import { db } from "../adminFirebase.js"
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import Bree from 'bree';

const TASK_COLLECTION = "Tasks";

/**
 * Fetch the `deadline` for a single task by id.
 * @param {string} taskId
 * @returns {Promise<{ taskId: string, deadline: Date|null, raw: any } | null>}
 *          Returns null if task doesn't exist. `deadline` is normalized to Date when possible.
 */

export async function taskDeadlineDue(taskId) {
    const taskRef = doc(db, TASK_COLLECTION, taskId);
    const snap = await getDoc(taskRef);

    // if (!snap.exists()) {
    //     console.warn(`Task ${taskId} not found`);
    // return null;

    const data = snap.data();
    const rawDeadline = data?.deadline ?? null;
    if (!rawDeadline) return null;   // no deadline stored
    if (typeof rawDeadline.toMillis === "function") {
        ms_of_deadline = rawDeadline.toMillis();
        const timestamp = Date.now();
        return Date.now() >= ms_of_deadline;
    }
}
