import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();
import path from 'path';

// Check if we're running in test mode with emulator
const isTestMode = process.env.FIRESTORE_EMULATOR_HOST || process.env.NODE_ENV === 'test';

// Only initialize if not already initialized (prevents double initialization in tests)
if (!admin.apps.length) {
  if (isTestMode) {
    // Test mode: use emulator without credentials
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'test-project'
    });
    console.log('🧪 Firebase Admin initialized for TESTING with emulator');
  } else {
    // Production mode: use service account key
    const serviceAccountPath = path.resolve("serviceAccountKey.json");
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('🔥 Firebase Admin initialized for PRODUCTION');
  }
}

// Export commonly used admin features:
export const db = admin.firestore();
export const auth = admin.auth();
export default admin;