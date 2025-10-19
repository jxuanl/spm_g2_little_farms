// import express from 'express';
// import deadlineService from '../services/deadlineService.js';

// const router = express.Router();

// router.post('/start-deadline-checker', (req, res) => {
//   try {
//     deadlineService.startDeadlineChecker();
//   } catch (error) {
//     console.error("Failed to start deadline checker:", error);
//     return res.status(500).json({ success: false, message: 'Failed to start deadline checker' });
//   }
// });