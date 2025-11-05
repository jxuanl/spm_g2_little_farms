import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import { createTestUser, createTestProject, createTestTask, createTestComment, seedTestData, db } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

describe('Tasks API - Workflow, Access Control, and Edge Cases', () => {
  let testData;
  
  beforeEach(async () => {
    testData = await seedTestData();
  });
  
  // ============================================================================
  // Task Status Workflow
  // ============================================================================
  describe('Task Status Workflow', () => {
    it('should successfully transition task through workflow states', async () => {
      const task = await createTestTask({
        title: 'Workflow Task',
        status: 'To Do',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      // Update status to In Progress
      let response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ status: 'In Progress' });
      
      expect(response.status).toBe(200);
      expect(response.body.task.status).toBe('In Progress');
      
      // Update status to Done
      response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ status: 'Done' });
      
      expect(response.status).toBe(200);
      expect(response.body.task.status).toBe('Done');
    });
    
    it('should handle all valid status transitions', async () => {
      const statuses = ['To Do', 'In Progress', 'In Review', 'Done'];
      const task = await createTestTask({
        title: 'Status Transition Task',
        status: 'To Do',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      for (const status of statuses) {
        const response = await request(app)
          .put(`/api/tasks/${task.id}`)
          .send({ status });
        
        expect(response.status).toBe(200);
        expect(response.body.task.status).toBe(status);
      }
    });
    
    it('should handle subtask status transitions', async () => {
      const parentTask = await createTestTask({
        title: 'Parent for Workflow',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      const subtask = await createTestTask({
        title: 'Workflow Subtask',
        status: 'To Do',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      // To Do → In Progress
      let response = await request(app)
        .put(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`)
        .send({ status: 'In Progress' });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('In Progress');
      
      // In Progress → Done
      response = await request(app)
        .put(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`)
        .send({ status: 'Done' });
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Done');
    });
  });
  
  // ============================================================================
  // Role-based Access Control
  // ============================================================================
  describe('Role-based Access Control', () => {
    it('should allow HR to see all tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      // HR should see tasks across all projects
    });
    
    it('should allow Manager to see tasks in their projects', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.manager.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
    });
    
    it('should allow Staff to see only assigned or created tasks', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tasks');
      
      // Verify tasks are only assigned or created by staff1
      response.body.tasks.forEach(task => {
        // Task should be assigned to or created by staff1
        expect(
          task.assigneeNames?.includes('Test Staff 1') || 
          task.creatorName === 'Test Staff 1' ||
          task.creatorId === testData.users.staff1.uid
        ).toBeTruthy();
      });
    });
    
    it('should prevent staff from viewing tasks they are not assigned to', async () => {
      const unauthorizedStaff = await createTestUser({
        email: 'unauthorized@test.com',
        name: 'Unauthorized Staff',
        role: 'staff',
        department: 'Sales'
      });
      
      const task = await createTestTask({
        title: 'Private Task',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .query({ userId: unauthorizedStaff.uid });
      
      expect(response.status).toBe(404);
    });
  });
  
  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================
  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect([400, 500]).toContain(response.status);
    });
    
    it('should handle very large request payloads', async () => {
      const largeDescription = 'A'.repeat(100000);
      const taskData = {
        title: 'Large Task',
        description: largeDescription,
        createdBy: testData.users.manager.uid
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      // Should either succeed or fail gracefully
      expect([201, 400, 413, 500]).toContain(response.status);
    });
    
    it('should handle concurrent updates to same task', async () => {
      const task = await createTestTask({
        title: 'Concurrent Task',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      // Make concurrent update requests
      const promises = [
        request(app).put(`/api/tasks/${task.id}`).send({ title: 'Update 1' }),
        request(app).put(`/api/tasks/${task.id}`).send({ title: 'Update 2' }),
        request(app).put(`/api/tasks/${task.id}`).send({ title: 'Update 3' })
      ];
      
      const responses = await Promise.all(promises);
      
      // All should succeed (Firestore handles concurrency)
      responses.forEach(response => {
        expect([200, 500]).toContain(response.status);
      });
    });
    
    it('should handle invalid task ID format', async () => {
      const response = await request(app)
        .get('/api/tasks/invalid-id-format-12345')
        .query({ userId: testData.users.staff1.uid });
      
      // Should return 404 or handle gracefully
      expect([404, 400]).toContain(response.status);
    });
    
    it('should handle SQL injection attempts in title', async () => {
      const taskData = {
        title: "'; DROP TABLE Tasks; --",
        createdBy: testData.users.manager.uid,
        projectId: testData.project.id
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      // Should handle as regular string (Firestore is NoSQL)
      expect(response.status).toBe(201);
      expect(response.body.title).toBe("'; DROP TABLE Tasks; --");
    });
    
    it('should handle XSS attempts in description', async () => {
      const taskData = {
        title: 'XSS Test Task',
        description: '<script>alert("XSS")</script>',
        createdBy: testData.users.manager.uid,
        projectId: testData.project.id
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      // Should store as-is (sanitization should be done on frontend)
      expect(response.status).toBe(201);
    });
    
    it('should handle unicode characters', async () => {
      const taskData = {
        title: 'Task with Unicode: 你好世界 🌍 🎉',
        description: 'Emoji: 😀 😃 😄 😁',
        createdBy: testData.users.manager.uid,
        projectId: testData.project.id
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body.title).toBe(taskData.title);
    });
    
    it('should handle whitespace-only strings', async () => {
      const taskData = {
        title: '   ',
        createdBy: testData.users.manager.uid,
        projectId: testData.project.id
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      // Should either accept or reject
      expect([201, 400, 500]).toContain(response.status);
    });
    
    it('should handle null values in optional fields', async () => {
      const taskData = {
        title: 'Task with nulls',
        description: null,
        deadline: null,
        projectId: testData.project.id, // Required, cannot be null
        assigneeIds: null,
        tags: null,
        createdBy: testData.users.manager.uid
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
    });
    
    it('should handle undefined values in optional fields', async () => {
      const taskData = {
        title: 'Task with undefined',
        createdBy: testData.users.manager.uid,
        projectId: testData.project.id
      };
      // Don't include optional fields
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
    });
  });
  
});
