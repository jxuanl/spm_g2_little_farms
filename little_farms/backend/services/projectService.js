import { db } from "../adminFirebase.js";

export async function getProjectsForUser(userId) {
  try {
    // Get all projects
    const projectsSnapshot = await db.collection("Projects").get();
    console.log("Total projects found in DB:", projectsSnapshot.size);

    const filteredProjects = [];

    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      const taskList = projectData.taskList || [];

      // Skip projects with no tasks
      if (!Array.isArray(taskList) || taskList.length === 0) continue;

      console.log("Task refs:", taskList.map(ref => ref.path || ref));

      const taskSnapshots = await Promise.all(
        taskList.map(async (taskRef) => {
          try {
            const taskSnap = await taskRef.get(); // taskRef is already a DocumentReference
            return taskSnap.exists ? taskSnap : null;
          } catch (err) {
            console.warn("Failed to fetch task:", taskRef.path, err);
            return null;
          }
        })
      );

      // Check if user has at least one assigned task
      const hasUserTask = taskSnapshots.some(taskDoc => {
        if (!taskDoc || !taskDoc.exists) return false;
        const taskData = taskDoc.data();
        console.log(taskData)
        // assignedTo is an array of DocumentReference
        return Array.isArray(taskData.assignedTo) &&
        taskData.assignedTo.some(ref => ref.path === `Users/${userId}`);
      });

      if (hasUserTask) {
        // Only return relevant fields
        console.log("User has tasks in project:", projectDoc.id);
        filteredProjects.push({
          id: projectDoc.id,
          title: projectData.title || '',
          description: projectData.description || '',
          owner: projectData.owner || '',
          taskList, // keep references if needed
        });
      } else {
        console.log("User has no tasks in project:", projectDoc.id);
      }
    }

    return filteredProjects;
  } catch (error) {
    console.error("Error fetching projects for user:", error);
    throw error;
  }
}

export default {
  getProjectsForUser
};
