import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import { createTestUser, createTestProject, createTestTask, createTestComment, seedTestData, db } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

describe('Task Filtering Data Structure', () => {
  let testData;
  let project1, project2;
  let creator1, creator2;
  let assignee1, assignee2;
  
  beforeEach(async () => {
    testData = await seedTestData();
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
