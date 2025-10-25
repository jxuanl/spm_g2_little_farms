import express from 'express';
import {
  getAllLoggedTime,
  getLoggedTimeById,
  getLoggedTimeWithDetails,
  getLoggedTimeWithDetailsByProject,
  getLoggedTimeWithDetailsByDepartment,
  createLoggedTime,
  updateLoggedTime,
  deleteLoggedTime
} from '../services/loggedTimeService.js';

const router = express.Router();

// Get all logged time entries
router.get('/', async (req, res) => {
  try {
    const loggedTimeEntries = await getAllLoggedTime();
    res.json(loggedTimeEntries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all logged time entries with full details
router.get('/details', async (req, res) => {
  try {
    const loggedTimeEntries = await getLoggedTimeWithDetails();
    res.json(loggedTimeEntries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/details/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const loggedTimeEntries = await getLoggedTimeWithDetailsByProject(projectId);
    res.json(loggedTimeEntries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logged time entries with details by department
router.get('/details/department/:department', async (req, res) => {
  try {
    const { department } = req.params;
    const loggedTimeEntries = await getLoggedTimeWithDetailsByDepartment(department);
    res.json(loggedTimeEntries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logged time entry by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const loggedTimeEntry = await getLoggedTimeById(id);
    res.json(loggedTimeEntry);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get logged time entries by user
// router.get('/user/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const loggedTimeEntries = await getLoggedTimeByUser(userId);
//     res.json(loggedTimeEntries);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Get logged time entries by task
// router.get('/task/:taskId', async (req, res) => {
//   try {
//     const { taskId } = req.params;
//     const loggedTimeEntries = await getLoggedTimeByTask(taskId);
//     res.json(loggedTimeEntries);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });


// Create a new logged time entry
router.post('/', async (req, res) => {
  try {
    const loggedTimeData = req.body;
    const newEntry = await createLoggedTime(loggedTimeData);
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a logged time entry ~ not tested
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const updatedEntry = await updateLoggedTime(id, updatedData);
    res.json(updatedEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a logged time entry ~ not tested
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteLoggedTime(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;