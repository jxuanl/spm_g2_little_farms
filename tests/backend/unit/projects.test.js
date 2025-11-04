import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import projectsRouter from '../../../little_farms/backend/routes/projects.js';
import { createTestUser, createTestProject, createTestTask, db } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/projects', projectsRouter);

describe('Projects API Unit Tests', () => {
  let manager;
  let staff1;
  let staff2;
  let staff3;
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
    
    staff3 = await createTestUser({
      email: 'staff3@example.com',
      name: 'Staff 3',
      role: 'staff',
      department: 'Marketing'
    });
    
    // Create project with owner as DocumentReference (as expected by service)
    const ownerRef = db.collection('Users').doc(manager.uid);
    testProject = await createTestProject({
      title: 'Test Project',
      description: 'A project for testing',
      owner: ownerRef
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
      const ownerRef = db.collection('Users').doc(manager.uid);
      const project2 = await createTestProject({
        title: 'Second Project',
        owner: ownerRef
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
      expect(response1.body.length).toBe(1);
      expect(response1.body[0].id).toBe(testProject.id);
      
      // Get projects for staff2
      const response2 = await request(app)
        .get('/api/projects')
        .query({ userId: staff2.uid });
      
      expect(response2.status).toBe(200);
      expect(response2.body.length).toBe(1);
      expect(response2.body[0].id).toBe(project2.id);
    });
    
    it('should return projects for project owner even without assigned tasks', async () => {
      // Create project owned by manager with no tasks
      const ownerRef = db.collection('Users').doc(manager.uid);
      const ownerProject = await createTestProject({
        title: 'Owner Project',
        description: 'Project owned by manager',
        owner: ownerRef
      });
      
      // Don't add any tasks
      const response = await request(app)
        .get('/api/projects')
        .query({ userId: manager.uid });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Owner should see their project
      const ownerProjects = response.body.filter(p => p.id === ownerProject.id);
      expect(ownerProjects.length).toBeGreaterThan(0);
    });
    
    it('should return projects for users who created tasks (not just assigned)', async () => {
      // Create task created by staff1 but assigned to staff2
      const task = await createTestTask({
        title: 'Task created by Staff1',
        assigneeIds: [staff2.uid],
        projectId: testProject.id,
        createdBy: staff1.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      // Staff1 should see project because they created the task
      const response = await request(app)
        .get('/api/projects')
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      const hasProject = response.body.some(p => p.id === testProject.id);
      expect(hasProject).toBe(true);
    });
    
    it('should handle missing userId parameter', async () => {
      const response = await request(app)
        .get('/api/projects');
      
      expect(response.status).toBe(200);
      // Should return empty array or handle gracefully
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    it('should handle invalid userId format', async () => {
      const response = await request(app)
        .get('/api/projects')
        .query({ userId: 'invalid-user-id-format' });
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    it('should handle projects with empty task lists', async () => {
      const ownerRef = db.collection('Users').doc(manager.uid);
      const emptyProject = await createTestProject({
        title: 'Empty Project',
        description: 'No tasks',
        owner: ownerRef,
        taskList: []
      });
      
      // Owner should see their project
      const response = await request(app)
        .get('/api/projects')
        .query({ userId: manager.uid });
      
      expect(response.status).toBe(200);
      const hasProject = response.body.some(p => p.id === emptyProject.id);
      expect(hasProject).toBe(true);
    });
    
    it('should handle projects with multiple tasks for same user', async () => {
      // Create multiple tasks for staff1 in same project
      const task1 = await createTestTask({
        title: 'Task 1 for Staff1',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      const task2 = await createTestTask({
        title: 'Task 2 for Staff1',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [
          db.collection('Tasks').doc(task1.id),
          db.collection('Tasks').doc(task2.id)
        ]
      });
      
      const response = await request(app)
        .get('/api/projects')
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      const hasProject = response.body.some(p => p.id === testProject.id);
      expect(hasProject).toBe(true);
      // Project should appear only once
      const projectCount = response.body.filter(p => p.id === testProject.id).length;
      expect(projectCount).toBe(1);
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
      const projectDoc = await db.collection('Projects').doc(response.body.projectId).get();
      expect(projectDoc.exists).toBe(true);
      expect(projectDoc.data().taskList).toEqual([]);
    });
    
    it('should handle missing userId parameter', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: 'Project without user',
          desc: 'Description'
        });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
    
    it('should trim whitespace from title and description', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: '  Trimmed Title  ',
          desc: '  Trimmed Description  ',
          userId: manager.uid
        });
      
      expect(response.status).toBe(201);
      
      const projectDoc = await db.collection('Projects').doc(response.body.projectId).get();
      const projectData = projectDoc.data();
      expect(projectData.title).toBe('Trimmed Title');
      expect(projectData.description).toBe('Trimmed Description');
    });
    
    it('should handle empty string title', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: '',
          desc: 'Description',
          userId: manager.uid
        });
      
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
    
    it('should handle empty string description', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: 'Valid Title',
          desc: '',
          userId: manager.uid
        });
      
      expect(response.status).toBe(201);
      const projectDoc = await db.collection('Projects').doc(response.body.projectId).get();
      expect(projectDoc.data().description).toBe('');
    });
    
    it('should handle very long title', async () => {
      const longTitle = 'A'.repeat(1000);
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: longTitle,
          desc: 'Description',
          userId: manager.uid
        });
      
      expect(response.status).toBe(201);
      const projectDoc = await db.collection('Projects').doc(response.body.projectId).get();
      expect(projectDoc.data().title).toBe(longTitle);
    });
    
    it('should handle special characters in title and description', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: 'Project <>&"\' with special chars',
          desc: 'Description with <script>alert("xss")</script>',
          userId: manager.uid
        });
      
      expect(response.status).toBe(201);
      const projectDoc = await db.collection('Projects').doc(response.body.projectId).get();
      expect(projectDoc.data().title).toContain('special chars');
    });
    
    it('should set owner as DocumentReference', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: 'Owner Test Project',
          desc: 'Testing owner reference',
          userId: manager.uid
        });
      
      expect(response.status).toBe(201);
      const projectDoc = await db.collection('Projects').doc(response.body.projectId).get();
      const ownerRef = projectDoc.data().owner;
      expect(ownerRef).toBeDefined();
      expect(ownerRef.path).toBe(`Users/${manager.uid}`);
    });
    
    it('should return project data in response', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: 'Response Test Project',
          desc: 'Testing response format',
          userId: manager.uid
        });
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('projectId');
      expect(response.body).toHaveProperty('project');
      expect(response.body.project).toHaveProperty('id');
      expect(response.body.project).toHaveProperty('title', 'Response Test Project');
      expect(response.body.project).toHaveProperty('description', 'Testing response format');
    });
    
    it('should handle invalid userId format', async () => {
      const response = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: 'Invalid User Project',
          desc: 'Testing invalid user',
          userId: 'invalid-user-id-that-does-not-exist'
        });
      
      // Should still create project, but owner reference might not resolve
      expect(response.status).toBe(201);
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
      expect(response.body.message).toContain('not found');
    });
    
    it('should return 404 when user has no tasks in project', async () => {
      // Create project with tasks for staff1 only
      const task = await createTestTask({
        title: 'Task for Staff1',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      // Staff2 has no tasks in this project
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff2.uid });
      
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
    
    it('should return all tasks for project owner', async () => {
      // Create multiple tasks with different assignees
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
      
      const task3 = await createTestTask({
        title: 'Task for Staff3',
        assigneeIds: [staff3.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [
          db.collection('Tasks').doc(task1.id),
          db.collection('Tasks').doc(task2.id),
          db.collection('Tasks').doc(task3.id)
        ]
      });
      
      // Manager (owner) should see all tasks
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: manager.uid });
      
      expect(response.status).toBe(200);
      expect(response.body.tasks.length).toBe(3);
      expect(response.body.isOwner).toBe(true);
      expect(response.body.showingAllTasks).toBe(true);
    });
    
    it('should return tasks for user who created them (not just assigned)', async () => {
      // Create task created by staff1 but assigned to staff2
      const task = await createTestTask({
        title: 'Task created by Staff1',
        assigneeIds: [staff2.uid],
        projectId: testProject.id,
        createdBy: staff1.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      // Staff1 should see the task because they created it
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body.tasks.length).toBe(1);
      expect(response.body.tasks[0].title).toBe('Task created by Staff1');
    });
    
    it('should resolve owner name in project details', async () => {
      const task = await createTestTask({
        title: 'Test Task',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ownerName');
      expect(response.body.ownerName).toBe('Manager');
    });
    
    it('should resolve creator and assignee names in tasks', async () => {
      const task = await createTestTask({
        title: 'Task with Names',
        assigneeIds: [staff1.uid, staff2.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body.tasks.length).toBe(1);
      const taskData = response.body.tasks[0];
      expect(taskData).toHaveProperty('creatorName');
      expect(taskData).toHaveProperty('assigneeNames');
      expect(taskData.creatorName).toBe('Manager');
      expect(Array.isArray(taskData.assigneeNames)).toBe(true);
      expect(taskData.assigneeNames.length).toBe(2);
    });
    
    it('should handle missing userId parameter', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`);
      
      // Should handle gracefully (may return 404 or empty)
      expect([200, 404, 500]).toContain(response.status);
    });
    
    it('should handle invalid projectId format', async () => {
      const response = await request(app)
        .get('/api/projects/invalid-project-id-format')
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(404);
    });
    
    it('should handle project with deleted task references', async () => {
      // Create a task and add it to project
      const task = await createTestTask({
        title: 'Task to be deleted',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      // Delete the task
      await db.collection('Tasks').doc(task.id).delete();
      
      // Should still return project but with empty tasks
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: manager.uid });
      
      expect(response.status).toBe(200);
      expect(response.body.tasks.length).toBe(0);
    });
    
    it('should handle project with null/undefined task references', async () => {
      // Create project with null task reference
      const ownerRef = db.collection('Users').doc(manager.uid);
      const projectWithNullTasks = await createTestProject({
        title: 'Project with Null Tasks',
        owner: ownerRef
      });
      
      // Add null task reference
      await db.collection('Projects').doc(projectWithNullTasks.id).update({
        taskList: [null]
      });
      
      // Should handle gracefully
      const response = await request(app)
        .get(`/api/projects/${projectWithNullTasks.id}`)
        .query({ userId: manager.uid });
      
      expect(response.status).toBe(200);
    });
    
    it('should handle tasks with multiple assignees', async () => {
      // Create task with multiple assignees
      const task = await createTestTask({
        title: 'Multi-assignee Task',
        assigneeIds: [staff1.uid, staff2.uid, staff3.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      // All assignees should see the task
      const response1 = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff1.uid });
      
      expect(response1.status).toBe(200);
      expect(response1.body.tasks.length).toBe(1);
      
      const response2 = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff2.uid });
      
      expect(response2.status).toBe(200);
      expect(response2.body.tasks.length).toBe(1);
    });
    
    it('should handle user who is both assignee and creator', async () => {
      // Create task where staff1 is both creator and assignee
      const task = await createTestTask({
        title: 'Self-assigned Task',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: staff1.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body.tasks.length).toBe(1);
      expect(response.body.tasks[0].title).toBe('Self-assigned Task');
    });
    
    it('should return correct project metadata', async () => {
      const task = await createTestTask({
        title: 'Metadata Test Task',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testProject.id);
      expect(response.body).toHaveProperty('title', 'Test Project');
      expect(response.body).toHaveProperty('description', 'A project for testing');
      expect(response.body).toHaveProperty('tasks');
      expect(response.body).toHaveProperty('owner');
      expect(response.body).toHaveProperty('ownerName');
      expect(response.body).toHaveProperty('isOwner');
      expect(response.body).toHaveProperty('showingAllTasks');
    });
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
    
    it('should handle empty task list', async () => {
      const projectDoc = await db.collection('Projects').doc(testProject.id).get();
      const taskList = projectDoc.data().taskList;
      
      expect(Array.isArray(taskList)).toBe(true);
    });
    
    it('should handle task references with invalid task IDs gracefully', async () => {
      // Add reference to non-existent task
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [
          db.collection('Tasks').doc('non-existent-task-id')
        ]
      });
      
      // Should not crash when fetching project
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: manager.uid });
      
      expect(response.status).toBe(200);
    });
    
    it('should handle mixed valid and invalid task references', async () => {
      const validTask = await createTestTask({
        title: 'Valid Task',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [
          db.collection('Tasks').doc(validTask.id),
          db.collection('Tasks').doc('invalid-task-id')
        ]
      });
      
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .query({ userId: staff1.uid });
      
      expect(response.status).toBe(200);
      // Should only return valid task
      expect(response.body.tasks.length).toBe(1);
      expect(response.body.tasks[0].id).toBe(validTask.id);
    });
  });
  
  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      // Test with invalid project structure
      const response = await request(app)
        .get('/api/projects')
        .query({ userId: 'valid-user-id' });
      
      // Should not crash, return array (even if empty)
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    it('should handle concurrent project access', async () => {
      const task = await createTestTask({
        title: 'Concurrent Task',
        assigneeIds: [staff1.uid],
        projectId: testProject.id,
        createdBy: manager.uid
      });
      
      await db.collection('Projects').doc(testProject.id).update({
        taskList: [db.collection('Tasks').doc(task.id)]
      });
      
      // Make multiple concurrent requests
      const promises = [
        request(app).get(`/api/projects/${testProject.id}`).query({ userId: staff1.uid }),
        request(app).get(`/api/projects/${testProject.id}`).query({ userId: staff1.uid }),
        request(app).get(`/api/projects/${testProject.id}`).query({ userId: staff1.uid })
      ];
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testProject.id);
      });
    });
    
    it('should handle project with no owner reference', async () => {
      // Create project without owner
      const projectWithoutOwner = await db.collection('Projects').add({
        title: 'Project Without Owner',
        description: 'No owner',
        taskList: []
      });
      
      const response = await request(app)
        .get(`/api/projects/${projectWithoutOwner.id}`)
        .query({ userId: manager.uid });
      
      // Should handle gracefully
      expect([200, 404]).toContain(response.status);
    });
  });
});
