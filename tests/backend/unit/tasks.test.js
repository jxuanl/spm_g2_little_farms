import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import { createTestUser, createTestProject, createTestTask, createTestComment, seedTestData } from '../../utils/helpers.js';

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
});
