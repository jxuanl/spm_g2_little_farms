import { db } from "../firebase.js";
import { collection, query, where, getDocs, orderBy, doc } from "firebase/firestore";
// import { addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";

const TASK_COLLECTION = "Tasks";


/**
 * Fetch tasks assigned to a specific user by user document ID
 * @param {string} userId - Firestore document ID of the user
 * @returns {Promise<object[]>}
 */

export async function getTasksForUser(userId) {
    try {
      const userRef = doc(db, "Users", userId); // create a document reference
  
      const q = query(
        collection(db, TASK_COLLECTION),
        where("assignedTo", "array-contains", userRef)
      );
  
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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