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
    // Firestore DocumentReference (admin SDK) branch
    if (typeof refOrId.get === 'function' && refOrId.id) {
      const snap = await refOrId.get()
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
  const names = []
  for (const refOrId of assignedTo) {
    const n = await getUserDisplayNameByRefOrId(refOrId)
    if (n) names.push(n)
  }
  return Array.from(new Set(names))
}

// Helper: chunk an array
function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Visibility model:
 * - A user can view ALL tasks that belong to ANY project where the user is assigned to at least one task.
 * - PLUS: The user should always see tasks they CREATED, even if they’re not assigned.
 * - Optional server-side filter by assigned users (IDs) via opts.assignedUserIds
 */
async function getTasksForUser(userId, opts = {}) {
  try {
    console.log(`[TimelineService] Getting timeline for user: ${userId}`)
    const { assignedUserIds = [] } = opts
    const userRef = db.collection('Users').doc(userId)

    const userDoc = await userRef.get()
    const role = (userDoc.exists ? (userDoc.data()?.role || 'staff') : 'staff').toLowerCase()

    // ==== Build project color/title maps ====
    const projectSnap = await db.collection('Projects').get()
    const projectColors = {}
    const projectTitles = new Map()
    projectSnap.docs.forEach((doc, i) => {
      const pdata = doc.data() || {}
      projectColors[doc.id] = colorPalette[i % colorPalette.length]
      projectTitles.set(doc.id, pdata.title || pdata.name || 'Untitled Project')
    })

    // ==== 1) Projects the user is involved in (assigned to any task) ====
    const involvementSnap = await db
      .collection('Tasks')
      .where('assignedTo', 'array-contains', userRef)
      .get()

    // ==== 1b) Projects the user is involved in (CREATED at least one task) ====
    const createdInvolvementSnap = await db
      .collection('Tasks')
      .where('taskCreatedBy', '==', userRef)
      .get()

    // Base: projects from assignment or creation
    let involvedProjectRefs = Array.from(new Set([
      ...involvementSnap.docs.map(d => d.data()?.projectId),
      ...createdInvolvementSnap.docs.map(d => d.data()?.projectId),
    ].filter(ref => ref && typeof ref.get === 'function')))

    // ==== 1c) If MANAGER, include all projects they own ====
    if (role === 'manager') {
      const ownedProjectsSnap = await db
        .collection('Projects')
        .where('owner', '==', userRef)
        .get()
      const ownedRefs = ownedProjectsSnap.empty ? [] : ownedProjectsSnap.docs.map(d => d.ref)
      if (ownedRefs.length) {
        const asSet = new Set(involvedProjectRefs.map(r => r.path))
        ownedRefs.forEach(r => { if (!asSet.has(r.path)) involvedProjectRefs.push(r) })
      }
    }

    // ==== 2) Fetch ALL tasks from those projects (any assignee/creator) ====
    // Firestore 'in' supports up to 10 values; batch if necessary.
    const taskDocs = []
    if (involvedProjectRefs.length) {
      const projectBatches = chunk(involvedProjectRefs, 10)
      for (const batch of projectBatches) {
        const snap = await db.collection('Tasks').where('projectId', 'in', batch).get()
        taskDocs.push(...snap.docs)
      }
    }

    // ==== 3) ALSO include tasks CREATED by the user (even if not assigned / not in involved projects) ====
    const createdSnap = await db
      .collection('Tasks')
      .where('taskCreatedBy', '==', userRef)
      .get()

    // Deduplicate by doc id
    const seenIds = new Set(taskDocs.map(d => d.id))
    createdSnap.docs.forEach(d => {
      if (!seenIds.has(d.id)) {
        taskDocs.push(d)
        seenIds.add(d.id)
      }
    })

    console.log(`[TimelineService] Total tasks after merging project + created: ${taskDocs.length}`)

    // ==== 4) Build response items ====
    const userTasks = []

    for (const docSnap of taskDocs) {
      const data = docSnap.data()
      const assignedTo = data.assignedTo || []

      // Optional server-side filter: assigned user IDs
      if (assignedUserIds.length) {
        const keep = assignedTo.some(ref => {
          const path = ref?.path || ref?._path?.segments?.join('/')
          const id = ref?.id || (Array.isArray(ref?._path?.segments) ? ref._path.segments.at(-1) : null)
          return assignedUserIds.includes(id) || assignedUserIds.some(u => path === `Users/${u}`)
        })
        if (!keep) continue
      }

      const startDate = getSafeDate(data.createdDate, new Date())
      const endDate = getSafeDate(data.deadline, new Date(startDate.getTime() + 3 * 86400000))
      const validEnd = endDate < startDate ? new Date(startDate.getTime() + 86400000) : endDate

      // Normalize project key from DocumentReference/string
      const pid =
        data.projectId?.id ||
        data.projectId?._path?.segments?.at(-1) ||
        (typeof data.projectId === 'string' ? data.projectId : null)

      const projectColor = projectColors[pid] || '#9ca3af'
      const projectTitle = pid ? (projectTitles.get(pid) || 'Untitled Project') : 'No Project'

      // Resolve assignee names for popup/filtering
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
        assigneeNames // array of strings
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
