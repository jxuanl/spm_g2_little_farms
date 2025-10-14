// jobs/check-deadline.js
import { db } from "../adminFirebase.js";
import { parentPort } from "node:worker_threads";
import sgMail from '@sendgrid/mail';
import { sendEmail } from "../services/emailService.js";
// console.log(sgMail);


console.log("Hi, I will be starting deadline checker");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

(async () => {
  try {
    // const taskRef = db.collection("Tasks");
    const userRef = db.collection("Users");
    const snapshot = await userRef.get();

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const userReminderPreference = userData.reminderPreference;
      console.log(`User ${userDoc.id} reminder preference is ${userReminderPreference}`);

      // now that i have their preference, compare and find which tasks are in the range
      const userId = userData.id;
      const taskAssignedToPath = db.doc(`/Users/${userDoc.id}`);
      console.log(`${userData.name}'s assignedTo path is ${taskAssignedToPath}`);
      const taskRef = db.collection("Tasks").where("assignedTo", "array-contains", taskAssignedToPath);
      const taskSnapshot = await taskRef.get();

      taskSnapshot.docs.forEach(async (taskDoc) => {
        const taskData = taskDoc.data();
        const deadline = taskData.deadline;
        const now = Date.now();
        const reminderDays = parseInt(userReminderPreference, 10); // "1, 3 & 5"
        const reminderMs = reminderDays * 24 * 60 * 60 * 1000;
        const deadlineMs = deadline.toDate().getTime();
        console.log(deadlineMs);
        const timeDiff = deadlineMs - now;
        if (taskData.status != "done" && (timeDiff > 0 && timeDiff <= reminderMs)) {
          // then task is due within the reminder period
          console.log("TRUE");
          const emailMsg = {
            to: "jovanwang2002@gmail.com",
            from: 'smuagilespm@gmail.com',
            subject: 'Task Deadline Reminder for "' + taskData.title + '", which is due in ' + userReminderPreference + " days.",
            text: 'Task title: ' + taskData.title + "\nDescription: " + taskData.description,
          }
          try {
            await sendEmail(emailMsg);
            console.log("EMAIL IS SENT!!");
          } catch (err) {
            console.error("Email sending failed:", err);
          }
        }
      })
    };
  } catch (err) {
    console.error("Error checking overdue tasks:", err);
  }

  // Signal to the parent thread that the job is done
  if (parentPort) {
    parentPort.postMessage('done');
  } else {
    process.exit(0);
  }
})();
