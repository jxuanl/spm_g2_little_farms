import admin from 'firebase-admin';

export const db = admin.firestore();

/**
 * Create test user in Firestore and Firebase Auth
 */
export async function createTestUser({ email, password = 'test123456', name, role = 'staff', department = 'IT' }) {
  // Create in Firebase Auth
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: name,
    emailVerified: true
  });
  
  // Create in Firestore Users collection
  await db.collection('Users').doc(userRecord.uid).set({
    email,
    name,
    role,
    department,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    emailVerified: true,
    reminderPreference: 1,
    channel: 'in-app'
  });
  
  return { uid: userRecord.uid, email, name, role, department };
}

/**
 * Create test project
 */
export async function createTestProject({ title, description = '', owner, taskList = [] }) {
  const projectRef = await db.collection('Projects').add({
    title,
    description,
    owner,
    taskList // Array of task references
  });
  
  return { id: projectRef.id, title, description, owner };
}

/**
 * Create test task
 */
export async function createTestTask({
  title,
  description = '',
  priority = 'medium',
  status = 'To Do',
  deadline = null,
  assigneeIds = [],
  projectId = null,
  createdBy,
  tags = [],
  isSubtask = false,
  parentTaskId = null
}) {
  // Convert assignee IDs to references
  const assignedToRefs = assigneeIds.map(id => db.collection('Users').doc(id));
  
  // Convert project ID to reference
  const projectRef = projectId ? db.collection('Projects').doc(projectId) : null;
  
  // Convert creator ID to reference
  const creatorRef = db.collection('Users').doc(createdBy);
  
  const taskData = {
    title,
    description,
    priority,
    status,
    deadline: deadline ? new Date(deadline) : null,
    assignedTo: assignedToRefs,
    projectId: projectRef,
    taskCreatedBy: creatorRef,
    tags,
    isOverdue: false,
    createdDate: new Date(),
    modifiedDate: new Date()
  };
  
  let taskRef;
  if (isSubtask && parentTaskId) {
    taskRef = await db.collection('Tasks').doc(parentTaskId).collection('Subtasks').add(taskData);
  } else {
    taskRef = await db.collection('Tasks').add(taskData);
  }
  
  return { id: taskRef.id, ...taskData };
}

/**
 * Create test comment
 */
export async function createTestComment({
  taskId,
  subtaskId = null,
  content,
  authorId,
  mentionedUsers = []
}) {
  const authorRef = db.collection('Users').doc(authorId);
  const mentionedRefs = mentionedUsers.map(id => db.collection('Users').doc(id));
  
  const commentData = {
    content,
    author: authorRef,
    mentionedUsers: mentionedRefs,
    createdDate: new Date(),
    modifiedDate: new Date()
  };
  
  let commentRef;
  if (subtaskId) {
    commentRef = await db.collection('Tasks')
      .doc(taskId)
      .collection('Subtasks')
      .doc(subtaskId)
      .collection('Comments')
      .add(commentData);
  } else {
    commentRef = await db.collection('Tasks')
      .doc(taskId)
      .collection('Comments')
      .add(commentData);
  }
  
  return { id: commentRef.id, ...commentData };
}

/**
 * Get custom token for user (for authentication in tests)
 * Note: For emulator testing, we just return a simple token since
 * the emulator doesn't strictly validate tokens like production
 */
export async function getCustomToken(uid) {
  // Create a custom token - in tests with emulator, token validation is relaxed
  const customToken = await admin.auth().createCustomToken(uid);
  // For emulator, we can use the custom token directly in some cases
  // or skip authentication entirely by passing userId in request body
  return customToken;
}

/**
 * Clean specific collection
 */
export async function cleanCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}

/**
 * Seed database with test data
 */
export async function seedTestData() {
  // Create test users
  const admin = await createTestUser({
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'admin',
    department: 'admin'
  });
  
  const manager = await createTestUser({
    email: 'manager@test.com',
    name: 'Test Manager',
    role: 'manager',
    department: 'IT'
  });
  
  const staff1 = await createTestUser({
    email: 'staff1@test.com',
    name: 'Test Staff 1',
    role: 'staff',
    department: 'IT'
  });
  
  const staff2 = await createTestUser({
    email: 'staff2@test.com',
    name: 'Test Staff 2',
    role: 'staff',
    department: 'Sales'
  });
  
  // Create test project
  const project = await createTestProject({
    title: 'Test Project',
    description: 'A test project for integration tests',
    owner: manager.uid
  });
  
  // Create test tasks
  const task1 = await createTestTask({
    title: 'Test Task 1',
    description: 'First test task',
    priority: 'high',
    assigneeIds: [staff1.uid],
    projectId: project.id,
    createdBy: manager.uid,
    tags: ['testing', 'priority']
  });
  
  const task2 = await createTestTask({
    title: 'Test Task 2',
    description: 'Second test task',
    priority: 'medium',
    status: 'In Progress',
    assigneeIds: [staff2.uid],
    projectId: project.id,
    createdBy: manager.uid
  });
  
  return {
    users: { admin, manager, staff1, staff2 },
    project,
    tasks: { task1, task2 }
  };
}

export default {
  createTestUser,
  createTestProject,
  createTestTask,
  createTestComment,
  getCustomToken,
  cleanCollection,
  seedTestData,
  db
};
