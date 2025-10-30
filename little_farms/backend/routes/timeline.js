import express from 'express'
import timelineService from '../services/timelineService.js'

const router = express.Router()

// ✅ GET /api/timeline?userId=abc123
router.get('/', async (req, res) => {
  try {
    console.log('🎯 [Timeline] Fetching tasks...')
    const userId = req.query.userId || req.user?.uid

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing userId in request',
      })
    }

    const tasks = await timelineService.getTasksForUser(userId)

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks,
    })
  } catch (error) {
    console.error('❌ [Timeline] Failed to fetch timeline:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timeline data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
})

export default router
