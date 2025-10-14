import { db } from "../adminFirebase.js";
const TASK_COLLECTION = "Tasks";

export async function getTasksForUser(userId) {
  console.log(userId); //correct
    try {
      // const userRef = doc(db, "Users", userId); // create a document reference
      const userRef = db.collection('Users').doc(userId) // correct
      console.log('UserRef path:', userRef.path)

      // Query tasks where assignedTo array contains this userRef
        const snapshot = await db
      .collection('Tasks')
      .where('assignedTo', 'array-contains', userRef)
      .get()
      console.log('Tasks count:', snapshot.size)

      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamps to JavaScript Dates for JSON serialization
        return {
          id: doc.id,
          ...data,
          deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
          createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : data.createdDate,
          modifiedDate: data.modifiedDate?.toDate ? data.modifiedDate.toDate() : data.modifiedDate
        };
      })
    } catch (err) {
      console.error("Error fetching user tasks:", err);
      return [];
    }
  }

export async function createTask(taskData) {
  try {
    // Check if this is a subtask
    const isSubtask = !!taskData.parentTaskId;
    
    // Convert assignee IDs to Firestore user references
    const assignedToRefs = [];
    if (taskData.assigneeIds && taskData.assigneeIds.length > 0) {
      for (const userId of taskData.assigneeIds) {
        if (userId) { // ✅ Check if userId is not null
          const userDoc = await db.collection('Users').doc(userId).get();
          if (userDoc.exists) {
            assignedToRefs.push(db.collection('Users').doc(userId));
          }
        }
      }
    }
    
    // Convert project ID to Firestore project reference
    let projectRef = null;
    if (taskData.projectId) {
      const projectDoc = await db.collection('Projects').doc(taskData.projectId).get();
      if (projectDoc.exists) {
      projectRef = db.collection('Projects').doc(taskData.projectId);
      }
    }
    
    // Convert creator ID to Firestore user reference
    let taskCreatedByRef = null;
    if (taskData.createdBy) {
      const creatorDoc = await db.collection('Users').doc(taskData.createdBy).get();
      if (creatorDoc.exists) {
      taskCreatedByRef = db.collection('Users').doc(taskData.createdBy);
      }
    }
    
    // Convert date strings to Firestore timestamps
    const createdDate = new Date();
    const deadline = taskData.deadline ? new Date(taskData.deadline) : null;
    
    const newTask = {
      assignedTo: assignedToRefs,
      createdDate: createdDate,
      deadline: deadline,
      description: taskData.description || '',
      isOverdue: false, // Initially false, will be updated by background jobs
      modifiedDate: createdDate,
      priority: taskData.priority || 'medium',
      projectId: projectRef,
      status: taskData.status || 'To Do',
      tags: taskData.tags || [],
      taskCreatedBy: taskCreatedByRef,
      title: taskData.title
    };
    
    let docRef;
    
    if (isSubtask) {
      // Create subtask in the parent task's Subtasks subcollection
      docRef = await db.collection(TASK_COLLECTION)
        .doc(taskData.parentTaskId)
        .collection('Subtasks')
        .add(newTask);
    } else {
      // Create regular task
      docRef = await db.collection(TASK_COLLECTION).add(newTask);
    }
    
    return { id: docRef.id, ...newTask };
  } catch (err) {
    console.error("Error creating task:", err);
    throw err;
  }
}

// export async function updateTask(taskId, updates) {
//   const taskRef = doc(db, TASK_COLLECTION, taskId);
//   await updateDoc(taskRef, updates);
// }

// export async function deleteTask(taskId) {
//   const taskRef = doc(db, TASK_COLLECTION, taskId);
//   await deleteDoc(taskRef);
// }

<<<<<<< HEAD
export async function getTaskById(taskId) {
  try {
    const taskDoc = await db.collection(TASK_COLLECTION).doc(taskId).get();
    if (!taskDoc.exists) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    return { id: taskDoc.id, ...taskDoc.data() };
  } catch (err) {
    console.error("Error fetching task by ID:", err);
    throw err;
  }
}

=======
>>>>>>> 3169ca790a75f29712a4e317b4ce51cc91a5bbcf
export async function getSubtasksForTask(taskId) {
  try {
    const snapshot = await db
      .collection(TASK_COLLECTION)
      .doc(taskId)
      .collection('Subtasks')
      .get();
      
    return snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Serialize Firestore references properly
      const serializedData = { ...data };
      
      // Convert projectId reference to include path
      if (data.projectId && data.projectId.path) {
        serializedData.projectId = { path: data.projectId.path };
      }
      
      // Convert taskCreatedBy reference to include path
      console.log('Raw taskCreatedBy data:', data.taskCreatedBy);
      if (data.taskCreatedBy && data.taskCreatedBy.path) {
        serializedData.taskCreatedBy = { path: data.taskCreatedBy.path };
      } else if (data.taskCreatedBy && data.taskCreatedBy._path && data.taskCreatedBy._path.segments) {
        // Handle Firestore DocumentReference format
        const pathString = data.taskCreatedBy._path.segments.join('/');
        console.log('Constructed path from segments:', pathString);
        serializedData.taskCreatedBy = { path: pathString };
      } else if (data.taskCreatedBy) {
        // Handle other reference formats
        console.log('taskCreatedBy exists but no recognizable path format, full object:', data.taskCreatedBy);
        serializedData.taskCreatedBy = data.taskCreatedBy;
      } else {
        console.log('taskCreatedBy is null or undefined');
        serializedData.taskCreatedBy = null;
      }
      
      // Convert assignedTo references to include paths
      if (data.assignedTo && Array.isArray(data.assignedTo)) {
        serializedData.assignedTo = data.assignedTo.map(ref => 
          ref && ref.path ? { path: ref.path } : ref
        );
      }
      
      // Convert Firestore Timestamps to JavaScript Dates for JSON serialization
      return {
        id: doc.id,
        ...serializedData,
        deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
        createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : data.createdDate,
        modifiedDate: data.modifiedDate?.toDate ? data.modifiedDate.toDate() : data.modifiedDate
      };
    });
  } catch (err) {
    console.error("Error fetching subtasks:", err);
    return [];
  }
}

