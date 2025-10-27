import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin for testing
beforeAll(async () => {
  // Use emulator if FIRESTORE_EMULATOR_HOST is set
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  }
  
  if (!admin.apps.length) {
    // For emulator, we don't need real credentials
    admin.initializeApp({
      projectId: 'test-project',
      credential: admin.credential.applicationDefault()
    });
  }
  
  console.log('✅ Firebase Admin initialized for testing');
  console.log('📍 Using Firestore Emulator:', process.env.FIRESTORE_EMULATOR_HOST);
});

// Clean up test data before each test
beforeEach(async () => {
  const db = admin.firestore();
  
  // Clear all collections
  const collections = ['Tasks', 'Users', 'Projects', 'UserSessions'];
  
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  
  console.log('🧹 Test database cleaned');
});

// Clean up after all tests
afterAll(async () => {
  await admin.app().delete();
  console.log('✅ Firebase Admin cleaned up');
});

// Global test timeout
jest.setTimeout(30000);
