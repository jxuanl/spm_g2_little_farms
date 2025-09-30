import { db } from "../adminFirebase.js";

export async function getUserByEmail(email) {
  try {
    const usersRef = db.collection('Users')
    const snapshot = await usersRef.where('email', '==', email).get()
    if (snapshot.empty) return null;

    const userDoc = snapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  } catch (err) {
    console.error("Error fetching user:", err);
    return null;
  }
}