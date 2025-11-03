import express from 'express'
import { getTasksForUser, createTask, getTaskDetail, updateTask, getSubtasksForTask, getSubtaskById, updateSubtask, completeTask, getAllTasks } from '../services/taskService.js'

const router = express.Router()

router.get('/allTasks', async (req, res) => {
  try {
    const tasks = await getAllTasks();
    
    res.status(200).json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      data: []
    });
  }
});


// GET /api/tasks/:id?userId=abc123  (must come first)
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
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch task detail',
    })
  }
})

// GET /api/tasks?userId=xxx (list)
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId' })
    }
    const tasks = await getTasksForUser(userId) // now includes assigneeNames
    return res.status(200).json({ success: true, tasks })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
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
      parentTaskId, // Optional: ID of parent task if this is a subtask
      recurring,           // Add recurrence fields
      recurrenceInterval,
      recurrenceValue
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

    // Validate recurrence fields if recurring is true
    if (recurring) {
      if (!recurrenceInterval || !['days', 'weeks', 'months'].includes(recurrenceInterval)) {
        return res.status(400).json({
          error: 'Valid recurrence interval (days, weeks, or months) is required for recurring tasks'
        });
      }
      if (!recurrenceValue || recurrenceValue < 1) {
        return res.status(400).json({
          error: 'Recurrence value must be at least 1'
        });
      }
      if (!deadline) {
        return res.status(400).json({
          error: 'Deadline is required for recurring tasks'
        });
      }
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
      parentTaskId,
      recurring: recurring || false,
      recurrenceInterval: recurring ? recurrenceInterval : null,
      recurrenceValue: recurring ? recurrenceValue : null
    };

    const newTask = await createTask(taskData);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body

    // Validate recurrence fields if recurring is being enabled
    if (updates.recurring) {
      if (!updates.recurrenceInterval || !['days', 'weeks', 'months'].includes(updates.recurrenceInterval)) {
        return res.status(400).json({
          success: false,
          message: 'Valid recurrence interval (days, weeks, or months) is required for recurring tasks'
        });
      }
      if (!updates.recurrenceValue || updates.recurrenceValue < 1) {
        return res.status(400).json({
          success: false,
          message: 'Recurrence value must be at least 1'
        });
      }
    }

    const updatedTask = await updateTask(id, updates)
    res.status(200).json({ success: true, task: updatedTask })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update task' })
  }
})

// POST /api/tasks/:id/complete - Complete task
router.post('/:id/complete', async (req, res) => {
  try {
    const { userId } = req.body
    const result = await completeTask(req.params.id, userId)
    res.status(200).json(result)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to complete task' })
  }
})

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
    res.status(500).json({ error: error.message });
  }
});

export default router
