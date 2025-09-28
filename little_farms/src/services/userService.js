import { db } from "../firebase.js";
import { collection, query, where, getDocs } from "firebase/firestore";

/**
 * Fetch a user document by email
 * @param {string} email
 * @returns {object|null} user object including id
 */
export async function getUserByEmail(email) {
  try {
    const q = query(collection(db, "Users"), where("email", "==", email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  } catch (err) {
    console.error("Error fetching user:", err);
    return null;
  }
}