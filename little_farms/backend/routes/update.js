import express from 'express';
import { getTaskById } from '../services/taskService.js';
import { sendEmail } from '../services/emailService.js';

const router = express.Router();
const senderEmail = process.env.SENDER_EMAIL
let taskTitle = "";
// POST /api/update/tasks/manager
// router.post('/tasks/manager', async (req, res) => {
//     const updatedFields = req.body;
//     const id = updatedFields.id;

//     console.log("HI U CALLED ME?")
//     const oldTaskData = await getTaskById(id);
//     const changes = {};
//     for (const key of Object.keys(updatedFields)) {
//         if (updatedFields[key] !== oldTaskData[key]) {
//             changes[key] = {old: oldTaskData[key], new: updatedFields[key]};
//         }
//     }
//     console.log("CHANGES:", changes);
//     let changesText = 'The following fields were updated:\n';
//     for (const [field, value] of Object.entries(changes)) {
//         changesText += `- ${field}: "${formatValue(value.old)}" → "${formatValue(value.new)}"\n`;
//     }

//     const emailMsg = {
//         to: "jovanwang2002@gmail.com", // its jovan for now
//         from: senderEmail,
//         subject: `Task Update Notification: ${updatedFields.title || oldTaskData.title}`,
//         text: `Hello,

//         The task "${updatedFields.title || oldTaskData.title}" has been updated.

//         ${changesText}
//         `
//     };

//     console.log(emailMsg);
//     try {
//         await sendEmail(emailMsg);
//         console.log("EMAIL IS SENT!!");
//         res.status(200).json({ message: "Email sent successfully", changes });
//     } catch (err) {
//         console.error("Email sending failed:", err);
//     }
// });

router.post('/tasks/manager', async (req, res) => {
    const updatedFields = req.body;
    const id = updatedFields.id;

    const changes = {};
    for (const [key, value] of Object.entries(updatedFields)) {
        if (key === 'id') continue;
        if (value && typeof value === 'object' && 'old' in value && 'new' in value) {
            // Consider this a potential change
            if (JSON.stringify(value.old) !== JSON.stringify(value.new)) {
                changes[key] = { old: value.old, new: value.new };
            }
        } else {
            // If structure is unexpected, ignore or optionally log
            console.warn(`Field ${key} missing required old/new structure`);
        }
    }

    console.log("CHANGES:", changes);
    if (!changes["title"]) {
        const TaskData = await getTaskById(id); // when the title is not changed
        taskTitle = TaskData.title;
    }
    let changesText = 'The following fields were updated:\n';
    for (const [field, value] of Object.entries(changes)) {
        changesText += `- ${field}: "${formatValue(value.old)}" → "${formatValue(value.new)}"\n`;
    }

    const emailMsg = {
        to: "jovanwang2002@gmail.com", // its jovan for now
        from: senderEmail,
        subject: `Task Update Notification: ${updatedFields.title?.new || taskTitle }`,
        text: `Hello, The task "${updatedFields.title?.new || taskTitle}" has been updated.

        ${changesText}
        `
    };

    console.log(emailMsg);
    try {
        await sendEmail(emailMsg);
        console.log("EMAIL IS SENT!!");
        res.status(200).json({ message: "Email sent successfully", changes });
    } catch (err) {
        console.error("Email sending failed:", err);
    }
});

function formatValue(val) {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map(formatValue).join(", ");
  // For Firestore document references
  if (val.path) return val.path; // DocumentReference object
  // For Firestore Timestamp
  if (val._seconds !== undefined && val._nanoseconds !== undefined) {
    const date = new Date(val._seconds * 1000 + val._nanoseconds / 1e6);
    return new Intl.DateTimeFormat('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Singapore'
    }).format(date);
  }
  return String(val); // fallback
}

function formatFirestoreTimestamp(timestamp) {
  const date = timestamp.toDate ? timestamp.toDate() : 
    new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
  return new Intl.DateTimeFormat('en-SG', { 
    dateStyle: 'medium', 
    timeStyle: 'short', 
    timeZone: 'Asia/Singapore'
    }).format(date);
}



export default router;
