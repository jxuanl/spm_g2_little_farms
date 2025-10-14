import express from 'express'
import { getTasksForUser, createTask, getSubtasksForTask, getSubtaskById, updateSubtask, getNotesForTask, createNote, updateNote, deleteNote } from '../services/taskService.js'

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

// === Notes Routes ===

// GET /api/tasks/:taskId/notes - Get notes for a regular task
router.get('/:taskId/notes', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId' });
    }
    
    const notes = await getNotesForTask(taskId);
    res.json(notes);
  } catch (error) {
    console.error('Backend error fetching notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/:taskId/subtasks/:subtaskId/notes - Get notes for a subtask
router.get('/:taskId/subtasks/:subtaskId/notes', async (req, res) => {
  try {
    const { taskId, subtaskId } = req.params;
    
    if (!taskId || !subtaskId) {
      return res.status(400).json({ error: 'Missing taskId or subtaskId' });
    }
    
    const notes = await getNotesForTask(taskId, subtaskId);
    res.json(notes);
  } catch (error) {
    console.error('Backend error fetching subtask notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:taskId/notes - Create a note for a regular task
router.post('/:taskId/notes', async (req, res) => {
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
    
    const noteData = { content, authorId };
    const newNote = await createNote(taskId, noteData);
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Backend error creating note:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:taskId/subtasks/:subtaskId/notes - Create a note for a subtask
router.post('/:taskId/subtasks/:subtaskId/notes', async (req, res) => {
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
    
    const noteData = { content, authorId };
    const newNote = await createNote(taskId, noteData, subtaskId);
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Backend error creating subtask note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add authorization helper function
const verifyNoteAuthor = async (taskId, noteId, userId, subtaskId = null) => {
  try {
    let noteRef;
    if (subtaskId) {
      noteRef = db.collection('Tasks').doc(taskId).collection('Subtasks').doc(subtaskId).collection('Notes').doc(noteId);
    } else {
      noteRef = db.collection('Tasks').doc(taskId).collection('Notes').doc(noteId);
    }
    
    const noteDoc = await noteRef.get();
    if (!noteDoc.exists) {
      return { authorized: false, error: 'Note not found' };
    }
    
    const noteData = noteDoc.data();
    
    // Extract author ID from the reference
    let authorId = null;
    if (noteData.author?.path) {
      authorId = noteData.author.path.split('/')[1]; // Extract ID from "Users/userId" path
    } else if (noteData.author?.id) {
      authorId = noteData.author.id;
    }
    
    console.log('Note author ID:', authorId, 'Requesting user ID:', userId);
    
    if (authorId !== userId) {
      return { authorized: false, error: 'Unauthorized: You can only edit your own notes' };
    }
    
    return { authorized: true };
  } catch (error) {
    console.error('Authorization check failed:', error);
    return { authorized: false, error: 'Authorization check failed' };
  }
};

// Update PUT route for regular task notes
router.put('/:taskId/notes/:noteId', async (req, res) => {
  try {
    const { taskId, noteId } = req.params;
    const { content, userId } = req.body;
    
    if (!taskId || !noteId) {
      return res.status(400).json({ error: 'Missing taskId or noteId' });
    }
    
    if (!content || !userId) {
      return res.status(400).json({ error: 'Missing content or userId' });
    }
    
    // Check authorization
    const authCheck = await verifyNoteAuthor(taskId, noteId, userId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    const updateData = { content };
    const updatedNote = await updateNote(taskId, noteId, updateData);
    
    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(updatedNote);
  } catch (error) {
    console.error('Backend error updating note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update PUT route for subtask notes
router.put('/:taskId/subtasks/:subtaskId/notes/:noteId', async (req, res) => {
  try {
    const { taskId, subtaskId, noteId } = req.params;
    const { content, userId } = req.body;
    
    if (!taskId || !subtaskId || !noteId) {
      return res.status(400).json({ error: 'Missing taskId, subtaskId, or noteId' });
    }
    
    if (!content || !userId) {
      return res.status(400).json({ error: 'Missing content or userId' });
    }
    
    // Check authorization
    const authCheck = await verifyNoteAuthor(taskId, noteId, userId, subtaskId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }
    
    const updateData = { content };
    const updatedNote = await updateNote(taskId, noteId, updateData, subtaskId);
    
    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(updatedNote);
  } catch (error) {
    console.error('Backend error updating subtask note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update DELETE route for regular task notes
router.delete('/:taskId/notes/:noteId', async (req, res) => {
  try {
    const { taskId, noteId } = req.params;
    const { userId } = req.body;
    
    if (!taskId || !noteId || !userId) {
      return res.status(400).json({ error: 'Missing taskId, noteId, or userId' });
    }
    
    // Check authorization
    const authCheck = await verifyNoteAuthor(taskId, noteId, userId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    const deleted = await deleteNote(taskId, noteId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Backend error deleting note:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update DELETE route for subtask notes
router.delete('/:taskId/subtasks/:subtaskId/notes/:noteId', async (req, res) => {
  try {
    const { taskId, subtaskId, noteId } = req.params;
    const { userId } = req.body;
    
    if (!taskId || !subtaskId || !noteId || !userId) {
      return res.status(400).json({ error: 'Missing taskId, subtaskId, noteId, or userId' });
    }
    
    // Check authorization
    const authCheck = await verifyNoteAuthor(taskId, noteId, userId, subtaskId);
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.error });
    }
    
    const deleted = await deleteNote(taskId, noteId, subtaskId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Backend error deleting subtask note:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router
