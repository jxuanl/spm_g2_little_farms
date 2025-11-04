# Integration Tests for Little Farms Task Management System

## Overview
This directory contains comprehensive integration tests for the Little Farms task management system, covering backend API endpoints, service layer logic, and end-to-end workflows.

## Test Structure

```
tests/
├── backend/
│   ├── api/
│   │   ├── tasks.test.js          # Task CRUD & subtask operations
│   │   ├── comments.test.js       # Comment operations & mentions
│   │   ├── users.test.js          # User authentication & management
│   │   └── projects.test.js       # Project operations
│   ├── services/
│   │   ├── taskService.test.js    # Task service unit tests
│   │   └── userService.test.js    # User service unit tests
│   └── integration/
│       ├── workflows.test.js      # End-to-end workflows
│       └── authorization.test.js  # Permission & access control
├── setup/
│   ├── firestore-emulator.js      # Firestore emulator setup
│   └── test-data.js               # Test data fixtures
└── utils/
    ├── helpers.js                  # Test helper functions
    └── assertions.js               # Custom assertions

```

## Test Coverage

### 1. **Task Management API** (`tasks.test.js`)
- ✅ Create task with valid data
- ✅ Create task with missing required fields (validation)
- ✅ Get tasks for a specific user
- ✅ Create subtask under parent task
- ✅ Get all subtasks for a task
- ✅ Get specific subtask by ID
- ✅ Update subtask details
- ✅ Update subtask status workflow (To Do → In Progress → Done)
- ✅ Handle references (assignees, project, creator)
- ✅ Verify subtask appears in parent task's subtask collection

### 2. **Comments API** (`comments.test.js`)
- ✅ Create comment on task
- ✅ Create comment on subtask
- ✅ Get all comments for task
- ✅ Get all comments for subtask
- ✅ Update comment (authorized user)
- ✅ Delete comment (authorized user)
- ✅ Prevent update/delete by non-author (403)
- ✅ Add user mentions in comments
- ✅ Verify mentioned users are stored as references
- ✅ Enforce 2000 character limit
- ✅ Comments refresh when switching between task/subtask

### 3. **User Management API** (`users.test.js`)
- ✅ User login with valid credentials
- ✅ User login with invalid credentials (401)
- ✅ Token verification
- ✅ Get user session data
- ✅ Get all users
- ✅ Search users by name/email
- ✅ Get users by role
- ✅ Get users by department
- ✅ User logout and session cleanup

### 4. **Project Management API** (`projects.test.js`)
- ✅ Create project
- ✅ Get projects for user (filtered by assigned tasks)
- ✅ Get project details with user's tasks
- ✅ Verify task list references
- ✅ Handle projects with no user tasks

### 5. **End-to-End Workflows** (`workflows.test.js`)
- ✅ **Complete Task Creation Workflow**
  - Create user → Create project → Assign user to project → Create task → Verify task appears in user's list
- ✅ **Subtask Workflow**
  - Create parent task → Create subtask → Update subtask → Complete subtask → Verify parent task reflects changes
- ✅ **Comment Thread Workflow**
  - Create task → Add comment → Mention users → Reply to comment → Edit comment → Delete comment
- ✅ **Project Assignment Workflow**
  - Create project → Create multiple tasks → Assign different users → Verify each user sees only their tasks
- ✅ **Task Status Progression**
  - Create task (To Do) → Assign to user → Move to In Progress → Add comments → Complete (Done) → Verify timeline

### 6. **Authorization & Security** (`authorization.test.js`)
- ✅ Comment edit/delete authorization (only author)
- ✅ Task visibility (users see only assigned tasks)
- ✅ Project access (users see only projects with their tasks)
- ✅ Verify Firestore security rules are respected
- ✅ Session-based user identification

## Running Tests

### Prerequisites
1. **Firebase Emulator Suite** (for local testing)
   ```bash
   npm install -g firebase-tools
   ```

2. **Install test dependencies**
   ```bash
   cd tests
   npm install
   ```

3. **Firebase Configuration** (already set up)
   - `firebase.json` - Emulator configuration in project root
   - `firestore.rules` - Firestore security rules (permissive for testing)

### Local Testing
```bash
# Start Firebase emulators (Auth + Firestore)
# Run from project root
firebase emulators:start --only firestore,auth --project=test-project

# Or use npm script from tests directory
cd tests
npm run emulator

# In a separate terminal, run tests
npm test

# Run specific test suite
npm test -- backend/unit/tasks.test.js

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### GitHub Actions (CI/CD)
Tests run automatically on:
- Pull requests to `main` branch
- Pushes to `main` branch
- Manual workflow dispatch

See `.github/workflows/integration-tests.yml` for configuration.

## Test Environment Variables

Create a `.env.test` file:
```env
FIREBASE_PROJECT_ID=test-project
FIRESTORE_EMULATOR_HOST=localhost:8080
NODE_ENV=test
PORT=3002
```

## Test Data Fixtures

Test data is seeded before each test suite:
- **Users**: admin, manager, staff (various roles/departments)
- **Projects**: Sample projects with task lists
- **Tasks**: Tasks with various statuses, priorities, deadlines
- **Comments**: Comments with mentions

## Assertions & Helpers

### Custom Assertions
```javascript
expect(response).toHaveStatus(200);
expect(response.body).toHaveProperty('id');
expect(task).toBeAssignedTo(userId);
expect(comment).toHaveAuthor(userId);
expect(comment).toMentionUsers([user1Id, user2Id]);
```

### Helper Functions
```javascript
await createTestUser({ name, email, role, department });
await createTestTask({ title, assigneeIds, projectId });
await createTestProject({ title, owner });
await authenticateUser(email, password);
```

## Continuous Integration

### GitHub Actions Workflow
- **Trigger**: PR to main, push to main
- **Environment**: Ubuntu latest with Node 18+
- **Steps**:
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies (backend + tests)
  4. Start Firestore emulator
  5. Run backend server
  6. Execute test suites
  7. Generate coverage report
  8. Upload coverage to Codecov (optional)
  9. Post test results as PR comment

### Parallel Test Execution
Tests are grouped and run in parallel for faster CI:
- Group 1: Task API tests
- Group 2: Comment API tests
- Group 3: User & Project API tests
- Group 4: Integration workflows
- Group 5: Authorization tests

## Code Coverage Goals
- **Overall**: >80%
- **Critical paths** (auth, task CRUD, comments): >90%
- **Service layer**: >85%

## Troubleshooting

### Common Issues

**Firestore connection errors**
```bash
# Ensure emulator is running
firebase emulators:start --only firestore --project=test-project
```

**Port conflicts**
```bash
# Change test server port in .env.test
PORT=3003
```

**Stale test data**
```bash
# Clear emulator data
firebase emulators:exec --only firestore "npm test" --project=test-project
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests pass locally
3. Update this README if new test categories are added
4. Maintain >80% code coverage
5. Tests must pass in CI before merging

## Resources
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Jest Documentation](https://jestjs.io/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
