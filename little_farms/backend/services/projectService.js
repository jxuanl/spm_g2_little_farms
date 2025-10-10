// import { collection, getDocs } from "firebase/firestore";
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

export async function addNewProject(title, description) {
    try {
        // Get user data from session storage
        const userSession = sessionStorage.getItem('UserSession');
        
        if (!userSession) {
            throw new Error('User not logged in');
        }
        
        const userData = JSON.parse(userSession);
        const userId = "/Users/"+userData.uid;
        
        
        if (!userId) {
            throw new Error('User ID not found in session');
        }
        
        // Create project data
        const projectData = {
            title: title,
            description: description,
            owner: userId,
            taskList: [] // Initialize empty task list
        };
        
        // Add project to Firestore
        const docRef = await addDoc(collection(db, "Projects"), projectData);
        
        console.log("Project created with ID: ", docRef.id);
        return {
            success: true,
            projectId: docRef.id,
            message: "Project created successfully"
        };
        
    } catch (error) {
        console.error("Error adding project: ", error);
        return {
            success: false,
            error: error.message
        };
    }
}

export const projectService = {
  fetchProjects
};