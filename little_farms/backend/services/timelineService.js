import { db } from '../adminFirebase.js'

const colorPalette = [
  '#3b82f6', '#10b981', '#f59e0b', '#29E6BD',
  '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16'
]

const getSafeDate = (value, fallback) => {
  if (value?.toDate) return value.toDate()
  if (typeof value === 'string' && !isNaN(Date.parse(value))) return new Date(value)
  return fallback
}

async function getTasksForUser(userId) {
  try {
    console.log(`[TimelineService] Getting tasks for user: ${userId}`)

    // --- Get all projects (for color assignment)
    const projectSnap = await db.collection('Projects').get()
    const projectColors = {}
    projectSnap.docs.forEach((doc, i) => {
      projectColors[doc.id] = colorPalette[i % colorPalette.length]
    })

    // --- Fetch all tasks
    const taskSnap = await db.collection('Tasks').get()
    console.log(`[TimelineService] Total tasks found: ${taskSnap.size}`)

    const userTasks = []

    for (const docSnap of taskSnap.docs) {
      const data = docSnap.data()
      const assignedTo = data.assignedTo || []

      // 🔒 only include tasks where this user is assigned
      const isUserAssigned =
        Array.isArray(assignedTo) &&
        assignedTo.some(ref => ref.path === `Users/${userId}`)

      if (!isUserAssigned) continue

      const startDate = getSafeDate(data.createdDate, new Date())
      const endDate = getSafeDate(data.deadline, new Date(startDate.getTime() + 3 * 86400000))
      const validEnd = endDate < startDate ? new Date(startDate.getTime() + 86400000) : endDate

      const projectColor = projectColors[data.projectId] || '#9ca3af'

      userTasks.push({
        id: docSnap.id,
        name: data.title || 'Untitled Task',
        start: startDate.toISOString().split('T')[0],
        end: validEnd.toISOString().split('T')[0],
        status: data.status || 'Not started',
        color: projectColor,
        projectId: data.projectId || null,
      })
    }

    console.log(`[TimelineService] Returning ${userTasks.length} tasks for user.`)
    return userTasks
  } catch (error) {
    console.error('[TimelineService] Error fetching tasks:', error)
    throw error
  }
}

export default { getTasksForUser }
