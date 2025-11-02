import admin, { db } from "../adminFirebase.js";

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
        .filter((t) => t.isCurrentInstance !== false); // show only current instance

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
        .filter((t) => t.isCurrentInstance !== false); // show only current instance
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
      .filter((t) => t.isCurrentInstance !== false); // show only current instance
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
    let projectDoc = null;
    if (taskData.projectId) {
      projectDoc = await db.collection('Projects').doc(taskData.projectId).get();
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
      title: taskData.title,
      recurring: taskData.recurring || false,
      recurrenceInterval: taskData.recurrenceInterval || null, // 'days', 'weeks', 'months'
      recurrenceValue: taskData.recurrenceValue || 1, // integer, e.g., every 2 weeks
      isCurrentInstance: true,
      parentTaskId: taskData.parentTaskId || null // reference to original task if subtask
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
      
      // ✅ Add task to project's taskList if task has a projectId
      if (projectDoc && projectDoc.exists) {
        const taskRef = db.collection(TASK_COLLECTION).doc(docRef.id);
        await projectDoc.ref.update({
          taskList: admin.firestore.FieldValue.arrayUnion(taskRef)
        });
        console.log(`✅ Added task ${docRef.id} to project ${taskData.projectId}'s taskList`);
      }
    }
    
    return { id: docRef.id, ...newTask };
  } catch (err) {
    console.error("Error creating task:", err);
    throw err;
  }
}

