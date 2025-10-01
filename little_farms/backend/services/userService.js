import { auth, db } from '../adminFirebase.js';

class UserService {
  /**
   * Sign in user with email and password
   * Backend validates and returns custom token
   */
  async signIn(email, password) {
    try {
      // Get user by email to verify they exist
      const userRecord = await auth.getUserByEmail(email);
      
      // Check if account is disabled
      if (userRecord.disabled) {
        throw new Error('This account has been disabled');
      }

      // Fetch user data from Firestore Users collection
      const userDocRef = db.collection('Users').doc(userRecord.uid);
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        throw new Error('User profile not found in database');
      }

      const userData = userDoc.data();

      // Create custom token for the user
      const customToken = await auth.createCustomToken(userRecord.uid);

      // Update login time in Firestore
      await userDocRef.update({
        lastLogin: new Date().toISOString()
      });

      // Create session data
      const sessionData = {
        uid: userRecord.uid,
        email: userData.email || userRecord.email,
        name: userData.name || 'User',
        role: userData.role || 'staff',
        department: userData.department || 'General',
        loginTime: new Date().toISOString(),
        emailVerified: userRecord.emailVerified
      };

      return {
        success: true,
        token: customToken,
        user: sessionData
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  /**
   * Create new user account
   */
  // async createUser(email, password, userData = {}) {
  //   try {
  //     // Create user in Firebase Auth
  //     const userRecord = await auth.createUser({
  //       email,
  //       password,
  //       displayName: userData.name || '',
  //       emailVerified: false
  //     });

  //     // Create user document in Firestore Users collection
  //     await db.collection('Users').doc(userRecord.uid).set({
  //       email,
  //       name: userData.name || 'User',
  //       role: userData.role || 'staff',
  //       department: userData.department || 'General',
  //       createdAt: new Date().toISOString(),
  //       lastLogin: null,
  //       emailVerified: false
  //     });

  //     return {
  //       success: true,
  //       uid: userRecord.uid,
  //       email: userRecord.email,
  //       message: 'User created successfully'
  //     };
  //   } catch (error) {
  //     console.error('Create user error:', error);
  //     throw error;
  //   }
  // }

  /**
   * Verify ID token from client
   */
  async verifyToken(idToken) {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      
      // Fetch user data from Firestore
      const userDocRef = db.collection('Users').doc(decodedToken.uid);
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();

      return {
        success: true,
        uid: decodedToken.uid,
        email: decodedToken.email,
        user: userData
      };
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  }

  /**
   * Get user by UID
   */
  async getUserById(uid) {
    try {
      const userRecord = await auth.getUser(uid);
      const userDocRef = db.collection('Users').doc(uid);
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();

      return {
        success: true,
        user: {
          uid: userRecord.uid,
          email: userData.email || userRecord.email,
          name: userData.name || 'User',
          role: userData.role || 'staff',
          department: userData.department || 'General',
          emailVerified: userRecord.emailVerified,
          lastLogin: userData.lastLogin,
          createdAt: userData.createdAt
        }
      };
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    try {
      const usersSnapshot = await db.collection('Users').get();
      const users = [];

      usersSnapshot.forEach(doc => {
        users.push({
          uid: doc.id,
          ...doc.data()
        });
      });

      return {
        success: true,
        users,
        count: users.length
      };
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }

  // /**
  //  * Update user profile
  //  */
  // async updateUser(uid, updates) {
  //   try {
  //     // Update Firebase Auth if email or display name changed
  //     const authUpdates = {};
  //     if (updates.name) authUpdates.displayName = updates.name;
  //     if (updates.email) authUpdates.email = updates.email;
      
  //     if (Object.keys(authUpdates).length > 0) {
  //       await auth.updateUser(uid, authUpdates);
  //     }

  //     // Update Firestore
  //     const updateData = {
  //       ...updates,
  //       updatedAt: new Date().toISOString()
  //     };

  //     await db.collection('Users').doc(uid).update(updateData);

  //     return { 
  //       success: true,
  //       message: 'User updated successfully'
  //     };
  //   } catch (error) {
  //     console.error('Update user error:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Delete user
  //  */
  // async deleteUser(uid) {
  //   try {
  //     // Delete from Firebase Auth
  //     await auth.deleteUser(uid);
      
  //     // Delete from Firestore
  //     await db.collection('Users').doc(uid).delete();

  //     return { 
  //       success: true,
  //       message: 'User deleted successfully'
  //     };
  //   } catch (error) {
  //     console.error('Delete user error:', error);
  //     throw error;
  //   }
  // }

  

  /**
   * Get user session data
   */
  async getUserSession(uid) {
    try {
      const result = await this.getUserById(uid);
      return result;
    } catch (error) {
      console.error('Get user session error:', error);
      throw error;
    }
  }

  /**
   * Search users by email or name
   */
  async searchUsers(query) {
    try {
      const usersSnapshot = await db.collection('Users').get();
      const users = [];

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const searchQuery = query.toLowerCase();
        
        if (
          userData.email?.toLowerCase().includes(searchQuery) ||
          userData.name?.toLowerCase().includes(searchQuery)
        ) {
          users.push({
            uid: doc.id,
            ...userData
          });
        }
      });

      return {
        success: true,
        users,
        count: users.length
      };
    } catch (error) {
      console.error('Search users error:', error);
      throw error;
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role) {
    try {
      const usersSnapshot = await db.collection('Users')
        .where('role', '==', role)
        .get();
      
      const users = [];
      usersSnapshot.forEach(doc => {
        users.push({
          uid: doc.id,
          ...doc.data()
        });
      });

      return {
        success: true,
        users,
        count: users.length
      };
    } catch (error) {
      console.error('Get users by role error:', error);
      throw error;
    }
  }

  /**
   * Get users by department
   */
  async getUsersByDepartment(department) {
    try {
      const usersSnapshot = await db.collection('Users')
        .where('department', '==', department)
        .get();
      
      const users = [];
      usersSnapshot.forEach(doc => {
        users.push({
          uid: doc.id,
          ...doc.data()
        });
      });

      return {
        success: true,
        users,
        count: users.length
      };
    } catch (error) {
      console.error('Get users by department error:', error);
      throw error;
    }
  }
  /**
   * Logout user - update logout time and session status
   */
  async logout(uid, token = null) {
    try {
      const userDocRef = db.collection('Users').doc(uid);
      const logoutTime = new Date().toISOString();

      // Update user document with logout information
      await userDocRef.update({
        lastLogout: logoutTime,
        isOnline: false,
        lastActivity: logoutTime
      });

      // Optional: Add to logout history for audit trail
      await db.collection('UserSessions').add({
        uid: uid,
        action: 'logout',
        timestamp: logoutTime,
        tokenId: token ? this.extractTokenId(token) : null
      });

      // Optional: Revoke refresh tokens (if using Firebase Auth with refresh tokens)
      // await auth.revokeRefreshTokens(uid);

      return {
        success: true,
        message: 'User logged out successfully',
        logoutTime: logoutTime
      };
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if there's an error updating the database, we should still consider the logout successful
      // from the client's perspective
      return {
        success: true,
        message: 'User logged out successfully (some session data may not be updated)',
        logoutTime: new Date().toISOString(),
        warning: 'Session tracking update failed'
      };
    }
  }
}

export default new UserService();