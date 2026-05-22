// Check for tasks due today and fire browser notifications
export async function requestAndNotify(tasks) {
  if (!("Notification" in window)) return;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return;

  const today    = new Date().toISOString().split("T")[0];
  const dueTasks = tasks.filter(t => !t.completed && t.dueDate === today);

  if (dueTasks.length === 0) return;

  if (dueTasks.length === 1) {
    new Notification("TaskFlow ◈ Due Today", {
      body: `"${dueTasks[0].title}" is due today. Get it done!`,
      icon: "https://bhagyajyoti-123.github.io/taskflow/icon.png"
    });
  } else {
    new Notification(`TaskFlow ◈ ${dueTasks.length} tasks due today`, {
      body: dueTasks.map(t => `• ${t.title}`).join("\n"),
      icon: "https://bhagyajyoti-123.github.io/taskflow/icon.png"
    });
  }
}
