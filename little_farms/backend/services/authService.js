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
