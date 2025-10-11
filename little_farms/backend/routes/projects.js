import express from 'express';
import projectService from '../services/projectService.js';
import admin from '../adminFirebase.js';

const router = express.Router();

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    console.log("hit backend")
    // const userId = req.user?.uid;
    const userId = req.query.userId || req.user?.uid;
    console.log("Request received for user:", userId);
    const result = await projectService.getProjectsForUser(userId);
    console.log("Projects result:", result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Failed to fetch projects in route:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
