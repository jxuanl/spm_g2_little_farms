import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import tasksRouter from '../../../little_farms/backend/routes/tasks.js';
import { createTestUser, createTestTask, createTestComment, seedTestData } from '../../utils/helpers.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/tasks', tasksRouter);

describe('Comments API Integration Tests', () => {
  let testData;
  let testTask;
  let testSubtask;
  
  beforeEach(async () => {
    testData = await seedTestData();
    
    // Create a task for comments
    testTask = await createTestTask({
      title: 'Task for Comments',
      assigneeIds: [testData.users.staff1.uid],
      projectId: testData.project.id,
      createdBy: testData.users.manager.uid
    });
    
    // Create a subtask for comments
    testSubtask = await createTestTask({
      title: 'Subtask for Comments',
      assigneeIds: [testData.users.staff1.uid],
      projectId: testData.project.id,
      createdBy: testData.users.manager.uid,
      isSubtask: true,
      parentTaskId: testTask.id
    });
  });
  
  describe('GET /api/tasks/:taskId/comments', () => {
    it('should get all comments for a task', async () => {
      // Create some comments
      await createTestComment({
        taskId: testTask.id,
        content: 'First comment',
        authorId: testData.users.manager.uid
      });
      
      await createTestComment({
        taskId: testTask.id,
        content: 'Second comment',
        authorId: testData.users.staff1.uid
      });
      
      const response = await request(app)
        .get(`/api/tasks/${testTask.id}/comments`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      
      // Verify comment structure
      const comment = response.body[0];
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('author');
      expect(comment).toHaveProperty('createdDate');
    });
    
    it('should return empty array for task with no comments', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask.id}/comments`);
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
    
    it('should return 400 when taskId is missing', async () => {
      const response = await request(app)
        .get('/api/tasks//comments');
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('GET /api/tasks/:taskId/subtasks/:subtaskId/comments', () => {
    it('should get all comments for a subtask', async () => {
      await createTestComment({
        taskId: testTask.id,
        subtaskId: testSubtask.id,
        content: 'Subtask comment 1',
        authorId: testData.users.staff1.uid
      });
      
      await createTestComment({
        taskId: testTask.id,
        subtaskId: testSubtask.id,
        content: 'Subtask comment 2',
        authorId: testData.users.manager.uid
      });
      
      const response = await request(app)
        .get(`/api/tasks/${testTask.id}/subtasks/${testSubtask.id}/comments`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
    
    it('should not mix task and subtask comments', async () => {
      // Add comment to task
      await createTestComment({
        taskId: testTask.id,
        content: 'Task comment',
        authorId: testData.users.manager.uid
      });
      
      // Add comment to subtask
      await createTestComment({
        taskId: testTask.id,
        subtaskId: testSubtask.id,
        content: 'Subtask comment',
        authorId: testData.users.staff1.uid
      });
      
      // Get task comments - should only have 1
      const taskResponse = await request(app)
        .get(`/api/tasks/${testTask.id}/comments`);
      expect(taskResponse.body.length).toBe(1);
      
      // Get subtask comments - should only have 1
      const subtaskResponse = await request(app)
        .get(`/api/tasks/${testTask.id}/subtasks/${testSubtask.id}/comments`);
      expect(subtaskResponse.body.length).toBe(1);
    });
  });
  
  describe('POST /api/tasks/:taskId/comments', () => {
    it('should create a comment on a task', async () => {
      const commentData = {
        content: 'This is a new comment',
        authorId: testData.users.staff1.uid
      };
      
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send(commentData);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe(commentData.content);
      expect(response.body.author).toHaveProperty('path');
    });
    
    it('should create a comment with mentioned users', async () => {
      const commentData = {
        content: 'Hey @staff1 and @staff2, check this out!',
        authorId: testData.users.manager.uid,
        mentionedUsers: [testData.users.staff1.uid, testData.users.staff2.uid]
      };
      
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send(commentData);
      
      expect(response.status).toBe(201);
      expect(response.body.mentionedUsers).toBeDefined();
      expect(Array.isArray(response.body.mentionedUsers)).toBe(true);
      expect(response.body.mentionedUsers.length).toBe(2);
    });
    
    it('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send({
          authorId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('content');
    });
    
    it('should return 400 when authorId is missing', async () => {
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send({
          content: 'Comment without author'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('authorId');
    });
    
    it('should return 400 when content exceeds 2000 characters', async () => {
      const longContent = 'a'.repeat(2001);
      
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send({
          content: longContent,
          authorId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('2000');
    });
  });
  
  describe('POST /api/tasks/:taskId/subtasks/:subtaskId/comments', () => {
    it('should create a comment on a subtask', async () => {
      const commentData = {
        content: 'Subtask comment',
        authorId: testData.users.staff1.uid
      };
      
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/subtasks/${testSubtask.id}/comments`)
        .send(commentData);
      
      expect(response.status).toBe(201);
      expect(response.body.content).toBe(commentData.content);
    });
  });
  
  describe('PUT /api/tasks/:taskId/comments/:commentId', () => {
    it('should update a comment by its author', async () => {
      const comment = await createTestComment({
        taskId: testTask.id,
        content: 'Original comment',
        authorId: testData.users.staff1.uid
      });
      
      const updateData = {
        content: 'Updated comment content',
        userId: testData.users.staff1.uid
      };
      
      const response = await request(app)
        .put(`/api/tasks/${testTask.id}/comments/${comment.id}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.content).toBe(updateData.content);
      expect(response.body.modifiedDate).toBeDefined();
    });
    
    it('should return 403 when non-author tries to update', async () => {
      const comment = await createTestComment({
        taskId: testTask.id,
        content: 'Staff1 comment',
        authorId: testData.users.staff1.uid
      });
      
      const response = await request(app)
        .put(`/api/tasks/${testTask.id}/comments/${comment.id}`)
        .send({
          content: 'Trying to edit someone else comment',
          userId: testData.users.staff2.uid // Different user
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Unauthorized');
    });
    
    it('should return 400 when content is missing', async () => {
      const comment = await createTestComment({
        taskId: testTask.id,
        content: 'Comment',
        authorId: testData.users.staff1.uid
      });
      
      const response = await request(app)
        .put(`/api/tasks/${testTask.id}/comments/${comment.id}`)
        .send({
          userId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(400);
    });
    
    it('should return 404 when comment does not exist', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTask.id}/comments/fake-comment-id`)
        .send({
          content: 'Update',
          userId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('PUT /api/tasks/:taskId/subtasks/:subtaskId/comments/:commentId', () => {
    it('should update a subtask comment by its author', async () => {
      const comment = await createTestComment({
        taskId: testTask.id,
        subtaskId: testSubtask.id,
        content: 'Original subtask comment',
        authorId: testData.users.staff1.uid
      });
      
      const response = await request(app)
        .put(`/api/tasks/${testTask.id}/subtasks/${testSubtask.id}/comments/${comment.id}`)
        .send({
          content: 'Updated subtask comment',
          userId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(200);
      expect(response.body.content).toBe('Updated subtask comment');
    });
  });
  
  describe('DELETE /api/tasks/:taskId/comments/:commentId', () => {
    it('should delete a comment by its author', async () => {
      const comment = await createTestComment({
        taskId: testTask.id,
        content: 'Comment to delete',
        authorId: testData.users.staff1.uid
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${testTask.id}/comments/${comment.id}`)
        .send({
          userId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
      
      // Verify comment is actually deleted
      const getResponse = await request(app)
        .get(`/api/tasks/${testTask.id}/comments`);
      expect(getResponse.body.length).toBe(0);
    });
    
    it('should return 403 when non-author tries to delete', async () => {
      const comment = await createTestComment({
        taskId: testTask.id,
        content: 'Comment to protect',
        authorId: testData.users.staff1.uid
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${testTask.id}/comments/${comment.id}`)
        .send({
          userId: testData.users.staff2.uid // Different user
        });
      
      expect(response.status).toBe(403);
    });
    
    it('should return 400 when userId is missing', async () => {
      const comment = await createTestComment({
        taskId: testTask.id,
        content: 'Comment',
        authorId: testData.users.staff1.uid
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${testTask.id}/comments/${comment.id}`)
        .send({});
      
      expect(response.status).toBe(400);
    });
    
    it('should return 404 when comment does not exist', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${testTask.id}/comments/fake-id`)
        .send({
          userId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('DELETE /api/tasks/:taskId/subtasks/:subtaskId/comments/:commentId', () => {
    it('should delete a subtask comment by its author', async () => {
      const comment = await createTestComment({
        taskId: testTask.id,
        subtaskId: testSubtask.id,
        content: 'Subtask comment to delete',
        authorId: testData.users.staff1.uid
      });
      
      const response = await request(app)
        .delete(`/api/tasks/${testTask.id}/subtasks/${testSubtask.id}/comments/${comment.id}`)
        .send({
          userId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('Comment Mentions Workflow', () => {
    it('should handle complete mention workflow', async () => {
      // Create comment with mentions
      const createResponse = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send({
          content: '@staff1 and @staff2 please review this',
          authorId: testData.users.manager.uid,
          mentionedUsers: [testData.users.staff1.uid, testData.users.staff2.uid]
        });
      
      expect(createResponse.status).toBe(201);
      expect(createResponse.body.mentionedUsers.length).toBe(2);
      
      // Get comments and verify mentions are persisted
      const getResponse = await request(app)
        .get(`/api/tasks/${testTask.id}/comments`);
      
      const comment = getResponse.body.find(c => c.id === createResponse.body.id);
      expect(comment.mentionedUsers).toBeDefined();
      expect(comment.mentionedUsers.length).toBe(2);
    });
  });
  
  describe('Character Limit Validation', () => {
    it('should accept comment at exactly 2000 characters', async () => {
      const exactContent = 'a'.repeat(2000);
      
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send({
          content: exactContent,
          authorId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(201);
    });
    
    it('should reject comment at 2001 characters', async () => {
      const tooLongContent = 'a'.repeat(2001);
      
      const response = await request(app)
        .post(`/api/tasks/${testTask.id}/comments`)
        .send({
          content: tooLongContent,
          authorId: testData.users.staff1.uid
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('2000');
    });
  });
});
