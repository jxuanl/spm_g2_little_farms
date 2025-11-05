// service.js
import { auth, db } from "../adminFirebase.js";

export async function verifyUserToken(idToken) {
  try {
    // Verify Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Get user data from Firestore
    const userDoc = await db.collection("Users").doc(uid).get();
    if (!userDoc.exists) throw new Error("User record not found in Firestore");

    const userData = userDoc.data();

    // Update lastLogin time
    await db.collection("Users").doc(uid).update({
      lastLogin: new Date().toISOString(),
    });

    return { message: "Login verified", user: userData };
  } catch (error) {
    console.error("Error verifying token:", error.message);
    throw new Error("User not verified");
  }
}

export async function logoutUser() {
  // Logout handled client-side by clearing token
  return { message: "Logout successful" };
}

export async function createUser(userData) {
  try {
    // console.log("User Data")
    // console.log(userData)
    const { email, password, name, role, department, channel, reminderPreference } = userData;

    // Validate password strength (since Admin SDK doesn't enforce it)
    if (password && password.length < 6) {
      throw new Error('The password is too weak.');
    }

    // 1. Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false
    });

    console.log(`User created in Firebase Auth: ${userRecord.uid}`);

    // 2. Prepare user data for Firestore
    const firestoreUserData = {
      email: email,
      name: name || '',
      role: role || 'staff',
      department: department || '',
      channel: channel || 'in-app',
      reminderPreference: reminderPreference || 1
    };

    // console.log("=================FirestoreData=================y")
    // console.log(firestoreUserData);

    // 3. Create user document in Firestore
    const userRef = db.collection('Users').doc(userRecord.uid);
    await userRef.set(firestoreUserData);

    console.log(`User document created in Firestore: ${userRecord.uid}`);

    // 4. Return combined user data
    return {
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        ...firestoreUserData
      }
    };

  } catch (error) {
    console.error('Error creating user:', error);
    
    // If Firestore creation fails but Auth succeeded, we might want to clean up
    if (error.code === 'auth/email-already-exists') {
      throw new Error('A user with this email already exists.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('The email address is invalid.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('The password is too weak.');
    } else if (error.message === 'The password is too weak.') {
      // Handle our custom validation error
      throw error;
    } else {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }
}

export async function deleteUser(uid) {
  let authExists = false;
  let firestoreExists = false;

  try {
    // 1. Check if user exists in Firestore
    const userDoc = await db.collection('Users').doc(uid).get();
    firestoreExists = userDoc.exists;

    // 2. Check if user exists in Auth
    try {
      await auth.getUser(uid);
      authExists = true;
    } catch (authError) {
      if (authError.code !== 'auth/user-not-found') {
        throw authError;
      }
    }

    // If user doesn't exist in either location, throw error
    if (!authExists && !firestoreExists) {
      throw new Error('User not found in Auth or Firestore');
    }

    // 3. Delete from Firestore if exists
    if (firestoreExists) {
      await db.collection('Users').doc(uid).delete();
    }

    // 4. Delete from Auth if exists
    if (authExists) {
      await auth.deleteUser(uid);
    }

    console.log(`User deleted: ${uid}`);
    return {
      success: true,
      message: 'User deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}