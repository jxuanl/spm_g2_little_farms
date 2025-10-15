import { db } from "../adminFirebase.js";

const TASK_COLLECTION = "Tasks";


// --- helper: enrich tasks with project/creator/assignee names ---
async function enrichTaskData(task) {
  let projectTitle = 'No project'
  let creatorName = 'No creator'
  let assigneeNames = []

  // === Project title ===
  if (task.projectId) {
    try {
      const projectRef = task.projectId
      const projectSnap = await projectRef.get()
      if (projectSnap.exists)
        projectTitle = projectSnap.data().title || 'Untitled Project'
    } catch (err) {
      console.error('Error loading project:', err)
    }
  }

  // === Creator name ===
  if (task.taskCreatedBy) {
    try {
      const creatorRef = task.taskCreatedBy
      const creatorSnap = await creatorRef.get()
      if (creatorSnap.exists)
        creatorName = creatorSnap.data().name || 'Unnamed Creator'
    } catch (err) {
      console.error('Error loading creator:', err)
    }
  }

  // === Assignee names ===
  if (Array.isArray(task.assignedTo) && task.assignedTo.length > 0) {
    try {
      const names = []
      for (const assignee of task.assignedTo) {
        const userSnap = await assignee.get()
        if (userSnap.exists) names.push(userSnap.data().name || 'Unnamed')
      }
      assigneeNames = names
    } catch (err) {
      console.error('Error loading assignees:', err)
    }
  }

  // ✅ --- Normalize Firestore/Date fields to ISO strings ---
  const normalizeDate = (v) => {
    if (v?.toDate) return v.toDate().toISOString()
    if (v?.seconds || v?._seconds)
      return new Date((v.seconds ?? v._seconds) * 1000).toISOString()
    if (v instanceof Date) return v.toISOString()
    if (typeof v === 'string') return v
    return null
  }

  const deadline = normalizeDate(task.deadline)
  const createdDate = normalizeDate(task.createdDate)
  const modifiedDate = normalizeDate(task.modifiedDate)

  return {
    ...task,
    projectTitle,
    creatorName,
    assigneeNames,
    deadline,
    createdDate,
    modifiedDate,
    creatorId: task.taskCreatedBy?.id || task.taskCreatedBy?._path?.segments?.pop() || null,
  }
}

// --- main service function ---
export async function getTasksForUser(userId) {
  try {
    const userDocRef = db.collection("Users").doc(userId)
    const userDoc = await userDocRef.get()

    if (!userDoc.exists) {
      console.error(`❌ User ${userId} not found`)
      return []
    }

    const userData = userDoc.data()
    const role = (userData.role || "staff").toLowerCase()
    console.log(`👤 User ${userId} role: ${role}`)

    // === Manager → can see all tasks in projects they created ===
    if (role === "manager") {
      console.log(`🔹 Manager access: fetching tasks for projects created by ${userId}`)

      // 1️⃣ Find projects created by this manager
      const projectSnap = await db
        .collection("Projects")
        .where("owner", "==", userDocRef)
        .get()

      if (projectSnap.empty) {
        console.log("⚠️ No projects found for this manager.")
        return []
      }

      const projectIds = projectSnap.docs.map((d) => d.ref)
      console.log(`📁 Found ${projectIds.length} projects for manager.`)

      // 2️⃣ Fetch tasks linked to those projects
      const tasksSnap = await db
        .collection("Tasks")
        .where("projectId", "in", projectIds)
        .get()

      // 3️⃣ Also include tasks they personally created (just in case)
      const createdSnap = await db
        .collection("Tasks")
        .where("taskCreatedBy", "==", userDocRef)
        .get()

      // Merge and deduplicate
      const taskMap = new Map()
      tasksSnap.docs.forEach((d) => taskMap.set(d.id, { id: d.id, ...d.data() }))
      createdSnap.docs.forEach((d) => taskMap.set(d.id, { id: d.id, ...d.data() }))

      const tasks = Array.from(taskMap.values())
      const enriched = await Promise.all(tasks.map(t => enrichTaskData(t)))

      console.log(`✅ Returning ${enriched.length} tasks for manager ${userId}`)
      return enriched
    }

    // === Staff → tasks they created or assigned ===
    console.log("🔹 Staff access: fetching created + assigned tasks")

    const assignedSnap = await db
      .collection("Tasks")
      .where("assignedTo", "array-contains", userDocRef)
      .get()

    const createdSnap = await db
      .collection("Tasks")
      .where("taskCreatedBy", "==", userDocRef)
      .get()

    // --- Merge both query results ---
    const taskMap = new Map()
    assignedSnap.docs.forEach((d) => taskMap.set(d.id, { id: d.id, ...d.data() }))
    createdSnap.docs.forEach((d) => taskMap.set(d.id, { id: d.id, ...d.data() }))

    // ✅ Here's where your new lines go:
    const tasks = Array.from(taskMap.values())
    const enriched = await Promise.all(tasks.map(t => enrichTaskData(t)))
    console.log(`✅ Returning ${enriched.length} staff tasks for user ${userId}`)
    return enriched

  } catch (err) {
    console.error("❌ Error fetching user tasks:", err)
    return []
  }
}

