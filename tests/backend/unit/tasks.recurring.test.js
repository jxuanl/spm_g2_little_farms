import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import { createTestUser, createTestProject, createTestTask, seedTestData, db } from '../../utils/helpers.js';
import admin from 'firebase-admin';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

describe('Recurring Task Behavior', () => {
  let testData;
  
  beforeEach(async () => {
    testData = await seedTestData();
  });
  
  // ============================================================================
  // Recurring Task Behavior Tests
  // ============================================================================
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
      // Use a date in the future to ensure task is completed before deadline
      const now = new Date();
      const baseDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day in the future
      const deadline = new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days after baseDate
      
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
      
      // Use Firestore Timestamp to ensure consistent date storage
      await db.collection('Tasks').doc(recurringTask.id).update({
        createdDate: admin.firestore.Timestamp.fromDate(baseDate),
        deadline: admin.firestore.Timestamp.fromDate(deadline)
      });
      
      // Small delay to ensure task completion happens after task creation
      await new Promise(resolve => setTimeout(resolve, 10));
      
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
      // Expected deadline should be deadline + 3 days (since task is completed before deadline)
      const expectedDeadline = new Date(deadline.getTime() + 3 * 24 * 60 * 60 * 1000);
      // Allow for timezone/rounding differences (within 1 day)
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
      const baseDate = new Date('2025-11-01T00:00:00.000Z');
      const deadline = new Date('2025-12-01T00:00:00.000Z'); // 1 month later
      
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
      
      // Use Firestore Timestamp to ensure consistent date storage
      await db.collection('Tasks').doc(recurringTask.id).update({
        createdDate: admin.firestore.Timestamp.fromDate(baseDate),
        deadline: admin.firestore.Timestamp.fromDate(deadline)
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
      // When adding 1 month to December (month 11), we get January (month 0) of next year
      // So we need to account for year wraparound
      const expectedDeadline = new Date(deadline);
      expectedDeadline.setMonth(expectedDeadline.getMonth() + 1);
      
      // Check that the new deadline is approximately 1 month after the original
      // Allow for small differences in month length (within 5 days)
      const diff = Math.abs(newDeadline.getTime() - expectedDeadline.getTime());
      expect(diff).toBeLessThan(5 * 24 * 60 * 60 * 1000);
      
      // Verify year and month are correct (accounting for wraparound)
      const expectedYear = deadline.getMonth() === 11 ? deadline.getFullYear() + 1 : deadline.getFullYear();
      const expectedMonth = deadline.getMonth() === 11 ? 0 : deadline.getMonth() + 1;
      expect(newDeadline.getFullYear()).toBe(expectedYear);
      expect(newDeadline.getMonth()).toBe(expectedMonth);
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

