import { db } from "./firebase.js";
import {
  ref, push, update, remove, onValue, off
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let currentRef = null;

export function listenToTasks(uid, callback) {
  if (currentRef) off(currentRef);
  currentRef = ref(db, `tasks/${uid}`);
  onValue(currentRef, (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    const tasks = Object.entries(data)
      .map(([id, val]) => ({ id, ...val }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(tasks);
  });
}

export function stopListening() {
  if (currentRef) { off(currentRef); currentRef = null; }
}

export async function addTaskToDb(uid, task) {
  await push(ref(db, `tasks/${uid}`), {
    title:       task.title,
    description: task.description || "",
    dueDate:     task.dueDate,
    priority:    task.priority,
    completed:   false,
    subtasks:    task.subtasks || [],
    createdAt:   Date.now()
  });
}

export async function toggleTaskComplete(uid, taskId, current) {
  await update(ref(db, `tasks/${uid}/${taskId}`), { completed: !current });
}

export async function updateTaskInDb(uid, taskId, data) {
  await update(ref(db, `tasks/${uid}/${taskId}`), data);
}

export async function deleteTaskFromDb(uid, taskId) {
  await remove(ref(db, `tasks/${uid}/${taskId}`));
}

export async function toggleSubtask(uid, taskId, idx, current) {
  await update(ref(db, `tasks/${uid}/${taskId}/subtasks/${idx}`), { done: !current });
}

export async function saveSubtaskNote(uid, taskId, idx, note) {
  await update(ref(db, `tasks/${uid}/${taskId}/subtasks/${idx}`), { note });
}

export async function addSubtask(uid, taskId, title) {
  await push(ref(db, `tasks/${uid}/${taskId}/subtasks`), { title, done: false, note: "" });
}

export async function deleteSubtask(uid, taskId, idx) {
  await remove(ref(db, `tasks/${uid}/${taskId}/subtasks/${idx}`));
}
