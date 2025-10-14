import express from 'express';
import { getTaskById } from '../services/taskService.js';
import { sendEmail } from '../services/emailService.js';
import { getUserById } from '../services/userService.js';

const router = express.Router();
const senderEmail = process.env.SENDER_EMAIL
console.log("Sender email is " + senderEmail);
// POST /api/update/tasks/manager
router.post('/tasks/manager', async (req, res) => {
    const updatedFields = req.body;
    const id = updatedFields.id;

    const oldTaskData = await getTaskById(id);
    const changes = {};
    for (const key of Object.keys(updatedFields)) {
        if (updatedFields[key] !== oldTaskData[key]) {
            changes[key] = {old: oldTaskData[key], new: updatedFields[key]};
        }
    }

    let changesText = 'The following fields were updated:\n';
    for (const [field, value] of Object.entries(changes)) {
        changesText += `- ${field}: "${formatValue(value.old)}" → "${formatValue(value.new)}"\n`;
    }

    const emailMsg = {
        to: "jovanwang2002@gmail.com", // its jovan for now
        from: senderEmail,
        subject: `Task Update Notification: ${updatedFields.title || oldTaskData.title}`,
        text: `Hello,

        The task "${updatedFields.title || oldTaskData.title}" has been updated.

        ${changesText}
        `
    };

    console.log(emailMsg);
    try {
        await sendEmail(emailMsg);
        console.log("EMAIL IS SENT!!");
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
  if (typeof val.toDate === "function") return val.toDate().toISOString();
  return String(val); // fallback
}


export default router;