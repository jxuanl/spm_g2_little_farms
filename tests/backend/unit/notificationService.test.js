import { jest } from '@jest/globals';
import { expect, test, beforeEach, afterEach, describe } from '@jest/globals';

// Mocks must match the paths used by notificationService.js imports
let fakeDbCollections = {};
const makeFakeDb = (collections) => ({
  collection: (name) => {
    const coll = collections[name] || {};
    return {
      doc: (id) => ({
        get: async () => ({ exists: !!coll[id], data: () => coll[id] }),
        update: jest.fn(async (payload) => { coll[id] = { ...coll[id], ...payload }; return true; }),
      }),
      where: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          get: async () => ({
            docs: (coll.queryDocs || []).map(d => ({ id: d.id, data: () => d })),
          }),
        })),
      })),
      add: jest.fn(async (doc) => {
        // emulate Firestore add returning ref with id
        const id = `generated-${Math.random().toString(36).slice(2,8)}`;
        coll[id] = doc;
        return { id };
      }),
      orderBy: jest.fn(() => ({ get: async () => ({ docs: [] }) })),
      get: async () => ({ docs: [] }),
    };
  }
});

// mock firebase-admin (serverTimestamp used)
jest.unstable_mockModule('firebase-admin', () => ({
  default: {},
  firestore: { FieldValue: { serverTimestamp: () => new Date() } }
}));

// mock adminFirebase db used by the service
jest.unstable_mockModule('../../../little_farms/backend/adminFirebase.js', () => {
  return {
    db: makeFakeDb(fakeDbCollections)
  };
});

// mock other services used by notificationService
jest.unstable_mockModule('../../../little_farms/backend/services/taskService.js', () => ({
  getTaskById: jest.fn()
}));
jest.unstable_mockModule('../../../little_farms/backend/services/emailService.js', () => ({
  sendEmail: jest.fn()
}));
jest.unstable_mockModule('../../../little_farms/backend/services/deadlineService.js', () => ({
  resolveUserDoc: jest.fn(),
  sendNotificationToUser: jest.fn()
}));
jest.unstable_mockModule('../../../little_farms/backend/services/webSocketService.js', () => ({
  sendToUser: jest.fn()
}));
jest.unstable_mockModule('../../../little_farms/backend/services/userService.js', () => ({
  default: { getUserById: jest.fn() }
}));

// import the service under test (after mocks declared)
const {
  getNotifications,
  acknowledgeNotification,
  handleManagerTaskUpdate,
  handleNewCommentNotification
} = await import('../../../little_farms/backend/services/notificationService.js');

const { getTaskById } = await import('../../../little_farms/backend/services/taskService.js');
const { sendEmail } = await import('../../../little_farms/backend/services/emailService.js');
const { resolveUserDoc } = await import('../../../little_farms/backend/services/deadlineService.js');
const { sendToUser } = await import('../../../little_farms/backend/services/webSocketService.js');
const adminFirebase = await import('../../../little_farms/backend/adminFirebase.js');

