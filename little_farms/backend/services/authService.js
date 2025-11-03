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
    const { email, password, name, role, department } = userData;

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
      channel: 'in-app',
      reminderPreference: 1
    };

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
    } else {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }
}

// export async function updateUser(uid, updateData) {
//   try {
//     const { name, email, role, department, ...otherData } = updateData;

//     // 1. Update Firebase Auth if relevant fields are provided
//     const authUpdate = {};
//     if (name !== undefined) authUpdate.displayName = name;
//     if (email !== undefined) authUpdate.email = email;

//     if (Object.keys(authUpdate).length > 0) {
//       await auth.updateUser(uid, authUpdate);
//     }

//     // 2. Update Firestore
//     const firestoreUpdate = {
//       ...updateData,
//       updatedAt: admin.firestore.FieldValue.serverTimestamp()
//     };

//     const userRef = db.collection('Users').doc(uid);
//     await userRef.update(firestoreUpdate);

//     console.log(`User updated: ${uid}`);

//     return {
//       success: true,
//       user: {
//         uid,
//         ...firestoreUpdate
//       }
//     };

//   } catch (error) {
//     console.error('Error updating user:', error);
//     throw new Error(`Failed to update user: ${error.message}`);
//   }
// }

export async function deleteUser(uid) {
  try {
    // 1. Delete from Firestore
    await db.collection('Users').doc(uid).delete();

    // 2. Delete from Firebase Auth
    await auth.deleteUser(uid);

    console.log(`User deleted: ${uid}`);

    return {
      success: true,
      message: 'User deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}




