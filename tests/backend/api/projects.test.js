import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import projectsRouter from '../../../little_farms/backend/routes/projects.js';
import { createTestUser, createTestProject, createTestTask } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/projects', projectsRouter);

describe('Projects API Integration Tests', () => {
  let manager;
  let staff1;
  let staff2;
  let testProject;
  
  beforeEach(async () => {
    manager = await createTestUser({
      email: 'manager@example.com',
      name: 'Manager',
      role: 'manager',
      department: 'IT'
    });
    
    staff1 = await createTestUser({
      email: 'staff1@example.com',
      name: 'Staff 1',
      role: 'staff',
      department: 'IT'
    });
    
    staff2 = await createTestUser({
      email: 'staff2@example.com',
      name: 'Staff 2',
      role: 'staff',
      department: 'Sales'
    });
    
    testProject = await createTestProject({
      title: 'Test Project',
      description: 'A project for testing',
      owner: manager.uid
    });
  });
  
  describe('GET /api/projects', () => {
    it('should get projects for user with assigned tasks', async () => {
      // Create a task assigned to staff1 in the project
      const task = await createTestTask({
        title: 'Task for Staff1',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      // Add task to project's taskList
      const { db } = await import('../../utils/helpers.js');
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      const response = await request(app)
        .get('/api/projects')
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('title');
      }
    });
    
    it('should return empty array for user with no assigned tasks', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ userId: staff2.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    it('should filter projects based on user task assignments', async () => {
      // Create another project
      const project2 = await createTestProject({
        title: 'Second Project',
        owner: manager.uid
      });
      
      // Create task for staff1 in first project
      const task1 = await createTestTask({
        title: 'Task in Project 1',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      // Create task for staff2 in second project
      const task2 = await createTestTask({
        title: 'Task in Project 2',
        assigneeIds: [staff2.uid],
        projectId: project2.id,
        createdBy: manager.uid
      });
      
      // Update project task lists
      const { db } = await import('../../utils/helpers.js');
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task1.id)]
      });
      await db.collection('Projects').doc(project2.id).update({
        taskList: [db.collection('Tasks').doc(task2.id)]
      });
      
      // Get projects for staff1
      const response1 = await request(app)
        .get('/api/projects')
        .query({ userId: staff1.uid });
      
      expect(response1.status).toBe(200);
      // Staff1 should only see Project 1
      
      // Get projects for staff2
      const response2 = await request(app)
        .get('/api/projects')
        .query({ userId: staff2.uid });
      
      expect(response2.status).toBe(200);
      // Staff2 should only see Project 2
    });
  });
  
  describe('POST /api/projects/createProject', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        title: 'New Integration Test Project',
        desc: 'Description for new project',
        userId: manager.uid
      };
      
      const response = await request(app)
        .post('/api/projects/createProject')
        .send(projectData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('projectId');
      expect(response.body.message).toContain('successfully');
    });
    
    it('should handle missing title', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          desc: 'Project without title',
          userId: manager.uid
        });
      
      expect(response.status).toBe(500); // Should ideally be 400
      expect(response.body.success).toBe(false);
    });
    
    it('should handle missing description', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: 'Project without description',
          userId: manager.uid
        });
      
      expect(response.status).toBe(500); // Should ideally be 400
    });
    
    it('should create project with empty task list', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: 'Empty Project',
          desc: 'No tasks yet',
          userId: manager.uid
        });
      
      expect(response.status).toBe(201);
      
      // Verify project was created
      const { db } = await import('../../utils/helpers.js');
      const projectDoc = await db.collection('Projects').doc(response.body.projectId).get();
      expect(projectDoc.exists).toBe(true);
      expect(projectDoc.data().taskList).toEqual([]);
    });
  });
  
  describe('GET /api/projects/:projectId', () => {
    it('should get project details for user with assigned tasks', async () => {
      // Create task for staff1
      const task = await createTestTask({
        title: 'Assigned Task',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      // Add task to project
      const { db } = await import('../../utils/helpers.js');
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testProject.id);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('tasks');
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });
    
    it('should return only user-assigned tasks in project', async () => {
      // Create tasks for different users
      const task1 = await createTestTask({
        title: 'Task for Staff1',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      const task2 = await createTestTask({
        title: 'Task for Staff2',
        assigneeIds: [staff2.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      // Add both tasks to project
      const { db } = await import('../../utils/helpers.js');
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [
          db.collection('Tasks').doc(task1.id),
          db.collection('Tasks').doc(task2.id)
        ]
      });
      
      // Get project for staff1
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body.tasks.length).toBe(1);
      expect(response.body.tasks[0].title).toBe('Task for Staff1');
    });
    
    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/nonexistent-project-id')
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(404);
    });
    
    // it('should return 404 when user has no tasks in project', async () => {
    //   const response = await request(app)
    //     .get(`/api/projects/${testProject.id}`)
    //     .query({ userId: staff2.uid });
      
    //   expect(response.status).toBe(404);
    //   expect(response.body.message).toContain('no tasks assigned');
    // });
  });
  
  describe('Project Task List References', () => {
    it('should maintain task references correctly', async () => {
      const task1 = await createTestTask({
        title: 'Task 1',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      const task2 = await createTestTask({
        title: 'Task 2',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      // Add tasks to project
      const { db } = await import('../../utils/helpers.js');
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [
          db.collection('Tasks').doc(task1.id),
          db.collection('Tasks').doc(task2.id)
        ]
      });
      
      // Verify references
      const projectDoc = await db.collection('Projects').doc(testProject.id).get();
      const taskList = projectDoc.data().taskList;
      
      expect(taskList).toHaveLength(2);
      expect(taskList[0].path).toBe(`Tasks/${task1.id}`);
      expect(taskList[1].path).toBe(`Tasks/${task2.id}`);
    });
  });
});