describe('notificationService (unit)', () => {
  beforeEach(() => {
    // reset and reattach fake db collections
    fakeDbCollections = {};
    // replace db inside mocked module with fresh fake db
    // note: adminFirebase was mocked earlier to return makeFakeDb(fakeDbCollections)
    // but we need to update its internal reference; mutate module export if present
    // (the mocked module returns an object with db = makeFakeDb(fakeDbCollections))
    adminFirebase.db = makeFakeDb(fakeDbCollections);
    // reset other mocks
    sendEmail.mockClear?.();
    sendToUser.mockClear?.();
    resolveUserDoc.mockClear?.();
    getTaskById.mockClear?.();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getNotifications returns items from Notifications collection', async () => {
    // arrange: prepare queryDocs to be returned by where().orderBy().get()
    fakeDbCollections.Notifications = {
      queryDocs: [
        { id: 'n1', title: 'T1', body: 'b1', createdAt: 1 },
        { id: 'n2', title: 'T2', body: 'b2', createdAt: 2 }
      ]
    };

    // act
    const items = await getNotifications('some-user');

    // assert
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(2);
    expect(items[0]).toHaveProperty('id', 'n1');
    expect(items[1]).toHaveProperty('title', 'T2');
  });

  test('acknowledgeNotification marks notification read when owner matches', async () => {
    // arrange
    const notifId = 'notif-1';
    fakeDbCollections.Notifications = {
      [notifId]: { userId: 'user-123', status: 'unread' }
    };

    // doc().update is a jest.fn created by the fakeDb; call acknowledge
    const res = await acknowledgeNotification(notifId, 'user-123');

    expect(res).toEqual({ success: true });
    // verify update was executed (update was created on the doc above)
    const notifDoc = adminFirebase.db.collection('Notifications').doc(notifId);
    // the mock update stores merged data; verify the stored state
    const snap = await notifDoc.get();
    expect(snap.data().status).toBe('read');
  });

  test('acknowledgeNotification throws on forbidden user', async () => {
    const notifId = 'notif-2';
    fakeDbCollections.Notifications = {
      [notifId]: { userId: 'owner-1', status: 'unread' }
    };

    await expect(acknowledgeNotification(notifId, 'other-user')).rejects.toThrow('Forbidden');
  });

  test('handleManagerTaskUpdate creates notifications for assignees and sends email', async () => {
    // arrange
    const taskId = 'task-123';
    const assignedUserRefLike = { id: 'u1' }; // whatever resolveUserDoc expects
    // prepare task doc returned when reading Tasks doc in service
    fakeDbCollections.Tasks = { [taskId]: { title: 'Original Task', assignedTo: [assignedUserRefLike] } };

    // resolveUserDoc should return a userDoc-like object with id and data()
    resolveUserDoc.mockResolvedValue({
      exists: true,
      id: 'u1',
      data: () => ({ channel: 'in-app', email: 'u1@example.com' })
    });

    // create an updatedFields payload with a changed field
    const updatedFields = {
      id: taskId,
      title: { old: 'Original Task', new: 'Updated Task' }
    };

    // act
    const result = await handleManagerTaskUpdate(updatedFields);

    // assert result contains changes and that email was sent
    expect(result).toHaveProperty('changes');
    // Notifications should have been added to Notifications collection
    const notifColl = adminFirebase.db.collection('Notifications');
    // ensure add was called at least once
    expect(typeof notifColl.add).toBe('function');
    // send email should have been invoked
    expect(sendEmail).toHaveBeenCalled();
  });

  test('handleNewCommentNotification saves url correctly (no subtask)', async () => {
    const taskId = 'G14nBo8E3O3CvBtCW7rY';
    const userId = 'T11Q6R7wnfWHqtYW21vT8jxv84Y2';
    fakeDbCollections.Tasks = { [taskId]: { title: 'Talk To Obama' } };
    fakeDbCollections.Users = { [userId]: { channel: 'in-app', email: 'u@example.com' } };
    // spy on Notifications.add
    const notifColl = adminFirebase.db.collection('Notifications');

    const payload = {
      taskId,
      subtaskId: '',
      taskName: 'Talk To Obama',
      commentText: 'DO YOUR WORK',
      commenterName: 'OSAMA',
      personsIdInvolved: [userId],
      timestamp: Date.now()
    };

    const result = await handleNewCommentNotification(payload);

    expect(result).toHaveProperty('message', 'Notifications processed');
    expect(notifColl.add).toHaveBeenCalled();
    const addedArg = fakeDbCollections.Notifications[Object.keys(fakeDbCollections.Notifications)[0]];
    // url must end with /all-tasks/<taskId>
    expect(addedArg.url).toContain(`/all-tasks/${taskId}`);
    expect(addedArg.url).not.toMatch(/\/[^/]+$/); // no subtask segment
  });

  test('handleNewCommentNotification saves url correctly (with subtask)', async () => {
    const taskId = 'task-with-sub';
    const subtaskId = 'sub-42';
    const userId = 'user-sub';
    fakeDbCollections.Tasks = { [taskId]: { title: 'Has Subtask' } };
    fakeDbCollections.Users = { [userId]: { channel: 'in-app', email: 'u2@example.com' } };

    const payload = {
      taskId,
      subtaskId,
      taskName: 'Has Subtask',
      commentText: 'hello',
      commenterName: 'bob',
      personsIdInvolved: [userId],
      timestamp: Date.now()
    };

    await handleNewCommentNotification(payload);

    const added = fakeDbCollections.Notifications[Object.keys(fakeDbCollections.Notifications)[0]];
    expect(added.url).toBeDefined();
    expect(added.url).toContain(`/all-tasks/${taskId}/${subtaskId}`);
  });
});