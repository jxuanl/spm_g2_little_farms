import { db } from "../adminFirebase.js";

// Helper function to resolve user data from DocumentReference
async function resolveUserData(userRef) {
  if (!userRef) return null;
  
  try {
    let userId;
    
    // Handle different reference formats
    if (typeof userRef === 'string') {
      userId = userRef;
    } else if (userRef.path) {
      const pathParts = userRef.path.split('/');
      userId = pathParts[pathParts.length - 1];
    } else if (userRef._path && userRef._path.segments) {
      // Handle Firestore DocumentReference with _path.segments
      userId = userRef._path.segments[userRef._path.segments.length - 1];
    } else if (userRef.id) {
      userId = userRef.id;
    }
    
    if (!userId) {
      console.warn('Could not extract userId from reference:', userRef);
      return null;
    }
    
    // console.log('Resolving user with ID:', userId);
    const userDoc = await db.collection('Users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.warn('User document does not exist:', userId);
      return null;
    }
    
    const userData = userDoc.data();
    return {
      id: userId,
      name: userData.name || userData.email || 'Unknown User',
      email: userData.email || ''
    };
  } catch (error) {
    console.error('Failed to resolve user data:', error);
    return null;
  }
}

// Helper function to resolve project data from DocumentReference
async function resolveProjectData(projectRef) {
  if (!projectRef) return null;
  
  try {
    let projectId;
    
    // Handle different reference formats
    if (typeof projectRef === 'string') {
      projectId = projectRef;
    } else if (projectRef.path) {
      const pathParts = projectRef.path.split('/');
      projectId = pathParts[pathParts.length - 1];
    } else if (projectRef.id) {
      projectId = projectRef.id;
    }
    
    if (!projectId) return null;
    
    const projectDoc = await db.collection('Projects').doc(projectId).get();
    if (!projectDoc.exists) return null;
    
    const projectData = projectDoc.data();
    return {
      id: projectId,
      title: projectData.title || 'Untitled Project'
    };
  } catch (error) {
    console.warn('Failed to resolve project data:', error);
    return null;
  }
}

export async function getProjectsForUser(userId) {
  try {
    // Get all projects
    const projectsSnapshot = await db.collection("Projects").get();
    // console.log("Total projects found in DB:", projectsSnapshot.size);

    const filteredProjects = [];

    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      const taskList = projectData.taskList || [];

      // console.log("Task refs:", taskList.map(ref => ref.path || ref));

      const taskSnapshots = await Promise.all(
        taskList.map(async (taskRef) => {
          try {
            const taskSnap = await taskRef.get();
            return taskSnap.exists ? taskSnap : null;
          } catch (err) {
            console.warn("Failed to fetch task:", taskRef.path, err);
            return null;
          }
        })
      );

      // Check if user has at least one assigned task OR is creator
      const isCreatorOfProject = projectData.owner?.path === `Users/${userId}`;
      // console.log(`Project ${projectDoc.id} owner path:`, projectData.owner?.path);
      
      const hasRelevantTask =
        isCreatorOfProject || taskSnapshots.some(taskDoc => {
          if (!taskDoc || !taskDoc.exists) return false;
          const taskData = taskDoc.data();

          const isAssigned =
            Array.isArray(taskData.assignedTo) &&
            taskData.assignedTo.some(ref => ref.path === `Users/${userId}`);

          const isCreatorOfTask =
            taskData.taskCreatedBy?.path === `Users/${userId}`;

          return isAssigned || isCreatorOfTask;
        });

      if (hasRelevantTask) {
        // console.log("User has tasks in project:", projectDoc.id);
        filteredProjects.push({
          id: projectDoc.id,
          title: projectData.title || '',
          description: projectData.description || '',
          owner: projectData.owner || '',
          taskList,
        });
      } else {
        // console.log("User has no tasks in project:", projectDoc.id);
      }
    }

    return filteredProjects;
  } catch (error) {
    console.error("Error fetching projects for user:", error);
    throw error;
  }
}

