import express from 'express'
import { getTasksForUser, createTask, getSubtasksForTask, getSubtaskById, updateSubtask } from '../services/taskService.js'

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
    console.error('Backend error fetching tasks:', error);
    res.status(500).json({ error: error.message });
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
      tags,
      parentTaskId // Optional: ID of parent task if this is a subtask
    } = req.body;

    // Validate required fields
    if (!title || !createdBy) {
      return res.status(400).json({ 
        error: 'Missing required fields: title and createdBy are required' 
      });
    }

    if (assigneeIds && !Array.isArray(assigneeIds)) {
      return res.status(400).json({ 
        error: 'assigneeIds must be an array' 
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
      tags,
      parentTaskId
    };

    const newTask = await createTask(taskData);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// GET /api/tasks/:taskId/subtasks - Get subtasks for a specific task
router.get('/:taskId/subtasks', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId' });
    }
    
    const subtasks = await getSubtasksForTask(taskId);
    res.json(subtasks);
  } catch (error) {
    console.error('Backend error fetching subtasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:taskId/subtasks/:subtaskId - Get a specific subtask
router.get('/:taskId/subtasks/:subtaskId', async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    
    if (!taskId || !subtaskId) {
      return res.status(400).json({ error: 'Missing taskId or subtaskId' });
    }
    
    const subtask = await getSubtaskById(taskId, subtaskId);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    
    res.json(subtask);
  } catch (error) {
    console.error('Backend error fetching subtask:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tasks/:taskId/subtasks/:subtaskId - Update a specific subtask
router.put('/:taskId/subtasks/:subtaskId', async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    const updateData = req.body;
    
    if (!taskId || !subtaskId) {
      return res.status(400).json({ error: 'Missing taskId or subtaskId' });
    }
    
    const updatedSubtask = await updateSubtask(taskId, subtaskId, updateData);
    if (!updatedSubtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }
    
    res.json(updatedSubtask);
  } catch (error) {
    console.error('Backend error updating subtask:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router
