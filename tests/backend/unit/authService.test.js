import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { verifyUserToken, logoutUser, createUser, deleteUser } from '../../../little_farms/backend/services/authService.js';
import { auth, db } from '../../../little_farms/backend/adminFirebase.js';
import { createTestUser } from '../../utils/helpers.js';

describe('Auth Service Unit Tests', () => {
  let testUser;
  let testUserToken;

  beforeEach(async () => {
    // Create a test user for each test
    testUser = await createTestUser({
      email: 'testuser@example.com',
      password: 'testpass123',
      name: 'Test User',
      role: 'staff',
      department: 'IT'
    });

    // For verifyUserToken tests, we need to mock an actual ID token
    // Custom tokens can't be verified with verifyIdToken()
    // We'll create a mock ID token that verifyIdToken can handle
    testUserToken = await auth.createCustomToken(testUser.uid);
  });

  describe('verifyUserToken', () => {
    it('should verify valid user token and update lastLogin', async () => {
      // Mock verifyIdToken to return decoded token
      const originalVerifyIdToken = auth.verifyIdToken;
      auth.verifyIdToken = jest.fn().mockResolvedValue({
        uid: testUser.uid,
        email: testUser.email
      });

      const result = await verifyUserToken('mock-id-token');

      expect(result).toHaveProperty('message', 'Login verified');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('email', testUser.email);
      expect(result.user).toHaveProperty('name', testUser.name);
      expect(result.user).toHaveProperty('role', testUser.role);

      // Verify lastLogin was updated
      const userDoc = await db.collection('Users').doc(testUser.uid).get();
      expect(userDoc.data().lastLogin).toBeDefined();

      // Restore original function
      auth.verifyIdToken = originalVerifyIdToken;
    });

    it('should throw error for invalid token', async () => {
      await expect(verifyUserToken('invalid-token'))
        .rejects
        .toThrow('User not verified');
    });

    it('should throw error for non-existent user in Firestore', async () => {
      // Create user in Auth but not in Firestore
      const authOnlyUser = await auth.createUser({
        email: 'authonly@example.com',
        password: 'password123'
      });

      // Mock verifyIdToken to return the auth-only user
      const originalVerifyIdToken = auth.verifyIdToken;
      auth.verifyIdToken = jest.fn().mockResolvedValue({
        uid: authOnlyUser.uid,
        email: authOnlyUser.email
      });

      await expect(verifyUserToken('mock-token'))
        .rejects
        .toThrow('User not verified');

      // Restore and clean up
      auth.verifyIdToken = originalVerifyIdToken;
      await auth.deleteUser(authOnlyUser.uid);
    });
  });

  describe('logoutUser', () => {
    it('should return success message', async () => {
      const result = await logoutUser();
      expect(result).toHaveProperty('message', 'Logout successful');
    });
  });

  describe('createUser', () => {
    it('should create user successfully with all fields', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'securepass123',
        name: 'New User',
        role: 'staff',
        department: 'Marketing'
      };

      const result = await createUser(userData);

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('uid');
      expect(result.user).toHaveProperty('email', userData.email);
      expect(result.user).toHaveProperty('name', userData.name);
      expect(result.user).toHaveProperty('role', userData.role);
      expect(result.user).toHaveProperty('department', userData.department);

      // Verify user in Firebase Auth
      const authUser = await auth.getUser(result.user.uid);
      expect(authUser.email).toBe(userData.email);
      expect(authUser.displayName).toBe(userData.name);

      // Verify user in Firestore
      const firestoreUser = await db.collection('Users').doc(result.user.uid).get();
      expect(firestoreUser.exists).toBe(true);
      expect(firestoreUser.data()).toMatchObject({
        email: userData.email,
        name: userData.name,
        role: userData.role,
        department: userData.department
      });

      // Clean up
      await deleteUser(result.user.uid);
    });

    it('should create user with minimum required fields', async () => {
      const userData = {
        email: 'minimal@example.com',
        password: 'pass123'
      };

      const result = await createUser(userData);

      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('uid');
      expect(result.user).toHaveProperty('email', userData.email);
      expect(result.user).toHaveProperty('role', 'staff'); // default role
      expect(result.user).toHaveProperty('name', ''); // default empty name
      expect(result.user).toHaveProperty('department', ''); // default empty department

      // Clean up
      await deleteUser(result.user.uid);
    });

    it('should throw error for existing email', async () => {
      const userData = {
        email: testUser.email, // Use existing test user's email
        password: 'password123',
        name: 'Duplicate User'
      };

      await expect(createUser(userData))
        .rejects
        .toThrow('A user with this email already exists.');
    });

    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'not-an-email',
        password: 'password123'
      };

      await expect(createUser(userData))
        .rejects
        .toThrow('The email address is invalid.');
    });

    it('should throw error for weak password', async () => {
      const userData = {
        email: 'valid@example.com',
        password: '123' // Too short/weak (less than 6 characters)
      };

      await expect(createUser(userData))
        .rejects
        .toThrow('The password is too weak.');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Create a user to delete
      const deleteTestUser = await createTestUser({
        email: 'todelete@example.com',
        password: 'deletepass123',
        name: 'Delete Test',
        role: 'staff'
      });

      const result = await deleteUser(deleteTestUser.uid);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User deleted successfully');

      // Verify user is deleted from Auth
      await expect(auth.getUser(deleteTestUser.uid))
        .rejects
        .toThrow();

      // Verify user is deleted from Firestore
      const userDoc = await db.collection('Users').doc(deleteTestUser.uid).get();
      expect(userDoc.exists).toBe(false);
    });

    it('should throw error for non-existent user', async () => {
      await expect(deleteUser('non-existent-uid'))
        .rejects
        .toThrow('Failed to delete user');
    });

    it('should handle delete when user exists in Auth but not in Firestore', async () => {
      // Create user in Auth only
      const authUser = await auth.createUser({
        email: 'authonly@example.com',
        password: 'password123'
      });

      const result = await deleteUser(authUser.uid);
      expect(result.success).toBe(true);

      // Verify user is deleted from Auth
      await expect(auth.getUser(authUser.uid))
        .rejects
        .toThrow();
    });

    it('should handle delete when user exists in Firestore but not in Auth', async () => {
      // Create user in Firestore only
      const firestoreOnlyUser = {
        uid: 'firestore-only-uid',
        email: 'firestoreonly@example.com',
        name: 'Firestore Only',
        role: 'staff'
      };
      
      await db.collection('Users').doc(firestoreOnlyUser.uid).set(firestoreOnlyUser);

      const result = await deleteUser(firestoreOnlyUser.uid);
      expect(result.success).toBe(true);

      // Verify user is deleted from Firestore
      const userDoc = await db.collection('Users').doc(firestoreOnlyUser.uid).get();
      expect(userDoc.exists).toBe(false);
    });
  });
});