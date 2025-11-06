// services/deadlineService.js
import admin from 'firebase-admin';
import { db } from '../adminFirebase.js';
import { sendToUser } from './webSocketService.js';
import { sendEmail } from './emailService.js';

const { FieldValue } = admin.firestore;

const MAX_REMINDER_DAYS_CAP = 30;
let timer = null;
let isRunning = false;

export function startDeadlineChecker(intervalMs = 30_000) {
  // console.log("Deadline checker starting (every ${intervalMs / 1000}s)…");
  runOnce().catch(console.error);
  timer = setInterval(() => runOnce().catch(console.error), intervalMs);
}

export function stopDeadlineChecker() {
  if (timer) clearInterval(timer);
  timer = null;
}

// ------------------ helpers ------------------

function msUntil(deadlineTs) {
  try {
    if (!deadlineTs) return null;
    return deadlineTs.toDate().getTime() - Date.now();
  } catch {
    return null;
  }
}

function getReminderMsForUser(userData) {
  const prefStr = String(userData?.reminderPreference ?? '1');
  const days = parseInt(prefStr, 10);
  const clampDays = Number.isFinite(days) && days > 0
    ? Math.min(days, MAX_REMINDER_DAYS_CAP)
    : 1;
  return clampDays * 24 * 60 * 60 * 1000;
}

export async function resolveUserDoc(userRefLike) {
  if (!userRefLike) return { exists: false };
  try {
    if (typeof userRefLike.get === 'function') {
      return await userRefLike.get(); // DocumentReference
    }
    if (typeof userRefLike === 'string') {
      const path = userRefLike.startsWith('/') ? userRefLike.slice(1) : userRefLike;
      return await db.doc(path).get();
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

/ Send email or in-app notification */
export async function sendNotificationToUser({ taskDoc, taskData, userDoc, reminderDays }) {
  const userData = userDoc.data();
  const userChannel = userData?.channel;
  const userName = userData?.name || '(unknown)';
  const deadlineStr = taskData.deadline?.toDate?.().toLocaleString?.() || '(no deadline)';
  const title = taskData.title || '(untitled)';
  const content = `Reminder: "${title}" is due in ${reminderDays} day(s). Deadline: ${deadlineStr}.`;

  if (userChannel === 'email') {
    // Prefer the user's email; for manual testing fallback to DEFAULT_TEST_EMAIL env var.
    const DEFAULT_TEST_EMAIL = process.env.DEFAULT_TEST_EMAIL || 'jovanwang2002@gmail.com'; // prof please change this to your email to test out!
    const emailMsg = {
      to: userData?.email || DEFAULT_TEST_EMAIL, // hi prof: set DEFAULT_TEST_EMAIL in .env to receive test emails
      from: 'smuagilespm@gmail.com',
      subject: `Task Deadline Reminder: "${title}" due in ${reminderDays} day(s)`,
      text:
        `Hi ${userName}, you have a task due soon!\n` +
        `Task: ${title}\nDescription: ${taskData.description || ''}\n` +
        `Deadline: ${deadlineStr}\n\n— Little Farms`,
    };
    try {
      const resp = await sendEmail(emailMsg);
      // console.log(`📧 Email sent to ${userDoc.id}:`, resp?.[0]?.statusCode ?? 'ok');
    } catch (err) {
      console.error(`Email send failed for user ${userDoc.id}`, err);
    }
  } else {
    const notifId = `${taskDoc.id}_${userDoc.id}`;
    const notifRef = db.collection('Notifications').doc(notifId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(notifRef);
      if (snap.exists) return; // already exists
      tx.set(notifRef, {
        userId: userDoc.id,
        taskId: taskDoc.id,
        status: 'unread',
        content,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    sendToUser({
      type: 'deadlineReminder',
      userId: userDoc.id,
    });
    
    // console.log(`In-app reminder sent to ${userDoc.id}`);
  }
}

/ Fetch candidate tasks */
async function fetchCandidateTasks() {
  const now = new Date();
  const upper = new Date(Date.now() + MAX_REMINDER_DAYS_CAP * 5 * 60 * 60 * 1000);

  const q = db.collection('Tasks')
    .where('deadline', '>', now)
    .where('deadline', '<=', upper)
    .orderBy('deadline', 'asc');

  const snap = await q.get();
  return snap.docs.filter(d => {
    const t = d.data();
    return t?.deadline && t?.status !== 'done';
  });
}

// ------------------ main job ------------------
export async function runOnce() {
  if (isRunning) {
    // console.log('Previous run still in progress, skipping.');
    return;
  }
  isRunning = true;
  

  try {
    const tasks = await fetchCandidateTasks();
    // console.log("Candidate tasks found: ${tasks.length}");

    for (const taskDoc of tasks) {
      const t = taskDoc.data();
      const timeDiff = msUntil(t.deadline);
      if (timeDiff === null || timeDiff <= 0) continue;

      if (t.isReminderSent) {
        // Skip tasks already reminded
        continue;
      }

      const assignees = Array.isArray(t.assignedTo) ? t.assignedTo : [];
      if (assignees.length === 0) continue;

      // Use first user's preference as reference for the task window
      const firstUserDoc = await resolveUserDoc(assignees[0]);
      const reminderMs = getReminderMsForUser(firstUserDoc.data());
      // console.log("Reminder in MS is: ", reminderMs);
      if (timeDiff > reminderMs) continue;

      // console.log(`Sending reminders for task "${t.title}" (${taskDoc.id}) to ${assignees.length} users`);

      // Notify all users assigned to this task
      for (const userRefLike of assignees) {
        const userDoc = await resolveUserDoc(userRefLike);
        if (!userDoc.exists) continue;
        // console.log("TASK DOC, TASKDATA, USERDOC, REMINDERDAYS: ", taskDoc, t, userDoc, Math.max(1, Math.round(reminderMs / (24 * 60 * 60 * 1000))));
        await sendNotificationToUser({
          taskDoc,
          taskData: t,
          userDoc,
          reminderDays: Math.max(1, Math.round(reminderMs / (24 * 60 * 60 * 1000))),
        });
      }

      await taskDoc.ref.update({ isReminderSent: true });
      // console.log(`Task ${taskDoc.id} marked as reminded.`);
    }

    // console.log('Deadline check cycle completed.');
  } catch (err) {
    console.error('Deadline checker error:', err);
  } finally {
    isRunning = false;
  }
}