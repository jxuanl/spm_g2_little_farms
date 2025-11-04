import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import usersRouter from '../../../little_farms/backend/routes/users.js';
import { createTestUser, getCustomToken } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('Users API Integration Tests', () => {
  let testUser;
  let customToken;
  
  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'testuser@example.com',
      password: 'secure123',
      name: 'Test User',
      role: 'staff',
      department: 'IT'
    });
    
    customToken = await getCustomToken(testUser.uid);
  });
  
  describe('POST /api/users/login', () => {
    it('should login user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: 'secure123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });
    
    it('should return 400 with missing email', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          password: 'secure123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email');
    });
    
    it('should return 400 with missing password', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('password');
    });
    
    it('should return 400 with invalid email format', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'not-an-email',
          password: 'secure123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('email');
    });
    
    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('account');
    });
  });
  
  describe('GET /api/users/', () => {
    it('should get all users', async () => {
      // Create additional users
      await createTestUser({
        email: 'user2@example.com',
        name: 'User 2',
        role: 'manager',
        department: 'Sales'
      });
      
      await createTestUser({
        email: 'user3@example.com',
        name: 'User 3',
        role: 'staff',
        department: 'HR'
      });
      
      const response = await request(app)
        .get('/api/users/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      expect(response.body).toHaveProperty('count');
    });
  });
  
  describe('GET /api/users/search', () => {
    beforeEach(async () => {
      await createTestUser({
        email: 'john.doe@example.com',
        name: 'John Doe',
        role: 'staff',
        department: 'IT'
      });
      
      await createTestUser({
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        role: 'manager',
        department: 'Sales'
      });
    });
    
    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'john' })
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users[0].name).toContain('John');
    });
    
    it('should search users by email', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'jane.smith' })
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users[0].email).toContain('jane.smith');
    });
    
    it('should return 400 when search query is missing', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(400);
    });
    
    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .query({ q: 'nonexistentuser123456' })
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users).toEqual([]);
    });
  });
  
  describe('GET /api/users/role/:role', () => {
    beforeEach(async () => {
      await createTestUser({
        email: 'admin1@example.com',
        name: 'Admin 1',
        role: 'admin',
        department: 'admin'
      });
      
      await createTestUser({
        email: 'manager1@example.com',
        name: 'Manager 1',
        role: 'manager',
        department: 'IT'
      });
      
      await createTestUser({
        email: 'staff1@example.com',
        name: 'Staff 1',
        role: 'staff',
        department: 'Sales'
      });
    });
    
    it('should get users by role - admin', async () => {
      const response = await request(app)
        .get('/api/users/role/admin')
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users.every(u => u.role === 'admin')).toBe(true);
    });
    
    it('should get users by role - manager', async () => {
      const response = await request(app)
        .get('/api/users/role/manager')
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users.every(u => u.role === 'manager')).toBe(true);
    });
    
    it('should return empty array for role with no users', async () => {
      const response = await request(app)
        .get('/api/users/role/nonexistentrole')
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users).toEqual([]);
    });
  });
  
  describe('GET /api/users/department/:department', () => {
    beforeEach(async () => {
      await createTestUser({
        email: 'it1@example.com',
        name: 'IT Person 1',
        role: 'staff',
        department: 'IT'
      });
      
      await createTestUser({
        email: 'sales1@example.com',
        name: 'Sales Person 1',
        role: 'staff',
        department: 'Sales'
      });
    });
    
    it('should get users by department - IT', async () => {
      const response = await request(app)
        .get('/api/users/department/IT')
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users.length).toBeGreaterThan(0);
      expect(response.body.users.every(u => u.department === 'IT')).toBe(true);
    });
    
    it('should get users by department - Sales', async () => {
      const response = await request(app)
        .get('/api/users/department/Sales')
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users.every(u => u.department === 'Sales')).toBe(true);
    });
  });
  
  describe('GET /api/users/:uid', () => {
    it('should get user by ID', async () => {
      const response = await request(app)
        .get(`/api/users/${testUser.uid}`)
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user.uid).toBe(testUser.uid);
      expect(response.body.user.email).toBe(testUser.email);
    });
    
    it('should return 500 for non-existent user ID', async () => {
      const response = await request(app)
        .get('/api/users/nonexistent-uid')
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(500);
    });
  });
  
  describe('GET /api/users/session', () => {
    it('should get user session with valid token', async () => {
      const response = await request(app)
        .get('/api/users/session')
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
    });
    
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/users/session');
      
      expect(response.status).toBe(401);
    });
    
    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/session')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/users/verify-token', () => {
    it('should verify valid token', async () => {
      const response = await request(app)
        .post('/api/users/verify-token')
        .send({ token: customToken });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
    
    it('should return 400 when token is missing', async () => {
      const response = await request(app)
        .post('/api/users/verify-token')
        .send({});
      
      expect(response.status).toBe(400);
    });
    
    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/users/verify-token')
        .send({ token: 'invalid-token' });
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('POST /api/users/logout', () => {
    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/users/logout')
        .set('Authorization', `Bearer ${customToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });
    
    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/users/logout');
      
      expect(response.status).toBe(401);
    });
  });
});
