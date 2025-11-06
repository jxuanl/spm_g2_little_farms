import { auth, db } from '../adminFirebase.js';
import admin from "../adminFirebase.js";

class UserService {
  constructor() {
    // In-memory cache for user data
    this.userCache = new Map();
    this.allUsersCache = null;
    this.allUsersCacheTimestamp = 0;
    
    // Cache configuration
    this.USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for individual users
    this.ALL_USERS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes for all users list
    
    // Cache statistics for monitoring
    this.cacheStats = {
      hits: 0,
      misses: 0,
      invalidations: 0
    };
  }

  /**
   * Get cache statistics (for monitoring stale data concerns)
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      cacheSize: this.userCache.size,
      hitRate: this.cacheStats.hits + this.cacheStats.misses > 0
        ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats() {
    this.cacheStats = { hits: 0, misses: 0, invalidations: 0 };
  }

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
   * Get user by UID (with caching)
   */
  async getUserById(uid) {
    try {
      // Check cache first
      const cached = this.userCache.get(uid);
      if (cached && Date.now() - cached.timestamp < this.USER_CACHE_TTL) {
        this.cacheStats.hits++;
        console.log(`[Cache HIT] User ${uid}`);
        return cached.data;
      }

      // Cache miss - fetch from database
      this.cacheStats.misses++;
      console.log(`[Cache MISS] User ${uid} - fetching from DB`);

      const userRecord = await auth.getUser(uid);
      const userDocRef = db.collection('Users').doc(uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();

      const result = {
        success: true,
        user: {
          uid: userRecord.uid,
          email: userData.email || userRecord.email,
          name: userData.name || 'User',
          role: userData.role || 'staff',
          department: userData.department || 'General',
          emailVerified: userRecord.emailVerified,
          lastLogin: userData.lastLogin,
          createdAt: userData.createdAt,
          reminderPreference: userData.reminderPreference || 'email',
          // Add version for optimistic locking (optional)
          _cacheVersion: Date.now()
        }
      };

      // Cache the result
      this.userCache.set(uid, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Get all users (with caching)
   */
  async getAllUsers() {
    try {
      // Check cache first
      if (this.allUsersCache && Date.now() - this.allUsersCacheTimestamp < this.ALL_USERS_CACHE_TTL) {
        this.cacheStats.hits++;
        console.log('[Cache HIT] All users list');
        return this.allUsersCache;
      }

      // Cache miss - fetch from database
      this.cacheStats.misses++;
      console.log('[Cache MISS] All users list - fetching from DB');

      const usersSnapshot = await db.collection('Users').get();
      const users = [];

      usersSnapshot.forEach(doc => {
        users.push({
          uid: doc.id,
          id: doc.id,
          ...doc.data()
        });
      });

      const result = {
        success: true,
        data: users,
        users: users, // Also include this for compatibility
        count: users.length
      };

      // Cache the result
      this.allUsersCache = result;
      this.allUsersCacheTimestamp = Date.now();

      return result;
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }

  /**
   * Batch get users by IDs (optimized for enrichment)
   */
  async getUsersByIds(userIds) {
    try {
      if (!userIds || userIds.length === 0) {
        return { success: true, users: [] };
      }

      const users = [];
      const uncachedIds = [];

      // Check cache for each user
      for (const uid of userIds) {
        const cached = this.userCache.get(uid);
        if (cached && Date.now() - cached.timestamp < this.USER_CACHE_TTL) {
          users.push(cached.data.user);
        } else {
          uncachedIds.push(uid);
        }
      }

      // Batch fetch uncached users
      if (uncachedIds.length > 0) {
        // Firestore 'in' query supports max 10 items, so chunk if needed
        const chunks = [];
        for (let i = 0; i < uncachedIds.length; i += 10) {
          chunks.push(uncachedIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
          const usersSnapshot = await db.collection('Users')
            .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
            .get();

          usersSnapshot.forEach(doc => {
            const userData = doc.data();
            const user = {
              uid: doc.id,
              email: userData.email || '',
              name: userData.name || 'User',
              role: userData.role || 'staff',
              department: userData.department || 'General',
              position: userData.position || 'Staff',
              phoneNumber: userData.phoneNumber || '',
              imageUrl: userData.imageUrl || ''
            };
            
            users.push(user);

            // Cache individual user
            this.userCache.set(doc.id, {
              data: { success: true, user },
              timestamp: Date.now()
            });
          });
        }
      }

      return { success: true, users };
    } catch (error) {
      console.error('Get users by IDs error:', error);
      throw error;
    }
  }

  /**
   * Invalidate user cache (call after user updates)
   */
  invalidateUserCache(uid) {
    this.cacheStats.invalidations++;
    
    if (uid) {
      const existed = this.userCache.has(uid);
      this.userCache.delete(uid);
      if (existed) {
        console.log(`[Cache INVALIDATE] User ${uid}`);
      }
    } else {
      // Invalidate all caches
      const userCount = this.userCache.size;
      this.userCache.clear();
      this.allUsersCache = null;
      this.allUsersCacheTimestamp = 0;
      console.log(`[Cache INVALIDATE] Cleared all user caches (${userCount} users + all users list)`);
    }
  }

  /**
   * Force refresh of user data (bypass cache)
   * Use when you need absolutely current data
   */
  async forceRefreshUser(uid) {
    console.log(`[Cache FORCE REFRESH] User ${uid}`);
    this.invalidateUserCache(uid);
    return this.getUserById(uid);
  }

  // /**
  //  * Update user profile
  //  */
  async updateUser(uid, updates) {
    try {
      // Update Firebase Auth if email or display name changed
      const authUpdates = {};
      if (updates.name) authUpdates.displayName = updates.name;
      if (updates.email) authUpdates.email = updates.email;

      if (Object.keys(authUpdates).length > 0) {
        await auth.updateUser(uid, authUpdates);
      }

      // Update Firestore - remove updatedAt from updates to avoid conflicts
      const { updatedAt, ...updateData } = updates;

      const firestoreUpdate = {
        ...updateData
      };

      await db.collection('Users').doc(uid).update(firestoreUpdate);

      // Invalidate cache for this user
      this.invalidateUserCache(uid);
      // Also invalidate all users cache since it contains this user
      this.allUsersCache = null;
      this.allUsersCacheTimestamp = 0;

      return {
        success: true,
        message: 'User updated successfully'
      };
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

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

  async getAllDepartments() {
    try {
      const usersSnapshot = await db.collection('Users').get();

      const departmentsSet = new Set();

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.department) {
          departmentsSet.add(userData.department);
        }
      });

      const departments = Array.from(departmentsSet).sort();

      return {
        success: true,
        departments: departments
      };

    } catch (error) {
      console.error('Error in getAllDepartments:', error);
      throw new Error('Failed to fetch departments from database');
    }
  }

}

export default new UserService();