export async function createTask(taskData) {
  try {
    // Convert assignee IDs to Firestore user references
    const assignedToRefs = [];
    if (taskData.assigneeIds && taskData.assigneeIds.length > 0) {
      for (const userId of taskData.assigneeIds) {
        if (userId) { // ✅ Check if userId is not null
          const userDoc = await db.collection('Users').doc(userId).get();
          if (userDoc.exists) {
            assignedToRefs.push(db.collection('Users').doc(userId));
          }
        }
      }
    }
    
    // Convert project ID to Firestore project reference
    let projectRef = null;
    if (taskData.projectId) {
      const projectDoc = await db.collection('Projects').doc(taskData.projectId).get();
      if (projectDoc.exists) {
      projectRef = db.collection('Projects').doc(taskData.projectId);
      }
    }
    
    // Convert creator ID to Firestore user reference
    let taskCreatedByRef = null;
    if (taskData.createdBy) {
      const creatorDoc = await db.collection('Users').doc(taskData.createdBy).get();
      if (creatorDoc.exists) {
      taskCreatedByRef = db.collection('Users').doc(taskData.createdBy);
      }
    }
    
    // Convert date strings to Firestore timestamps
    const createdDate = new Date();
    const deadline = taskData.deadline ? new Date(taskData.deadline) : null;
    
    const newTask = {
      assignedTo: assignedToRefs,
      createdDate: createdDate,
      deadline: deadline,
      description: taskData.description || '',
      isOverdue: false, // Initially false, will be updated by background jobs
      modifiedDate: createdDate,
      priority: taskData.priority || 'medium',
      projectId: projectRef,
      status: taskData.status || 'To Do',
      tags: taskData.tags || [],
      taskCreatedBy: taskCreatedByRef,
      title: taskData.title
    };
    
    const docRef = await db.collection(TASK_COLLECTION).add(newTask);
    return { id: docRef.id, ...newTask };
  } catch (err) {
    console.error("Error creating task:", err);
    throw err;
  }
}

export async function getTaskDetail(taskId, userId) {
  try {
    const taskRef = db.collection('Tasks').doc(taskId)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) return null

    const taskData = taskSnap.data()

    // 🔹 Access control (same logic as list)
    const userRef = db.collection('Users').doc(userId)
    const userDoc = await userRef.get()
    if (!userDoc.exists) return null

    const userData = userDoc.data()
    const role = (userData.role || 'staff').toLowerCase()

    // Staff can view only if assigned or created
    if (role === 'staff') {
      const assigned = (taskData.assignedTo || []).some(
        ref => ref.path === userRef.path
      )
      const createdBy = taskData.taskCreatedBy?.path === userRef.path
      if (!assigned && !createdBy) {
        console.warn(`🚫 Access denied for staff user ${userId} on task ${taskId}`)
        return null
      }
    }

    // Enrich task with names/titles
    const enriched = await enrichTaskData({ id: taskId, ...taskData })
    return enriched
  } catch (err) {
    console.error('❌ Error fetching task detail:', err)
    return null
  }
}

export async function updateTask(taskId, updates) {
  try {
    const taskRef = db.collection(TASK_COLLECTION).doc(taskId)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) {
      throw new Error(`Task ${taskId} not found`)
    }

    const existingTask = taskSnap.data()

    // --- Access control ---
    if (updates.userId) {
      const userRef = db.collection('Users').doc(updates.userId)
      const userSnap = await userRef.get()
      if (!userSnap.exists) throw new Error(`User ${updates.userId} not found`)

      const userData = userSnap.data()
      const role = (userData.role || 'staff').toLowerCase()

      if (role === 'staff') {
        const isCreator = existingTask.taskCreatedBy?.path === userRef.path
        if (!isCreator) {
          throw new Error('Access denied: only the creator can edit this task')
        }
      }
    } else {
      console.warn('⚠️ No userId provided in update request — skipping role check')
    }

    const updateData = {}

    // --- Basic fields ---
    if (typeof updates.title !== 'undefined') updateData.title = updates.title
    if (typeof updates.description !== 'undefined') updateData.description = updates.description
    if (typeof updates.priority !== 'undefined') updateData.priority = updates.priority
    if (typeof updates.status !== 'undefined') updateData.status = updates.status
    if (Array.isArray(updates.tags)) updateData.tags = updates.tags

    // --- Project reference ---
    if (typeof updates.projectId === 'string' && updates.projectId.trim() !== '') {
      updateData.projectId = db.collection('Projects').doc(updates.projectId)
    } else {
      updateData.projectId = null
    }

    // --- Assigned users (array of references) ---
    if (Array.isArray(updates.assignedTo)) {
      updateData.assignedTo = updates.assignedTo
        .filter((uid) => !!uid)
        .map((uid) => db.collection('Users').doc(uid))
    }

    // --- Deadline ---
    if (updates.deadline) {
      updateData.deadline = new Date(updates.deadline)
    } else {
      updateData.deadline = null
    }

    // --- Overdue check ---
    if (updateData.deadline) {
      const now = new Date()
      const isOverdue = now > updateData.deadline && updateData.status !== 'done'
      updateData.isOverdue = isOverdue
    } else {
      updateData.isOverdue = false
    }

    // --- Always update modifiedDate ---
    updateData.modifiedDate = new Date()

    // --- Update document ---
    await taskRef.update(updateData)
    console.log(`✅ Task ${taskId} updated successfully by user ${updates.userId}`)

    return { id: taskId, ...updateData }
  } catch (err) {
    console.error('❌ Error updating task:', err)
    throw err
  }
}

// // ✅ Delete Task (backend-safe)
// export async function deleteTask(taskId) {
//   try {
//     const taskRef = db.collection(TASK_COLLECTION).doc(taskId)
//     await taskRef.delete()
//     console.log(`🗑️ Deleted task ${taskId}`)
//     return { success: true, id: taskId }
//   } catch (err) {
//     console.error('❌ Error deleting task:', err)
//     throw err
//   }
// }

export const taskService = {
  getTasksForUser,
  createTask,
  updateTask,
  // deleteTask,
};


