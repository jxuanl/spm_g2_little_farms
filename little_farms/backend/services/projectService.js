import { collection, getDocs } from "firebase/firestore";
import { db } from "../adminFirebase.js";

export async function fetchProjects() {
  try {
    const snapshot = await db.collection('Projects').get();
    if (snapshot.empty) {
      console.log('No projects found in DB');
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().title,
      tasksCount: 0, // placeholder
      color: 'bg-blue-500'
    }));
  } catch (err) {
    console.error('Error fetching projects:', err);
    return [];
  }
}