// services/notificationService.js
import admin from 'firebase-admin';
import { db } from '../adminFirebase.js';
import { getTaskById } from './taskService.js';
import { sendEmail } from './emailService.js';
import { resolveUserDoc, sendNotificationToUser } from './deadlineService.js';
import AuthService from './userService.js';
import { sendToUser } from './webSocketService.js';

const senderEmail = process.env.SENDER_EMAIL;

// ==============================
// Helper Functions
// ==============================
function formatValue(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map(formatValue).join(", ");
  if (val.path) return val.path; // Firestore DocumentReference
  if (val._seconds !== undefined && val._nanoseconds !== undefined) {
    const date = new Date(val._seconds * 1000 + val._nanoseconds / 1e6);
    return new Intl.DateTimeFormat('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Singapore'
    }).format(date);
  }
  return String(val);
}

function formatFirestoreTimestamp(timestamp) {
  let date;
  // numeric ms since epoch
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp._seconds !== undefined) {
    date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1e6);
  } else {
    // fallback try
    date = new Date(timestamp);
  }
  return new Intl.DateTimeFormat('en-SG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Singapore'
  }).format(date);
 }

// create a notification doc for a user
async function createNotificationForUser({ userId, title, body, taskId = null, url = null, metadata = {} }) {
  try {
    const notif = {
      userId,
      title,
      body,
      taskId,
      url,
      metadata,
      status: 'unread',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
    await db.collection('Notifications').add(notif)
    // try to push realtime if socket connected (best-effort)
    try { sendToUser({ type: 'notification', userId, title, body, taskId, url, metadata }) } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('Failed to create notification doc:', err)
  }
}

// ==========================================================================================

// Get all notifications for the current user
export async function getNotifications(userId) {
  const q = db
    .collection('Notifications')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc');

  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Acknowledge a notification (mark as read)
export async function acknowledgeNotification(notifId, userId) {
  const notifRef = db.collection('Notifications').doc(notifId);
  const notifSnap = await notifRef.get();

  if (!notifSnap.exists) throw new Error('Notification not found');

  const notifData = notifSnap.data();
  if (notifData.userId !== userId) throw new Error('Forbidden');

  await notifRef.update({ status: 'read' });
  return { success: true };
}

// Handle manager updating a task
export async function handleManagerTaskUpdate(updatedFields) {
  const id = updatedFields.id;
  const changes = {};
  let taskTitle = "";

  // Detect changed fields
  for (const [key, value] of Object.entries(updatedFields)) {
    if (key === 'id') continue;
    if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
      if (JSON.stringify(value.old) !== JSON.stringify(value.new)) {
        changes[key] = { old: value.old, new: value.new };
      }
    }
  }

  // Get task title if not changed
  if (!changes["title"]) {
    const taskData = await getTaskById(id);
    taskTitle = taskData.title;
  }

  let changesText = 'The following fields were updated:\n';
  for (const [field, value] of Object.entries(changes)) {
    changesText += `- ${field}: "${formatValue(value.old)}" → "${formatValue(value.new)}"\n`;
  }

  const taskDoc = await db.collection('Tasks').doc(id).get();
  if (!taskDoc.exists) throw new Error("Task not found");
  const taskData = taskDoc.data();

  // Notify assigned users
  const assignees = Array.isArray(taskData.assignedTo) ? taskData.assignedTo : [];
  for (const userRefLike of assignees) {
    const userDoc = await resolveUserDoc(userRefLike);
    if (!userDoc.exists) continue;

    try {
      // create a change notification (instead of the deadline reminder)
      const userId = userDoc.id;
      const title = `Task Updated: ${updatedFields.title?.new || taskTitle}`;
      const body = changesText || `Task "${updatedFields.title?.new || taskTitle}" was updated.`;
      await createNotificationForUser({
        userId,
        title,
        body,
        taskId: id,
        metadata: { changeCount: Object.keys(changes).length }
      });
    } catch (err) {
      console.error(`Failed to send notification to user ${userDoc.id}:`, err);
    }
  }

  // Send update email
  const emailMsg = {
    to: "jovanwang2002@gmail.com", // temporary
    from: senderEmail,
    subject: `Task Update Notification: ${updatedFields.title?.new || taskTitle}`,
    text: `Hello, The task "${updatedFields.title?.new || taskTitle}" has been updated.\n\n${changesText}`
  };

  await sendEmail(emailMsg);
  return { message: "Email sent and notifications dispatched", changes };
}

// Handle daily digest
export async function sendDailyDigest(userId, detailedTasks) {
  const userData = await AuthService.getUserById(userId);
  const userEmail = "jovanwang2002@gmail.com"; // replace with userData.user.email
  const tasks = Array.isArray(detailedTasks) ? detailedTasks : [];

  // helper: safe HTML escaping
  const escapeHtml = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  // helper: robust timestamp formatting you already have
  const fmt = (ts) => formatFirestoreTimestamp(ts) || '—';

  // build one table per task (header row + one data row)
  const htmlTables = tasks.map((t) => {
    const project = escapeHtml(t.prjTitle || '—');
    const desc = escapeHtml(t.description || '—');
    const deadline = escapeHtml(fmt(t.deadline));
    const status = escapeHtml(t.status || '—');
    const title = escapeHtml(t.taskTitle || 'Untitled Task');

    return `
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:16px 0;border:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;">
        <thead>
          <tr>
            <th colspan="4" align="left" style="background:#f8fafc;padding:12px 14px;font-size:16px;border-bottom:1px solid #e5e7eb;">
              ${title}
            </th>
          </tr>
          <tr>
            <th align="left" style="background:#f1f5f9;padding:8px 12px;border-bottom:1px solid #e5e7eb;">Project</th>
            <th align="left" style="background:#f1f5f9;padding:8px 12px;border-bottom:1px solid #e5e7eb;">Task Description</th>
            <th align="left" style="background:#f1f5f9;padding:8px 12px;border-bottom:1px solid #e5e7eb;">Deadline</th>
            <th align="left" style="background:#f1f5f9;padding:8px 12px;border-bottom:1px solid #e5e7eb;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td valign="top" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${project}</td>
            <td valign="top" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${desc}</td>
            <td valign="top" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${deadline}</td>
            <td valign="top" style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${status}</td>
          </tr>
        </tbody>
      </table>
    `;
  });

  const htmlBody = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <h2 style="margin:0 0 8px 0;">Daily Digest</h2>
      <p style="margin:0 0 16px 0;">Here’s a summary of your tasks:</p>
      ${htmlTables.join('\n')}
      <p style="color:#64748b;font-size:12px;margin-top:24px;">— This is an automated message.</p>
    </div>
  `;

  // plain-text fallback
  const textBody = tasks.map((t, i) => {
    return [
      `${i + 1}. ${t.taskTitle || 'Untitled Task'}`,
      `Project: ${t.prjTitle || '—'}`,
      `Task Description: ${t.description || '—'}`,
      `Deadline: ${fmt(t.deadline)}`,
      `Status: ${t.status || '—'}`,
      ''
    ].join('\n');
  }).join('\n');

  const emailMsg = {
    to: userEmail,
    from: senderEmail,
    subject: `Daily Digest: ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
    text: textBody || 'No tasks found for today.',
    html: tasks.length ? htmlBody : `<p>No tasks found for today.</p>`
  };

  await sendEmail(emailMsg);
  return { message: 'Daily digest sent', count: tasks.length };
}

