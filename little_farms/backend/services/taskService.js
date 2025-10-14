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

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (err) {
      console.error("Error fetching user tasks:", err);
      return [];
    }
  }

export async function createTask(taskData) {
  try {
    // Convert assignee IDs to Firestore user references
    const assignedToRefs = [];
    if (taskData.assigneeIds) {
      for (const userId of taskData.assigneeIds) {
      const userDoc = await db.collection('Users').doc(userId).get();
      if (userDoc.exists) {
        assignedToRefs.push(db.collection('Users').doc(userId));
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
    
    const docRef = await db.collection(TASK_COLLECTION).add(newTask);
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

export const taskService = {
  getTasksForUser,
  createTask,
  getTaskById,
  // updateTask,
  // deleteTask,
};


