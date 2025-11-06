import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();
test.describe.configure({ mode: 'serial' });

const TEST_STAFF_EMAIL = process.env.TEST_STAFF_EMAIL;
const TEST_STAFF__PASSWORD = process.env.TEST_STAFF_PASSWORD;

test('test past date task creation + create task & update task', async ({ page }) => {

  // Fill in the login form
  await page.goto('http:localhost:5173');
  await page.getByPlaceholder('Enter your email').fill(TEST_STAFF_EMAIL);
  await page.getByPlaceholder('Enter your password').fill(TEST_STAFF__PASSWORD);
  await page.locator(".login-button").click(); 
  await page.waitForTimeout(1000); // Wait for navigation
  await page.waitForURL("http://localhost:5173/all-tasks");
  await expect(page.locator('h2')).toContainText("Task Dashboard");

  // Create a new task with past date TM-002
  await page.getByRole('button', { name: 'New Task' }).click();
  await page.getByPlaceholder("Enter task title...").fill('TEST PAST DATE');
  await page.getByPlaceholder('Enter priority (1-10)').click(); // priority
  await page.getByPlaceholder('Enter priority (1-10)').fill('5');
  await page.getByRole('button', { name: 'Select project *' }).click();
  await page.getByRole('button', { name: 'Team Summary Test project' }).click();
  await page.locator('input[type="date"]').fill('2025-11-01'); // past date
  await page.getByRole('button', { name: 'Create Task' }).click();
  await expect(page.locator('form')).toContainText('Due date cannot be in the past');
  await page.getByRole('button', { name: 'Cancel' }).click(); // move out of form
  await page.setDefaultTimeout(3000);
  
  // Create a new task TM-001
  await page.getByRole('button', { name: 'New Task' }).click();
  await page.getByPlaceholder("Enter task title...").fill('TEST CI/CD'); // title
  await page.getByPlaceholder('Enter priority (1-10)').click(); // priority
  await page.getByPlaceholder('Enter priority (1-10)').fill('5');
  await page.locator('input[type="date"]').fill('2025-11-22'); // date
  await page.getByRole('button', { name: 'Select status' }).click() // status
   await page.getByRole('button', { name: 'To Do' }).click();
  await page.getByRole('button', { name: 'Select project *' }).click(); // project
  await page.getByRole('button', { name: 'Team Summary Test project' }).click();
  await page.getByRole('button', { name: 'Select assignees' }).click(); // assignees
  await page.getByRole('button', { name: 'Sunday', exact: true }).click();
  await page.getByRole('button', { name: 'Create Task' }).click();
  await page.setDefaultTimeout(6000);
  // Verify the new task appears in the task list
  await expect(page.locator('table')).toContainText('TEST CI/CD');

  // UPDATE TESTING TASK
  // wait for any create/edit modal to be closed before clicking the row
  await page.waitForSelector('.create-task-modal', { state: 'detached', timeout: 5000 }).catch(() => {});
  // pick the first matching row to avoid strict mode violation
  const taskRow = page.locator('table tr', { hasText: 'TEST CI/CD' }).first();
  await taskRow.waitFor({ state: 'visible', timeout: 5000 });
  await taskRow.click();

  // open edit using a button scoped to the row (if present) or the global Edit button after opening details
  // prefer scoped click to avoid ambiguity
  await taskRow.locator('button', { hasText: 'Edit Task' }).first().click().catch(async () => {
    // fallback: click global Edit Task button (after row click opened details)
    await page.getByRole('button', { name: 'Edit Task' }).click();
  });

  // then continue with edits...
  await page.getByRole('textbox', { name: 'Enter task title...' }).fill('TEST CI/CD - UPDATED');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  page.setDefaultTimeout(6000);
  // Verify the updated task appears when we go back to task details
  // assert the paragraph that contains the title is visible
  await expect(page.locator('h1', { hasText: 'TEST CI/CD - UPDATED' })).toBeVisible();
  // alternative: await expect(page.getByText('TEST CI/CD - UPDATED')).toBeVisible();
});

test('use filters to find tasks, and add a comment to the task', async ({ page }) => {
  
  // Fill in the login form
  await page.goto('http:localhost:5173');
  await page.getByPlaceholder('Enter your email').fill(TEST_STAFF_EMAIL);
  await page.getByPlaceholder('Enter your password').fill(TEST_STAFF__PASSWORD);
  await page.locator(".login-button").click(); 
  await page.waitForTimeout(1000); // Wait for navigation
  await page.waitForURL("http://localhost:5173/all-tasks");
  
  // await page.context().storageState({ path: STATE_PATH });

  // await page.getByRole('button', { name: 'All Statuses' }).click();
  // await page.getByRole('button', { name: 'To Do' }).click();
  // assert at least one matching row is visible (use .first() to avoid strict-mode)
  const matchingRow = page.locator('table tr', { hasText: 'TEST CI/CD - UPDATED' }).first();
  await expect(matchingRow).toBeVisible();
  

  // now, add a subtask to 'TEST CI/CD - UPDATED'
  // await page.getByRole('button', { name: 'To Do' }).click();
  await page.getByRole('cell', { name: 'TEST CI/CD - UPDATED' }).click();
  await page.setDefaultTimeout(2000);
  // await page.getByRole('button', { name: 'New Subtask' }).click();
  // await page.getByRole('textbox', { name: 'Subtask Title *' }).click();
  // await page.getByRole('textbox', { name: 'Subtask Title *' }).fill('Subtask for TEST CI/CD - UPDATED');
  await page.getByRole('textbox', { name: 'Add a comment...' }).click();
  await page.getByRole('textbox', { name: 'Add a comment...' }).fill('Comment for task TEST CI/CD - UPDATED');

  // click Post and wait for either the network or the element to appear
  await Promise.all([
    // optional: wait for the API that persists comments (uncomment and adjust if known)
    // page.waitForResponse(resp => resp.url().includes('/comments') && resp.status() === 200, { timeout: 8000 }),
    page.getByRole('button', { name: 'Post Comment' }).click()
  ]);

  // use a precise locator and wait explicitly (longer timeout) instead of scrollIntoViewIfNeeded
  const commentText = 'Comment for task TEST CI/CD - UPDATED';
  const commentLocator = page.locator('div.whitespace-pre-wrap', { hasText: commentText }).first();

  // ensure we give it enough time
  await expect(commentLocator).toBeVisible({ timeout: 8000 });

  // (optionally) restore a sensible default timeout for later steps
  await page.setDefaultTimeout(6000);

  // DELETE TESTING TASK
  await page.goto('http:localhost:5173/all-tasks');
  // await page.locator('table tr', { hasText: 'TEST CI/CD - UPDATED' }).click();
  await page.getByText('TEST CI/CD - UPDATED').first().click();
  await page.getByRole('button', { name: 'Delete Task' }).click();
   page.on('dialog', async dialog => {
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toContain('Are you sure you want to delete this task? This action cannot be undone.');
    await dialog.accept(); // Clicks "OK" on the alert
  });
});

// test('test task management', async ({ page }) => {
//   await page.goto('http:localhost:5173');
//   // Expect the login container and inputs to be visible
// });


  

  //   page.once('dialog', dialog => {
  //   console.log(`Dialog message: ${dialog.message()}`);
  //   dialog.dismiss().catch(() => {});
  // });