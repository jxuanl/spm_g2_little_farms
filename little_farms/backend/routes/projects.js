import express from 'express';
import projectService from '../services/projectService.js';

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

export default router;
