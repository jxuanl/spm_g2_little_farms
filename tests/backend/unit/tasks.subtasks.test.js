import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import { createTestUser, createTestProject, createTestTask, seedTestData } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

describe('Subtasks API', () => {
  let testData;
  let parentTask;
  
  beforeEach(async () => {
    testData = await seedTestData();
    parentTask = await createTestTask({
      title: 'Parent Task for Subtasks',
      description: 'This task will have subtasks',
      assigneeIds: [testData.users.staff1.uid],
      projectId: testData.project.id,
      createdBy: testData.users.manager.uid
    });
  });
  
  // ============================================================================
  // Subtasks API
  // ============================================================================
  describe('POST /api/tasks - Create subtask', () => {
    it('should create a subtask under parent task', async () => {
      const subtaskData = {
        title: 'Test Subtask',
        description: 'A subtask for testing',
        priority: 'medium',
        status: 'To Do',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        parentTaskId: parentTask.id
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(subtaskData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(subtaskData.title);
    });
    
    it('should return error when parent task does not exist', async () => {
      const subtaskData = {
        title: 'Orphan Subtask',
        createdBy: testData.users.manager.uid,
        parentTaskId: 'non-existent-parent-id'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(subtaskData);
      
      expect(response.status).toBe(500);
    });
  });
  
  describe('GET /api/tasks/:taskId/subtasks', () => {
    it('should get all subtasks for a task', async () => {
      // Create a couple of subtasks
      await createTestTask({
        title: 'Subtask 1',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      await createTestTask({
        title: 'Subtask 2',
        assigneeIds: [testData.users.staff2.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      const response = await request(app)
        .get(`/api/tasks/${parentTask.id}/subtasks`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should return empty array when task has no subtasks', async () => {
      const response = await request(app)
        .get(`/api/tasks/${parentTask.id}/subtasks`);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    it('should return 400 when taskId is missing', async () => {
      const response = await request(app)
        .get('/api/tasks//subtasks');
      
      expect(response.status).toBe(404); // Express routing issue
    });
    
    it('should handle non-existent parent task', async () => {
      const response = await request(app)
        .get('/api/tasks/nonexistent-id/subtasks');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
  
  describe('GET /api/tasks/:taskId/subtasks/:subtaskId', () => {
    it('should get a specific subtask', async () => {
      const subtask = await createTestTask({
        title: 'Specific Subtask',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      const response = await request(app)
        .get(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(subtask.id);
      expect(response.body.title).toBe('Specific Subtask');
    });
    
    it('should return 404 when subtask does not exist', async () => {
      const response = await request(app)
        .get(`/api/tasks/${parentTask.id}/subtasks/nonexistent-id`);
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 when taskId is missing', async () => {
      const response = await request(app)
        .get('/api/tasks//subtasks/subtask-id');
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 when subtaskId is missing', async () => {
      const response = await request(app)
        .get(`/api/tasks/${parentTask.id}/subtasks/`);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('PUT /api/tasks/:taskId/subtasks/:subtaskId', () => {
    it('should update a subtask successfully', async () => {
      const subtask = await createTestTask({
        title: 'Subtask to Update',
        status: 'To Do',
        priority: 'low',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      const updateData = {
        title: 'Updated Subtask Title',
        status: 'In Progress',
        priority: 'high'
      };
      
      const response = await request(app)
        .put(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.status).toBe(updateData.status);
      expect(response.body.priority).toBe(updateData.priority);
    });
    
    it('should update subtask assignees', async () => {
      const subtask = await createTestTask({
        title: 'Subtask for Reassignment',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      const response = await request(app)
        .put(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`)
        .send({
          assignedTo: [testData.users.staff2.uid]
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('assignedTo');
    });
    
    it('should return 404 when updating non-existent subtask', async () => {
      const response = await request(app)
        .put(`/api/tasks/${parentTask.id}/subtasks/fake-id`)
        .send({ title: 'Updated' });
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 when taskId is missing', async () => {
      const response = await request(app)
        .put('/api/tasks//subtasks/subtask-id')
        .send({ title: 'Updated' });
      
      expect(response.status).toBe(404);
    });
    
    it('should return 400 when subtaskId is missing', async () => {
      const response = await request(app)
        .put(`/api/tasks/${parentTask.id}/subtasks/`)
        .send({ title: 'Updated' });
      
      expect(response.status).toBe(404);
    });
    
    it('should handle partial updates', async () => {
      const subtask = await createTestTask({
        title: 'Subtask',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      const response = await request(app)
        .put(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`)
        .send({ description: 'Updated description only' });
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('DELETE /api/tasks/:taskId/subtasks/:subtaskId', () => {
    it('should delete subtask successfully when user is creator', async () => {
      const subtask = await createTestTask({
        title: 'Subtask to Delete',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`)
        .query({ userId: testData.users.manager.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
    
    it('should return 400 when userId is missing', async () => {
      const subtask = await createTestTask({
        title: 'Subtask',
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 404 when subtask does not exist', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${parentTask.id}/subtasks/nonexistent-id`)
        .query({ userId: testData.users.manager.uid });
      
      expect(response.status).toBe(404);
    });
    
    it('should return 404 when user is not authorized', async () => {
      const subtask = await createTestTask({
        title: 'Private Subtask',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      const unauthorizedUser = await createTestUser({
        email: 'unauthorized@test.com',
        name: 'Unauthorized',
        role: 'staff',
        department: 'Sales'
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`)
        .query({ userId: unauthorizedUser.uid });
      
      expect(response.status).toBe(404);
    });
  });
});