export async function getProjectDetailForUser(projectId, userId) {
  try {
    const projectDoc = await db.collection('Projects').doc(projectId).get();
    if (!projectDoc.exists) return null;

    const projectData = projectDoc.data();
    const taskList = projectData.taskList || [];

    // Check if user is the project owner
    const isProjectOwner = projectData.owner?.path === `Users/${userId}`;

    // console.log('Project owner check:', {
    //   projectId,
    //   userId,
    //   ownerPath: projectData.owner?.path,
    //   expectedPath: `Users/${userId}`,
    //   isProjectOwner
    // });

    // ✅ RESOLVE PROJECT OWNER NAME
    const ownerData = await resolveUserData(projectData.owner);
    // console.log('Resolved project owner:', ownerData);

    // Fetch task documents with resolved user/project data
    const taskSnapshots = await Promise.all(
      taskList.map(async (taskRef) => {
        const taskSnap = await taskRef.get();
        if (!taskSnap.exists) return null;
        const taskData = taskSnap.data();

        // If user owns the project, show ALL tasks
        if (isProjectOwner) {
          // console.log('Project owner viewing task:', taskSnap.id);
        } else {
          // Otherwise, only include tasks where user is assigned OR created the task
          const isAssigned = Array.isArray(taskData.assignedTo) &&
            taskData.assignedTo.some(ref => ref.path === `Users/${userId}`);
          
          const isTaskCreator = taskData.taskCreatedBy?.path === `Users/${userId}`;

          if (!isAssigned && !isTaskCreator) {
            // console.log('User does not have access to task:', taskSnap.id);
            return null;
          }
          
          // console.log('User has access to task:', taskSnap.id, { isAssigned, isTaskCreator });
        }

        // ✅ RESOLVE USER AND PROJECT DATA
        // Resolve creator
        // console.log('Resolving creator for task:', taskSnap.id, 'taskCreatedBy:', taskData.taskCreatedBy);
        const creatorData = await resolveUserData(taskData.taskCreatedBy);
        // console.log('Resolved creator data:', creatorData);
        
        // Resolve assignees
        const assigneePromises = Array.isArray(taskData.assignedTo) 
          ? taskData.assignedTo.map(ref => resolveUserData(ref))
          : [];
        const assigneeDataArray = await Promise.all(assigneePromises);
        const assigneeNames = assigneeDataArray
          .filter(Boolean)
          .map(user => user.name);
        
        // Resolve project (if task has a parentProject reference)
        let projectTitle = projectData.title || 'No Project';
        if (taskData.parentProject) {
          const projectInfo = await resolveProjectData(taskData.parentProject);
          if (projectInfo) {
            projectTitle = projectInfo.title;
          }
        }

        // Return enriched task data
        return {
          id: taskSnap.id,
          ...taskData,
          // Add resolved names for display
          creatorName: creatorData?.name || 'Unknown',
          assigneeNames: assigneeNames,
          projectTitle: projectTitle,
          // Keep original references for other operations if needed
          creatorId: creatorData?.id,
          assigneeIds: assigneeDataArray.filter(Boolean).map(u => u.id)
        };
      })
    );

    // Filter out nulls
    const userTasks = taskSnapshots.filter(t => t !== null);

    // console.log('Total tasks returned:', userTasks.length, 'out of', taskList.length);

    return {
      id: projectDoc.id,
      title: projectData.title || '',
      description: projectData.description || '',
      owner: projectData.owner || '',
      ownerName: ownerData?.name || 'Unknown', // ✅ Add resolved owner name
      tasks: userTasks,
      isOwner: isProjectOwner,
      showingAllTasks: isProjectOwner
    };
  } catch (error) {
    console.error("Error fetching project detail for user:", error);
    throw error;
  }
}

export default {
  getProjectsForUser,
  getProjectDetailForUser
};