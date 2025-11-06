import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import admin from 'firebase-admin';
import timelineService from '../../../little_farms/backend/services/timelineService.js';

const db = admin.firestore();

describe('Timeline Service', () => {
  // Test data
  let userIds = {
    staff: 'staff-user-1',
    manager: 'manager-user-1',
    other: 'other-user-1'
  };
  
  let projectIds = {
    project1: 'project-1',
    project2: 'project-2'
  };

  beforeEach(async () => {
    // Create test users
    await db.collection('Users').doc(userIds.staff).set({
      name: 'Staff User',
      role: 'staff',
      email: 'staff@test.com'
    });

    await db.collection('Users').doc(userIds.manager).set({
      name: 'Manager User',
      role: 'manager',
      email: 'manager@test.com'
    });

    await db.collection('Users').doc(userIds.other).set({
      name: 'Other User',
      role: 'staff',
      email: 'other@test.com'
    });

    // Create test projects
    await db.collection('Projects').doc(projectIds.project1).set({
      title: 'Test Project 1',
      owner: db.collection('Users').doc(userIds.manager)
    });

    await db.collection('Projects').doc(projectIds.project2).set({
      title: 'Test Project 2',
      owner: db.collection('Users').doc(userIds.manager)
    });
  });

  describe('getTasksForUser', () => {
    it('should return tasks created by user', async () => {
      // Create a task created by staff user
      const taskData = {
        title: 'Staff Created Task',
        taskCreatedBy: db.collection('Users').doc(userIds.staff),
        projectId: db.collection('Projects').doc(projectIds.project1),
        createdDate: admin.firestore.Timestamp.fromDate(new Date()),
        deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)), // tomorrow
        status: 'To Do',
        assignedTo: [] // Empty assignees
      };

      await db.collection('Tasks').add(taskData);

      const result = await timelineService.getTasksForUser(userIds.staff);
      
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Staff Created Task');
      expect(result[0].status).toBe('To Do');
      expect(result[0].projectTitle).toBe('Test Project 1');
    });

    it('should return tasks assigned to user', async () => {
      // Create a task assigned to staff user but created by other
      const taskData = {
        title: 'Assigned Task',
        taskCreatedBy: db.collection('Users').doc(userIds.other),
        projectId: db.collection('Projects').doc(projectIds.project1),
        createdDate: admin.firestore.Timestamp.fromDate(new Date()),
        deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
        status: 'To Do',
        assignedTo: [db.collection('Users').doc(userIds.staff)]
      };

      await db.collection('Tasks').add(taskData);

      const result = await timelineService.getTasksForUser(userIds.staff);
      
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Assigned Task');
      expect(result[0].assigneeNames).toContain('Staff User');
    });

    it('should return all project tasks for manager', async () => {
      // Create multiple tasks in manager's project
      const tasks = [
        {
          title: 'Project Task 1',
          taskCreatedBy: db.collection('Users').doc(userIds.other),
          projectId: db.collection('Projects').doc(projectIds.project1),
          assignedTo: [db.collection('Users').doc(userIds.other)]
        },
        {
          title: 'Project Task 2',
          taskCreatedBy: db.collection('Users').doc(userIds.staff),
          projectId: db.collection('Projects').doc(projectIds.project1),
          assignedTo: [db.collection('Users').doc(userIds.staff)]
        }
      ];

      await Promise.all(tasks.map(task => 
        db.collection('Tasks').add({
          ...task,
          createdDate: admin.firestore.Timestamp.fromDate(new Date()),
          deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
          status: 'To Do'
        })
      ));

      const result = await timelineService.getTasksForUser(userIds.manager);
      
      expect(result.length).toBe(2);
      expect(result.map(t => t.name)).toContain('Project Task 1');
      expect(result.map(t => t.name)).toContain('Project Task 2');
    });

    it('should filter tasks by assigned users when provided', async () => {
      // Create tasks with different assignees
      const tasks = [
        {
          title: 'Task for Staff',
          assignedTo: [db.collection('Users').doc(userIds.staff)]
        },
        {
          title: 'Task for Other',
          assignedTo: [db.collection('Users').doc(userIds.other)]
        },
        {
          title: 'Task for Both',
          assignedTo: [
            db.collection('Users').doc(userIds.staff),
            db.collection('Users').doc(userIds.other)
          ]
        }
      ];

      await Promise.all(tasks.map(task => 
        db.collection('Tasks').add({
          ...task,
          taskCreatedBy: db.collection('Users').doc(userIds.manager),
          projectId: db.collection('Projects').doc(projectIds.project1),
          createdDate: admin.firestore.Timestamp.fromDate(new Date()),
          deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
          status: 'To Do'
        })
      ));

      const result = await timelineService.getTasksForUser(userIds.manager, {
        assignedUserIds: [userIds.staff]
      });

      // Should only get tasks assigned to staff
      expect(result.length).toBe(2);
      expect(result.map(t => t.name)).toContain('Task for Staff');
      expect(result.map(t => t.name)).toContain('Task for Both');
      expect(result.map(t => t.name)).not.toContain('Task for Other');
    });

    it('should handle invalid dates gracefully', async () => {
      const taskData = {
        title: 'Task with Invalid Date',
        taskCreatedBy: db.collection('Users').doc(userIds.staff),
        projectId: db.collection('Projects').doc(projectIds.project1),
        createdDate: 'invalid-date', // Invalid date
        deadline: null, // Missing deadline
        status: 'To Do',
        assignedTo: []
      };

      await db.collection('Tasks').add(taskData);

      const result = await timelineService.getTasksForUser(userIds.staff);
      
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Task with Invalid Date');
      expect(Date.parse(result[0].start)).not.toBeNaN();
      expect(Date.parse(result[0].end)).not.toBeNaN();
    });

    it('should assign unique colors to different projects', async () => {
      // Create tasks in different projects
      const tasks = [
        {
          title: 'Project 1 Task',
          projectId: db.collection('Projects').doc(projectIds.project1)
        },
        {
          title: 'Project 2 Task',
          projectId: db.collection('Projects').doc(projectIds.project2)
        }
      ];

      await Promise.all(tasks.map(task => 
        db.collection('Tasks').add({
          ...task,
          taskCreatedBy: db.collection('Users').doc(userIds.staff),
          createdDate: admin.firestore.Timestamp.fromDate(new Date()),
          deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 86400000)),
          status: 'To Do',
          assignedTo: []
        })
      ));

      const result = await timelineService.getTasksForUser(userIds.staff);
      
      expect(result.length).toBe(2);
      const [task1, task2] = result;
      expect(task1.color).toBeTruthy();
      expect(task2.color).toBeTruthy();
      expect(task1.color).not.toBe(task2.color);
    });
  });
});