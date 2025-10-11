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

// GET /api/projects/:id
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.query.userId || req.user?.uid;

    const project = await projectService.getProjectDetailForUser(projectId, userId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found or no tasks assigned to user' });
    }

    res.status(200).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

export default router;
