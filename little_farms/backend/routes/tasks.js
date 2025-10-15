import express from 'express'
import { getTasksForUser, createTask, getTaskDetail, updateTask } from '../services/taskService.js'

const router = express.Router()

// ✅ GET /api/tasks/:id?userId=abc123  (must come first)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.query

    if (!id || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing task ID or userId',
      })
    }

    const task = await getTaskDetail(id, userId)
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or access denied',
      })
    }

    return res.status(200).json({ success: true, task })
  } catch (error) {
    console.error('❌ Error fetching task detail:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch task detail',
    })
  }
})

// ✅ GET /api/tasks?userId=xxx (list)
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId
    if (!userId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing userId' })
    }

    const tasks = await getTasksForUser(userId)
    return res.status(200).json({ success: true, tasks })
  } catch (error) {
    console.error('Backend error fetching tasks:', error)
    return res
      .status(500)
      .json({ success: false, message: error.message })
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
      tags
    };

    const newTask = await createTask(taskData);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const updatedTask = await updateTask(id, updates)
    res.status(200).json({ success: true, task: updatedTask })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update task' })
  }
})

export default router
