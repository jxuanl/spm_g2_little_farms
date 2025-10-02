import express from 'express'
import { getTasksForUser, createTask } from '../services/taskService.js'

const router = express.Router()

// Example GET /api/tasks?userId=xxx
router.get('/', async (req, res) => {
  const userId = req.query.userId
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }
  try {
    const tasks = await getTasksForUser(userId)
    res.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// POST /api/tasks - Create a new task
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      status,
      deadline,
      assigneeIds, // Array of user IDs
      projectId,   // Project document reference ID
      createdBy,   // User ID of the task creator
      tags
    } = req.body;

    // Validate required fields
    if (!title || !createdBy) {
      return res.status(400).json({ 
        error: 'Missing required fields: title and createdBy are required' 
      });
    }

    if (!assigneeIds || !Array.isArray(assigneeIds) || assigneeIds.length === 0) {
      return res.status(400).json({ 
        error: 'At least one assignee is required' 
      });
    }

    const taskData = {
      title,
      description,
      priority,
      status,
      deadline,
      assigneeIds,
      projectId,
      createdBy,
      tags
    };

    const newTask = await createTask(taskData);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

export default router
