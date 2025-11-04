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
    }
  }

  // --- Normalize Firestore/Date fields to ISO strings ---
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
      return []
    }

    const userData = userDoc.data()
    const role = (userData.role || "staff").toLowerCase()

    // === HR → can see all tasks across all projects ===
    if (role === "hr") {
      const allTasksSnap = await db.collection("Tasks").get()
      const allTasks = allTasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => t.isCurrentInstance !== false); // show only current instance

      // ✅ Enrich tasks (project, creator, assignees)
      const enriched = await Promise.all(allTasks.map((t) => enrichTaskData(t)))
      return enriched
    }

    // === Manager → can see all tasks in projects they created ===
    if (role === "manager") {
      const projectSnap = await db
        .collection("Projects")
        .where("owner", "==", userDocRef)
        .get()

      if (projectSnap.empty) {
        return []
      }

      const projectIds = projectSnap.docs.map((d) => d.ref)

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

      return enriched
    }

    // === Staff → tasks they created or assigned ===
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
    return enriched

  } catch (err) {
    return []
  }
}

export async function createTask(taskData) {
  try {
    // Check if this is a subtask
    const isSubtask = !!taskData.parentTaskId;
    console.log(`📝 createTask - isSubtask: ${isSubtask}, parentTaskId: ${taskData.parentTaskId}`);
    
    // Convert assignee IDs to Firestore user references
    const assignedToRefs = [];
    if (taskData.assigneeIds && taskData.assigneeIds.length > 0) {
      for (const userId of taskData.assigneeIds) {
        // ✅ Validate userId is a non-empty string
        if (userId && typeof userId === 'string' && userId.trim() !== '') {
          const userDoc = await db.collection('Users').doc(userId).get();
          if (userDoc.exists) {
            assignedToRefs.push(db.collection('Users').doc(userId));
            console.log(`✅ Assignee found: ${userId}`);
          } else {
            console.warn(`⚠️ User ${userId} not found`);
          }
        } else {
          console.warn(`⚠️ Invalid userId: ${userId}`);
        }
      }
    }
    console.log(`📝 Total valid assignees: ${assignedToRefs.length}`);
    
    // Convert project ID to Firestore project reference
    let projectRef = null;
    let projectDoc = null;
    if (taskData.projectId) {
      projectDoc = await db.collection('Projects').doc(taskData.projectId).get();
      if (projectDoc.exists) {
        projectRef = db.collection('Projects').doc(taskData.projectId);
      }
    } else {
      console.log('ℹ️ No projectId provided or invalid projectId');
    }
    
    // Convert creator ID to Firestore user reference
    let taskCreatedByRef = null;
    if (taskData.createdBy && typeof taskData.createdBy === 'string' && taskData.createdBy.trim() !== '') {
      const creatorDoc = await db.collection('Users').doc(taskData.createdBy).get();
      if (creatorDoc.exists) {
        taskCreatedByRef = db.collection('Users').doc(taskData.createdBy);
        console.log(`✅ Creator found: ${taskData.createdBy}`);
      } else {
        console.warn(`⚠️ Creator ${taskData.createdBy} not found`);
        throw new Error(`Creator user not found: ${taskData.createdBy}`);
      }
    } else {
      console.error('❌ No valid createdBy provided');
      throw new Error('createdBy is required and must be a valid user ID');
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
      console.log(`📝 Creating subtask under parent task: ${taskData.parentTaskId}`);
      
      // Verify parent task exists
      const parentTaskDoc = await db.collection(TASK_COLLECTION).doc(taskData.parentTaskId).get();
      if (!parentTaskDoc.exists) {
        throw new Error(`Parent task ${taskData.parentTaskId} not found`);
      }
      console.log(`✅ Parent task exists`);
      
      docRef = await db.collection(TASK_COLLECTION)
        .doc(taskData.parentTaskId)
        .collection('Subtasks')
        .add(newTask);
      console.log(`✅ Subtask created with ID: ${docRef.id}`);
    } else {
      // Create regular task
      console.log(`📝 Creating regular task`);
      docRef = await db.collection(TASK_COLLECTION).add(newTask);
      
      // Add task to project's taskList if task has a projectId
      if (projectDoc && projectDoc.exists) {
        const taskRef = db.collection(TASK_COLLECTION).doc(docRef.id);
        await projectDoc.ref.update({
          taskList: admin.firestore.FieldValue.arrayUnion(taskRef)
        });
      }
    }
    
    return { id: docRef.id, ...newTask };
  } catch (err) {
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
      
      // Add new recurring instance to project's taskList if task has a projectId
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
        } catch (err) {
        }
      }
    } else {
      // Normal update (no recurring task completion)
      await taskRef.update(updateData)
    }

    return { id: taskId, ...updateData }
  } catch (err) {
    throw err
  }
}

