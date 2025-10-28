import express from 'express';
import { db } from '../adminFirebase.js';

const router = express.Router();

// GET /api/notifications?userId=<ID>
router.get('/', async (req, res, next) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    // If you saved notifications with field `userId` (recommended)
    const q = db.collection('Notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc'); // may need a Firestore composite index

    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

export default router;
