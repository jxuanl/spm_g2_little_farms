import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import usersRouter from '../../../little_farms/backend/routes/users.js';
import projectsRouter from '../../../little_farms/backend/routes/projects.js';
import { createTestUser, createTestProject, createTestTask, db } from '../../utils/helpers.js';

// Create test app with all routes
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);
app.use('/api/users', usersRouter);
app.use('/api/projects', projectsRouter);

describe('Integration Tests', () => {
  describe('Complete Task Creation and Assignment Workflow', () => {
    it('should complete full user-project-task workflow', async () => {
      // Step 1: Create manager user
      const manager = await createTestUser({
        email: 'manager@workflow.com',
        name: 'Workflow Manager',
        role: 'manager',
        department: 'IT'
      });
      expect(manager).toHaveProperty('uid');
      
      // Step 2: Create staff user
      const staff = await createTestUser({
        email: 'staff@workflow.com',
        name: 'Workflow Staff',
        role: 'staff',
        department: 'IT'
      });
      expect(staff).toHaveProperty('uid');
      
      // Step 3: Create project
      const createProjectResponse = await request(app)
        .post('/api/projects/createProject')
        .send({
          title: 'Workflow Test Project',
          desc: 'End-to-end workflow test',
          userId: manager.uid
        });
      expect(createProjectResponse.status).toBe(201);
      const projectId = createProjectResponse.body.projectId;
      
      // Step 4: Create task and assign to staff
      const createTaskResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Workflow Test Task',
          description: 'Task for end-to-end test',
          priority: 'high',
          status: 'To Do',
          assigneeIds: [staff.uid],
          projectId: projectId,
          createdBy: manager.uid,
          tags: ['workflow', 'test']
        });
      expect(createTaskResponse.status).toBe(201);
      const taskId = createTaskResponse.body.id;
      
      // Step 5: Add task to project's task list
      await db.collection('Projects').doc(projectId).update({
        taskList: [db.collection('Tasks').doc(taskId)]
      });
      
      // Step 6: Verify staff can see their tasks
      const getTasksResponse = await request(app)
        .get('/api/tasks')
        .query({ userId: staff.uid });
      expect(getTasksResponse.status).toBe(200);
      expect(getTasksResponse.body).toHaveProperty('success', true);
      expect(getTasksResponse.body).toHaveProperty('tasks');
      expect(getTasksResponse.body.tasks.length).toBeGreaterThan(0);
      
      // Step 7: Verify staff can see the project
      const getProjectsResponse = await request(app)
        .get('/api/projects')
        .query({ userId: staff.uid });
      expect(getProjectsResponse.status).toBe(200);
      expect(getProjectsResponse.body.length).toBeGreaterThan(0);
      
      console.log('✅ Complete workflow passed!');
    });
  });
  
  describe('Subtask Creation and Management Workflow', () => {
    it('should handle complete subtask lifecycle', async () => {
      // Setup users
      const manager = await createTestUser({
        email: 'subtask.manager@test.com',
        name: 'Subtask Manager',
        role: 'manager'
      });
      
      const staff = await createTestUser({
        email: 'subtask.staff@test.com',
        name: 'Subtask Staff',
        role: 'staff'
      });
      
      // Create project
      const project = await createTestProject({
        title: 'Subtask Project',
        owner: manager.uid
      });
      
      // Step 1: Create parent task
      const createParentResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Parent Task',
          description: 'Has subtasks',
          assigneeIds: [staff.uid],
          projectId: project.id,
          createdBy: manager.uid
        });
      expect(createParentResponse.status).toBe(201);
      const parentId = createParentResponse.body.id;
      
      // Step 2: Create subtask
      const createSubtaskResponse = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Subtask 1',
          description: 'First subtask',
          priority: 'medium',
          status: 'To Do',
          assigneeIds: [staff.uid],
          projectId: project.id,
          createdBy: manager.uid,
          parentTaskId: parentId
        });
      expect(createSubtaskResponse.status).toBe(201);
      const subtaskId = createSubtaskResponse.body.id;
      
      // Step 3: Get all subtasks
      const getSubtasksResponse = await request(app)
        .get(`/api/tasks/${parentId}/subtasks`);
      expect(getSubtasksResponse.status).toBe(200);
      expect(getSubtasksResponse.body.length).toBe(1);
      
      // Step 4: Update subtask status
      const updateSubtaskResponse = await request(app)
        .put(`/api/tasks/${parentId}/subtasks/${subtaskId}`)
        .send({ status: 'In Progress' });
      expect(updateSubtaskResponse.status).toBe(200);
      expect(updateSubtaskResponse.body.status).toBe('In Progress');
      
      // Step 5: Complete subtask
      const completeSubtaskResponse = await request(app)
        .put(`/api/tasks/${parentId}/subtasks/${subtaskId}`)
        .send({ status: 'Done' });
      expect(completeSubtaskResponse.status).toBe(200);
      expect(completeSubtaskResponse.body.status).toBe('Done');
      
      console.log('✅ Subtask workflow passed!');
    });
  });
  
  describe('Comment Thread Workflow', () => {
    it('should handle complete comment thread with mentions', async () => {
      // Setup users
      const author = await createTestUser({
        email: 'comment.author@test.com',
        name: 'Comment Author',
        role: 'staff'
      });
      
      const mentioned1 = await createTestUser({
        email: 'mentioned1@test.com',
        name: 'Mentioned User 1',
        role: 'staff'
      });
      
      const mentioned2 = await createTestUser({
        email: 'mentioned2@test.com',
        name: 'Mentioned User 2',
        role: 'manager'
      });
      
      // Create task
      const task = await createTestTask({
        title: 'Task with Comments',
        assigneeIds: [author.uid, mentioned1.uid],
        createdBy: mentioned2.uid
      });
      
      // Step 1: Create initial comment with mentions
      const createCommentResponse = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .send({
          content: '@mentioned1 and @mentioned2 please review',
          authorId: author.uid,
          mentionedUsers: [mentioned1.uid, mentioned2.uid]
        });
      expect(createCommentResponse.status).toBe(201);
      const commentId = createCommentResponse.body.id;
      expect(createCommentResponse.body.mentionedUsers).toHaveLength(2);
      
      // Step 2: Get all comments
      const getCommentsResponse = await request(app)
        .get(`/api/tasks/${task.id}/comments`);
      expect(getCommentsResponse.status).toBe(200);
      expect(getCommentsResponse.body.length).toBe(1);
      
      // Step 3: Add reply comment
      const replyResponse = await request(app)
        .post(`/api/tasks/${task.id}/comments`)
        .send({
          content: 'Looks good to me!',
          authorId: mentioned1.uid
        });
      expect(replyResponse.status).toBe(201);
      
      // Step 4: Update original comment
      const updateCommentResponse = await request(app)
        .put(`/api/tasks/${task.id}/comments/${commentId}`)
        .send({
          content: '@mentioned1 and @mentioned2 please review (updated)',
          userId: author.uid
        });
      expect(updateCommentResponse.status).toBe(200);
      
      // Step 5: Verify comment count
      const finalCommentsResponse = await request(app)
        .get(`/api/tasks/${task.id}/comments`);
      expect(finalCommentsResponse.body.length).toBe(2);
      
      // Step 6: Delete a comment
      const deleteCommentResponse = await request(app)
        .delete(`/api/tasks/${task.id}/comments/${commentId}`)
        .send({ userId: author.uid });
      expect(deleteCommentResponse.status).toBe(200);
      
      // Step 7: Verify deletion
      const afterDeleteResponse = await request(app)
        .get(`/api/tasks/${task.id}/comments`);
      expect(afterDeleteResponse.body.length).toBe(1);
      
      console.log('✅ Comment thread workflow passed!');
    });
  });
  
  describe('Multi-User Task Assignment Workflow', () => {
    it('should handle task visibility across multiple users', async () => {
      // Create manager and staff users
      const manager = await createTestUser({
        email: 'multiuser.manager@test.com',
        name: 'Multi Manager',
        role: 'manager'
      });
      
      const staff1 = await createTestUser({
        email: 'multiuser.staff1@test.com',
        name: 'Multi Staff 1',
        role: 'staff',
        department: 'IT'
      });
      
      const staff2 = await createTestUser({
        email: 'multiuser.staff2@test.com',
        name: 'Multi Staff 2',
        role: 'staff',
        department: 'Sales'
      });
      
      const staff3 = await createTestUser({
        email: 'multiuser.staff3@test.com',
        name: 'Multi Staff 3',
        role: 'staff',
        department: 'HR'
      });
      
      // Create project
      const project = await createTestProject({
        title: 'Multi-User Project',
        owner: manager.uid
      });
      
      // Create tasks assigned to different users
      const task1 = await createTestTask({
        title: 'Task for Staff 1',
        assigneeIds: [staff1.uid],
        projectId: project.id,
        createdBy: manager.uid
      });
      
      const task2 = await createTestTask({
        title: 'Task for Staff 2',
        assigneeIds: [staff2.uid],
        projectId: project.id,
        createdBy: manager.uid
      });
      
      const task3 = await createTestTask({
        title: 'Task for Staff 1 and 2',
        assigneeIds: [staff1.uid, staff2.uid],
        projectId: project.id,
        createdBy: manager.uid
      });
      
      // Verify each user sees only their tasks
      const staff1Tasks = await request(app)
        .get('/api/tasks')
        .query({ userId: staff1.uid });
      expect(staff1Tasks.body.tasks.length).toBe(2); // task1 and task3
      
      const staff2Tasks = await request(app)
        .get('/api/tasks')
        .query({ userId: staff2.uid });
      expect(staff2Tasks.body.tasks.length).toBe(2); // task2 and task3
      
      const staff3Tasks = await request(app)
        .get('/api/tasks')
        .query({ userId: staff3.uid });
      expect(staff3Tasks.body.tasks.length).toBe(0); // No tasks
      
      console.log('✅ Multi-user workflow passed!');
    });
  });
  
  describe('Task Status Progression Workflow', () => {
    it('should track complete task lifecycle with timeline', async () => {
      const manager = await createTestUser({
        email: 'timeline.manager@test.com',
        name: 'Timeline Manager',
        role: 'manager'
      });
      
      const staff = await createTestUser({
        email: 'timeline.staff@test.com',
        name: 'Timeline Staff',
        role: 'staff'
      });
      
      const project = await createTestProject({
        title: 'Timeline Project',
        owner: manager.uid
      });
      
      // Create task in "To Do" status
      const task = await createTestTask({
        title: 'Task with Timeline',
        description: 'Track through lifecycle',
        status: 'To Do',
        priority: 'high',
        assigneeIds: [staff.uid],
        projectId: project.id,
        createdBy: manager.uid,
        isSubtask: false
      });
      
      const parentTask = await createTestTask({
        title: 'Parent for tracking',
        assigneeIds: [staff.uid],
        projectId: project.id,
        createdBy: manager.uid
      });
      
      const subtask = await createTestTask({
        title: 'Trackable Subtask',
        status: 'To Do',
        priority: 'high',
        assigneeIds: [staff.uid],
        projectId: project.id,
        createdBy: manager.uid,
        isSubtask: true,
        parentTaskId: parentTask.id
      });
      
      // Move to In Progress
      const inProgressResponse = await request(app)
        .put(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`)
        .send({ status: 'In Progress' });
      expect(inProgressResponse.body.status).toBe('In Progress');
      
      // Add comment during work
      await request(app)
        .post(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}/comments`)
        .send({
          content: 'Working on this now',
          authorId: staff.uid
        });
      
      // Complete task
      const doneResponse = await request(app)
        .put(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`)
        .send({ status: 'Done' });
      expect(doneResponse.body.status).toBe('Done');
      
      // Add completion comment
      await request(app)
        .post(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}/comments`)
        .send({
          content: 'Task completed!',
          authorId: staff.uid
        });
      
      // Verify final state
      const finalTask = await request(app)
        .get(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}`);
      expect(finalTask.body.status).toBe('Done');
      
      const finalComments = await request(app)
        .get(`/api/tasks/${parentTask.id}/subtasks/${subtask.id}/comments`);
      expect(finalComments.body.length).toBe(2);
      
      console.log('✅ Timeline workflow passed!');
    });
  });
});
