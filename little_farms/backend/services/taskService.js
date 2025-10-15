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

    // === 🟢 HR → can see all tasks across all projects ===
    if (role === "hr") {
      console.log("🔹 HR access: fetching all tasks across all projects")

      const allTasksSnap = await db.collection("Tasks").get()
      const allTasks = allTasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

      // ✅ Enrich tasks (project, creator, assignees)
      const enriched = await Promise.all(allTasks.map((t) => enrichTaskData(t)))
      console.log(`✅ Returning ${enriched.length} tasks for HR ${userId}`)
      return enriched
    }

    // === Manager → can see all tasks in projects they created ===
    if (role === "manager") {
      console.log(`🔹 Manager access: fetching tasks for projects created by ${userId}`)

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

      const tasksSnap = await db
        .collection("Tasks")
        .where("projectId", "in", projectIds)
        .get()

      const createdSnap = await db
        .collection("Tasks")
        .where("taskCreatedBy", "==", userDocRef)
        .get()

      const taskMap = new Map()
      tasksSnap.docs.forEach((d) => taskMap.set(d.id, { id: d.id, ...d.data() }))
      createdSnap.docs.forEach((d) => taskMap.set(d.id, { id: d.id, ...d.data() }))

      const tasks = Array.from(taskMap.values())
      const enriched = await Promise.all(tasks.map((t) => enrichTaskData(t)))

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

    const taskMap = new Map()
    assignedSnap.docs.forEach((d) => taskMap.set(d.id, { id: d.id, ...d.data() }))
    createdSnap.docs.forEach((d) => taskMap.set(d.id, { id: d.id, ...d.data() }))

    const tasks = Array.from(taskMap.values())
    const enriched = await Promise.all(tasks.map((t) => enrichTaskData(t)))
    console.log(`✅ Returning ${enriched.length} staff tasks for user ${userId}`)
    return enriched

  } catch (err) {
    console.error("❌ Error fetching user tasks:", err)
    return []
  }
}

export async function createTask(taskData) {
  try {
    // Check if this is a subtask
    const isSubtask = !!taskData.parentTaskId;
    
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
    
    let docRef;
    
    if (isSubtask) {
      // Create subtask in the parent task's Subtasks subcollection
      docRef = await db.collection(TASK_COLLECTION)
        .doc(taskData.parentTaskId)
        .collection('Subtasks')
        .add(newTask);
    } else {
      // Create regular task
      docRef = await db.collection(TASK_COLLECTION).add(newTask);
    }
    
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

      if (role === 'hr') {
        throw new Error('Access denied: HR users cannot edit tasks')
      }

      if (role === 'staff') {
        const isCreator = existingTask.taskCreatedBy?.path === userRef.path
        if (!isCreator) {
          throw new Error('Access denied: only the creator can edit this task')
        }
      }

      // Managers are allowed to edit — no restriction here
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
        .filter((uid) => typeof uid === 'string' && uid.trim() !== '')
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
//   const taskRef = doc(db, TASK_COLLECTION, taskId);
//   await deleteDoc(taskRef);
// }

export async function getTaskById(taskId) {
  try {
    const taskDoc = await db.collection(TASK_COLLECTION).doc(taskId).get();
    if (!taskDoc.exists) {
      throw new Error(`Task with ID ${taskId} not found`);
    }
    return { id: taskDoc.id, ...taskDoc.data() };
  } catch (err) {
    console.error("Error fetching task by ID:", err);
    throw err;
  }
}

=======
>>>>>>> 3169ca790a75f29712a4e317b4ce51cc91a5bbcf
export async function getSubtasksForTask(taskId) {
  try {
    const snapshot = await db
      .collection(TASK_COLLECTION)
      .doc(taskId)
      .collection('Subtasks')
      .get();
      
    return snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Serialize Firestore references properly
      const serializedData = { ...data };
      
      // Convert projectId reference to include path
      if (data.projectId && data.projectId.path) {
        serializedData.projectId = { path: data.projectId.path };
      }
      
      // Convert taskCreatedBy reference to include path
      console.log('Raw taskCreatedBy data:', data.taskCreatedBy);
      if (data.taskCreatedBy && data.taskCreatedBy.path) {
        serializedData.taskCreatedBy = { path: data.taskCreatedBy.path };
      } else if (data.taskCreatedBy && data.taskCreatedBy._path && data.taskCreatedBy._path.segments) {
        // Handle Firestore DocumentReference format
        const pathString = data.taskCreatedBy._path.segments.join('/');
        console.log('Constructed path from segments:', pathString);
        serializedData.taskCreatedBy = { path: pathString };
      } else if (data.taskCreatedBy) {
        // Handle other reference formats
        console.log('taskCreatedBy exists but no recognizable path format, full object:', data.taskCreatedBy);
        serializedData.taskCreatedBy = data.taskCreatedBy;
      } else {
        console.log('taskCreatedBy is null or undefined');
        serializedData.taskCreatedBy = null;
      }
      
      // Convert assignedTo references to include paths
      if (data.assignedTo && Array.isArray(data.assignedTo)) {
        serializedData.assignedTo = data.assignedTo.map(ref => 
          ref && ref.path ? { path: ref.path } : ref
        );
      }
      
      // Convert Firestore Timestamps to JavaScript Dates for JSON serialization
      return {
        id: doc.id,
        ...serializedData,
        deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
        createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : data.createdDate,
        modifiedDate: data.modifiedDate?.toDate ? data.modifiedDate.toDate() : data.modifiedDate
      };
    });
  } catch (err) {
    console.error("Error fetching subtasks:", err);
    return [];
  }
}

