import { db } from '../adminFirebase.js'

const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#29E6BD', '#8b5cf6', '#14b8a6', '#ec4899', '#84cc16']

const getSafeDate = (value, fallback) => {
  if (value?.toDate) return value.toDate()
  if (typeof value === 'string' && !isNaN(Date.parse(value))) return new Date(value)
  return fallback
}

async function getUserDisplayNameByRefOrId(refOrId) {
  try {
    if (!refOrId) return null
    if (typeof refOrId === 'string') {
      const doc = await db.collection('Users').doc(refOrId).get()
      const u = doc.exists ? doc.data() : null
      return u?.displayName || u?.name || u?.email || null
    }
    if (refOrId.path) {
      const snap = await db.doc(refOrId.path).get()
      const u = snap.exists ? snap.data() : null
      return u?.displayName || u?.name || u?.email || null
    }
  } catch (e) {
    console.warn('Failed to resolve user name:', e)
  }
  return null
}

async function resolveAssigneeNames(assignedTo) {
  if (!Array.isArray(assignedTo) || !assignedTo.length) return []
  // Resolve sequentially; if you have many, consider Promise.all with small concurrency.
  const names = []
  for (const refOrId of assignedTo) {
    const n = await getUserDisplayNameByRefOrId(refOrId)
    if (n) names.push(n)
  }
  // Deduplicate
  return Array.from(new Set(names))
}

async function getTasksForUser(userId) {
  try {
    console.log(`[TimelineService] Getting tasks for user: ${userId}`)

    // Projects for color/title maps
    const projectSnap = await db.collection('Projects').get()
    const projectColors = {}
    const projectTitles = new Map()
    projectSnap.docs.forEach((doc, i) => {
      const pdata = doc.data() || {}
      projectColors[doc.id] = colorPalette[i % colorPalette.length]
      projectTitles.set(doc.id, pdata.title || pdata.name || 'Untitled Project')
    })

    // Load tasks
    const taskSnap = await db.collection('Tasks').get()
    console.log(`[TimelineService] Total tasks found: ${taskSnap.size}`)

    const userTasks = []

    for (const docSnap of taskSnap.docs) {
      const data = docSnap.data()
      const assignedTo = data.assignedTo || []

      // keep same role filter: only tasks where user is assigned
      const isUserAssigned =
        Array.isArray(assignedTo) &&
        assignedTo.some(ref => (ref?.path || '') === `Users/${userId}` || ref === userId)
      if (!isUserAssigned) continue

      const startDate = getSafeDate(data.createdDate, new Date())
      const endDate = getSafeDate(data.deadline, new Date(startDate.getTime() + 3 * 86400000))
      const validEnd = endDate < startDate ? new Date(startDate.getTime() + 86400000) : endDate

      const pid = data.projectId || null
      const projectColor = projectColors[pid] || '#9ca3af'
      const projectTitle = pid ? (projectTitles.get(pid) || pid) : 'No Project'

      // NEW: resolve assignee names
      const assigneeNames = await resolveAssigneeNames(assignedTo)

      userTasks.push({
        id: docSnap.id,
        name: data.title || 'Untitled Task',
        start: startDate.toISOString().split('T')[0],
        end: validEnd.toISOString().split('T')[0],
        status: data.status || 'Not started',
        color: projectColor,
        projectId: pid,
        projectTitle,
        assigneeNames // <-- used by UI
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
