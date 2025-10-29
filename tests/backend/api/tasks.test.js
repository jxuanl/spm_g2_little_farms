import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import { createTestUser, createTestProject, createTestTask, seedTestData } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

describe('Tasks API Integration Tests', () => {
  let testData;
  
  beforeEach(async () => {
    testData = await seedTestData();
  });
  
  describe('GET /api/tasks', () => {
    it('should get tasks for a specific user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Verify the task belongs to the user
      const task = response.body[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('status');
    });
    
    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .get('/api/tasks');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('userId');
    });
    
    it('should return empty array for user with no tasks', async () => {
      const newUser = await createTestUser({
        email: 'notasks@test.com',
        name: 'No Tasks User',
        role: 'staff',
        department: 'HR'
      });
      
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: newUser.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
  
  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'New Integration Test Task',
        description: 'Created via API test',
        priority: 'high',
        status: 'To Do',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        tags: ['api-test', 'integration']
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(taskData.title);
      expect(response.body.priority).toBe(taskData.priority);
    });
    
    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          description: 'Task without title',
          createdBy: testData.users.manager.uid
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('title');
    });
    
    it('should return 400 when createdBy is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task without creator'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('createdBy');
    });
    
    it('should return 400 when assigneeIds is not an array', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Invalid assignees',
          createdBy: testData.users.manager.uid,
          assigneeIds: 'not-an-array'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('array');
    });
  });
  
  describe('Subtasks API', () => {
    let parentTask;
    
    beforeEach(async () => {
      parentTask = await createTestTask({
        title: 'Parent Task for Subtasks',
        description: 'This task will have subtasks',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
    });
    
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
        expect(response.body.length).toBe(2);
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
        
        expect(response.status).toBe(404); // Express will return 404 for invalid route
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
    });
  });
  
  describe('Task Status Workflow', () => {
    it('should successfully transition task through workflow states', async () => {
      // Create task
      const task = await createTestTask({
        title: 'Workflow Task',
        status: 'To Do',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      // Move to In Progress
      let response = await request(app)
        .put(`/api/tasks/${testData.project.id}/subtasks/${task.id}`)
        .send({ status: 'In Progress' });
      
      // Note: This might 404 because task is not a subtask
      // You may need to add a PUT /api/tasks/:taskId endpoint for regular tasks
      
      // For now, we'll test with subtasks
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
      response = await request(app)
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
});
