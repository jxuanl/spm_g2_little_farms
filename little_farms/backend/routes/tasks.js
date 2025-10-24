import express from 'express'
import { getTasksForUser, createTask, getSubtasksForTask, getSubtaskById, updateSubtask, getCommentsForTask, createComment, updateComment, deleteComment } from '../services/taskService.js'

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
    const { content, authorId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId' });
    }
    
    if (!content || !authorId) {
      return res.status(400).json({ error: 'Missing required fields: content and authorId' });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    const commentData = { content, authorId };
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
    const { content, authorId } = req.body;
    
    if (!taskId || !subtaskId) {
      return res.status(400).json({ error: 'Missing taskId or subtaskId' });
    }
    
    if (!content || !authorId) {
      return res.status(400).json({ error: 'Missing required fields: content and authorId' });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    const commentData = { content, authorId };
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
    
    // Check authorization
    const authCheck = await verifyCommentAuthor(taskId, commentId, userId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    const updateData = { content };
    const updatedComment = await updateComment(taskId, commentId, updateData);
    
    if (!updatedComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
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
    
    // Check authorization
    const authCheck = await verifyCommentAuthor(taskId, commentId, userId, subtaskId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    const updateData = { content };
    const updatedComment = await updateComment(taskId, commentId, updateData, subtaskId);
    
    if (!updatedComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
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
    
    // Check authorization
    const authCheck = await verifyCommentAuthor(taskId, commentId, userId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    const deleted = await deleteComment(taskId, commentId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
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
    
    // Check authorization
    const authCheck = await verifyCommentAuthor(taskId, commentId, userId, subtaskId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    const deleted = await deleteComment(taskId, commentId, subtaskId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Backend error deleting subtask comment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router
