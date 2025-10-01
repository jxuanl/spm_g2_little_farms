// firebaseService.js
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase'; // Import your existing Firebase config

// Get user session from session storage
const getUserSession = () => {
  const userSessionStr = sessionStorage.getItem('userSession');
  if (!userSessionStr) {
    throw new Error('No user session found');
  }
  return JSON.parse(userSessionStr);
};

// Project Services
export const projectService = {
  // Create a new project
  async createProject(projectData) {
    try {
      const userSession = getUserSession();
      const userId = userSession.uid;

      const newProject = {
        title: projectData.title,
        desc: projectData.desc || '',
        owner: `/Users/${userId}`,
        dateCreated: serverTimestamp(),
        lastModifiedDate: serverTimestamp(),
        startDate: projectData.startDate ? new Date(projectData.startDate) : serverTimestamp(),
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
      };

      const docRef = await addDoc(collection(db, 'Projects'), newProject);
      
      return {
        id: docRef.id,
        ...newProject
      };
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  // Get all projects for current user
  async getUserProjects() {
    try {
      const userSession = getUserSession();
      const userId = userSession.uid;
      const userPath = `/Users/${userId}`;

      const q = query(
        collection(db, 'Projects'),
        where('owner', '==', userPath)
      );

      const querySnapshot = await getDocs(q);
      const projects = [];
      
      querySnapshot.forEach((doc) => {
        projects.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  // Update a project
  async updateProject(projectId, updates) {
    try {
      const projectRef = doc(db, 'Projects', projectId);
      
      const updateData = {
        ...updates,
        lastModifiedDate: serverTimestamp()
      };

      await updateDoc(projectRef, updateData);
      
      return {
        id: projectId,
        ...updateData
      };
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },

  // Delete a project
  async deleteProject(projectId) {
    try {
      await deleteDoc(doc(db, 'Projects', projectId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }
};

// Task Services
export const taskService = {
  // Create a new task
  async createTask(taskData) {
    try {
      const userSession = getUserSession();
      const userId = userSession.uid;

      const newTask = {
        title: taskData.title,
        desc: taskData.desc || '',
        projectId: taskData.projectId,
        owner: `/Users/${userId}`,
        dateCreated: serverTimestamp(),
        lastModifiedDate: serverTimestamp(),
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium'
      };

      const docRef = await addDoc(collection(db, 'Tasks'), newTask);
      
      return {
        id: docRef.id,
        ...newTask
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // Get tasks for a specific project
  async getProjectTasks(projectId) {
    try {
      const q = query(
        collection(db, 'Tasks'),
        where('projectId', '==', projectId)
      );

      const querySnapshot = await getDocs(q);
      const tasks = [];
      
      querySnapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  // Get all tasks for current user
  async getUserTasks() {
    try {
      const userSession = getUserSession();
      const userId = userSession.uid;
      const userPath = `/Users/${userId}`;

      const q = query(
        collection(db, 'Tasks'),
        where('owner', '==', userPath)
      );

      const querySnapshot = await getDocs(q);
      const tasks = [];
      
      querySnapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },

  // Update a task
  async updateTask(taskId, updates) {
    try {
      const taskRef = doc(db, 'Tasks', taskId);
      
      const updateData = {
        ...updates,
        lastModifiedDate: serverTimestamp()
      };

      await updateDoc(taskRef, updateData);
      
      return {
        id: taskId,
        ...updateData
      };
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  // Delete a task
  async deleteTask(taskId) {
    try {
      await deleteDoc(doc(db, 'Tasks', taskId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
};

export default {
  projectService,
  taskService
};