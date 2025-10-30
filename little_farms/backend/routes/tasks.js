import express from 'express'
import { db } from '../adminFirebase.js'
import { getTasksForUser, createTask, getTaskDetail, updateTask, getSubtasksForTask, getSubtaskById, updateSubtask, completeTask, getAllTasks, getCommentsForTask, createComment, updateComment, deleteComment } from '../services/taskService.js'

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
    console.error('Error in /allTasks route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
      data: []
    });
  }
});


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
      return res.status(400).json({ success: false, message: 'Missing userId' })
    }
    const tasks = await getTasksForUser(userId) // now includes assigneeNames
    return res.status(200).json({ success: true, tasks })
  } catch (error) {
    console.error('Backend error fetching tasks:', error)
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
    console.error('Error creating task:', error);
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
    console.error('Error completing task:', err)
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

// === Comments Routes ===

// GET /api/tasks/:taskId/comments - Get comments for a regular task
router.get('/:taskId/comments', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId' });
    }
    
    const comments = await getCommentsForTask(taskId);
    res.json(comments);
  } catch (error) {
    console.error('Backend error fetching comments:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:taskId/subtasks/:subtaskId/comments - Get comments for a subtask
router.get('/:taskId/subtasks/:subtaskId/comments', async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    
    if (!taskId || !subtaskId) {
      return res.status(400).json({ error: 'Missing taskId or subtaskId' });
    }
    
    const comments = await getCommentsForTask(taskId, subtaskId);
    res.json(comments);
  } catch (error) {
    console.error('Backend error fetching subtask comments:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:taskId/comments - Create a comment for a regular task
router.post('/:taskId/comments', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content, authorId, mentionedUsers } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId' });
    }
    
    if (!content || !authorId) {
      return res.status(400).json({ error: 'Missing required fields: content and authorId' });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    const commentData = { content, authorId, mentionedUsers: mentionedUsers || [] };
    const newComment = await createComment(taskId, commentData);
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Backend error creating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:taskId/subtasks/:subtaskId/comments - Create a comment for a subtask
router.post('/:taskId/subtasks/:subtaskId/comments', async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    const { content, authorId, mentionedUsers } = req.body;
    
    if (!taskId || !subtaskId) {
      return res.status(400).json({ error: 'Missing taskId or subtaskId' });
    }
    
    if (!content || !authorId) {
      return res.status(400).json({ error: 'Missing required fields: content and authorId' });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    const commentData = { content, authorId, mentionedUsers: mentionedUsers || [] };
    const newComment = await createComment(taskId, commentData, subtaskId);
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Backend error creating subtask comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add authorization helper function
const verifyCommentAuthor = async (taskId, commentId, userId, subtaskId = null) => {
  try {
    let commentRef;
    if (subtaskId) {
      commentRef = db.collection('Tasks').doc(taskId).collection('Subtasks').doc(subtaskId).collection('Comments').doc(commentId);
    } else {
      commentRef = db.collection('Tasks').doc(taskId).collection('Comments').doc(commentId);
    }
    
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return { authorized: false, error: 'Comment not found' };
    }
    
    const commentData = commentDoc.data();
    
    // Extract author ID from the reference
    let authorId = null;
    if (commentData.author?.path) {
      authorId = commentData.author.path.split('/')[1]; // Extract ID from "Users/userId" path
    } else if (commentData.author?.id) {
      authorId = commentData.author.id;
    }
    
    console.log('Comment author ID:', authorId, 'Requesting user ID:', userId);
    
    if (authorId !== userId) {
      return { authorized: false, error: 'Unauthorized: You can only edit your own comments' };
    }
    
    return { authorized: true };
  } catch (error) {
    console.error('Authorization check failed:', error);
    return { authorized: false, error: 'Authorization check failed' };
  }
};

// Update PUT route for regular task comments
router.put('/:taskId/comments/:commentId', async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { content, userId } = req.body;
    
    if (!taskId || !commentId) {
      return res.status(400).json({ error: 'Missing taskId or commentId' });
    }
    
    if (!content || !userId) {
      return res.status(400).json({ error: 'Missing content or userId' });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    // ✅ CHECK IF COMMENT EXISTS FIRST
    const commentRef = db.collection('Tasks').doc(taskId).collection('Comments').doc(commentId);
    const commentDoc = await commentRef.get();
    
    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // ✅ THEN CHECK AUTHORIZATION
    const authCheck = await verifyCommentAuthor(taskId, commentId, userId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    const updateData = { content };
    const updatedComment = await updateComment(taskId, commentId, updateData);
    
    res.json(updatedComment);
  } catch (error) {
    console.error('Backend error updating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update PUT route for subtask comments
router.put('/:taskId/subtasks/:subtaskId/comments/:commentId', async (req, res) => {
  try {
    const { taskId, subtaskId, commentId } = req.params;
    const { content, userId } = req.body;
    
    if (!taskId || !subtaskId || !commentId) {
      return res.status(400).json({ error: 'Missing taskId, subtaskId, or commentId' });
    }
    
    if (!content || !userId) {
      return res.status(400).json({ error: 'Missing content or userId' });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    // ✅ CHECK IF COMMENT EXISTS FIRST
    const commentRef = db.collection('Tasks').doc(taskId)
      .collection('Subtasks').doc(subtaskId)
      .collection('Comments').doc(commentId);
    const commentDoc = await commentRef.get();
    
    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // ✅ THEN CHECK AUTHORIZATION
    const authCheck = await verifyCommentAuthor(taskId, commentId, userId, subtaskId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    const updateData = { content };
    const updatedComment = await updateComment(taskId, commentId, updateData, subtaskId);
    
    res.json(updatedComment);
  } catch (error) {
    console.error('Backend error updating subtask comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update DELETE route for regular task comments
router.delete('/:taskId/comments/:commentId', async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { userId } = req.body;
    
    if (!taskId || !commentId || !userId) {
      return res.status(400).json({ error: 'Missing taskId, commentId, or userId' });
    }
    
    // ✅ CHECK IF COMMENT EXISTS FIRST
    const commentRef = db.collection('Tasks').doc(taskId).collection('Comments').doc(commentId);
    const commentDoc = await commentRef.get();
    
    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // ✅ THEN CHECK AUTHORIZATION
    const authCheck = await verifyCommentAuthor(taskId, commentId, userId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    const deleted = await deleteComment(taskId, commentId);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Backend error deleting comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update DELETE route for subtask comments
router.delete('/:taskId/subtasks/:subtaskId/comments/:commentId', async (req, res) => {
  try {
    const { taskId, subtaskId, commentId } = req.params;
    const { userId } = req.body;
    
    if (!taskId || !subtaskId || !commentId || !userId) {
      return res.status(400).json({ error: 'Missing taskId, subtaskId, commentId, or userId' });
    }
    
    // ✅ CHECK IF COMMENT EXISTS FIRST
    const commentRef = db.collection('Tasks').doc(taskId)
      .collection('Subtasks').doc(subtaskId)
      .collection('Comments').doc(commentId);
    const commentDoc = await commentRef.get();
    
    if (!commentDoc.exists) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // ✅ THEN CHECK AUTHORIZATION
    const authCheck = await verifyCommentAuthor(taskId, commentId, userId, subtaskId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    const deleted = await deleteComment(taskId, commentId, subtaskId);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Backend error deleting subtask comment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router
