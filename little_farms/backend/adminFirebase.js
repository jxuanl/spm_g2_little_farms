import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
dotenv.config();
import path from 'path';


// Path to your service account file
const serviceAccountPath = path.resolve("serviceAccountKey.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));


// Initialize the admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Export commonly used admin features:
export const db = admin.firestore();
export const auth = admin.auth();
export default admin;