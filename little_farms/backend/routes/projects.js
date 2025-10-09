import express from 'express';
// import { getFirestore, collection, addDo c, getDocs, query, where } from 'firebase/firestore';import { fetchProjects } from '../services/projectService.js';
import admin from '../adminFirebase.js';

const router = express.Router();

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const projects = await fetchProjects();
    console.log("Trying to fetch projects");
    console.log("Projects returned from service:", projects);
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/createProject', async (req, res) => {
    try {
    const { title, desc, userId } = req.body;
    
    const projectData = {
      title: title.trim(),
      description: desc.trim(),
      owner: userId, // Don't prefix with "/Projects/"
      taskList: []
    };

    // Use admin firestore correctly
    const docRef = await admin.firestore().collection('Projects').add(projectData);
    
    res.status(201).json({
      success: true,
      projectId: docRef.id,
      message: "Project created successfully"
    });
  } catch (error) {
        console.error("Error adding project: ", error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

export default router;