export async function getSubtaskById(taskId, subtaskId) {
  try {
    const doc = await db
      .collection(TASK_COLLECTION)
      .doc(taskId)
      .collection('Subtasks')
      .doc(subtaskId)
      .get();
      
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    
    // Serialize Firestore references properly
    const serializedData = { ...data };
    
    // Convert projectId reference to include path
    if (data.projectId && data.projectId.path) {
      serializedData.projectId = { path: data.projectId.path };
    }
    
    // Convert taskCreatedBy reference to include path
    console.log('Raw taskCreatedBy data:', data.taskCreatedBy);
    if (data.taskCreatedBy && data.taskCreatedBy.path) {
      serializedData.taskCreatedBy = { path: data.taskCreatedBy.path };
    } else if (data.taskCreatedBy && data.taskCreatedBy._path && data.taskCreatedBy._path.segments) {
      // Handle Firestore DocumentReference format
      const pathString = data.taskCreatedBy._path.segments.join('/');
      console.log('Constructed path from segments:', pathString);
      serializedData.taskCreatedBy = { path: pathString };
    } else if (data.taskCreatedBy) {
      // Handle other reference formats
      console.log('taskCreatedBy exists but no recognizable path format, full object:', data.taskCreatedBy);
      serializedData.taskCreatedBy = data.taskCreatedBy;
    } else {
      console.log('taskCreatedBy is null or undefined');
      serializedData.taskCreatedBy = null;
    }
    
    // Convert assignedTo references to include paths
    if (data.assignedTo && Array.isArray(data.assignedTo)) {
      serializedData.assignedTo = data.assignedTo.map(ref => 
        ref && ref.path ? { path: ref.path } : ref
      );
    }
    
    // Convert Firestore Timestamps to JavaScript Dates for JSON serialization
    return {
      id: doc.id,
      ...serializedData,
      deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
      createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : data.createdDate,
      modifiedDate: data.modifiedDate?.toDate ? data.modifiedDate.toDate() : data.modifiedDate
    };
  } catch (err) {
    console.error("Error fetching subtask:", err);
    return null;
  }
}

export async function updateSubtask(taskId, subtaskId, updateData) {
  try {
    const subtaskRef = db
      .collection(TASK_COLLECTION)
      .doc(taskId)
      .collection('Subtasks')
      .doc(subtaskId);
    
    // Check if subtask exists
    const subtaskDoc = await subtaskRef.get();
    if (!subtaskDoc.exists) {
      return null;
    }
    
    // Prepare update data with proper references
    const updatedFields = { ...updateData };
    
    // Convert assignee IDs to Firestore user references if provided
    if (updateData.assignedTo && Array.isArray(updateData.assignedTo)) {
      const assignedToRefs = [];
      for (const userId of updateData.assignedTo) {
        if (userId && userId.trim() !== '') {
          const userDoc = await db.collection('Users').doc(userId).get();
          if (userDoc.exists) {
            assignedToRefs.push(db.collection('Users').doc(userId));
          }
        }
      }
      updatedFields.assignedTo = assignedToRefs;
    }
    
    // Convert project ID to Firestore project reference if provided
    if (updateData.projectId && typeof updateData.projectId === 'string' && updateData.projectId.trim() !== '') {
      const projectDoc = await db.collection('Projects').doc(updateData.projectId).get();
      if (projectDoc.exists) {
        updatedFields.projectId = db.collection('Projects').doc(updateData.projectId);
      }
    } else if (updateData.projectId === null) {
      // Handle explicit null to remove project reference
      updatedFields.projectId = null;
    }
    
    // Convert date strings to proper dates if provided
    if (updateData.deadline) {
      updatedFields.deadline = new Date(updateData.deadline);
    }
    
    // Always update the modified date
    updatedFields.modifiedDate = new Date();
    
    // Update the subtask
    await subtaskRef.update(updatedFields);
    
    // Return the updated subtask
    const updatedDoc = await subtaskRef.get();
    const data = updatedDoc.data();
    return {
      id: updatedDoc.id,
      ...data,
      deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
      createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : data.createdDate,
      modifiedDate: data.modifiedDate?.toDate ? data.modifiedDate.toDate() : data.modifiedDate
    };
  } catch (err) {
    console.error("Error updating subtask:", err);
    throw err;
  }
}

export const taskService = {
  getTasksForUser,
  createTask,
<<<<<<< HEAD
  getTaskById,
=======
>>>>>>> 3169ca790a75f29712a4e317b4ce51cc91a5bbcf
  getSubtasksForTask,
  getSubtaskById,
  updateSubtask,
  // updateTask,
  // deleteTask,
};


