import { db } from "../adminFirebase.js";

export async function getProjectsForUser(userId) {
  try {
    // Get all projects
    const projectsSnapshot = await db.collection("Projects").get();
    console.log("Total projects found in DB:", projectsSnapshot.size);

    const filteredProjects = [];

    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      const taskList = projectData.taskList || [];

      console.log("Task refs:", taskList.map(ref => ref.path || ref));

      const taskSnapshots = await Promise.all(
        taskList.map(async (taskRef) => {
          try {
            const taskSnap = await taskRef.get(); // taskRef is already a DocumentReference
            return taskSnap.exists ? taskSnap : null;
          } catch (err) {
            console.warn("Failed to fetch task:", taskRef.path, err);
            return null;
          }
        })
      );

      // Check if user has at least one assigned task
      // OR If user is a creator of the project
      // OR If the user is a creator of the task
        const isCreatorOfProject = projectData.owner?.path === `Users/${userId}`;
        console.log(`Project ${projectDoc.id} owner path:`, projectData.owner?.path);
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
        // Only return relevant fields
        console.log("User has tasks in project:", projectDoc.id);
        filteredProjects.push({
          id: projectDoc.id,
          title: projectData.title || '',
          description: projectData.description || '',
          owner: projectData.owner || '',
          taskList, // keep references if needed
        });
      } else {
        console.log("User has no tasks in project:", projectDoc.id);
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

    // Check if user is the project owner (owner is a DocumentReference)
    const isProjectOwner = projectData.owner?.path === `Users/${userId}`;

    console.log('Project owner check:', {
      projectId,
      userId,
      ownerPath: projectData.owner?.path,
      expectedPath: `Users/${userId}`,
      isProjectOwner
    });

    // Fetch task documents
    const taskSnapshots = await Promise.all(
      taskList.map(async (taskRef) => {
        const taskSnap = await taskRef.get();
        if (!taskSnap.exists) return null;
        const taskData = taskSnap.data();

        // If user owns the project (is the manager who created it), show ALL tasks
        if (isProjectOwner) {
          console.log('Project owner viewing task:', taskSnap.id);
          return { id: taskSnap.id, ...taskData };
        }

        // Otherwise, only include tasks where user is assigned OR created the task
        const isAssigned = Array.isArray(taskData.assignedTo) &&
          taskData.assignedTo.some(ref => ref.path === `Users/${userId}`);
        
        const isTaskCreator = taskData.taskCreatedBy?.path === `Users/${userId}`;

        if (isAssigned || isTaskCreator) {
          console.log('User has access to task:', taskSnap.id, { isAssigned, isTaskCreator });
          return { id: taskSnap.id, ...taskData };
        }
        
        return null;
      })
    );

    // Filter out nulls
    const userTasks = taskSnapshots.filter(t => t !== null);

    console.log('Total tasks returned:', userTasks.length, 'out of', taskList.length);

    return {
      id: projectDoc.id,
      title: projectData.title || '',
      description: projectData.description || '',
      owner: projectData.owner || '',
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
