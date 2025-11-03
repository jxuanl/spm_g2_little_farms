import express from 'express';
import {
  getTasksByProjectWithDetails,
  getTasksByProjectWithDetailsAndFilter,
  getTasksByUserWithDetails,
  getTasksByUserWithDetailsAndFilter,
  getUserTaskSummary,
  getTasksforDailyDigest
} from '../services/reportDataService.js';

const router = express.Router();

// Get all tasks by project ID with detailed information
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await getTasksByProjectWithDetails(projectId);
    res.json(tasks);
  } catch (error) {
    if (error.message === 'Project not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get tasks by project ID with filters
router.get('/project/:projectId/filtered', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, assignedTo, priority } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (priority) filters.priority = priority;
    
    const tasks = await getTasksByProjectWithDetailsAndFilter(projectId, filters);
    res.json(tasks);
  } catch (error) {
    if (error.message === 'Project not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get all tasks assigned to a specific user with detailed information
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const tasks = await getTasksByUserWithDetails(userId);
    res.json(tasks);
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get tasks assigned to user with filters
router.get('/user/:userId/filtered', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, projectId, priority, startDate, endDate } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (projectId) filters.projectId = projectId;
    if (priority) filters.priority = priority;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    const tasks = await getTasksByUserWithDetailsAndFilter(userId, filters);
    res.json(tasks);
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get user task summary (for dashboards)
router.get('/user/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const summary = await getUserTaskSummary(userId);
    res.json(summary);
  } catch (error) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;