export async function getTaskDetail(taskId, userId) {
  try {
    const taskRef = db.collection(TASK_COLLECTION).doc(taskId)
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
    
    // Clear isNewInstance flag when task is viewed
    if (taskData.isNewInstance === true) {
      await taskRef.update({ isNewInstance: false })
      enriched.isNewInstance = true // Still return true so the UI can show the indicator initially
      // After this fetch, the flag is cleared so it won't show again on subsequent views
    }
    
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

    // --- Basic fields (exclude id field) ---
    if (typeof updates.title !== 'undefined') updateData.title = updates.title
    if (typeof updates.description !== 'undefined') updateData.description = updates.description
    if (typeof updates.priority !== 'undefined') updateData.priority = updates.priority
    if (typeof updates.status !== 'undefined' && updates.status !== null) {
      // Normalize status: map 'done' to 'Done' for consistency
      const statusMap = {
        'todo': 'To Do',
        'in-progress': 'In Progress',
        'review': 'In Review',
        'done': 'Done'
      }
      updateData.status = statusMap[updates.status] || updates.status
    }
    if (Array.isArray(updates.tags)) updateData.tags = updates.tags

    // --- Recurrence fields ---
    if (typeof updates.recurring !== 'undefined') {
      updateData.recurring = updates.recurring
      
      // If disabling recurring, clear recurrence fields
      if (!updates.recurring) {
        updateData.recurrenceInterval = null
        updateData.recurrenceValue = null
      } else {
        // If enabling recurring, validate fields
        if (!updates.recurrenceInterval && !existingTask.recurrenceInterval) {
          throw new Error('Recurrence interval is required for recurring tasks')
        }
        if (!updates.recurrenceValue && !existingTask.recurrenceValue) {
          throw new Error('Recurrence value is required for recurring tasks')
        }
        if (!updateData.deadline && !existingTask.deadline) {
          throw new Error('Deadline is required for recurring tasks')
        }
      }
    }

    if (typeof updates.recurrenceInterval !== 'undefined') {
      if (updates.recurrenceInterval && !['days', 'weeks', 'months'].includes(updates.recurrenceInterval)) {
        throw new Error('Recurrence interval must be days, weeks, or months')
      }
      updateData.recurrenceInterval = updates.recurrenceInterval
    }

    if (typeof updates.recurrenceValue !== 'undefined') {
      const value = Number(updates.recurrenceValue)
      if (updates.recurrenceValue && (isNaN(value) || value < 1)) {
        throw new Error('Recurrence value must be a number >= 1')
      }
      updateData.recurrenceValue = updates.recurrenceValue
    }

    // --- Project reference ---
    if (typeof updates.projectId === 'string' && updates.projectId.trim() !== '') {
      updateData.projectId = db.collection('Projects').doc(updates.projectId)
    } else if (updates.projectId === null) {
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
    } else if (updates.deadline === null) {
      updateData.deadline = null
    }

    // --- Overdue check ---
    if (updateData.deadline) {
      const now = new Date()
      const isOverdue = now > updateData.deadline && updateData.status !== 'Done' && updateData.status !== 'done'
      updateData.isOverdue = isOverdue
    } else {
      updateData.isOverdue = false
    }

    // --- Always update modifiedDate ---
    updateData.modifiedDate = new Date()

    // --- Check if status is being changed to Done for a recurring task ---
    const statusChanged = typeof updates.status !== 'undefined'
    // Use normalized status from updateData if available, otherwise check raw updates.status
    const normalizedStatus = updateData.status || updates.status
    const isChangingToDone = statusChanged && (normalizedStatus === 'Done' || updates.status === 'Done' || updates.status === 'done')
    const wasNotDone = existingTask.status !== 'Done' && existingTask.status !== 'done'
    const isRecurring = existingTask.recurring && existingTask.recurrenceInterval && existingTask.recurrenceValue

    if (isChangingToDone && wasNotDone && isRecurring) {
      // Mark current task as done and hide it from current instances
      updateData.isCurrentInstance = false
      
      // After updating, create the next instance
      await taskRef.update(updateData)
      
      const now = new Date()
      let baseDate
      
      // Get the original deadline
      if (existingTask.deadline && existingTask.deadline.toDate) {
        baseDate = existingTask.deadline.toDate()
      } else if (existingTask.deadline instanceof Date) {
        baseDate = new Date(existingTask.deadline)
      } else {
        baseDate = now
      }

      // Check if task is overdue - if so, start from now instead of old deadline
      let nextDeadline
      if (baseDate < now) {
        // Task was overdue - start interval from now
        nextDeadline = new Date(now)
      } else {
        // Task completed on time - start from original deadline
        nextDeadline = new Date(baseDate)
      }

      // Calculate next deadline based on interval
      switch (existingTask.recurrenceInterval) {
        case 'days':
          nextDeadline.setDate(nextDeadline.getDate() + existingTask.recurrenceValue)
          break
        case 'weeks':
          nextDeadline.setDate(nextDeadline.getDate() + (7 * existingTask.recurrenceValue))
          break
        case 'months':
          nextDeadline.setMonth(nextDeadline.getMonth() + existingTask.recurrenceValue)
          break
        default:
          console.error('Invalid recurrence interval:', existingTask.recurrenceInterval)
          return { id: taskId, ...updateData }
      }

      // Create new task instance with isNewInstance flag
      const newTask = {
        assignedTo: existingTask.assignedTo || [],
        createdDate: now,
        deadline: nextDeadline,
        description: existingTask.description || '',
        isOverdue: false,
        modifiedDate: now,
        priority: existingTask.priority || 'medium',
        projectId: existingTask.projectId || null,
        status: 'To Do',
        tags: existingTask.tags || [],
        taskCreatedBy: existingTask.taskCreatedBy || null,
        title: existingTask.title,
        recurring: true,
        recurrenceInterval: existingTask.recurrenceInterval,
        recurrenceValue: existingTask.recurrenceValue,
        isCurrentInstance: true,
        isNewInstance: true, // Mark as new instance
        parentTaskId: existingTask.parentTaskId || null
      }

      const newTaskDocRef = await db.collection(TASK_COLLECTION).add(newTask)
      console.log(`✅ Created new recurring task instance with deadline: ${nextDeadline.toISOString()}`)
      
      // ✅ Add new recurring instance to project's taskList if task has a projectId
      if (existingTask.projectId) {
        try {
          // Get project reference from task's projectId
          let projectRef;
          if (existingTask.projectId.path) {
            // projectId is already a DocumentReference
            projectRef = existingTask.projectId;
          } else if (existingTask.projectId.id) {
            // projectId is an object with an id field
            projectRef = db.collection('Projects').doc(existingTask.projectId.id);
          } else {
            // Assume it's a string ID
            projectRef = db.collection('Projects').doc(existingTask.projectId);
          }
          
          const newTaskRef = db.collection(TASK_COLLECTION).doc(newTaskDocRef.id);
          await projectRef.update({
            taskList: admin.firestore.FieldValue.arrayUnion(newTaskRef)
          });
          console.log(`✅ Added recurring task ${newTaskDocRef.id} to project's taskList`);
        } catch (err) {
          console.error('Error adding recurring task to project taskList:', err);
          // Don't throw - this is not critical enough to fail the entire operation
        }
      }
    } else {
      // Normal update (no recurring task completion)
      await taskRef.update(updateData)
    }

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

export async function completeTask(taskId, userId) {
  try {
    const taskRef = db.collection(TASK_COLLECTION).doc(taskId);
    const taskSnap = await taskRef.get();
    
    if (!taskSnap.exists) {
      throw new Error('Task not found');
    }

    const taskData = taskSnap.data();
    const now = new Date();

    // Mark current task as done and hide it from current instances
    await taskRef.update({ 
      status: 'Done', 
      isCurrentInstance: false, 
      modifiedDate: now 
    });

    // If recurring, create next instance
    if (taskData.recurring && taskData.recurrenceInterval && taskData.recurrenceValue) {
      let baseDate;
      
      // Get the original deadline
      if (taskData.deadline && taskData.deadline.toDate) {
        baseDate = taskData.deadline.toDate();
      } else if (taskData.deadline instanceof Date) {
        baseDate = new Date(taskData.deadline);
      } else {
        baseDate = now;
      }

      // Check if task is overdue - if so, start from now instead of old deadline
      let nextDeadline;
      if (baseDate < now) {
        // Task was overdue - start interval from now
        nextDeadline = new Date(now);
      } else {
        // Task completed on time - start from original deadline
        nextDeadline = new Date(baseDate);
      }

      // Calculate next deadline based on interval
      switch (taskData.recurrenceInterval) {
        case 'days':
          nextDeadline.setDate(nextDeadline.getDate() + taskData.recurrenceValue);
          break;
        case 'weeks':
          nextDeadline.setDate(nextDeadline.getDate() + (7 * taskData.recurrenceValue));
          break;
        case 'months':
          nextDeadline.setMonth(nextDeadline.getMonth() + taskData.recurrenceValue);
          break;
        default:
          console.error('Invalid recurrence interval:', taskData.recurrenceInterval);
          return;
      }

      // Create new task instance with isNewInstance flag
      const newTask = {
        ...taskData,
        status: 'To Do',
        createdDate: now,
        deadline: nextDeadline,
        isCurrentInstance: true,
        isNewInstance: true, // Mark as new instance
        modifiedDate: now,
        isOverdue: false
      };

      // Remove the id field as it will be auto-generated
      delete newTask.id;

      const newTaskDocRef = await db.collection(TASK_COLLECTION).add(newTask);
      console.log(`✅ Created new recurring task instance with deadline: ${nextDeadline.toISOString()}`);
      
      // ✅ Add new recurring instance to project's taskList if task has a projectId
      if (taskData.projectId) {
        try {
          // Get project reference from task's projectId
          let projectRef;
          if (taskData.projectId.path) {
            // projectId is already a DocumentReference
            projectRef = taskData.projectId;
          } else if (taskData.projectId.id) {
            // projectId is an object with an id field
            projectRef = db.collection('Projects').doc(taskData.projectId.id);
          } else {
            // Assume it's a string ID
            projectRef = db.collection('Projects').doc(taskData.projectId);
          }
          
          const newTaskRef = db.collection(TASK_COLLECTION).doc(newTaskDocRef.id);
          await projectRef.update({
            taskList: admin.firestore.FieldValue.arrayUnion(newTaskRef)
          });
          console.log(`✅ Added recurring task ${newTaskDocRef.id} to project's taskList`);
        } catch (err) {
          console.error('Error adding recurring task to project taskList:', err);
          // Don't throw - this is not critical enough to fail the entire operation
        }
      }
    }

    return { success: true, message: 'Task completed successfully' };
  } catch (error) {
    console.error('❌ Error completing task:', error);
    throw error;
  }
}

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

export async function getAllTasks() {
  try {
    // Get all documents in the "Tasks" collection
    const snapshot = await db.collection(TASK_COLLECTION).get();

    // Map Firestore docs to JS objects
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return tasks;
  } catch (error) {
    console.error('Error fetching tasks from Firestore:', error);
    throw new Error('Failed to retrieve tasks from Firestore');
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
  completeTask,
  getAllTasks
  // deleteTask,
};


