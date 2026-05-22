const GEMINI_API_KEY = "AIzaSyAN-MtmoOz2sZZtJjhrKILSfKurqQlfRrk";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function generateSubtasksAndPriority(goal, dueDate) {
  const today    = new Date().toISOString().split("T")[0];
  const daysLeft = Math.ceil((new Date(dueDate) - new Date(today)) / (1000 * 60 * 60 * 24));

  const prompt = `
You are a productivity assistant. A student has this goal: "${goal}"
Due date: ${dueDate} (${daysLeft} days from today).

Do two things:
1. Break this goal into 3-6 specific subtasks (actionable steps, not vague).
2. Suggest a priority level: "high" if due in 3 days or less, "medium" if 4-7 days, "low" if more than 7 days.

Respond ONLY with valid JSON in this exact format, no extra text:
{
  "subtasks": ["subtask 1", "subtask 2", "subtask 3"],
  "priority": "high",
  "reason": "one sentence why this priority"
}`;

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!res.ok) {
    const status = res.status;
    if (status === 429) throw new Error("QUOTA_EXCEEDED");
    throw new Error(`Gemini API error: ${status}`);
  }

  const data  = await res.json();
  const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}