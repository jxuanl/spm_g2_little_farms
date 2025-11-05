import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import { createTestUser, createTestProject, createTestTask, seedTestData, db } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

/**
 * Simulate frontend filtering logic for assignee search
 * This matches the logic in TaskList.vue: assigneeOptions computed property
 */
function filterAssigneeNames(tasks, searchQuery) {
  // Collect all unique assignee names from tasks
  const nameSet = new Set();
  for (const task of tasks) {
    if (Array.isArray(task.assigneeNames)) {
      for (const name of task.assigneeNames) {
        if (name) nameSet.add(name);
      }
    }
  }
  const all = Array.from(nameSet);
  
  // Filter based on search query (case-insensitive substring match)
  const query = searchQuery.toLowerCase();
  return query ? all.filter(name => name.toLowerCase().includes(query)) : all;
}

describe('Assignee Search Functionality', () => {
  let testData;
  let project1;
  let alexTan, alexSmith, alexanderLee, johnTan, otherStaff;
  
  beforeEach(async () => {
    testData = await seedTestData();
    
    // Create project
    const ownerRef = db.collection('Users').doc(testData.users.manager.uid);
    project1 = await createTestProject({
      title: 'Test Project',
      description: 'Test project for assignee search',
      owner: ownerRef
    });
    
    // Create users with various names for testing
    alexTan = await createTestUser({
      email: 'alextan@test.com',
      name: 'Alex Tan',
      role: 'staff',
      department: 'IT'
    });
    
    alexSmith = await createTestUser({
      email: 'alexsmith@test.com',
      name: 'Alex Smith',
      role: 'staff',
      department: 'Design'
    });
    
    alexanderLee = await createTestUser({
      email: 'alexanderlee@test.com',
      name: 'Alexander Lee',
      role: 'staff',
      department: 'Sales'
    });
    
    johnTan = await createTestUser({
      email: 'johntan@test.com',
      name: 'John Tan',
      role: 'staff',
      department: 'Marketing'
    });
    
    otherStaff = await createTestUser({
      email: 'other@test.com',
      name: 'Other Staff',
      role: 'staff',
      department: 'HR'
    });
  });

  describe('Exact Name Search - "Alex Tan"', () => {
    it('should return only "Alex Tan" when searching for "Alex Tan"', async () => {
      // Create tasks assigned to different people
      await createTestTask({
        title: 'Task for Alex Tan',
        assigneeIds: [alexTan.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      await createTestTask({
        title: 'Task for Alex Smith',
        assigneeIds: [alexSmith.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      await createTestTask({
        title: 'Task for Alexander Lee',
        assigneeIds: [alexanderLee.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      await createTestTask({
        title: 'Task for John Tan',
        assigneeIds: [johnTan.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      // Get tasks as HR (can see all tasks)
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tasks');
      
      const tasks = response.body.tasks;
      
      // Verify tasks have assigneeNames
      tasks.forEach(task => {
        expect(task).toHaveProperty('assigneeNames');
        expect(Array.isArray(task.assigneeNames)).toBe(true);
      });
      
      // Filter assignee names using search query "Alex Tan"
      const searchQuery = 'Alex Tan';
      const filteredNames = filterAssigneeNames(tasks, searchQuery);
      
      // Should only return "Alex Tan"
      expect(filteredNames.length).toBe(1);
      expect(filteredNames).toContain('Alex Tan');
      expect(filteredNames).not.toContain('Alex Smith');
      expect(filteredNames).not.toContain('Alexander Lee');
      expect(filteredNames).not.toContain('John Tan');
    });
    
    it('should return results within 1 second for "Alex Tan" search', async () => {
      // Create multiple tasks to test performance
      const tasksToCreate = [];
      for (let i = 0; i < 20; i++) {
        tasksToCreate.push(createTestTask({
          title: `Task ${i}`,
          assigneeIds: i % 2 === 0 ? [alexTan.uid] : [alexSmith.uid],
          projectId: project1.id,
          createdBy: testData.users.manager.uid
        }));
      }
      await Promise.all(tasksToCreate);
      
      // Measure response time
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      
      const tasks = response.body.tasks;
      const responseTime = endTime - startTime;
      
      // Backend response should be within 1 second
      expect(responseTime).toBeLessThan(1000);
      
      // Measure filtering time (simulating frontend)
      const filterStartTime = Date.now();
      const filteredNames = filterAssigneeNames(tasks, 'Alex Tan');
      const filterEndTime = Date.now();
      
      const filterTime = filterEndTime - filterStartTime;
      
      // Frontend filtering should be very fast (< 100ms)
      expect(filterTime).toBeLessThan(100);
      
      // Verify correctness
      expect(filteredNames).toContain('Alex Tan');
      expect(filteredNames).not.toContain('Alex Smith');
    });
  });

  describe('Dynamic Progressive Search - "A" → "Al" → "Ale" → "Alex"', () => {
    beforeEach(async () => {
      // Create tasks assigned to different people for progressive search testing
      await createTestTask({
        title: 'Task 1',
        assigneeIds: [alexTan.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      await createTestTask({
        title: 'Task 2',
        assigneeIds: [alexSmith.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      await createTestTask({
        title: 'Task 3',
        assigneeIds: [alexanderLee.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      await createTestTask({
        title: 'Task 4',
        assigneeIds: [johnTan.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      await createTestTask({
        title: 'Task 5',
        assigneeIds: [otherStaff.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
    });
    
    it('should filter dynamically after typing "A"', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      // Simulate typing "A"
      const filteredA = filterAssigneeNames(tasks, 'A');
      
      // Should include all names starting with "A"
      expect(filteredA.length).toBeGreaterThanOrEqual(3);
      expect(filteredA).toContain('Alex Tan');
      expect(filteredA).toContain('Alex Smith');
      expect(filteredA).toContain('Alexander Lee');
      // Should not include names not starting with "A"
      expect(filteredA).not.toContain('John Tan');
      expect(filteredA).not.toContain('Other Staff');
      
      // Measure filtering time
      const startTime = Date.now();
      filterAssigneeNames(tasks, 'A');
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
    
    it('should filter dynamically after typing "Al"', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      // Simulate typing "Al"
      const filteredAl = filterAssigneeNames(tasks, 'Al');
      
      // Should include all names containing "Al"
      expect(filteredAl.length).toBeGreaterThanOrEqual(3);
      expect(filteredAl).toContain('Alex Tan');
      expect(filteredAl).toContain('Alex Smith');
      expect(filteredAl).toContain('Alexander Lee');
      // Should not include names not containing "Al"
      expect(filteredAl).not.toContain('John Tan');
      expect(filteredAl).not.toContain('Other Staff');
      
      // Measure filtering time
      const startTime = Date.now();
      filterAssigneeNames(tasks, 'Al');
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
    
    it('should filter dynamically after typing "Ale"', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      // Simulate typing "Ale"
      const filteredAle = filterAssigneeNames(tasks, 'Ale');
      
      // Should include all names containing "Ale"
      expect(filteredAle.length).toBeGreaterThanOrEqual(3);
      expect(filteredAle).toContain('Alex Tan');
      expect(filteredAle).toContain('Alex Smith');
      expect(filteredAle).toContain('Alexander Lee');
      // Should not include names not containing "Ale"
      expect(filteredAle).not.toContain('John Tan');
      expect(filteredAle).not.toContain('Other Staff');
      
      // Measure filtering time
      const startTime = Date.now();
      filterAssigneeNames(tasks, 'Ale');
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
    
    it('should filter dynamically after typing "Alex"', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      // Simulate typing "Alex"
      const filteredAlex = filterAssigneeNames(tasks, 'Alex');
      
      // Should include all names containing "Alex"
      expect(filteredAlex.length).toBeGreaterThanOrEqual(3);
      expect(filteredAlex).toContain('Alex Tan');
      expect(filteredAlex).toContain('Alex Smith');
      expect(filteredAlex).toContain('Alexander Lee');
      // Should not include names not containing "Alex"
      expect(filteredAlex).not.toContain('John Tan');
      expect(filteredAlex).not.toContain('Other Staff');
      
      // Measure filtering time
      const startTime = Date.now();
      filterAssigneeNames(tasks, 'Alex');
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
    
    it('should update filter progressively with each keystroke', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      // Simulate progressive typing: "A" → "Al" → "Ale" → "Alex"
      const resultsA = filterAssigneeNames(tasks, 'A');
      const resultsAl = filterAssigneeNames(tasks, 'Al');
      const resultsAle = filterAssigneeNames(tasks, 'Ale');
      const resultsAlex = filterAssigneeNames(tasks, 'Alex');
      
      // Each progressive filter should be a subset or equal to the previous
      // (More specific queries should have fewer or equal results)
      expect(resultsAlex.length).toBeLessThanOrEqual(resultsAle.length);
      expect(resultsAle.length).toBeLessThanOrEqual(resultsAl.length);
      expect(resultsAl.length).toBeLessThanOrEqual(resultsA.length);
      
      // All should contain "Alex Tan", "Alex Smith", "Alexander Lee"
      [resultsA, resultsAl, resultsAle, resultsAlex].forEach(results => {
        expect(results).toContain('Alex Tan');
        expect(results).toContain('Alex Smith');
        expect(results).toContain('Alexander Lee');
      });
      
      // None should contain names not matching the pattern
      [resultsA, resultsAl, resultsAle, resultsAlex].forEach(results => {
        expect(results).not.toContain('John Tan');
        expect(results).not.toContain('Other Staff');
      });
      
      // Each update should be fast
      const queries = ['A', 'Al', 'Ale', 'Alex'];
      queries.forEach(query => {
        const startTime = Date.now();
        filterAssigneeNames(tasks, query);
        const endTime = Date.now();
        expect(endTime - startTime).toBeLessThan(100);
      });
    });
    
    it('should update filter results within 1 second for each keystroke', async () => {
      // Create more tasks to test performance with larger dataset
      const tasksToCreate = [];
      for (let i = 0; i < 30; i++) {
        const assigneeId = i % 5 === 0 ? alexTan.uid :
                          i % 5 === 1 ? alexSmith.uid :
                          i % 5 === 2 ? alexanderLee.uid :
                          i % 5 === 3 ? johnTan.uid : otherStaff.uid;
        
        tasksToCreate.push(createTestTask({
          title: `Performance Task ${i}`,
          assigneeIds: [assigneeId],
          projectId: project1.id,
          createdBy: testData.users.manager.uid
        }));
      }
      await Promise.all(tasksToCreate);
      
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      // Test each progressive search query
      const queries = ['A', 'Al', 'Ale', 'Alex'];
      
      for (const query of queries) {
        const startTime = Date.now();
        const filteredNames = filterAssigneeNames(tasks, query);
        const endTime = Date.now();
        
        const filterTime = endTime - startTime;
        
        // Each filter update should complete within 1 second (actually much faster)
        expect(filterTime).toBeLessThan(1000);
        
        // Verify results are correct
        expect(filteredNames.length).toBeGreaterThanOrEqual(3);
        expect(filteredNames).toContain('Alex Tan');
        expect(filteredNames).toContain('Alex Smith');
        expect(filteredNames).toContain('Alexander Lee');
      }
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle case-insensitive search for "alex tan"', async () => {
      await createTestTask({
        title: 'Task for Alex Tan',
        assigneeIds: [alexTan.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      // Test lowercase search
      const filteredLower = filterAssigneeNames(tasks, 'alex tan');
      expect(filteredLower).toContain('Alex Tan');
      
      // Test uppercase search
      const filteredUpper = filterAssigneeNames(tasks, 'ALEX TAN');
      expect(filteredUpper).toContain('Alex Tan');
      
      // Test mixed case search
      const filteredMixed = filterAssigneeNames(tasks, 'AlEx TaN');
      expect(filteredMixed).toContain('Alex Tan');
    });
  });

  describe('Edge Cases', () => {
    it('should return all assignees when search query is empty', async () => {
      await createTestTask({
        title: 'Task 1',
        assigneeIds: [alexTan.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      await createTestTask({
        title: 'Task 2',
        assigneeIds: [alexSmith.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      const allNames = filterAssigneeNames(tasks, '');
      expect(allNames.length).toBeGreaterThanOrEqual(2);
      expect(allNames).toContain('Alex Tan');
      expect(allNames).toContain('Alex Smith');
    });
    
    it('should return empty array when no assignees match search query', async () => {
      await createTestTask({
        title: 'Task 1',
        assigneeIds: [alexTan.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      const filteredNames = filterAssigneeNames(tasks, 'NonExistentName123');
      expect(filteredNames).toEqual([]);
    });
    
    it('should handle tasks with multiple assignees correctly', async () => {
      await createTestTask({
        title: 'Task with multiple assignees',
        assigneeIds: [alexTan.uid, alexSmith.uid, johnTan.uid],
        projectId: project1.id,
        createdBy: testData.users.manager.uid
      });
      
      const response = await request(app)
        .get('/api/tasks')
        .query({ userId: testData.users.hr.uid });
      
      expect(response.status).toBe(200);
      const tasks = response.body.tasks;
      
      // Verify all assignee names are present
      const task = tasks.find(t => t.title === 'Task with multiple assignees');
      expect(task).toBeDefined();
      expect(Array.isArray(task.assigneeNames)).toBe(true);
      expect(task.assigneeNames.length).toBe(3);
      expect(task.assigneeNames).toContain('Alex Tan');
      expect(task.assigneeNames).toContain('Alex Smith');
      expect(task.assigneeNames).toContain('John Tan');
      
      // Filter should include all matching assignees
      const filteredNames = filterAssigneeNames(tasks, 'Alex');
      expect(filteredNames).toContain('Alex Tan');
      expect(filteredNames).toContain('Alex Smith');
    });
  });
});

