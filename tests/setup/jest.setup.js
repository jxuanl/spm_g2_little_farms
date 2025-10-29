import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set environment variables BEFORE any backend imports
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize Firebase Admin for testing IMMEDIATELY
// This prevents the backend's adminFirebase.js from initializing first
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'test-project'
  });
  console.log('✅ Firebase Admin initialized for testing with emulator');
  console.log('📍 Using Firestore Emulator:', process.env.FIRESTORE_EMULATOR_HOST);
}

// Initialize Firebase Admin for testing
beforeAll(async () => {
  console.log('🧪 Test suite starting...');
});

// Clean up test data before each test
beforeEach(async () => {
  const db = admin.firestore();
  
  // Clear all Firestore collections
  const collections = ['Tasks', 'Users', 'Projects', 'UserSessions'];
  
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  
  // Clear all Firebase Auth users (emulator only)
  try {
    const listUsersResult = await admin.auth().listUsers();
    const deletePromises = listUsersResult.users.map(user => 
      admin.auth().deleteUser(user.uid)
    );
    await Promise.all(deletePromises);
  } catch (error) {
    // Ignore errors if no users exist
  }
  
  console.log('🧹 Test database and auth users cleaned');
});

// Clean up after all tests
afterAll(async () => {
  await admin.app().delete();
  console.log('✅ Firebase Admin cleaned up');
});
