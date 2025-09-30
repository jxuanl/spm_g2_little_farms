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

// export async function createTask(newTask) {
//   await addDoc(collection(db, TASK_COLLECTION), newTask);
// }

// export async function updateTask(taskId, updates) {
//   const taskRef = doc(db, TASK_COLLECTION, taskId);
//   await updateDoc(taskRef, updates);
// }

// export async function deleteTask(taskId) {
//   const taskRef = doc(db, TASK_COLLECTION, taskId);
//   await deleteDoc(taskRef);
// }

export const taskService = {
  getTasksForUser,
  // createTask,
  // updateTask,
  // deleteTask,
};