// // Delete Task (backend-safe)
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
      
      // Add new recurring instance to project's taskList if task has a projectId
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
        } catch (err) {
        }
      }
    }

    return { success: true, message: 'Task completed successfully' };
  } catch (error) {
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
      // console.log('Raw taskCreatedBy data:', data.taskCreatedBy);
      if (data.taskCreatedBy && data.taskCreatedBy.path) {
        serializedData.taskCreatedBy = { path: data.taskCreatedBy.path };
      } else if (data.taskCreatedBy && data.taskCreatedBy._path && data.taskCreatedBy._path.segments) {
        // Handle Firestore DocumentReference format
        const pathString = data.taskCreatedBy._path.segments.join('/');
        // console.log('Constructed path from segments:', pathString);
        serializedData.taskCreatedBy = { path: pathString };
      } else if (data.taskCreatedBy) {
        // Handle other reference formats
        // console.log('taskCreatedBy exists but no recognizable path format, full object:', data.taskCreatedBy);
        serializedData.taskCreatedBy = data.taskCreatedBy;
      } else {
        // console.log('taskCreatedBy is null or undefined');
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
    // console.log('Raw taskCreatedBy data:', data.taskCreatedBy);
    if (data.taskCreatedBy && data.taskCreatedBy.path) {
      serializedData.taskCreatedBy = { path: data.taskCreatedBy.path };
    } else if (data.taskCreatedBy && data.taskCreatedBy._path && data.taskCreatedBy._path.segments) {
      // Handle Firestore DocumentReference format
      const pathString = data.taskCreatedBy._path.segments.join('/');
      // console.log('Constructed path from segments:', pathString);
      serializedData.taskCreatedBy = { path: pathString };
    } else if (data.taskCreatedBy) {
      // Handle other reference formats
      // console.log('taskCreatedBy exists but no recognizable path format, full object:', data.taskCreatedBy);
      serializedData.taskCreatedBy = data.taskCreatedBy;
    } else {
      // console.log('taskCreatedBy is null or undefined');
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

// === Comments Functions ===
export async function getCommentsForTask(taskId, subtaskId = null) {
  try {
    let commentsRef;
    
    if (subtaskId) {
      // Get comments for a subtask
      commentsRef = db
        .collection(TASK_COLLECTION)
        .doc(taskId)
        .collection('Subtasks')
        .doc(subtaskId)
        .collection('Comments');
    } else {
      // Get comments for a regular task
      commentsRef = db
        .collection(TASK_COLLECTION)
        .doc(taskId)
        .collection('Comments');
    }
    
    const snapshot = await commentsRef.orderBy('createdDate', 'desc').get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Serialize the author reference
      const serializedData = { ...data };
      if (data.author && data.author._path && data.author._path.segments) {
        const pathString = data.author._path.segments.join('/');
        serializedData.author = { path: pathString };
      } else if (data.author && data.author.path) {
        serializedData.author = { path: data.author.path };
      }
      
      // Serialize mentioned users references
      if (data.mentionedUsers && Array.isArray(data.mentionedUsers)) {
        serializedData.mentionedUsers = data.mentionedUsers.map(ref => {
          if (ref && ref._path && ref._path.segments) {
            return { path: ref._path.segments.join('/') };
          } else if (ref && ref.path) {
            return { path: ref.path };
          }
          return ref;
        });
      }
      
      return {
        id: doc.id,
        ...serializedData,
        createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : data.createdDate,
        modifiedDate: data.modifiedDate?.toDate ? data.modifiedDate.toDate() : data.modifiedDate
      };
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    return [];
  }
}

export async function createComment(taskId, commentData, subtaskId = null) {
  try {
    // Validate required fields
    if (!commentData.content || !commentData.authorId) {
      throw new Error('Content and authorId are required');
    }
    
    // Convert author ID to Firestore user reference
    let authorRef = null;
    if (commentData.authorId) {
      const authorDoc = await db.collection('Users').doc(commentData.authorId).get();
      if (authorDoc.exists) {
        authorRef = db.collection('Users').doc(commentData.authorId);
      } else {
        throw new Error('Author not found');
      }
    }
    
    // Convert mentioned user IDs to Firestore user references
    const mentionedUsersRefs = [];
    if (commentData.mentionedUsers && Array.isArray(commentData.mentionedUsers)) {
      for (const userId of commentData.mentionedUsers) {
        if (userId) {
          const userDoc = await db.collection('Users').doc(userId).get();
          if (userDoc.exists) {
            mentionedUsersRefs.push(db.collection('Users').doc(userId));
          }
        }
      }
    }
    
    // Validate attachments (optional)
    let attachments = []
    if (Array.isArray(commentData.attachments)) {
      // Enforce a maximum of 3 files and size <= 500KB each if size provided
      const MAX_FILES = 3
      const MAX_BYTES = 500 * 1024
      if (commentData.attachments.length > MAX_FILES) {
        throw new Error(`A maximum of ${MAX_FILES} attachments are allowed`)
      }
      attachments = commentData.attachments
        .filter(a => a && typeof a === 'object')
        .slice(0, MAX_FILES)
        .map(a => ({
          name: a.name,
          url: a.url,
          contentType: a.contentType,
          size: typeof a.size === 'number' ? a.size : null,
          storagePath: a.storagePath || null,
        }))
      // Soft-validate sizes if provided
      for (const a of attachments) {
        if (a.size != null && a.size > MAX_BYTES) {
          throw new Error('Attachment exceeds 500KB size limit')
        }
      }
    }

    const now = new Date();
    const newComment = {
      content: commentData.content.trim(),
      author: authorRef,
      mentionedUsers: mentionedUsersRefs,
      attachments,
      createdDate: now,
      modifiedDate: now
    };
    
    let commentsRef;
    if (subtaskId) {
      // Create comment for a subtask
      commentsRef = db
        .collection(TASK_COLLECTION)
        .doc(taskId)
        .collection('Subtasks')
        .doc(subtaskId)
        .collection('Comments');
    } else {
      // Create comment for a regular task
      commentsRef = db
        .collection(TASK_COLLECTION)
        .doc(taskId)
        .collection('Comments');
    }
    
    const docRef = await commentsRef.add(newComment);
    
    return {
      id: docRef.id,
      ...newComment,
      author: { path: authorRef.path },
      mentionedUsers: mentionedUsersRefs.map(ref => ({ path: ref.path })),
      createdDate: now,
      modifiedDate: now
    };
  } catch (err) {
    console.error("Error creating comment:", err);
    throw err;
  }
}

export async function updateComment(taskId, commentId, updateData, subtaskId = null) {
  try {
    let commentRef;
    if (subtaskId) {
      // Update comment for a subtask
      commentRef = db
        .collection(TASK_COLLECTION)
        .doc(taskId)
        .collection('Subtasks')
        .doc(subtaskId)
        .collection('Comments')
        .doc(commentId);
    } else {
      // Update comment for a regular task
      commentRef = db
        .collection(TASK_COLLECTION)
        .doc(taskId)
        .collection('Comments')
        .doc(commentId);
    }
    
    // Check if comment exists
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return null;
    }
    
    const updatedFields = {
      content: updateData.content.trim(),
      modifiedDate: new Date()
    };
    
    await commentRef.update(updatedFields);
    
    // Return the updated comment
    const updatedDoc = await commentRef.get();
    const data = updatedDoc.data();
    
    return {
      id: updatedDoc.id,
      ...data,
      createdDate: data.createdDate?.toDate ? data.createdDate.toDate() : data.createdDate,
      modifiedDate: data.modifiedDate?.toDate ? data.modifiedDate.toDate() : data.modifiedDate
    };
  } catch (err) {
    console.error("Error updating comment:", err);
    throw err;
  }
}

export async function deleteComment(taskId, commentId, subtaskId = null) {
  try {
    let commentRef;
    if (subtaskId) {
      // Delete comment for a subtask
      commentRef = db
        .collection(TASK_COLLECTION)
        .doc(taskId)
        .collection('Subtasks')
        .doc(subtaskId)
        .collection('Comments')
        .doc(commentId);
    } else {
      // Delete comment for a regular task
      commentRef = db
        .collection(TASK_COLLECTION)
        .doc(taskId)
        .collection('Comments')
        .doc(commentId);
    }
    
    // Check if comment exists
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return false;
    }
    
    await commentRef.delete();
    return true;
  } catch (err) {
    console.error("Error deleting comment:", err);
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
    throw new Error('Failed to retrieve tasks from Firestore');
  }
}

// --- Helper: Get user role ---
async function getUserRole(userId) {
  try {
    if (!userId) return null;
    const userDoc = await db.collection('Users').doc(userId).get();
    if (!userDoc.exists) return null;
    const userData = userDoc.data();
    return (userData.role || 'staff').toLowerCase();
  } catch (err) {
    return null;
  }
}

// --- Helper: Get project owner ID from project reference ---
async function getProjectOwnerId(projectRef) {
  try {
    if (!projectRef) return null;
    
    let projectDoc;
    
    // Handle DocumentReference (most common case)
    if (projectRef.path || projectRef.get) {
      // It's a DocumentReference, fetch the document
      projectDoc = await projectRef.get();
    } else if (typeof projectRef === 'string') {
      // It's a string ID, fetch by ID
      projectDoc = await db.collection('Projects').doc(projectRef).get();
    } else {
      return null;
    }
    
    if (!projectDoc || !projectDoc.exists) return null;
    
    const projectData = projectDoc.data();
    const owner = projectData.owner;
    
    if (!owner) return null;
    
    // Extract owner ID from owner reference (owner is a DocumentReference)
    if (typeof owner === 'string') {
      // owner is already a string ID
      return owner;
    } else if (owner.path) {
      // owner is a DocumentReference with path property
      const pathParts = owner.path.split('/');
      return pathParts[pathParts.length - 1];
    } else if (owner._path && owner._path.segments) {
      // owner is a DocumentReference with _path.segments
      return owner._path.segments[owner._path.segments.length - 1];
    } else if (owner.id) {
      // owner has an id property
      return owner.id;
    }
    
    return null;
  } catch (err) {
    console.error('Error getting project owner ID:', err);
    return null;
  }
}

// delete a task (creator OR project-owning manager)
export async function deleteTask(taskId, userId) {
  try {
    const taskRef = db.collection(TASK_COLLECTION).doc(taskId);
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) return false;

    const taskData = taskSnap.data();

    // Resolve creator id robustly
    const creatorPath = taskData.taskCreatedBy?.path
      || taskData.taskCreatedBy?._path?.segments?.join('/')
      || null;
    const creatorId =
      taskData.taskCreatedBy?.id ||
      (creatorPath ? creatorPath.split('/').slice(-1)[0] : null);

    // Fast-path: creator can delete
    if (creatorId && creatorId === userId) {
      // proceed
    } else {
      // Not the creator — check if user is a manager who owns the project
      const role = await getUserRole(userId);
      if (role !== 'manager') return false;

      const projectOwnerId = await getProjectOwnerId(taskData.projectId);
      if (!projectOwnerId || projectOwnerId !== userId) {
        // Manager but not the owner of this task's project
        return false;
      }
    }

    // Delete subtasks (if any) then the task
    const subCol = await taskRef.collection('Subtasks').get();
    const batch = db.batch();
    subCol.forEach((doc) => batch.delete(doc.ref));
    batch.delete(taskRef);
    await batch.commit();

    return true;
  } catch (err) {
    throw err;
  }
}

