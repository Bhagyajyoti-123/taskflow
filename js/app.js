import {
  listenToTasks, stopListening,
  addTaskToDb, toggleTaskComplete,
  updateTaskInDb, deleteTaskFromDb,
  toggleSubtask, saveSubtaskNote,
  addSubtask, deleteSubtask
} from "./tasks.js";
import { generateSubtasksAndPriority } from "./gemini.js";
import { requestAndNotify }            from "./notifications.js";

let allTasks      = [];
let currentUid    = null;
let activeFilter  = "all";
let searchQuery   = "";
let editingId     = null;
let subtaskInputs = [];
let notified      = false;

// ── Theme ──
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  document.getElementById("theme-toggle").textContent = theme === "dark" ? "☀ Light" : "☾ Dark";
}
window.toggleTheme = function() {
  const current = localStorage.getItem("theme") || "dark";
  applyTheme(current === "dark" ? "light" : "dark");
};
applyTheme(localStorage.getItem("theme") || "dark");

// ── Auth events ──
window.addEventListener("userLoggedIn", (e) => {
  currentUid = e.detail.uid;
  listenToTasks(currentUid, (tasks) => {
    allTasks = tasks;
    render();
    if (!notified) { notified = true; requestAndNotify(tasks); }
  });
});
window.addEventListener("userLoggedOut", () => {
  currentUid = null; allTasks = []; notified = false; stopListening();
});

// ── Navigation ──
window.goToAddTask = function() {
  document.getElementById("app-screen").classList.remove("active");
  document.getElementById("add-screen").classList.add("active");
  document.getElementById("task-title").value = "";
  document.getElementById("task-due").value   = "";
  document.getElementById("task-desc").value  = "";
  document.getElementById("task-priority").value = "medium";
  document.getElementById("add-error").classList.add("hidden");
  document.getElementById("subtask-list-input").innerHTML = "";
  document.getElementById("ai-result").classList.add("hidden");
  document.getElementById("ai-goal").value    = "";
  document.getElementById("ai-due").value     = "";
  subtaskInputs = [];
};
window.goHome = function() {
  document.getElementById("add-screen").classList.remove("active");
  document.getElementById("app-screen").classList.add("active");
};

// ── AI Planner ──
window.runAI = async function() {
  const goal    = document.getElementById("ai-goal").value.trim();
  const dueDate = document.getElementById("ai-due").value;
  const btn     = document.getElementById("ai-btn");
  const errEl   = document.getElementById("add-error");
  errEl.classList.add("hidden");

  if (!goal)    { showAddErr("Enter your goal first."); return; }
  if (!dueDate) { showAddErr("Set a due date first."); return; }

  btn.textContent = "Thinking…";
  btn.disabled    = true;

  try {
    const result = await generateSubtasksAndPriority(goal, dueDate);

    // Fill in the form automatically
    document.getElementById("task-title").value    = goal;
    document.getElementById("task-due").value      = dueDate;
    document.getElementById("task-priority").value = result.priority;

    // Show AI result box
    document.getElementById("ai-priority-val").textContent = result.priority.toUpperCase();
    document.getElementById("ai-priority-val").className   = `ai-priority-badge priority-${result.priority}`;
    document.getElementById("ai-reason").textContent       = result.reason;
    document.getElementById("ai-result").classList.remove("hidden");

    // Populate subtask inputs
    document.getElementById("subtask-list-input").innerHTML = "";
    subtaskInputs = [];
    result.subtasks.forEach(s => {
      const idx = subtaskInputs.length;
      subtaskInputs.push(s);
      const container = document.getElementById("subtask-list-input");
      const row = document.createElement("div");
      row.className = "subtask-input-row";
      row.id        = `si-${idx}`;
      row.innerHTML = `
        <span class="subtask-bullet">◦</span>
        <input type="text" class="subtask-text-input" value="${s}"
          oninput="subtaskInputs[${idx}] = this.value" />
        <button class="icon-btn delete-btn" onclick="removeSubtaskInput(${idx})">✕</button>`;
      container.appendChild(row);
    });

  } catch (err) {
    showAddErr("AI failed. Check your Gemini API key in js/gemini.js or try again.");
    console.error(err);
  } finally {
    btn.textContent = "✦ Generate with AI";
    btn.disabled    = false;
  }
};

