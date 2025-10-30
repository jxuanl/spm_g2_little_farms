import admin from '../adminFirebase.js';

const db = admin.firestore();

async function getUserDetails(userReference) {
  try {
    const userDocRef = typeof userReference === 'string'
      ? db.doc(userReference)
      : userReference;
    
    const userId = typeof userReference === 'string' 
      ? userReference.split('/').pop() 
      : userReference.id;
    
    const userDoc = await userDocRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      return {
        id: userId,
        name: userData.name || 'Unknown',
        email: userData.email || '',
        department: userData.department || '',
        role: userData.role || ''
      };
    } else {
      return {
        id: userId,
        name: 'User Not Found',
        email: '',
        department: '',
        role: ''
      };
    }
  } catch (error) {
    console.warn('Error fetching user details:', error);
    return {
      id: 'error',
      name: 'Error Loading User',
      email: '',
      department: '',
      role: ''
    };
  }
}

// Get all tasks by project ID with detailed information
export async function getTasksByProjectWithDetails(projectId) {
  try {
    // Get the project first to verify it exists and get its title
    const projectRef = db.collection('Projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      throw new Error('Project not found');
    }
    
    const projectData = projectDoc.data();
    
    // Get all tasks for this project
    const tasksSnapshot = await db.collection('Tasks')
      .where('projectId', '==', db.collection('Projects').doc(projectId))
      .get();
    
    const detailedTasks = [];
    
    // Process each task to get user details
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      
      try {
        // Get task owner details
        let taskOwnerDetails = {};
        let taskOwnerId = null;
        
        if (taskData.taskCreatedBy) {
          const ownerRef = typeof taskData.taskCreatedBy === 'string'
            ? db.doc(taskData.taskCreatedBy)
            : taskData.taskCreatedBy;
          
          taskOwnerId = typeof taskData.taskCreatedBy === 'string' 
            ? taskData.taskCreatedBy.split('/').pop() 
            : taskData.taskCreatedBy.id;
            
          const ownerDoc = await ownerRef.get();
          if (ownerDoc.exists) {
            taskOwnerDetails = ownerDoc.data();
          }
        }
        
        // Get assigned users details
        const assignedUsersDetails = [];
        if (taskData.assignedTo && Array.isArray(taskData.assignedTo)) {
          for (const userRef of taskData.assignedTo) {
            try {
              const userDocRef = typeof userRef === 'string'
                ? db.doc(userRef)
                : userRef;
              
              const userId = typeof userRef === 'string' 
                ? userRef.split('/').pop() 
                : userRef.id;
                
              const userDoc = await userDocRef.get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                assignedUsersDetails.push({
                  id: userId,
                  name: userData.name,
                  email: userData.email,
                  department: userData.department,
                  role: userData.role
                });
              }
            } catch (error) {
              console.warn(`Error fetching user details for user ${userRef}:`, error);
            }
          }
        }
        
        // Construct the detailed task object
        const detailedTask = {
          // Task basic info
          id: taskDoc.id,
          taskTitle: taskData.title || taskData.taskTitle,
          status: taskData.status,
          deadline: taskData.deadline,
          completedDate: taskData.modifiedDate || taskData.completedDate,
          
          // Project info
          prjId: projectId,
          prjTitle: projectData.title,
          
          // User info
          taskOwner: {
            id: taskOwnerId,
            name: taskOwnerDetails.name,
            // email: taskOwnerDetails.email,
            // department: taskOwnerDetails.department
          },
          
          assignedTo: assignedUsersDetails,
          
          // Additional task fields that might be useful
        //   description: taskData.description,
        //   priority: taskData.priority,
          createdDate: taskData.createdDate,
          modifiedDate: taskData.modifiedDate
        };
        
        detailedTasks.push(detailedTask);
      } catch (error) {
        console.error(`Error processing task ${taskDoc.id}:`, error);
        // Continue with other tasks even if one fails
        detailedTasks.push({
          id: taskDoc.id,
          taskTitle: taskData.title || taskData.taskTitle,
          status: taskData.status,
          error: 'Failed to load user details: ' + error.message
        });
      }
    }
    
    return detailedTasks;
  } catch (error) {
    console.error('Error getting tasks by project with details:', error);
    throw error;
  }
}


// Get tasks by project with optional status filter
export async function getTasksByProjectWithDetailsAndFilter(projectId, filters = {}) {
  try {
    let tasks = await getTasksByProjectWithDetails(projectId);
    
    // Apply filters
    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status);
    }
    
    if (filters.assignedTo) {
      tasks = tasks.filter(task => 
        task.assignedTo.some(user => user.id === filters.assignedTo)
      );
    }
    
    // if (filters.priority) {
    //   tasks = tasks.filter(task => task.priority === filters.priority);
    // }
    
    return tasks;
  } catch (error) {
    console.error('Error getting filtered tasks by project:', error);
    throw error;
  }
}