// delete a subtask (creator OR project-owning manager)
export async function deleteSubtask(taskId, subtaskId, userId) {
  try {
    const taskRef = db.collection(TASK_COLLECTION).doc(taskId);
    const subRef = taskRef.collection('Subtasks').doc(subtaskId);

    const subSnap = await subRef.get();
    if (!subSnap.exists) return false;

    const data = subSnap.data();

    // Resolve creator id robustly (stored on subtask)
    const creatorPath = data.taskCreatedBy?.path
      || data.taskCreatedBy?._path?.segments?.join('/')
      || null;
    const creatorId =
      data.taskCreatedBy?.id ||
      (creatorPath ? creatorPath.split('/').slice(-1)[0] : null);

    // Fast-path: creator can delete
    if (creatorId && creatorId === userId) {
      // proceed
    } else {
      // Not the creator — check if user is a manager who owns the project
      const role = await getUserRole(userId);
      if (role !== 'manager') return false;

      // Prefer subtask.projectId; if absent, fall back to parent task's projectId
      let projectOwnerId = await getProjectOwnerId(data.projectId);
      if (!projectOwnerId) {
        const parentSnap = await taskRef.get();
        if (parentSnap.exists) {
          const parentData = parentSnap.data();
          projectOwnerId = await getProjectOwnerId(parentData?.projectId);
        }
      }
      if (!projectOwnerId || projectOwnerId !== userId) {
        return false;
      }
    }

    await subRef.delete();
    return true;
  } catch (err) {
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
  getCommentsForTask,
  createComment,
  updateComment,
  deleteComment,
  updateTask,
  completeTask,
  getAllTasks,
  deleteTask, 
  deleteSubtask
};