export async function handleNewCommentNotification({ taskId, subtaskId, taskName, commentText, commenterName, personsIdInvolved, timestamp }) {
  const taskDoc = await db.collection('Tasks').doc(taskId).get();
  if (!taskDoc.exists) throw new Error("Task not found");
  const taskData = taskDoc.data();
  taskName = taskData.title || 'Untitled Task';
  const commentTime = formatFirestoreTimestamp(timestamp);

  // build the frontend link (subtaskId optional)
  const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  const url = subtaskId ? `${frontendBase}/all-tasks/${taskId}/${subtaskId}` : `${frontendBase}/all-tasks/${taskId}`;

  const body = `${commenterName} commented on task "${taskName}" at ${commentTime}:\n\n"${commentText}"\n\n`;

  const targets = Array.isArray(personsIdInvolved) ? personsIdInvolved : [];
  if (targets.length === 0) {
    return { message: 'No recipients provided' };
  }

  const results = [];
  for (const userId of targets) {
    try {
      const userDoc = await db.collection('Users').doc(userId).get();
      if (!userDoc.exists) {
        results.push({ userId, error: 'User not found' });
        continue;
      }
      const userData = userDoc.data();
      // canonical channel var; fallbacks if schema differs
      const channel = userData.channel || userData.reminderPreference || 'in-app';

      const title = `New Comment on Task: ${taskName}`;
      if (channel === 'in-app') {
        await createNotificationForUser({
          userId,
          title,
          body,
          taskId,
          url,
          metadata: {}
        });
        results.push({ userId, channel: 'in-app', ok: true });
      } else {
        // send email (use user's email if present)
        const toEmail = userData.email || (userData.user && userData.user.email) || null;
        if (!toEmail) {
          results.push({ userId, error: 'No email for user' });
          continue;
        }
        const emailMsg = {
          to: toEmail,
          from: senderEmail,
          subject: title,
          text: body + `\n\nView: ${url}`
        };
        await sendEmail(emailMsg);
        results.push({ userId, channel: 'email', ok: true });
      }
    } catch (e) {
      console.error(`Failed to notify ${userId}:`, e);
      results.push({ userId, error: e?.message || String(e) });
    }
  }

  return { message: 'Notifications processed', results };
}