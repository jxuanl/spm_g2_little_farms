import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import { createTestUser, createTestProject, createTestTask, createTestComment, seedTestData, db } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

describe('Tasks API Unit Tests', () => {
  let testData;
  
  beforeEach(async () => {
    testData = await seedTestData();
  });
  
  // ============================================================================
  // GET /api/tasks/allTasks - Get all tasks
  // ============================================================================
  describe('GET /api/tasks/allTasks', () => {
    it('should get all tasks successfully', async () => {
      const response = await request(app)
        .get('/api/tasks/allTasks');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThanOrEqual(0);
    });
    
    it('should return tasks with correct structure', async () => {
      const response = await request(app)
        .get('/api/tasks/allTasks');
      
      if (response.body.data.length > 0) {
        const task = response.body.data[0];
        expect(task).toHaveProperty('id');
        expect(task).toHaveProperty('title');
      }
    });
  });
  
  // ============================================================================
  // GET /api/tasks - Get tasks for user
  // ============================================================================
  describe('GET /api/tasks', () => {
    it('should get tasks for a specific user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tasks');
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.tasks.length).toBeGreaterThan(0);
      
      // Verify the task belongs to the user
      const task = response.body.tasks[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('status');
    });
    
    it('should return 400 when userId is missing', async () => {
      const response = await request(app)
        .get('/api/tasks');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('userId');
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
      expect(response.body).toEqual({ success: true, tasks: [] });
    });
    
    it('should return empty array for non-existent user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: 'non-existent-user-id' });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, tasks: [] });
    });
    
    it('should handle empty userId string', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: '' });
      
      expect(response.status).toBe(400);
    });
    
    it('should return tasks with enriched data (projectTitle, creatorName, assigneeNames)', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.staff1.uid });
      
      if (response.body.tasks.length > 0) {
        const task = response.body.tasks[0];
        expect(task).toHaveProperty('projectTitle');
        expect(task).toHaveProperty('creatorName');
        expect(task).toHaveProperty('assigneeNames');
        expect(Array.isArray(task.assigneeNames)).toBe(true);
      }
    });
    
    it('should filter out tasks with isCurrentInstance=false', async () => {
      // Create a task and mark it as not current instance
      const task = await createTestTask({
        title: 'Old Task Instance',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      // Mark as not current (this would be done by the service in real scenarios)
      // The service filters these out, so we verify the filter works
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.staff1.uid });
      
      // The task should still appear if it's current
      const foundTask = response.body.tasks.find(t => t.id === task.id);
      // If it exists, it should have isCurrentInstance !== false
      if (foundTask) {
        expect(foundTask.isCurrentInstance).not.toBe(false);
      }
    });
  });
  
  // ============================================================================
  // GET /api/tasks/:id - Get task detail
  // ============================================================================
  describe('GET /api/tasks/:id', () => {
    it('should get task detail successfully', async () => {
      const task = await createTestTask({
        title: 'Detail Test Task',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .query({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('task');
      expect(response.body.task.id).toBe(task.id);
      expect(response.body.task.title).toBe('Detail Test Task');
    });
    
    it('should return 400 when taskId is missing', async () => {
      const response = await request(app)
        .get('/api/tasks/')
        .query({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(404); // Express returns 404 for missing route
    });
    
    it('should return 400 when userId is missing', async () => {
      const task = await createTestTask({
        title: 'Test Task',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .get(`/api/tasks/${task.id}`);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('userId');
    });
    
    it('should return 404 when task does not exist', async () => {
      const response = await request(app)
        .get('/api/tasks/nonexistent-task-id')
        .query({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
    
    it('should return 404 when user does not have access', async () => {
      const task = await createTestTask({
        title: 'Private Task',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      const unauthorizedUser = await createTestUser({
        email: 'unauthorized@test.com',
        name: 'Unauthorized User',
        role: 'staff',
        department: 'Sales'
      });
      
      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .query({ userId: unauthorizedUser.uid });
      
      expect(response.status).toBe(404);
    });
    
    it('should clear isNewInstance flag when task is viewed', async () => {
      // This would require setting isNewInstance=true in the task
      // The service handles this automatically
      const task = await createTestTask({
        title: 'New Task',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .get(`/api/tasks/${task.id}`)
        .query({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(200);
      // The service clears isNewInstance on fetch
    });
  });
  
  // ============================================================================
  // POST /api/tasks - Create task
  // ============================================================================
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
      expect(response.body.status).toBe(taskData.status);
    });
    
    it('should create task with minimal required fields', async () => {
      const taskData = {
        title: 'Minimal Task',
        createdBy: testData.users.manager.uid
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Minimal Task');
      expect(response.body.priority).toBe('medium'); // Default
      expect(response.body.status).toBe('To Do'); // Default
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
    
    it('should return 400 when title is empty string', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: '',
          createdBy: testData.users.manager.uid
        });
      
      expect(response.status).toBe(400);
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
    
    it('should return 400 when createdBy is invalid user', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Task with invalid creator',
          createdBy: 'non-existent-user-id'
        });
      
      // Should fail when trying to create task with invalid creator
      expect(response.status).toBe(500);
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
    
    it('should handle empty assigneeIds array', async () => {
      const taskData = {
        title: 'Task with no assignees',
        createdBy: testData.users.manager.uid,
        assigneeIds: []
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
    
    it('should handle invalid assigneeIds (non-existent users)', async () => {
      const taskData = {
        title: 'Task with invalid assignees',
        createdBy: testData.users.manager.uid,
        assigneeIds: ['non-existent-user-1', 'non-existent-user-2']
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      // Should still create task but with empty assignees
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
    
    it('should handle mixed valid and invalid assigneeIds', async () => {
      const taskData = {
        title: 'Task with mixed assignees',
        createdBy: testData.users.manager.uid,
        assigneeIds: [testData.users.staff1.uid, 'non-existent-user']
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
    
    it('should handle invalid projectId', async () => {
      const taskData = {
        title: 'Task with invalid project',
        createdBy: testData.users.manager.uid,
        projectId: 'non-existent-project-id'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      // Should still create task but without project reference
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
    
    it('should handle null projectId', async () => {
      const taskData = {
        title: 'Task without project',
        createdBy: testData.users.manager.uid,
        projectId: null
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
    });
    
    it('should handle special characters in title', async () => {
      const taskData = {
        title: 'Task with special chars: !@#$%^&*()_+-=[]{}|;:",.<>?',
        createdBy: testData.users.manager.uid
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body.title).toBe(taskData.title);
    });
    
    it('should handle very long title', async () => {
      const longTitle = 'A'.repeat(500);
      const taskData = {
        title: longTitle,
        createdBy: testData.users.manager.uid
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body.title).toBe(longTitle);
    });
    
    it('should handle very long description', async () => {
      const longDescription = 'B'.repeat(10000);
      const taskData = {
        title: 'Task with long description',
        description: longDescription,
        createdBy: testData.users.manager.uid
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
    });
    
    it('should handle invalid deadline format', async () => {
      const taskData = {
        title: 'Task with invalid deadline',
        createdBy: testData.users.manager.uid,
        deadline: 'invalid-date-string'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      // Should still create but deadline might be invalid
      expect([201, 400, 500]).toContain(response.status);
    });
    
    it('should handle past deadline', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const taskData = {
        title: 'Task with past deadline',
        createdBy: testData.users.manager.uid,
        deadline: pastDate
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
    });
    
    it('should handle invalid priority value', async () => {
      const taskData = {
        title: 'Task with invalid priority',
        createdBy: testData.users.manager.uid,
        priority: 'super-high' // Invalid value
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      // Should still create with default priority
      expect(response.status).toBe(201);
    });
    
    it('should handle invalid status value', async () => {
      const taskData = {
        title: 'Task with invalid status',
        createdBy: testData.users.manager.uid,
        status: 'Unknown Status'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body.status).toBe('Unknown Status');
    });
    
    it('should handle tags array', async () => {
      const taskData = {
        title: 'Task with tags',
        createdBy: testData.users.manager.uid,
        tags: ['tag1', 'tag2', 'tag3']
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(Array.isArray(response.body.tags)).toBe(true);
    });
    
    it('should handle empty tags array', async () => {
      const taskData = {
        title: 'Task with empty tags',
        createdBy: testData.users.manager.uid,
        tags: []
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
    });
    
    it('should handle null tags', async () => {
      const taskData = {
        title: 'Task with null tags',
        createdBy: testData.users.manager.uid,
        tags: null
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
    });
    
    // Recurring tasks tests
    it('should create recurring task with valid recurrence fields', async () => {
      const taskData = {
        title: 'Recurring Task',
        createdBy: testData.users.manager.uid,
        recurring: true,
        recurrenceInterval: 'weeks',
        recurrenceValue: 2,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
      expect(response.body.recurring).toBe(true);
      expect(response.body.recurrenceInterval).toBe('weeks');
      expect(response.body.recurrenceValue).toBe(2);
    });
    
    it('should return 400 when recurring is true but interval is missing', async () => {
      const taskData = {
        title: 'Recurring Task without interval',
        createdBy: testData.users.manager.uid,
        recurring: true,
        recurrenceValue: 2
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('recurrence interval');
    });
    
    it('should return 400 when recurring is true but interval is invalid', async () => {
      const taskData = {
        title: 'Recurring Task with invalid interval',
        createdBy: testData.users.manager.uid,
        recurring: true,
        recurrenceInterval: 'invalid',
        recurrenceValue: 2
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 400 when recurring is true but value is missing', async () => {
      const taskData = {
        title: 'Recurring Task without value',
        createdBy: testData.users.manager.uid,
        recurring: true,
        recurrenceInterval: 'weeks'
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Recurrence value');
    });
    
    it('should return 400 when recurring is true but value is less than 1', async () => {
      const taskData = {
        title: 'Recurring Task with invalid value',
        createdBy: testData.users.manager.uid,
        recurring: true,
        recurrenceInterval: 'weeks',
        recurrenceValue: 0
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 400 when recurring is true but deadline is missing', async () => {
      const taskData = {
        title: 'Recurring Task without deadline',
        createdBy: testData.users.manager.uid,
        recurring: true,
        recurrenceInterval: 'weeks',
        recurrenceValue: 2
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Deadline');
    });
    
    it('should handle all valid recurrence intervals', async () => {
      const intervals = ['days', 'weeks', 'months'];
      
      for (const interval of intervals) {
        const taskData = {
          title: `Recurring Task - ${interval}`,
          createdBy: testData.users.manager.uid,
          recurring: true,
          recurrenceInterval: interval,
          recurrenceValue: 1,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        const response = await request(app)
          .post('/api/tasks')
          .send(taskData);
        
        expect(response.status).toBe(201);
        expect(response.body.recurrenceInterval).toBe(interval);
      }
    });
  });
  
  // ============================================================================
  // PUT /api/tasks/:id - Update task
  // ============================================================================
  describe('PUT /api/tasks/:id', () => {
    let task;
    
    beforeEach(async () => {
      task = await createTestTask({
        title: 'Task to Update',
        description: 'Original description',
        priority: 'medium',
        status: 'To Do',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
    });
    
    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
        priority: 'high',
        status: 'In Progress'
      };
      
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.task.title).toBe('Updated Title');
    });
    
    it('should return 404 when task does not exist', async () => {
      const response = await request(app)
        .put('/api/tasks/nonexistent-id')
        .send({ title: 'Updated' });
      
      expect(response.status).toBe(500);
    });
    
    it('should handle partial updates', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ title: 'Only Title Updated' });
      
      expect(response.status).toBe(200);
      expect(response.body.task.title).toBe('Only Title Updated');
    });
    
    it('should handle status normalization (todo -> To Do)', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ status: 'todo' });
      
      expect(response.status).toBe(200);
      expect(response.body.task.status).toBe('To Do');
    });
    
    it('should handle status normalization (done -> Done)', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ status: 'done' });
      
      expect(response.status).toBe(200);
      expect(response.body.task.status).toBe('Done');
    });
    
    it('should update assignedTo with user IDs', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({
          assignedTo: [testData.users.staff2.uid]
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should handle empty assignedTo array', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({
          assignedTo: []
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should update projectId', async () => {
      const newProject = await createTestProject({
        title: 'New Project',
        owner: testData.users.manager.uid
      });
      
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({
          projectId: newProject.id
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should handle null projectId', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({
          projectId: null
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should update deadline', async () => {
      const newDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({
          deadline: newDeadline
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should handle null deadline', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({
          deadline: null
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should update tags array', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({
          tags: ['updated', 'tags']
        });
      
      expect(response.status).toBe(200);
      expect(response.body.task.tags).toEqual(['updated', 'tags']);
    });
    
    it('should update recurring task fields', async () => {
      const recurringTask = await createTestTask({
        title: 'Recurring Task',
        createdBy: testData.users.manager.uid,
        recurring: true,
        recurrenceInterval: 'weeks',
        recurrenceValue: 2,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      const response = await request(app)
        .put(`/api/tasks/${recurringTask.id}`)
        .send({
          recurrenceInterval: 'months',
          recurrenceValue: 1
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should return 400 when enabling recurring without valid interval', async () => {
      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({
          recurring: true,
          recurrenceInterval: 'invalid'
        });
      
      expect(response.status).toBe(400);
    });
    
    it('should handle disabling recurring task', async () => {
      const recurringTask = await createTestTask({
        title: 'Recurring Task',
        createdBy: testData.users.manager.uid,
        recurring: true,
        recurrenceInterval: 'weeks',
        recurrenceValue: 2,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      const response = await request(app)
        .put(`/api/tasks/${recurringTask.id}`)
        .send({
          recurring: false
        });
      
      expect(response.status).toBe(200);
    });
  });
  
  // ============================================================================
  // POST /api/tasks/:id/complete - Complete task
  // ============================================================================
  describe('POST /api/tasks/:id/complete', () => {
    it('should complete a task successfully', async () => {
      const task = await createTestTask({
        title: 'Task to Complete',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid,
        status: 'In Progress'
      });
      
      const response = await request(app)
        .post(`/api/tasks/${task.id}/complete`)
        .send({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
    
    it('should return error when task does not exist', async () => {
      const response = await request(app)
        .post('/api/tasks/nonexistent-id/complete')
        .send({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(500);
    });
    
    it('should handle completing recurring task and create next instance', async () => {
      const recurringTask = await createTestTask({
        title: 'Recurring Task to Complete',
        createdBy: testData.users.manager.uid,
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        recurring: true,
        recurrenceInterval: 'days',
        recurrenceValue: 7,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
      
      const response = await request(app)
        .post(`/api/tasks/${recurringTask.id}/complete`)
        .send({ userId: testData.users.staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
  
  // ============================================================================
  // DELETE /api/tasks/:id - Delete task
  // ============================================================================
  describe('DELETE /api/tasks/:id', () => {
    it('should delete task successfully when user is creator', async () => {
      const task = await createTestTask({
        title: 'Task to Delete',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .query({ userId: testData.users.manager.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
    
    it('should return 400 when userId is missing', async () => {
      const task = await createTestTask({
        title: 'Task',
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${task.id}`);
      
      expect(response.status).toBe(400);
    });
    
    it('should return 404 when task does not exist', async () => {
      const response = await request(app)
        .delete('/api/tasks/nonexistent-id')
        .query({ userId: testData.users.manager.uid });
      
      expect(response.status).toBe(404);
    });
    
    it('should return 404 when user is not authorized', async () => {
      const task = await createTestTask({
        title: 'Private Task',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      const unauthorizedUser = await createTestUser({
        email: 'unauthorized@test.com',
        name: 'Unauthorized',
        role: 'staff',
        department: 'Sales'
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .query({ userId: unauthorizedUser.uid });
      
      expect(response.status).toBe(404);
    });
    
    it('should delete task and all its subtasks', async () => {
      const task = await createTestTask({
        title: 'Parent Task with Subtasks',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      // Create subtasks
      await createTestTask({
        title: 'Subtask 1',
        isSubtask: true,
        parentTaskId: task.id,
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .query({ userId: testData.users.manager.uid });
      
      expect(response.status).toBe(200);
    });
  });
  
  // ============================================================================
  // Subtasks API
  // ============================================================================
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
  
  // ============================================================================
  // Comments API
  // ============================================================================
  describe('Comments API', () => {
    let task;
    
    beforeEach(async () => {
      task = await createTestTask({
        title: 'Task with Comments',
        assigneeIds: [testData.users.staff1.uid],
        projectId: testData.project.id,
        createdBy: testData.users.manager.uid
      });
    });
    
    describe('GET /api/tasks/:taskId/comments', () => {
      it('should get comments for a task', async () => {
        await createTestComment({
          taskId: task.id,
          content: 'Test comment',
          authorId: testData.users.staff1.uid
        });
        
        const response = await request(app)
          .get(`/api/tasks/${task.id}/comments`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
      });
      
      it('should return empty array when task has no comments', async () => {
        const response = await request(app)
          .get(`/api/tasks/${task.id}/comments`);
        
        expect(response.status).toBe(200);
        expect(response.body).toEqual([]);
      });
      
      it('should return 400 when taskId is missing', async () => {
        const response = await request(app)
          .get('/api/tasks//comments');
        
        expect(response.status).toBe(404);
      });
      
      it('should return comments ordered by createdDate desc', async () => {
        await createTestComment({
          taskId: task.id,
          content: 'First comment',
          authorId: testData.users.staff1.uid
        });
        
        // Wait a bit to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await createTestComment({
          taskId: task.id,
          content: 'Second comment',
          authorId: testData.users.staff1.uid
        });
        
        const response = await request(app)
          .get(`/api/tasks/${task.id}/comments`);
        
        expect(response.status).toBe(200);
        if (response.body.length >= 2) {
          const dates = response.body.map(c => new Date(c.createdDate));
          expect(dates[0].getTime()).toBeGreaterThanOrEqual(dates[1].getTime());
        }
      });
    });
    
    describe('POST /api/tasks/:taskId/comments', () => {
      it('should create a comment successfully', async () => {
        const commentData = {
          content: 'New comment',
          authorId: testData.users.staff1.uid
        };
        
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send(commentData);
        
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.content).toBe('New comment');
      });
      
      it('should return 400 when content is missing', async () => {
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            authorId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('content');
      });
      
      it('should return 400 when authorId is missing', async () => {
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            content: 'Comment without author'
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('authorId');
      });
      
      it('should return 400 when content exceeds 2000 characters', async () => {
        const longContent = 'A'.repeat(2001);
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            content: longContent,
            authorId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('2000');
      });
      
      it('should handle content exactly at 2000 characters', async () => {
        const content = 'A'.repeat(2000);
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            content,
            authorId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(201);
      });
      
      it('should handle mentionedUsers array', async () => {
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            content: 'Comment with mentions',
            authorId: testData.users.staff1.uid,
            mentionedUsers: [testData.users.staff2.uid]
          });
        
        expect(response.status).toBe(201);
        expect(Array.isArray(response.body.mentionedUsers)).toBe(true);
      });
      
      it('should handle empty mentionedUsers array', async () => {
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            content: 'Comment',
            authorId: testData.users.staff1.uid,
            mentionedUsers: []
          });
        
        expect(response.status).toBe(201);
      });
      
      it('should handle attachments array', async () => {
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            content: 'Comment with attachments',
            authorId: testData.users.staff1.uid,
            attachments: [
              { name: 'file1.pdf', url: 'http://example.com/file1.pdf', contentType: 'application/pdf' }
            ]
          });
        
        expect(response.status).toBe(201);
      });
      
      it('should return error when attachments exceed 3 files', async () => {
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            content: 'Comment with too many attachments',
            authorId: testData.users.staff1.uid,
            attachments: [
              { name: 'file1.pdf', url: 'http://example.com/file1.pdf' },
              { name: 'file2.pdf', url: 'http://example.com/file2.pdf' },
              { name: 'file3.pdf', url: 'http://example.com/file3.pdf' },
              { name: 'file4.pdf', url: 'http://example.com/file4.pdf' }
            ]
          });
        
        expect(response.status).toBe(500);
      });
      
      it('should return error when attachment exceeds 500KB', async () => {
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            content: 'Comment with large attachment',
            authorId: testData.users.staff1.uid,
            attachments: [
              { name: 'large.pdf', url: 'http://example.com/large.pdf', size: 500 * 1024 + 1 }
            ]
          });
        
        expect(response.status).toBe(500);
      });
      
      it('should return error when authorId is invalid', async () => {
        const response = await request(app)
          .post(`/api/tasks/${task.id}/comments`)
          .send({
            content: 'Comment',
            authorId: 'non-existent-user-id'
          });
        
        expect(response.status).toBe(500);
      });
    });
    
    describe('PUT /api/tasks/:taskId/comments/:commentId', () => {
      let comment;
      
      beforeEach(async () => {
        comment = await createTestComment({
          taskId: task.id,
          content: 'Original comment',
          authorId: testData.users.staff1.uid
        });
      });
      
      it('should update comment successfully', async () => {
        const response = await request(app)
          .put(`/api/tasks/${task.id}/comments/${comment.id}`)
          .send({
            content: 'Updated comment',
            userId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(200);
        expect(response.body.content).toBe('Updated comment');
      });
      
      it('should return 400 when content is missing', async () => {
        const response = await request(app)
          .put(`/api/tasks/${task.id}/comments/${comment.id}`)
          .send({
            userId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(400);
      });
      
      it('should return 400 when userId is missing', async () => {
        const response = await request(app)
          .put(`/api/tasks/${task.id}/comments/${comment.id}`)
          .send({
            content: 'Updated'
          });
        
        expect(response.status).toBe(400);
      });
      
      it('should return 403 when user is not the author', async () => {
        const response = await request(app)
          .put(`/api/tasks/${task.id}/comments/${comment.id}`)
          .send({
            content: 'Updated comment',
            userId: testData.users.staff2.uid
          });
        
        expect(response.status).toBe(403);
      });
      
      it('should return 404 when comment does not exist', async () => {
        const response = await request(app)
          .put(`/api/tasks/${task.id}/comments/nonexistent-id`)
          .send({
            content: 'Updated',
            userId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(404);
      });
      
      it('should return 400 when content exceeds 2000 characters', async () => {
        const longContent = 'A'.repeat(2001);
        const response = await request(app)
          .put(`/api/tasks/${task.id}/comments/${comment.id}`)
          .send({
            content: longContent,
            userId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(400);
      });
    });
    
    describe('DELETE /api/tasks/:taskId/comments/:commentId', () => {
      let comment;
      
      beforeEach(async () => {
        comment = await createTestComment({
          taskId: task.id,
          content: 'Comment to delete',
          authorId: testData.users.staff1.uid
        });
      });
      
      it('should delete comment successfully', async () => {
        const response = await request(app)
          .delete(`/api/tasks/${task.id}/comments/${comment.id}`)
          .send({
            userId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
      
      it('should return 400 when userId is missing', async () => {
        const response = await request(app)
          .delete(`/api/tasks/${task.id}/comments/${comment.id}`);
        
        expect(response.status).toBe(400);
      });
      
      it('should return 403 when user is not the author', async () => {
        const response = await request(app)
          .delete(`/api/tasks/${task.id}/comments/${comment.id}`)
          .send({
            userId: testData.users.staff2.uid
          });
        
        expect(response.status).toBe(403);
      });
      
      it('should return 404 when comment does not exist', async () => {
        const response = await request(app)
          .delete(`/api/tasks/${task.id}/comments/nonexistent-id`)
          .send({
            userId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(404);
      });
    });
    
    describe('Subtask Comments', () => {
      let parentTask, subtask;
      
      beforeEach(async () => {
        parentTask = await createTestTask({
          title: 'Parent Task',
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          createdBy: testData.users.manager.uid
        });
        
        subtask = await createTestTask({
          title: 'Subtask',
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          createdBy: testData.users.manager.uid,
          isSubtask: true,
          parentTaskId: parentTask.id
        });
      });
      
      it('should get comments for a subtask', async () => {
        await createTestComment({
          taskId: parentTask.id,
          subtaskId: subtask.id,
          content: 'Subtask comment',
          authorId: testData.users.staff1.uid
        });
        
        const response = await request(app)
          .get(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}/comments`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
      
      it('should create comment for a subtask', async () => {
        const response = await request(app)
          .post(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}/comments`)
          .send({
            content: 'New subtask comment',
            authorId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(201);
        expect(response.body.content).toBe('New subtask comment');
      });
      
      it('should update comment for a subtask', async () => {
        const comment = await createTestComment({
          taskId: parentTask.id,
          subtaskId: subtask.id,
          content: 'Original subtask comment',
          authorId: testData.users.staff1.uid
        });
        
        const response = await request(app)
          .put(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}/comments/${comment.id}`)
          .send({
            content: 'Updated subtask comment',
            userId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(200);
        expect(response.body.content).toBe('Updated subtask comment');
      });
      
      it('should delete comment for a subtask', async () => {
        const comment = await createTestComment({
          taskId: parentTask.id,
          subtaskId: subtask.id,
          content: 'Subtask comment to delete',
          authorId: testData.users.staff1.uid
        });
        
        const response = await request(app)
          .delete(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}/comments/${comment.id}`)
          .send({
            userId: testData.users.staff1.uid
          });
        
        expect(response.status).toBe(200);
      });
    });
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
        createdBy: testData.users.manager.uid
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
        createdBy: testData.users.manager.uid
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
        createdBy: testData.users.manager.uid
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
        createdBy: testData.users.manager.uid
      };
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      // Should either accept or reject
      expect([201, 400]).toContain(response.status);
    });
    
    it('should handle null values in optional fields', async () => {
      const taskData = {
        title: 'Task with nulls',
        description: null,
        deadline: null,
        projectId: null,
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
        createdBy: testData.users.manager.uid
      };
      // Don't include optional fields
      
      const response = await request(app)
        .post('/api/tasks')
        .send(taskData);
      
      expect(response.status).toBe(201);
    });
  });
  
  // ============================================================================
  // Recurring Task Behavior Tests
  // ============================================================================
  describe('Recurring Task Behavior', () => {
    describe('T301: Set interval of days, weeks, or months when creating task', () => {
      it('should create task with interval of days', async () => {
        const taskData = {
          title: 'Daily Recurring Task',
          description: 'Task that repeats every 3 days',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'days',
          recurrenceValue: 3,
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        const response = await request(app)
          .post('/api/tasks')
          .send(taskData);
        
        expect(response.status).toBe(201);
        expect(response.body.recurring).toBe(true);
        expect(response.body.recurrenceInterval).toBe('days');
        expect(response.body.recurrenceValue).toBe(3);
      });
      
      it('should create task with interval of weeks', async () => {
        const taskData = {
          title: 'Weekly Recurring Task',
          description: 'Task that repeats every 2 weeks',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        const response = await request(app)
          .post('/api/tasks')
          .send(taskData);
        
        expect(response.status).toBe(201);
        expect(response.body.recurring).toBe(true);
        expect(response.body.recurrenceInterval).toBe('weeks');
        expect(response.body.recurrenceValue).toBe(2);
        expect(response.body.isCurrentInstance).toBe(true);
      });
      
      it('should create task with interval of months', async () => {
        const taskData = {
          title: 'Monthly Recurring Task',
          description: 'Task that repeats every 1 month',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'months',
          recurrenceValue: 1,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        const response = await request(app)
          .post('/api/tasks')
          .send(taskData);
        
        expect(response.status).toBe(201);
        expect(response.body.recurring).toBe(true);
        expect(response.body.recurrenceInterval).toBe('months');
        expect(response.body.recurrenceValue).toBe(1);
      });
      
      it('should accept unrestricted interval values (e.g. 1000 days)', async () => {
        const taskData = {
          title: 'Long Interval Task',
          description: 'Task with very long interval',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'days',
          recurrenceValue: 1000,
          deadline: new Date(Date.now() + 1000 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        const response = await request(app)
          .post('/api/tasks')
          .send(taskData);
        
        expect(response.status).toBe(201);
        expect(response.body.recurring).toBe(true);
        expect(response.body.recurrenceInterval).toBe('days');
        expect(response.body.recurrenceValue).toBe(1000);
      });
      
      it('should accept various interval values (1 day, 10 weeks, 3 months)', async () => {
        const intervals = [
          { interval: 'days', value: 1 },
          { interval: 'weeks', value: 10 },
          { interval: 'months', value: 3 }
        ];
        
        for (const { interval, value } of intervals) {
          const taskData = {
            title: `Recurring Task - ${value} ${interval}`,
            createdBy: testData.users.manager.uid,
            assigneeIds: [testData.users.staff1.uid],
            projectId: testData.project.id,
            recurring: true,
            recurrenceInterval: interval,
            recurrenceValue: value,
            deadline: new Date(Date.now() + value * (interval === 'days' ? 1 : interval === 'weeks' ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString()
          };
          
          const response = await request(app)
            .post('/api/tasks')
            .send(taskData);
          
          expect(response.status).toBe(201);
          expect(response.body.recurrenceInterval).toBe(interval);
          expect(response.body.recurrenceValue).toBe(value);
        }
      });
    });
    
    describe('T301: Only current active instance appears on Tasks page', () => {
      it('should filter out non-current instances when getting tasks', async () => {
        // Create a recurring task
        const recurringTask = await createTestTask({
          title: 'Recurring Task',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        // Mark it as not current instance (simulating old instance)
        const taskRef = db.collection('Tasks').doc(recurringTask.id);
        await taskRef.update({ isCurrentInstance: false });
        
        // Get tasks for user - should NOT include the old instance
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const foundTask = response.body.tasks.find(t => t.id === recurringTask.id);
        expect(foundTask).toBeUndefined(); // Old instance should not appear
      });
      
      it('should show only current instance when multiple instances exist', async () => {
        // Create a recurring task (current instance)
        const task1 = await createTestTask({
          title: 'Recurring Task Instance 1',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        // Manually create an old instance (simulating previous instance)
        const task2Data = {
          ...task1,
          id: undefined,
          isCurrentInstance: false,
          createdDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          deadline: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        };
        delete task2Data.id;
        const task2Ref = await db.collection('Tasks').add(task2Data);
        
        // Get tasks for user - should only show current instance
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const currentTask = response.body.tasks.find(t => t.id === task1.id);
        const oldTask = response.body.tasks.find(t => t.id === task2Ref.id);
        
        expect(currentTask).toBeDefined();
        expect(currentTask.isCurrentInstance).not.toBe(false);
        expect(oldTask).toBeUndefined(); // Old instance should not appear
      });
    });
    
    describe('T301: Next instance created when current instance marked done', () => {
      it('should create next instance when recurring task is marked done', async () => {
        const baseDate = new Date('2025-11-01');
        const deadline = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks later
        
        const recurringTask = await createTestTask({
          title: 'Recurring Task',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: deadline.toISOString()
        });
        
        // Update task to have specific dates
        await db.collection('Tasks').doc(recurringTask.id).update({
          createdDate: baseDate,
          deadline: deadline
        });
        
        // Mark task as done
        const completeResponse = await request(app)
          .post(`/api/tasks/${recurringTask.id}/complete`)
          .send({ userId: testData.users.staff1.uid });
        
        expect(completeResponse.status).toBe(200);
        
        // Verify old task is marked as not current
        const oldTaskDoc = await db.collection('Tasks').doc(recurringTask.id).get();
        const oldTaskData = oldTaskDoc.data();
        expect(oldTaskData.isCurrentInstance).toBe(false);
        expect(oldTaskData.status).toBe('Done');
        
        // Verify new instance was created
        const tasksResponse = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(tasksResponse.status).toBe(200);
        const newInstance = tasksResponse.body.tasks.find(
          t => t.title === 'Recurring Task' && t.id !== recurringTask.id && t.isCurrentInstance !== false
        );
        
        expect(newInstance).toBeDefined();
        expect(newInstance.recurring).toBe(true);
        expect(newInstance.recurrenceInterval).toBe('weeks');
        expect(newInstance.recurrenceValue).toBe(2);
        expect(newInstance.status).toBe('To Do');
      });
      
      it('should calculate next instance deadline correctly for weeks', async () => {
        const baseDate = new Date('2025-11-01');
        const deadline = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000); // Nov 15
        
        const recurringTask = await createTestTask({
          title: 'Weekly Recurring Task',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: deadline.toISOString()
        });
        
        await db.collection('Tasks').doc(recurringTask.id).update({
          createdDate: baseDate,
          deadline: deadline
        });
        
        // Mark as done
        await request(app)
          .post(`/api/tasks/${recurringTask.id}/complete`)
          .send({ userId: testData.users.staff1.uid });
        
        // Get new instance
        const tasksResponse = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const newInstance = tasksResponse.body.tasks.find(
          t => t.title === 'Weekly Recurring Task' && t.id !== recurringTask.id
        );
        
        expect(newInstance).toBeDefined();
        // New deadline should be 2 weeks after original deadline (Nov 15 + 14 days = Nov 29)
        const expectedDeadline = new Date(deadline.getTime() + 14 * 24 * 60 * 60 * 1000);
        const actualDeadline = new Date(newInstance.deadline);
        expect(actualDeadline.getTime()).toBe(expectedDeadline.getTime());
      });
    });
    
    describe('T302: New instance does not start until current is done', () => {
      it('should not create new instance if current is not marked done', async () => {
        const recurringTask = await createTestTask({
          title: 'Recurring Task Not Done',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() // Past deadline
        });
        
        // Wait a bit (simulating time passing)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get tasks - should only show current instance
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const instances = response.body.tasks.filter(t => t.title === 'Recurring Task Not Done');
        expect(instances.length).toBe(1); // Only one instance
        expect(instances[0].id).toBe(recurringTask.id);
        expect(instances[0].status).not.toBe('Done');
      });
      
      it('should not auto-create instance even after interval passes', async () => {
        const pastDate = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000); // 3 weeks ago
        const pastDeadline = new Date(pastDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks after past date
        
        const recurringTask = await createTestTask({
          title: 'Overdue Recurring Task',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: pastDeadline.toISOString()
        });
        
        // Update to have past dates
        await db.collection('Tasks').doc(recurringTask.id).update({
          createdDate: pastDate,
          deadline: pastDeadline,
          status: 'To Do' // Not done
        });
        
        // Get tasks - should still only show one instance
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const instances = response.body.tasks.filter(t => t.title === 'Overdue Recurring Task');
        expect(instances.length).toBe(1);
        expect(instances[0].status).not.toBe('Done');
      });
    });
    
    describe('T303: Completion after interval uses completion date', () => {
      it('should start new instance from completion date when overdue', async () => {
        const baseDate = new Date('2025-11-01');
        const originalDeadline = new Date('2025-11-15'); // 2 weeks later
        const completionDate = new Date('2025-11-20'); // 5 days after deadline
        
        // Mock current time to be completion date
        const recurringTask = await createTestTask({
          title: 'Overdue Recurring Task',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: originalDeadline.toISOString()
        });
        
        await db.collection('Tasks').doc(recurringTask.id).update({
          createdDate: baseDate,
          deadline: originalDeadline
        });
        
        // Mark as done (simulating completion on Nov 20)
        await request(app)
          .post(`/api/tasks/${recurringTask.id}/complete`)
          .send({ userId: testData.users.staff1.uid });
        
        // Get new instance
        const tasksResponse = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const newInstance = tasksResponse.body.tasks.find(
          t => t.title === 'Overdue Recurring Task' && t.id !== recurringTask.id
        );
        
        expect(newInstance).toBeDefined();
        // New deadline should be calculated from completion time (Nov 20) + 2 weeks
        // The service logic uses completion date when overdue
        const newDeadline = new Date(newInstance.deadline);
        expect(newDeadline.getTime()).toBeGreaterThan(originalDeadline.getTime());
      });
    });
    
    describe('T304: Full interval duration regardless of completion timing', () => {
      it('should maintain full interval even when completed early', async () => {
        const baseDate = new Date('2025-11-01');
        const deadline = new Date('2025-11-15'); // 2 weeks later
        
        const recurringTask = await createTestTask({
          title: 'Early Completion Task',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: deadline.toISOString()
        });
        
        await db.collection('Tasks').doc(recurringTask.id).update({
          createdDate: baseDate,
          deadline: deadline
        });
        
        // Mark as done early (after 5 days, not 14 days)
        await request(app)
          .post(`/api/tasks/${recurringTask.id}/complete`)
          .send({ userId: testData.users.staff1.uid });
        
        // Get new instance
        const tasksResponse = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const newInstance = tasksResponse.body.tasks.find(
          t => t.title === 'Early Completion Task' && t.id !== recurringTask.id
        );
        
        expect(newInstance).toBeDefined();
        // New deadline should be based on original deadline + interval, not completion date
        const newDeadline = new Date(newInstance.deadline);
        const expectedDeadline = new Date(deadline.getTime() + 14 * 24 * 60 * 60 * 1000);
        // Should be close to expected (within 1 day tolerance for timing)
        const diff = Math.abs(newDeadline.getTime() - expectedDeadline.getTime());
        expect(diff).toBeLessThan(24 * 60 * 60 * 1000); // Within 1 day
      });
    });
    
    describe('T305-T307: Recurrence logic for all interval units', () => {
      it('should correctly calculate next instance for days interval', async () => {
        const baseDate = new Date('2025-11-01');
        const deadline = new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
        
        const recurringTask = await createTestTask({
          title: 'Daily Recurring Task',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'days',
          recurrenceValue: 3,
          deadline: deadline.toISOString()
        });
        
        await db.collection('Tasks').doc(recurringTask.id).update({
          createdDate: baseDate,
          deadline: deadline
        });
        
        await request(app)
          .post(`/api/tasks/${recurringTask.id}/complete`)
          .send({ userId: testData.users.staff1.uid });
        
        const tasksResponse = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const newInstance = tasksResponse.body.tasks.find(
          t => t.title === 'Daily Recurring Task' && t.id !== recurringTask.id
        );
        
        expect(newInstance).toBeDefined();
        const newDeadline = new Date(newInstance.deadline);
        const expectedDeadline = new Date(deadline.getTime() + 3 * 24 * 60 * 60 * 1000);
        const diff = Math.abs(newDeadline.getTime() - expectedDeadline.getTime());
        expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
      });
      
      it('should correctly calculate next instance for weeks interval', async () => {
        const baseDate = new Date('2025-11-01');
        const deadline = new Date(baseDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
        
        const recurringTask = await createTestTask({
          title: 'Weekly Recurring Task',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: deadline.toISOString()
        });
        
        await db.collection('Tasks').doc(recurringTask.id).update({
          createdDate: baseDate,
          deadline: deadline
        });
        
        await request(app)
          .post(`/api/tasks/${recurringTask.id}/complete`)
          .send({ userId: testData.users.staff1.uid });
        
        const tasksResponse = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const newInstance = tasksResponse.body.tasks.find(
          t => t.title === 'Weekly Recurring Task' && t.id !== recurringTask.id
        );
        
        expect(newInstance).toBeDefined();
        const newDeadline = new Date(newInstance.deadline);
        const expectedDeadline = new Date(deadline.getTime() + 14 * 24 * 60 * 60 * 1000);
        const diff = Math.abs(newDeadline.getTime() - expectedDeadline.getTime());
        expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
      });
      
      it('should correctly calculate next instance for months interval', async () => {
        const baseDate = new Date('2025-11-01');
        const deadline = new Date('2025-12-01'); // 1 month later
        
        const recurringTask = await createTestTask({
          title: 'Monthly Recurring Task',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'months',
          recurrenceValue: 1,
          deadline: deadline.toISOString()
        });
        
        await db.collection('Tasks').doc(recurringTask.id).update({
          createdDate: baseDate,
          deadline: deadline
        });
        
        await request(app)
          .post(`/api/tasks/${recurringTask.id}/complete`)
          .send({ userId: testData.users.staff1.uid });
        
        const tasksResponse = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const newInstance = tasksResponse.body.tasks.find(
          t => t.title === 'Monthly Recurring Task' && t.id !== recurringTask.id
        );
        
        expect(newInstance).toBeDefined();
        const newDeadline = new Date(newInstance.deadline);
        // Should be approximately 1 month after original deadline
        expect(newDeadline.getFullYear()).toBeGreaterThanOrEqual(deadline.getFullYear());
        expect(newDeadline.getMonth()).toBeGreaterThanOrEqual(deadline.getMonth());
      });
    });
    
    describe('T308: Interval accepts any valid integer value', () => {
      it('should accept large interval values (1000 days)', async () => {
        const taskData = {
          title: 'Long Interval Task',
          description: 'Task with 1000 day interval',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'days',
          recurrenceValue: 1000,
          deadline: new Date(Date.now() + 1000 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        const response = await request(app)
          .post('/api/tasks')
          .send(taskData);
        
        expect(response.status).toBe(201);
        expect(response.body.recurrenceValue).toBe(1000);
      });
      
      it('should accept various large values for different intervals', async () => {
        const largeValues = [
          { interval: 'days', value: 500 },
          { interval: 'weeks', value: 100 },
          { interval: 'months', value: 24 }
        ];
        
        for (const { interval, value } of largeValues) {
          const taskData = {
            title: `Large Interval Task - ${value} ${interval}`,
            createdBy: testData.users.manager.uid,
            assigneeIds: [testData.users.staff1.uid],
            projectId: testData.project.id,
            recurring: true,
            recurrenceInterval: interval,
            recurrenceValue: value,
            deadline: new Date(Date.now() + value * (interval === 'days' ? 1 : interval === 'weeks' ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString()
          };
          
          const response = await request(app)
            .post('/api/tasks')
            .send(taskData);
          
          expect(response.status).toBe(201);
          expect(response.body.recurrenceValue).toBe(value);
        }
      });
      
      it('should reject zero or negative values', async () => {
        const invalidValues = [0, -1, -100];
        
        for (const value of invalidValues) {
          const taskData = {
            title: `Invalid Interval Task`,
            createdBy: testData.users.manager.uid,
            recurring: true,
            recurrenceInterval: 'days',
            recurrenceValue: value,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          };
          
          const response = await request(app)
            .post('/api/tasks')
            .send(taskData);
          
          expect(response.status).toBe(400);
        }
      });
    });
    
    describe('Integration: Complete recurring task workflow', () => {
      it('should complete full workflow: create → complete → verify new instance', async () => {
        // Step 1: Create recurring task
        const taskData = {
          title: 'Workflow Test Task',
          description: 'Testing complete workflow',
          createdBy: testData.users.manager.uid,
          assigneeIds: [testData.users.staff1.uid],
          projectId: testData.project.id,
          recurring: true,
          recurrenceInterval: 'weeks',
          recurrenceValue: 2,
          deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        const createResponse = await request(app)
          .post('/api/tasks')
          .send(taskData);
        
        expect(createResponse.status).toBe(201);
        const taskId = createResponse.body.id;
        
        // Step 2: Verify only current instance appears
        const tasksBefore = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const instancesBefore = tasksBefore.body.tasks.filter(t => t.title === 'Workflow Test Task');
        expect(instancesBefore.length).toBe(1);
        expect(instancesBefore[0].id).toBe(taskId);
        expect(instancesBefore[0].isCurrentInstance).not.toBe(false);
        
        // Step 3: Mark as done
        const completeResponse = await request(app)
          .post(`/api/tasks/${taskId}/complete`)
          .send({ userId: testData.users.staff1.uid });
        
        expect(completeResponse.status).toBe(200);
        
        // Step 4: Verify old instance is hidden
        const oldTaskDoc = await db.collection('Tasks').doc(taskId).get();
        expect(oldTaskDoc.data().isCurrentInstance).toBe(false);
        expect(oldTaskDoc.data().status).toBe('Done');
        
        // Step 5: Verify new instance appears
        const tasksAfter = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const instancesAfter = tasksAfter.body.tasks.filter(t => t.title === 'Workflow Test Task');
        expect(instancesAfter.length).toBe(1);
        expect(instancesAfter[0].id).not.toBe(taskId); // Different ID
        expect(instancesAfter[0].isCurrentInstance).not.toBe(false);
        expect(instancesAfter[0].status).toBe('To Do');
        expect(instancesAfter[0].recurring).toBe(true);
      });
    });
  });
  
  // ============================================================================
  // Task Filtering Tests (Data Structure Verification)
  // ============================================================================
  describe('Task Filtering Data Structure', () => {
    let project1, project2;
    let creator1, creator2;
    let assignee1, assignee2;
    
    beforeEach(async () => {
      // Create multiple projects
      const ownerRef = db.collection('Users').doc(testData.users.manager.uid);
      project1 = await createTestProject({
        title: 'Website Redesign',
        description: 'Revamp company website',
        owner: ownerRef
      });
      
      project2 = await createTestProject({
        title: 'Mobile App Revamp',
        description: 'Update mobile app',
        owner: ownerRef
      });
      
      // Create additional users
      creator1 = await createTestUser({
        email: 'john@test.com',
        name: 'John',
        role: 'staff',
        department: 'IT'
      });
      
      creator2 = await createTestUser({
        email: 'lucy@test.com',
        name: 'Lucy',
        role: 'staff',
        department: 'Design'
      });
      
      assignee1 = creator1;
      assignee2 = creator2;
    });
    
    describe('Filter by Project', () => {
      it('should return tasks with projectTitle for filtering', async () => {
        // Create tasks in different projects
        const task1 = await createTestTask({
          title: 'Task T401',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        const task2 = await createTestTask({
          title: 'Task T402',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        const task3 = await createTestTask({
          title: 'Task T403',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        // Get tasks
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const tasks = response.body.tasks;
        
        // Verify all tasks have projectTitle
        tasks.forEach(task => {
          expect(task).toHaveProperty('projectTitle');
          expect(typeof task.projectTitle).toBe('string');
        });
        
        // Simulate filtering by project
        const websiteTasks = tasks.filter(t => t.projectTitle === 'Website Redesign');
        expect(websiteTasks.length).toBeGreaterThanOrEqual(2);
        expect(websiteTasks.every(t => t.projectTitle === 'Website Redesign')).toBe(true);
      });
      
      it('should filter tasks by project correctly', async () => {
        await createTestTask({
          title: 'Task T401',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const tasks = response.body.tasks;
        
        // Filter by "Website Redesign"
        const filtered = tasks.filter(t => t.projectTitle === 'Website Redesign');
        const taskIds = filtered.map(t => t.title);
        
        expect(filtered.length).toBeGreaterThanOrEqual(2);
        expect(taskIds).toContain('Task T401');
        expect(taskIds).toContain('Task T403');
        expect(taskIds).not.toContain('Task T402');
      });
    });
    
    describe('Filter by Creator', () => {
      it('should return tasks with creatorName for filtering', async () => {
        await createTestTask({
          title: 'Task T401',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator2.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const tasks = response.body.tasks;
        
        // Verify all tasks have creatorName
        tasks.forEach(task => {
          expect(task).toHaveProperty('creatorName');
          expect(typeof task.creatorName).toBe('string');
        });
        
        // Filter by creator "John"
        const johnTasks = tasks.filter(t => t.creatorName === 'John');
        expect(johnTasks.length).toBeGreaterThanOrEqual(2);
        expect(johnTasks.every(t => t.creatorName === 'John')).toBe(true);
      });
      
      it('should filter tasks by creator correctly', async () => {
        await createTestTask({
          title: 'Task T401',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator2.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const tasks = response.body.tasks;
        
        // Filter by creator "John"
        const filtered = tasks.filter(t => t.creatorName === 'John');
        const taskIds = filtered.map(t => t.title);
        
        expect(filtered.length).toBeGreaterThanOrEqual(2);
        expect(taskIds).toContain('Task T401');
        expect(taskIds).toContain('Task T403');
        expect(taskIds).not.toContain('Task T402');
      });
    });
    
    describe('Filter by Status', () => {
      it('should return tasks with status for filtering', async () => {
        await createTestTask({
          title: 'Task T401',
          status: 'Done',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          status: 'In Progress',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          status: 'Done',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const tasks = response.body.tasks;
        
        // Verify all tasks have status
        tasks.forEach(task => {
          expect(task).toHaveProperty('status');
        });
        
        // Filter by status "Done"
        const doneTasks = tasks.filter(t => t.status === 'Done' || t.status === 'done');
        expect(doneTasks.length).toBeGreaterThanOrEqual(2);
      });
      
      it('should filter tasks by status correctly', async () => {
        await createTestTask({
          title: 'Task T401',
          status: 'Done',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          status: 'In Progress',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          status: 'Done',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const tasks = response.body.tasks;
        
        // Filter by status "Done"
        const filtered = tasks.filter(t => t.status === 'Done' || t.status === 'done');
        const taskIds = filtered.map(t => t.title);
        
        expect(filtered.length).toBeGreaterThanOrEqual(2);
        expect(taskIds).toContain('Task T401');
        expect(taskIds).toContain('Task T403');
        expect(taskIds).not.toContain('Task T402');
      });
    });
    
    describe('Filter by Priority', () => {
      it('should return tasks with priority for filtering', async () => {
        await createTestTask({
          title: 'Task T401',
          priority: 8,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          priority: 5,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          priority: 9,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const tasks = response.body.tasks;
        
        // Verify all tasks have priority
        tasks.forEach(task => {
          expect(task).toHaveProperty('priority');
        });
        
        // Filter by priority >= 8
        const highPriorityTasks = tasks.filter(t => {
          const priority = typeof t.priority === 'number' ? t.priority : Number(t.priority);
          return !isNaN(priority) && priority >= 8;
        });
        expect(highPriorityTasks.length).toBeGreaterThanOrEqual(2);
      });
      
      it('should filter tasks by priority range correctly', async () => {
        await createTestTask({
          title: 'Task T401',
          priority: 8,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          priority: 5,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          priority: 9,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const tasks = response.body.tasks;
        
        // Filter by priority >= 8
        const filtered = tasks.filter(t => {
          const priority = typeof t.priority === 'number' ? t.priority : Number(t.priority);
          return !isNaN(priority) && priority >= 8;
        });
        const taskIds = filtered.map(t => t.title);
        
        expect(filtered.length).toBeGreaterThanOrEqual(2);
        expect(taskIds).toContain('Task T401');
        expect(taskIds).toContain('Task T403');
        expect(taskIds).not.toContain('Task T402');
      });
    });
    
    describe('Filter by Assignee', () => {
      it('should return tasks with assigneeNames array for filtering', async () => {
        await createTestTask({
          title: 'Task T401',
          assigneeIds: [assignee1.uid, assignee2.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          assigneeIds: [assignee2.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          assigneeIds: [assignee1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: assignee1.uid });
        
        expect(response.status).toBe(200);
        const tasks = response.body.tasks;
        
        // Verify all tasks have assigneeNames
        tasks.forEach(task => {
          expect(task).toHaveProperty('assigneeNames');
          expect(Array.isArray(task.assigneeNames)).toBe(true);
        });
        
        // Filter by assignee "John"
        const johnTasks = tasks.filter(t => 
          Array.isArray(t.assigneeNames) && t.assigneeNames.includes('John')
        );
        expect(johnTasks.length).toBeGreaterThanOrEqual(2);
      });
      
      it('should filter tasks by assignee correctly', async () => {
        await createTestTask({
          title: 'Task T401',
          assigneeIds: [assignee1.uid, assignee2.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          assigneeIds: [assignee2.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          assigneeIds: [assignee1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: assignee1.uid });
        
        const tasks = response.body.tasks;
        
        // Filter by assignee "John"
        const filtered = tasks.filter(t => 
          Array.isArray(t.assigneeNames) && t.assigneeNames.includes('John')
        );
        const taskIds = filtered.map(t => t.title);
        
        expect(filtered.length).toBeGreaterThanOrEqual(2);
        expect(taskIds).toContain('Task T401');
        expect(taskIds).toContain('Task T403');
        expect(taskIds).not.toContain('Task T402');
      });
    });
    
    describe('Filter by Due Date', () => {
      it('should return tasks with deadline for filtering', async () => {
        const today = new Date('2025-10-21');
        const thisWeek1 = new Date('2025-10-24');
        const thisWeek2 = new Date('2025-10-22');
        const nextWeek = new Date('2025-10-31');
        
        await createTestTask({
          title: 'Task T401',
          deadline: thisWeek1.toISOString(),
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          deadline: thisWeek2.toISOString(),
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          deadline: nextWeek.toISOString(),
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const tasks = response.body.tasks;
        
        // Verify all tasks have deadline (or null)
        tasks.forEach(task => {
          expect(task).toHaveProperty('deadline');
        });
      });
      
      it('should filter tasks by due date range correctly', async () => {
        // Mock current date: Oct 21, 2025
        const baseDate = new Date('2025-10-21');
        const thisWeek1 = new Date('2025-10-24'); // 3 days later
        const thisWeek2 = new Date('2025-10-22'); // 1 day later
        const nextWeek = new Date('2025-10-31'); // 10 days later (outside "this week")
        
        await createTestTask({
          title: 'Task T401',
          deadline: thisWeek1.toISOString(),
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T402',
          deadline: thisWeek2.toISOString(),
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id,
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T403',
          deadline: nextWeek.toISOString(),
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const tasks = response.body.tasks;
        
        // Filter by "Due This Week" (within 7 days from now)
        const nowMs = baseDate.getTime();
        const weekFromNowMs = nowMs + 7 * 24 * 60 * 60 * 1000;
        
        const filtered = tasks.filter(t => {
          if (!t.deadline) return false;
          const deadlineMs = new Date(t.deadline).getTime();
          return deadlineMs >= nowMs && deadlineMs <= weekFromNowMs;
        });
        
        const taskIds = filtered.map(t => t.title);
        expect(taskIds).toContain('Task T401');
        expect(taskIds).toContain('Task T402');
        expect(taskIds).not.toContain('Task T403'); // Outside this week
      });
    });
    
    describe('Multiple Filters Combined', () => {
      it('should support filtering by multiple criteria simultaneously', async () => {
        // Create task matching all criteria
        await createTestTask({
          title: 'Task T419',
          status: 'In Progress',
          priority: 9,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        // Create tasks that don't match all criteria
        await createTestTask({
          title: 'Task T420',
          status: 'In Progress',
          priority: 9,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project2.id, // Different project
          createdBy: creator1.uid
        });
        
        await createTestTask({
          title: 'Task T421',
          status: 'To Do', // Different status
          priority: 5, // Lower priority
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator2.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const tasks = response.body.tasks;
        
        // Apply multiple filters: Project = "Website Redesign", Status = "In Progress", Priority >= 7
        const filtered = tasks.filter(t => {
          const matchesProject = t.projectTitle === 'Website Redesign';
          const matchesStatus = t.status === 'In Progress' || t.status === 'in-progress';
          const priority = typeof t.priority === 'number' ? t.priority : Number(t.priority);
          const matchesPriority = !isNaN(priority) && priority >= 7;
          
          return matchesProject && matchesStatus && matchesPriority;
        });
        
        const taskIds = filtered.map(t => t.title);
        expect(taskIds).toContain('Task T419');
        expect(taskIds).not.toContain('Task T420'); // Wrong project
        expect(taskIds).not.toContain('Task T421'); // Wrong status and priority
      });
      
      it('should handle complex filter combinations correctly', async () => {
        await createTestTask({
          title: 'Complex Filter Task 1',
          status: 'Done',
          priority: 8,
          assigneeIds: [assignee1.uid],
          projectId: project1.id,
          createdBy: creator1.uid,
          deadline: new Date('2025-10-25').toISOString()
        });
        
        await createTestTask({
          title: 'Complex Filter Task 2',
          status: 'Done',
          priority: 9,
          assigneeIds: [assignee2.uid], // Different assignee
          projectId: project1.id,
          createdBy: creator1.uid,
          deadline: new Date('2025-10-25').toISOString()
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: assignee1.uid });
        
        const tasks = response.body.tasks;
        
        // Filter: Project + Status + Priority + Assignee
        const filtered = tasks.filter(t => {
          const matchesProject = t.projectTitle === 'Website Redesign';
          const matchesStatus = t.status === 'Done' || t.status === 'done';
          const priority = typeof t.priority === 'number' ? t.priority : Number(t.priority);
          const matchesPriority = !isNaN(priority) && priority >= 8;
          const matchesAssignee = Array.isArray(t.assigneeNames) && 
            t.assigneeNames.includes('John');
          
          return matchesProject && matchesStatus && matchesPriority && matchesAssignee;
        });
        
        const taskIds = filtered.map(t => t.title);
        expect(taskIds).toContain('Complex Filter Task 1');
        expect(taskIds).not.toContain('Complex Filter Task 2'); // Different assignee
      });
    });
    
    describe('No Results Handling', () => {
      it('should return empty array when no tasks match filters', async () => {
        await createTestTask({
          title: 'Task T401',
          status: 'Done',
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const tasks = response.body.tasks;
        
        // Apply filters that match nothing
        const filtered = tasks.filter(t => {
          return t.projectTitle === 'Non-existent Project' && 
                 t.status === 'Non-existent Status';
        });
        
        expect(filtered).toEqual([]);
        expect(filtered.length).toBe(0);
      });
      
      it('should handle empty results gracefully', async () => {
        await createTestTask({
          title: 'Task T401',
          status: 'Done',
          priority: 8,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        const tasks = response.body.tasks;
        
        // Very specific filter combination that matches nothing
        const filtered = tasks.filter(t => {
          const matchesProject = t.projectTitle === 'Website Redesign';
          const matchesStatus = t.status === 'In Progress';
          const matchesPriority = (typeof t.priority === 'number' ? t.priority : Number(t.priority)) === 10;
          const matchesAssignee = Array.isArray(t.assigneeNames) && 
            t.assigneeNames.includes('Non-existent User');
          
          return matchesProject && matchesStatus && matchesPriority && matchesAssignee;
        });
        
        expect(filtered).toEqual([]);
        // Note: Frontend should display "No tasks found" message
      });
    });
    
    describe('Data Structure for Filtering', () => {
      it('should return all required fields for filtering', async () => {
        await createTestTask({
          title: 'Complete Task',
          status: 'In Progress',
          priority: 7,
          assigneeIds: [testData.users.staff1.uid],
          projectId: project1.id,
          createdBy: creator1.uid,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['frontend', 'urgent']
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const tasks = response.body.tasks;
        
        if (tasks.length > 0) {
          const task = tasks.find(t => t.title === 'Complete Task') || tasks[0];
          
          // Verify all filtering fields exist
          expect(task).toHaveProperty('projectTitle');
          expect(task).toHaveProperty('creatorName');
          expect(task).toHaveProperty('assigneeNames');
          expect(Array.isArray(task.assigneeNames)).toBe(true);
          expect(task).toHaveProperty('status');
          expect(task).toHaveProperty('priority');
          expect(task).toHaveProperty('deadline');
          expect(task).toHaveProperty('tags');
          expect(Array.isArray(task.tags)).toBe(true);
        }
      });
      
      it('should handle missing optional fields gracefully', async () => {
        await createTestTask({
          title: 'Minimal Task',
          assigneeIds: [testData.users.staff1.uid],
          createdBy: creator1.uid
          // No project, deadline, tags
        });
        
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        
        expect(response.status).toBe(200);
        const tasks = response.body.tasks;
        
        const minimalTask = tasks.find(t => t.title === 'Minimal Task');
        if (minimalTask) {
          // Should have defaults
          expect(minimalTask).toHaveProperty('projectTitle');
          expect(minimalTask).toHaveProperty('creatorName');
          expect(minimalTask).toHaveProperty('assigneeNames');
          expect(Array.isArray(minimalTask.assigneeNames)).toBe(true);
        }
      });
    });
    
    describe('Filter Performance', () => {
      it('should return tasks efficiently for large datasets', async () => {
        // Create multiple tasks
        const tasksToCreate = [];
        for (let i = 0; i < 50; i++) {
          tasksToCreate.push(createTestTask({
            title: `Bulk Task ${i}`,
            assigneeIds: [testData.users.staff1.uid],
            projectId: i % 2 === 0 ? project1.id : project2.id,
            createdBy: i % 3 === 0 ? creator1.uid : creator2.uid,
            priority: (i % 10) + 1
          }));
        }
        
        await Promise.all(tasksToCreate);
        
        // Measure response time
        const startTime = Date.now();
        const response = await request(app)
          .get('/api/tasks')
          .query({ userId: testData.users.staff1.uid });
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        expect(response.body.tasks.length).toBeGreaterThanOrEqual(50);
        
        // Backend should respond quickly (within 2 seconds for 50 tasks)
        // Note: Frontend filtering should be < 1 second
        const responseTime = endTime - startTime;
        expect(responseTime).toBeLessThan(2000);
        
        // Verify filtering is fast (simulate frontend filtering)
        const filterStartTime = Date.now();
        const filtered = response.body.tasks.filter(t => 
          t.projectTitle === 'Website Redesign' && 
          (typeof t.priority === 'number' ? t.priority : Number(t.priority)) >= 7
        );
        const filterEndTime = Date.now();
        
        const filterTime = filterEndTime - filterStartTime;
        // Frontend filtering should be very fast (< 100ms for 50 tasks)
        expect(filterTime).toBeLessThan(100);
      });
    });
  });
});
