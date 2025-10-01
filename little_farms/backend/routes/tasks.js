import express from 'express'
import { getTasksForUser } from '../services/taskService.js'

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
    console.error('Error fetching tasks:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
