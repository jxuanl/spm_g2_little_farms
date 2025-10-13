// import express from 'express';
// import { getFirestore } from 'firebase-admin/firestore';

// const router = express.Router();
// const db = getFirestore();

// // GET all tasks for Gantt
// router.get('/', async (req, res) => {
//   try {
//     const snapshot = await db.collection('Tasks').get();
//     const tasks = snapshot.docs.map(doc => {
//       const data = doc.data();
//       return {
//         id: doc.id,
//         name: data.title || 'Untitled Task',
//         start: data.createdDate?.toDate?.()?.toISOString().split('T')[0],
//         end: data.deadline?.toDate?.()?.toISOString().split('T')[0],
//         priority: data.priority || 'no priority',
//       };
//     });
//     res.json({ success: true, data: tasks });
//   } catch (err) {
//     console.error('Error fetching timeline data:', err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// export default router;
