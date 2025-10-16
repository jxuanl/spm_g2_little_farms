// services/deadlineService.js
import { db } from '../adminFirebase.js';
import { sendToUser } from './webSocketService.js';
import { sendEmail } from './emailService.js';

let timer = null;
let isRunning = false; // prevent overlapping runs

export function startDeadlineChecker(intervalMs = 30_000) {
  console.log(`⏱️ Deadline checker starting (every ${intervalMs / 1000}s)…`);

  // run once immediately, then on interval
  runOnce().catch(console.error);

  timer = setInterval(() => {
    runOnce().catch(console.error);
  }, intervalMs);
}

export function stopDeadlineChecker() {
  if (timer) clearInterval(timer);
  timer = null;
}

// One execution of the checker
async function runOnce() {
  if (isRunning) {
    console.log('⏳ Previous deadline check still running; skipping this tick.');
    return;
  }
  isRunning = true;

  try {
    const userSnap = await db.collection('Users').get();
    console.log('🔎 Users found:', userSnap.size);

    for (const userDoc of userSnap.docs) {
      // console.log(userDoc.id)
      const userData = userDoc.data();
      const userName = userData.name || '(unknown)';
      const userChannel = userData.channel; // "email" | "in-app"
      const prefStr = String(userData.reminderPreference ?? '1'); // e.g. "1"
      const reminderDays = parseInt(prefStr, 10);
      const reminderMs = reminderDays * 24 * 60 * 60 * 1000;

      console.log(`Checking ${userName}'s tasks…`);

      const assignedToPath = db.doc(`/Users/${userDoc.id}`);
      const taskSnap = await db.collection('Tasks')
        .where('assignedTo', 'array-contains', assignedToPath)
        .get();

      for (const taskDoc of taskSnap.docs) {
        try {
          const t = taskDoc.data();
          const deadline = t.deadline;
          const alreadySent = t.isReminderSent || false;
          if (!deadline || alreadySent) continue;

          const now = Date.now();
          const dueMs = deadline.toDate().getTime();
          const timeDiff = dueMs - now;

          if (t.status !== 'done' && timeDiff > 0 && timeDiff <= reminderMs) {
            console.log(`Need to notify ${userName} for "${t.title}"`);

            if (userChannel === 'email') {
              const emailMsg = {
                to: 'jovanwang2002@gmail.com', // TODO: use userData.email when ready
                from: 'smuagilespm@gmail.com',
                subject: `Task Deadline Reminder: "${t.title}" due in ${reminderDays} day(s)`,
                text:
                  `Hi ${userName}, you have a task due soon!\n` +
                  `Task: ${t.title}\n` +
                  `Description: ${t.description || ''}\n` +
                  `Deadline: ${deadline.toDate().toLocaleString()}\n\n— Little Farms`,
              };

              try {
                const resp = await sendEmail(emailMsg); // must await sgMail.send(...)
                console.log('Email sent:', resp?.[0]?.statusCode ?? 'ok');
                await taskDoc.ref.update({ isReminderSent: true });
              } catch (err) {
                console.error('Email send failed:', err);
              }
            } else {
              // (Recommended) Persist a notification row first, then nudge:
              // const notifRef = db.collection('Notifications').doc();
              // await notifRef.set({ id: notifRef.id, userId: userData.id, type: 'DEADLINE_REMINDER', status: 'unread', createdAt: new Date(), payload: { taskId: taskDoc.id, title: t.title, dueAt: deadline.toDate() } });

              // WebSocket nudge so the client refetches notifications
              sendToUser({
                type: 'deadlineReminder',
                message: `Reminder: "${t.title}" is due in ${reminderDays} day(s). Deadline: ${deadline.toDate().toLocaleString()}.`,
              });
              
              const content_to_add_to_notification_db = {
                id: userDoc.id,
                status: 'unread',
                content: `Reminder: "${t.title}" is due in ${reminderDays} day(s). Deadline: ${deadline.toDate().toLocaleString()}.`}
              await db.collection('Notifications').add(content_to_add_to_notification_db)
              await taskDoc.ref.update({ isReminderSent: true });
            }
          }
        } catch (taskErr) {
          console.error('Task processing error:', taskErr);
          continue;
        }
      }
    }
  } catch (err) {
    console.error('Deadline checker error:', err);
  } finally {
    isRunning = false;
  }
}