// ── Subtask inputs ──
window.addSubtaskInput = function() {
  const idx = subtaskInputs.length;
  subtaskInputs.push("");
  const container = document.getElementById("subtask-list-input");
  const row = document.createElement("div");
  row.className = "subtask-input-row";
  row.id        = `si-${idx}`;
  row.innerHTML = `
    <span class="subtask-bullet">◦</span>
    <input type="text" class="subtask-text-input"
      placeholder="e.g. Unit 1 – Neural Networks"
      oninput="subtaskInputs[${idx}] = this.value" />
    <button class="icon-btn delete-btn" onclick="removeSubtaskInput(${idx})">✕</button>`;
  container.appendChild(row);
  row.querySelector("input").focus();
};
window.removeSubtaskInput = function(idx) {
  document.getElementById(`si-${idx}`)?.remove();
  subtaskInputs[idx] = null;
};

// ── Add Task ──
window.addTask = async function() {
  const title    = document.getElementById("task-title").value.trim();
  const dueDate  = document.getElementById("task-due").value;
  const desc     = document.getElementById("task-desc").value.trim();
  const priority = document.getElementById("task-priority").value;
  document.getElementById("add-error").classList.add("hidden");

  if (!title)   { showAddErr("Task title is required."); return; }
  if (!dueDate) { showAddErr("Please set a due date."); return; }

  const subtasks = subtaskInputs
    .filter(s => s && s.trim())
    .map(s => ({ title: s.trim(), done: false, note: "" }));

  try {
    await addTaskToDb(currentUid, { title, dueDate, description: desc, priority, subtasks });
    subtaskInputs = [];
    goHome();
  } catch (err) {
    showAddErr("Failed to save. Check your connection.");
    console.error(err);
  }
};
function showAddErr(msg) {
  const el = document.getElementById("add-error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

// ── Filter & Search ──
window.setFilter = function(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const labels = { all:"All Tasks", pending:"Pending", completed:"Completed", overdue:"Overdue", high:"High Priority" };
  document.getElementById("list-heading").textContent = labels[filter] || "Tasks";
  render();
};
window.searchTasks = function(val) { searchQuery = val.toLowerCase(); render(); };

// ── Render ──
function render() {
  const today = todayStr();
  let tasks = [...allTasks];

  if      (activeFilter === "completed") tasks = tasks.filter(t => t.completed);
  else if (activeFilter === "pending")   tasks = tasks.filter(t => !t.completed);
  else if (activeFilter === "overdue")   tasks = tasks.filter(t => !t.completed && t.dueDate < today);
  else if (activeFilter === "high")      tasks = tasks.filter(t => t.priority === "high");

  if (searchQuery) tasks = tasks.filter(t =>
    t.title.toLowerCase().includes(searchQuery) ||
    (t.description && t.description.toLowerCase().includes(searchQuery)));

  const total = allTasks.length;
  const done  = allTasks.filter(t => t.completed).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("stat-total").textContent    = total;
  document.getElementById("stat-done").textContent     = done;
  document.getElementById("stat-pending").textContent  = total - done;
  document.getElementById("progress-pct").textContent  = pct + "%";
  document.getElementById("progress-fill").style.width = pct + "%";

  const container = document.getElementById("task-list");
  container.innerHTML = tasks.length === 0
    ? `<p class="empty-msg">No tasks here yet.</p>`
    : tasks.map(t => taskCardHTML(t, today)).join("");
}

function getSubtaskEntries(task) {
  if (!task.subtasks) return [];
  if (Array.isArray(task.subtasks))
    return task.subtasks.map((s,i) => [i,s]).filter(([,s]) => s && s.title);
  return Object.entries(task.subtasks).filter(([,s]) => s && s.title);
}

function subtasksHTML(task) {
  const entries = getSubtaskEntries(task);
  if (entries.length === 0) return `
    <div class="subtask-section">
      <button class="add-subtask-btn" onclick="doAddSubtask('${task.id}')">＋ Add subtask</button>
    </div>`;

  const total = entries.length;
  const done  = entries.filter(([,s]) => s.done).length;
  const pct   = total ? Math.round((done/total)*100) : 0;

  const rows = entries.map(([idx,s]) => `
    <div class="subtask-row ${s.done ? 'subtask-done' : ''}">
      <button class="subtask-check ${s.done ? 'checked' : ''}"
        onclick="doToggleSubtask('${task.id}','${idx}',${!!s.done})">
        ${s.done ? '✓' : ''}
      </button>
      <div class="subtask-body">
        <span class="subtask-title">${escHtml(s.title)}</span>
        <textarea class="subtask-note"
          placeholder="What's pending / notes for next time…"
          onblur="doSaveNote('${task.id}','${idx}',this.value)"
        >${escHtml(s.note || "")}</textarea>
      </div>
      <button class="icon-btn delete-btn subtask-del"
        onclick="doDeleteSubtask('${task.id}','${idx}')">✕</button>
    </div>`).join("");

  return `
  <div class="subtask-section">
    <div class="subtask-header">
      <span class="subtask-label">Subtasks</span>
      <span class="subtask-progress">${done}/${total} done</span>
    </div>
    <div class="subtask-progress-bar">
      <div class="subtask-progress-fill" style="width:${pct}%"></div>
    </div>
    ${rows}
    <button class="add-subtask-btn" onclick="doAddSubtask('${task.id}')">＋ Add subtask</button>
  </div>`;
}

function taskCardHTML(t, today) {
  const isOverdue   = !t.completed && t.dueDate < today;
  const classes     = ["task-card", t.completed?"completed":"", isOverdue?"overdue":""].filter(Boolean).join(" ");
  const dueLabel    = isOverdue ? `⚠ Overdue · ${formatDate(t.dueDate)}` : `Due ${formatDate(t.dueDate)}`;
  const dueClass    = isOverdue ? "due-text overdue" : "due-text";
  const statusBadge = t.completed
    ? `<span class="badge badge-done">Done</span>`
    : isOverdue ? `<span class="badge badge-overdue">Overdue</span>` : "";

  return `
  <div class="${classes}" id="task-${t.id}">
    <div class="task-top">
      <button class="task-check" onclick="toggleTask('${t.id}',${t.completed})">
        ${t.completed ? '✓' : ''}
      </button>
      <div class="task-body">
        <div class="task-title-text">${escHtml(t.title)}</div>
        ${t.description ? `<div class="task-desc-text">${escHtml(t.description)}</div>` : ""}
        <div class="task-meta">
          <span class="badge badge-${t.priority}">${t.priority}</span>
          ${statusBadge}
          <span class="${dueClass}">${dueLabel}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn edit-btn"   onclick="openEdit('${t.id}')" title="Edit">✎</button>
        <button class="icon-btn delete-btn" onclick="deleteTask('${t.id}')" title="Delete">🗑</button>
      </div>
    </div>
    ${subtasksHTML(t)}
  </div>`;
}

// ── Subtask actions ──
window.doToggleSubtask = async (tid,idx,cur) => await toggleSubtask(currentUid,tid,idx,cur);
window.doSaveNote      = async (tid,idx,note) => await saveSubtaskNote(currentUid,tid,idx,note);
window.doDeleteSubtask = async function(tid,idx) {
  if (!confirm("Remove this subtask?")) return;
  await deleteSubtask(currentUid,tid,idx);
};
window.doAddSubtask = async function(tid) {
  const title = prompt("Subtask name:");
  if (!title || !title.trim()) return;
  await addSubtask(currentUid,tid,title.trim());
};

// ── Task actions ──
window.toggleTask = async (id,cur) => await toggleTaskComplete(currentUid,id,cur);
window.deleteTask = async function(id) {
  if (!confirm("Delete this task? Cannot be undone.")) return;
  await deleteTaskFromDb(currentUid,id);
};

// ── Edit Modal ──
window.openEdit = function(id) {
  const t = allTasks.find(x => x.id === id);
  if (!t) return;
  editingId = id;
  document.getElementById("edit-title").value    = t.title;
  document.getElementById("edit-due").value      = t.dueDate;
  document.getElementById("edit-priority").value = t.priority;
  document.getElementById("edit-desc").value     = t.description || "";
  document.getElementById("modal-overlay").classList.remove("hidden");
};
window.closeModal = function() {
  document.getElementById("modal-overlay").classList.add("hidden");
  editingId = null;
};
window.saveEdit = async function() {
  if (!editingId) return;
  const data = {
    title:       document.getElementById("edit-title").value.trim(),
    dueDate:     document.getElementById("edit-due").value,
    priority:    document.getElementById("edit-priority").value,
    description: document.getElementById("edit-desc").value.trim()
  };
  if (!data.title)   { alert("Title is required."); return; }
  if (!data.dueDate) { alert("Due date is required."); return; }
  await updateTaskInDb(currentUid,editingId,data);
  closeModal();
};

// ── Helpers ──
function todayStr() { return new Date().toISOString().split("T")[0]; }
function formatDate(str) {
  if (!str) return "";
  const [y,m,d] = str.split("-");
  return new Date(y,m-1,d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
