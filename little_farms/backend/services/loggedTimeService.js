import admin from '../adminFirebase.js';

const db = admin.firestore();
const loggedTimeCollection = db.collection('LoggedTime');

// Get all logged time entries
export async function getAllLoggedTime() {
  try {
    const snapshot = await loggedTimeCollection.get();
    const loggedTimeEntries = [];

    snapshot.forEach((doc) => {
      loggedTimeEntries.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return loggedTimeEntries;
  } catch (error) {
    console.error('Error getting logged time entries:', error);
    throw error;
  }
}

// Get a single logged time entry by ID
export async function getLoggedTimeById(id) {
  try {
    const docRef = loggedTimeCollection.doc(id);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      throw new Error('Logged time entry not found');
    }
  } catch (error) {
    console.error('Error getting logged time entry:', error);
    throw error;
  }
}

// Get logged time entries by user
// export async function getLoggedTimeByUser(userId) {
//   try {
//     const snapshot = await loggedTimeCollection.where('user', '==', `/Users/${userId}`).get();
//     const loggedTimeEntries = [];

//     snapshot.forEach((doc) => {
//       loggedTimeEntries.push({
//         id: doc.id,
//         ...doc.data()
//       });
//     });

//     return loggedTimeEntries;
//   } catch (error) {
//     console.error('Error getting logged time entries by user:', error);
//     throw error;
//   }
// }

// Get logged time entries by task
// export async function getLoggedTimeByTask(taskId) {
//   try {
//     const snapshot = await loggedTimeCollection.where('task', '==', `/Tasks/${taskId}`).get();
//     const loggedTimeEntries = [];

//     snapshot.forEach((doc) => {
//       loggedTimeEntries.push({
//         id: doc.id,
//         ...doc.data()
//       });
//     });

//     return loggedTimeEntries;
//   } catch (error) {
//     console.error('Error getting logged time entries by task:', error);
//     throw error;
//   }
// }

// Get all logged time entries with joined data

export async function getLoggedTimeWithDetails() {
  try {
    const loggedTimeSnapshot = await db.collection('LoggedTime').get();

    // If no logged time entries exist, return empty array
    if (loggedTimeSnapshot.empty) {
      return [];
    }

    const detailedEntries = [];

    // Process each logged time entry
    for (const doc of loggedTimeSnapshot.docs) {
      const loggedTimeData = doc.data();

      try {
        // Validate required fields
        if (!loggedTimeData.task || !loggedTimeData.user) {
          console.warn(`Logged time entry ${doc.id} is missing task or user reference`);
          detailedEntries.push({
            loggedTimeId: doc.id,
            amtOfTime: loggedTimeData.amtOfTime,
            lastModified: doc.updateTime?.toDate() || doc.createTime?.toDate() || new Date(),
            error: 'Missing task or user reference'
          });
          continue;
        }

        // Get task details with better error handling
        let taskDetails = {};
        try {
          const taskRef = typeof loggedTimeData.task === 'string'
            ? db.doc(loggedTimeData.task)
            : loggedTimeData.task;

          const taskDoc = await taskRef.get();
          if (taskDoc.exists) {
            taskDetails = taskDoc.data();
            // console.log(taskDetails)
            taskDetails.id = taskDoc.id;
          } else {
            throw new Error(`Task not found: ${loggedTimeData.task}`);
          }
        } catch (taskError) {
          console.warn(`Error fetching task for logged time ${doc.id}:`, taskError.message);
          taskDetails = { error: 'Task not found' };
        }

        // Get project details from task
        let projectDetails = {};
        if (taskDetails.projectId && !taskDetails.error) {
          try {
            const projectRef = typeof taskDetails.projectId === 'string'
              ? db.doc(taskDetails.projectId)
              : taskDetails.projectId;

            const projectDoc = await projectRef.get();
            if (projectDoc.exists) {
              projectDetails = projectDoc.data();
              projectDetails.id = projectDoc.id;
            } else {
              throw new Error(`Project not found: ${taskDetails.projectId}`);
            }
          } catch (projectError) {
            console.warn(`Error fetching project for task ${taskDetails.id}:`, projectError.message);
            projectDetails = { error: 'Project not found' };
          }
        }

        // Get user details
        let userDetails = {};
        try {
          const userRef = typeof loggedTimeData.user === 'string'
            ? db.doc(loggedTimeData.user)
            : loggedTimeData.user;

          const userDoc = await userRef.get();
          if (userDoc.exists) {
            userDetails = userDoc.data();
            userDetails.id = userDoc.id;
            // console.log(userDetails)
          } else {
            throw new Error(`User not found: ${loggedTimeData.user}`);
          }
        } catch (userError) {
          console.warn(`Error fetching user for logged time ${doc.id}:`, userError.message);
          userDetails = { error: 'User not found' };
        }

        // Construct the detailed entry
        const detailedEntry = {
          // LoggedTime data
          loggedTimeId: doc.id,
          amtOfTime: loggedTimeData.amtOfTime,
          lastModified: doc.updateTime?.toDate() || doc.createTime?.toDate() || new Date(),

          // Project details (handle errors)
          prjId: projectDetails.id || null,
          prjName: projectDetails.title || projectDetails.name || 'N/A',

          // Task details (handle errors)
          taskId: taskDetails.id || null,
          taskName: taskDetails.title || taskDetails.name || 'N/A',
          createdDate: taskDetails.modifiedDate,  //it to fit in with the rest

          // User details (handle errors)
          userId: userDetails.id || null,
          userName: userDetails.name || 'N/A',
          userDept: userDetails.department || 'N/A',
          userEmail: userDetails.email || 'N/A',
          userRole: userDetails.role || 'N/A'
        };

        // Add error flags if any related data failed to load
        if (taskDetails.error) detailedEntry.taskError = true;
        if (projectDetails.error) detailedEntry.projectError = true;
        if (userDetails.error) detailedEntry.userError = true;

        detailedEntries.push(detailedEntry);
      } catch (error) {
        console.error(`Error processing logged time entry ${doc.id}:`, error);
        // Continue with other entries even if one fails
        detailedEntries.push({
          loggedTimeId: doc.id,
          amtOfTime: loggedTimeData.amtOfTime,
          lastModified: doc.updateTime?.toDate() || doc.createTime?.toDate() || new Date(),
          error: 'Failed to process entry'
        });
      }
    }

    return detailedEntries;
  } catch (error) {
    console.error('Error getting logged time entries with details:', error);
    throw error;
  }
}

export async function getLoggedTimeWithDetailsByProject(projectId) {
  try {
    const allEntries = await getLoggedTimeWithDetails();
    return allEntries.filter(entry => entry.prjId === projectId);
  } catch (error) {
    console.error('Error getting logged time by project:', error);
    throw error;
  }
}

export async function getLoggedTimeWithDetailsByDepartment(department) {
  try {
    const allEntries = await getLoggedTimeWithDetails();
    return allEntries.filter(entry =>
      entry.userDept && entry.userDept.toLowerCase() === department.toLowerCase()
    );
  } catch (error) {
    console.error('Error getting logged time by department:', error);
    throw error;
  }
}

// Create a new logged time entry
export async function createLoggedTime(loggedTimeData) {
  try {
    // Convert string paths to DocumentReference objects
    const processedData = { ...loggedTimeData };

    // Convert task path to DocumentReference
    if (processedData.task && typeof processedData.task === 'string') {
      processedData.task = db.doc(processedData.task);
    }

    // Convert user path to DocumentReference  
    if (processedData.user && typeof processedData.user === 'string') {
      processedData.user = db.doc(processedData.user);
    }

    // Convert amtOfTime to integer
    if (processedData.amtOfTime !== undefined && processedData.amtOfTime !== null) {
      processedData.amtOfTime = parseInt(processedData.amtOfTime, 10);

      // Handle NaN case (if conversion fails)
      if (isNaN(processedData.amtOfTime)) {
        throw new Error('amtOfTime must be a valid number');
      }
    } else {
      throw new Error('amtOfTime is required');
    }

    const docRef = await loggedTimeCollection.add(processedData);

    // Get the created document to return complete data
    const newDoc = await docRef.get();

    return {
      id: newDoc.id,
      ...newDoc.data()
    };
  } catch (error) {
    console.error('Error creating logged time entry:', error);
    throw error;
  }
}

// Update a logged time entry
export async function updateLoggedTime(id, updatedData) {
  try {
    const docRef = loggedTimeCollection.doc(id);
    await docRef.update(updatedData);

    // Get the updated document
    const updatedDoc = await docRef.get();

    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };
  } catch (error) {
    console.error('Error updating logged time entry:', error);
    throw error;
  }
}

// Delete a logged time entry
export async function deleteLoggedTime(id) {
  try {
    const docRef = loggedTimeCollection.doc(id);
    await docRef.delete();
    return { id, message: 'Logged time entry deleted successfully' };
  } catch (error) {
    console.error('Error deleting logged time entry:', error);
    throw error;
  }
}