// Get all tasks assigned to a specific user with detailed information
export async function getTasksByUserWithDetails(userId) {
  try {
    // First, get the user details to verify the user exists
    const userRef = db.collection('Users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Get all tasks where the user is in the assignedTo array
    const tasksSnapshot = await db.collection('Tasks')
      .where('assignedTo', 'array-contains', db.collection('Users').doc(userId))
      .get();
    
    const detailedTasks = [];
    
    // Process each task to get project and user details
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data();
      
      try {
        // Get project details
        let projectDetails = {};
        let projectId = null;
        
        if (taskData.projectId) {
          const projectRef = typeof taskData.projectId === 'string'
            ? db.doc(taskData.projectId)
            : taskData.projectId;
          
          projectId = typeof taskData.projectId === 'string' 
            ? taskData.projectId.split('/').pop() 
            : taskData.projectId.id;
            
          const projectDoc = await projectRef.get();
          if (projectDoc.exists) {
            projectDetails = projectDoc.data();
          }
        }
        
        // Get task owner details
        let taskOwnerDetails = { name: 'Unknown', email: '', department: '' };
        if (taskData.taskCreatedBy) {
          taskOwnerDetails = await getUserDetails(taskData.taskCreatedBy);
        }
        
        // Get all assigned users details
        const assignedUsersDetails = [];
        if (taskData.assignedTo && Array.isArray(taskData.assignedTo)) {
          const userPromises = taskData.assignedTo.map(userRef => getUserDetails(userRef));
          const userResults = await Promise.all(userPromises);
          assignedUsersDetails.push(...userResults);
        }
        
        // Construct the detailed task object
        const detailedTask = {
          // Task basic info
          id: taskDoc.id,
          taskTitle: taskData.title || taskData.taskTitle || 'Untitled Task',
          status: taskData.status || 'Unknown',
          deadline: taskData.deadline || null,
          completedDate: taskData.modifiedDate || taskData.completedDate || null,
          
          // Project info
          prjId: projectId,
          prjTitle: projectDetails.title || 'Unknown Project',
          prjDescription: projectDetails.description || '',
          
          // User info
          taskOwner: taskOwnerDetails,
          assignedTo: assignedUsersDetails,
        //   requestingUser: {
        //     id: userId,
        //     name: userData.name,
        //     email: userData.email,
        //     department: userData.department,
        //     role: userData.role
        //   },
          
          // Additional task fields
        //   description: taskData.description || '',
        //   priority: taskData.priority || 'medium',
          createdDate: taskData.createdDate || null,
          modifiedDate: taskData.modifiedDate || null,
        //   estimatedHours: taskData.estimatedHours || null,
        //   actualHours: taskData.actualHours || null
        };
        
        detailedTasks.push(detailedTask);
      } catch (error) {
        console.error(`Error processing task ${taskDoc.id}:`, error);
        // Provide basic task info even if details fail
        detailedTasks.push({
          id: taskDoc.id,
          taskTitle: taskData.title || taskData.taskTitle || 'Untitled Task',
          status: taskData.status || 'Unknown',
          error: `Failed to load task details: ${error.message}`
        });
      }
    }
    
    return detailedTasks;
  } catch (error) {
    console.error('Error getting tasks by user with details:', error);
    throw error;
  }
}

// Get tasks by user with optional filters
export async function getTasksByUserWithDetailsAndFilter(userId, filters = {}) {
  try {
    let tasks = await getTasksByUserWithDetails(userId);
    
    // Apply filters
    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status);
    }
    
    if (filters.projectId) {
      tasks = tasks.filter(task => task.prjId === filters.projectId);
    }
    
    // if (filters.priority) {
    //   tasks = tasks.filter(task => task.priority === filters.priority);
    // }
    
    // Date range filter
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      tasks = tasks.filter(task => {
        const taskDate = task.createdDate ? new Date(task.createdDate._seconds * 1000) : new Date();
        return taskDate >= startDate && taskDate <= endDate;
      });
    }
    
    return tasks;
  } catch (error) {
    console.error('Error getting filtered tasks by user:', error);
    throw error;
  }
}

// Get user task summary (useful for dashboards)
export async function getUserTaskSummary(userId) {
  try {
    const tasks = await getTasksByUserWithDetails(userId);
    
    const summary = {
      totalTasks: tasks.length,
      byStatus: {},
      byProject: {},
    //   byPriority: {},
      overdueTasks: 0,
      completedThisWeek: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0
    };
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    tasks.forEach(task => {
      // Count by status
      summary.byStatus[task.status] = (summary.byStatus[task.status] || 0) + 1;
      
      // Count by project
      summary.byProject[task.prjTitle] = (summary.byProject[task.prjTitle] || 0) + 1;
      
      // Count by priority
    //   summary.byPriority[task.priority] = (summary.byPriority[task.priority] || 0) + 1;
      
      // Count overdue tasks
      if (task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done') {
        summary.overdueTasks++;
      }
      
      // Count completed this week
      if (task.status === 'done' && task.completedDate && new Date(task.completedDate) >= oneWeekAgo) {
        summary.completedThisWeek++;
      }
      
      // Sum hours
      if (task.estimatedHours) summary.totalEstimatedHours += task.estimatedHours;
      if (task.actualHours) summary.totalActualHours += task.actualHours;
    });
    
    return {
      user: tasks.length > 0 ? tasks[0].requestingUser : null,
      summary,
      tasks
    };
  } catch (error) {
    console.error('Error getting user task summary:', error);
    throw error;
  }
}