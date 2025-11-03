// routes/notifications.js
import express from 'express';
import admin from 'firebase-admin';
import {
  getNotifications,
  acknowledgeNotification,
  handleManagerTaskUpdate,
  sendDailyDigest
} from '../services/notificationService.js';
import {getTasksforDailyDigest} from '../services/reportDataService.js';

const router = express.Router();

// Middleware: verify Firebase ID token
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;
    if (!token) return res.status(401).json({ error: 'Missing or invalid Authorization header' });

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// ==============================
// ROUTES
// ==============================

// GET /api/notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const items = await getNotifications(req.user.uid);
    res.json({ items });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/notifications/:id/acknowledge
router.patch('/:id/acknowledge', verifyToken, async (req, res) => {
  try {
    const result = await acknowledgeNotification(req.params.id, req.user.uid);
    res.json(result);
  } catch (err) {
    if (err.message === 'Notification not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Forbidden') return res.status(403).json({ error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/update/tasks/manager
router.post('/update/tasks/manager', async (req, res) => {
  /*
  Expected body in req.body:
  {
    "id": "",
    "userId": "",
    "changes" : {}
  }
  */
  try {
    const result = await handleManagerTaskUpdate(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in /update/tasks/manager:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications/daily-digest (expect userId in body)
router.post('/daily-digest', async (req, res) => {
  const {userId} = req.body;
  const detailedTasks = await getTasksforDailyDigest(userId);
  try {
    const response = await sendDailyDigest(userId, detailedTasks);
    if (response.error) {
      throw new Error(response.error);
    }
    // console.log("Daily digest email sent successfully!");
  } catch (error) {
    console.error('Error getting tasks by user with details:', error);
    throw error;
  } finally {
    res.status(200).json({ message: "Daily digest process completed" });
  }
});

// POST /api/notifications/update/comment -> send to this, and wait for response
router.post('/update/comment', async (req, res) => {
  
  /*
  Expected body in req.body:
  {
    "taskId": "",
    "taskName": "",
    "commentText": "",
    "commenterName": "",
    "personsIdInvolved": []
    "timestamp": Date.now()
  }
  */
})

export default router;
