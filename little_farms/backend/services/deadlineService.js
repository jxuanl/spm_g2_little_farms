import Bree from 'bree'
import path from 'path'

const jobsFolder = path.resolve('./jobs');

const bree = new Bree({
  root: jobsFolder,
  jobs: [{
      name: 'deadline-reminder',
      interval: '10s',
      timeout: '5s', 
  }]
})

export function startDeadlineChecker() {
  bree.start();
}

startDeadlineChecker();

// jobs/check-deadline.js
// import { parentPort, workerData } from "node:worker_threads";
// import { taskDeadlineDue } from "../services/deadlineService.js";

// (async () => {
//   try {
//     const { taskId } = workerData;
//     if (!taskId) throw new Error("Missing taskId in workerData");

//     const overdue = await taskDeadlineDue(taskId);

//     if (overdue === true) {
//       console.log(`[Bree] Task ${taskId} is OVERDUE`);
//       // TODO: notify/update status here
//     } else if (overdue === false) {
//       console.log(`[Bree] Task ${taskId} not overdue`);
//     } else {
//       console.warn(`[Bree] Task ${taskId} not found or has no deadline`);
//     }

//     parentPort?.postMessage("done");
//   } catch (err) {
//     console.error("[Bree] check-deadline error:", err);
//     parentPort?.postMessage("error");
//   }
// })();
