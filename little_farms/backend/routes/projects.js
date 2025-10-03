import express from 'express';
import { fetchProjects } from '../services/projectService.js';

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

export default router;