export async function getSubtaskById(taskId, subtaskId) {
  try {
    const doc = await db
      .collection(TASK_COLLECTION)
      .doc(taskId)
      .collection('Subtasks')
      .doc(subtaskId)
      .get();
      
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    
    // Serialize Firestore references properly
    const serializedData = { ...data };
    
    // Convert projectId reference to include path
    if (data.projectId && data.projectId.path) {
      serializedData.projectId = { path: data.projectId.path };
    }
    
    // Convert taskCreatedBy reference to include path
    console.log('Raw taskCreatedBy data:', data.taskCreatedBy);
    if (data.taskCreatedBy && data.taskCreatedBy.path) {
      serializedData.taskCreatedBy = { path: data.taskCreatedBy.path };
    } else if (data.taskCreatedBy && data.taskCreatedBy._path && data.taskCreatedBy._path.segments) {
      // Handle Firestore DocumentReference format
      const pathString = data.taskCreatedBy._path.segments.join('/');
      console.log('Constructed path from segments:', pathString);
      serializedData.taskCreatedBy = { path: pathString };
    } else if (data.taskCreatedBy) {
      // Handle other reference formats
      console.log('taskCreatedBy exists but no recognizable path format, full object:', data.taskCreatedBy);
      serializedData.taskCreatedBy = data.taskCreatedBy;
    } else {
      console.log('taskCreatedBy is null or undefined');
      serializedData.taskCreatedBy = null;
    }
    
    // Convert assignedTo references to include paths
    if (data.assignedTo && Array.isArray(data.assignedTo)) {
      serializedData.assignedTo = data.assignedTo.map(ref => 
        ref && ref.path ? { path: ref.path } : ref
      );
    }
    
    // Convert Firestore Timestamps to JavaScript Dates for JSON serialization
    return {
      id: doc.id,
      ...serializedData,
      deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
      createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : data.createdDate,
      modifiedDate: data.modifiedDate?.toDate ? data.modifiedDate.toDate() : data.modifiedDate
    };
  } catch (err) {
    console.error("Error fetching subtask:", err);
    return null;
  }
}

export async function updateSubtask(taskId, subtaskId, updateData) {
  try {
    const subtaskRef = db
      .collection(TASK_COLLECTION)
      .doc(taskId)
      .collection('Subtasks')
      .doc(subtaskId);
    
    // Check if subtask exists
    const subtaskDoc = await subtaskRef.get();
    if (!subtaskDoc.exists) {
      return null;
    }
    
    // Prepare update data with proper references
    const updatedFields = { ...updateData };
    
    // Convert assignee IDs to Firestore user references if provided
    if (updateData.assignedTo && Array.isArray(updateData.assignedTo)) {
      const assignedToRefs = [];
      for (const userId of updateData.assignedTo) {
        if (userId && userId.trim() !== '') {
          const userDoc = await db.collection('Users').doc(userId).get();
          if (userDoc.exists) {
            assignedToRefs.push(db.collection('Users').doc(userId));
          }
        }
      }
      updatedFields.assignedTo = assignedToRefs;
    }
    
    // Convert project ID to Firestore project reference if provided
    if (updateData.projectId && typeof updateData.projectId === 'string' && updateData.projectId.trim() !== '') {
      const projectDoc = await db.collection('Projects').doc(updateData.projectId).get();
      if (projectDoc.exists) {
        updatedFields.projectId = db.collection('Projects').doc(updateData.projectId);
      }
    } else if (updateData.projectId === null) {
      // Handle explicit null to remove project reference
      updatedFields.projectId = null;
    }
    
    // Convert date strings to proper dates if provided
    if (updateData.deadline) {
      updatedFields.deadline = new Date(updateData.deadline);
    }
    
    // Always update the modified date
    updatedFields.modifiedDate = new Date();
    
    // Update the subtask
    await subtaskRef.update(updatedFields);
    
    // Return the updated subtask
    const updatedDoc = await subtaskRef.get();
    const data = updatedDoc.data();
    return {
      id: updatedDoc.id,
      ...data,
      deadline: data.deadline?.toDate ? data.deadline.toDate() : data.deadline,
      createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : data.createdDate,
      modifiedDate: data.modifiedDate?.toDate ? data.modifiedDate.toDate() : data.modifiedDate
    };
  } catch (err) {
    console.error("Error updating subtask:", err);
    throw err;
  }
}

export const taskService = {
  getTasksForUser,
  createTask,
  getTaskById,
  getSubtasksForTask,
  getSubtaskById,
  updateSubtask,
  updateTask,
  // deleteTask,
};


