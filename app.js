let reminders = JSON.parse(localStorage.getItem("meds")) || [];
let currentMode = "rel";

window.onload = () => {
  const now = new Date();
  document.getElementById("absDate").value = now.toISOString().split("T")[0];
  document.getElementById("absTime").value = now.toTimeString().slice(0, 5);
  render();
};

function switchMode(mode) {
  currentMode = mode;
  document.getElementById("modeRel").style.display =
    mode === "rel" ? "block" : "none";
  document.getElementById("modeAbs").style.display =
    mode === "abs" ? "block" : "none";
  document.getElementById("tabRel").classList.toggle("active", mode === "rel");
  document.getElementById("tabAbs").classList.toggle("active", mode === "abs");
  updatePreview();
}

function adjustHours(amount) {
  const el = document.getElementById("hoursDelay");
  let val = parseFloat(el.value) || 0;
  el.value = Math.max(0, val + amount);
  updatePreview();
}

function setQuickTime(h) {
  document.getElementById("hoursDelay").value = h;
  updatePreview();
}

function getCalculatedTarget() {
  if (currentMode === "rel") {
    const h = parseFloat(document.getElementById("hoursDelay").value);
    return h && h > 0 ? Date.now() + h * 3600000 : null;
  } else {
    const d = document.getElementById("absDate").value;
    const t = document.getElementById("absTime").value;
    return d && t ? new Date(`${d}T${t}`).getTime() : null;
  }
}

function updatePreview() {
  const target = getCalculatedTarget();
  const preview = document.getElementById("timePreview");
  if (target && target > Date.now()) {
    const d = new Date(target);
    preview.innerText = `Remind at: ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (${d.toLocaleDateString([], { month: "short", day: "numeric" })})`;
  } else {
    preview.innerText = "Set a valid future time";
  }
}

function addReminder() {
  const nameEl = document.getElementById("medName");
  const targetTime = getCalculatedTarget();
  if (!nameEl.value || !targetTime || targetTime <= Date.now()) return;
  const fmtName =
    nameEl.value.charAt(0).toUpperCase() + nameEl.value.slice(1).toLowerCase();
  reminders.push({
    id: Date.now(),
    name: fmtName,
    targetTime,
    info: typeof medDatabase !== "undefined" ? medDatabase[fmtName] || "" : "",
    status: "active",
    notified: false,
  });
  nameEl.value = "";
  document.getElementById("hoursDelay").value = "";
  save();
}

function save() {
  localStorage.setItem("meds", JSON.stringify(reminders));
  render();
}

function complete(id) {
  const m = reminders.find((r) => r.id === id);
  if (m) m.status = "completed";
  save();
}

function remove(id) {
  reminders = reminders.filter((r) => r.id !== id);
  save();
}

function render() {
  const list = document.getElementById("reminderList");
  list.innerHTML = "";
  if (reminders.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:40px; color:var(--gray-light); font-size:13px;">No medications scheduled</div>`;
    return;
  }
  const sorted = [...reminders].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    if (a.status === "active" && b.status === "active")
      return a.targetTime - b.targetTime;
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    return a.targetTime - b.targetTime;
  });
  sorted.forEach((m) => {
    const d = new Date(m.targetTime);
    const isPending = m.status === "pending";
    const isDone = m.status === "completed";
    list.innerHTML += `
            <div class="card med-item" style="${isDone ? "opacity:0.3" : ""}; border-left: 4px solid ${isPending ? "var(--red)" : isDone ? "var(--gray-border)" : "var(--blue)"}">
                <div class="med-header">
                    <span class="med-name">${m.name}</span>
                    <span class="status-tag ${isPending ? "tag-pending" : ""}">${m.status}</span>
                </div>
                <div style="font-size:12px; color:var(--gray-light)">
                    ${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                ${m.info ? `<div class="info-box">${m.info}</div>` : ""}
                ${isPending ? `<button class="btn-outline" onclick="complete(${m.id})">Mark as Taken</button>` : ""}
                <button class="del-link" onclick="remove(${m.id})">Delete</button>
            </div>`;
  });
}

function updateTimer() {
  const container = document.getElementById("timerContainer");
  const pending = reminders.filter((m) => m.status === "pending");
  const active = reminders
    .filter((m) => m.status === "active")
    .sort((a, b) => a.targetTime - b.targetTime);
  if (pending.length > 0) {
    container.style.display = "block";
    container.style.borderColor = "var(--red)";
    document.getElementById("timerTitle").innerText =
      `Overdue: ${pending[0].name}`;
    document.getElementById("countdown").innerText = "NOW";
    document.getElementById("countdown").style.color = "var(--red)";
    return;
  }
  if (active.length === 0) {
    container.style.display = "none";
    return;
  }
  const diff = active[0].targetTime - Date.now();
  container.style.display = "block";
  container.style.borderColor = "var(--gray-border)";
  document.getElementById("countdown").style.color = "var(--white)";
  document.getElementById("timerTitle").innerHTML = `Next: ${active[0].name}`;
  const h = Math.floor(diff / 3600000),
    m = Math.floor((diff % 3600000) / 60000),
    s = Math.floor((diff % 60000) / 1000);
  document.getElementById("countdown").innerText =
    `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function checkMeds() {
  const now = Date.now();
  let updated = false;
  reminders.forEach((m) => {
    if (m.status === "active" && now >= m.targetTime) {
      m.status = "pending";
      if (!m.notified) {
        if ("Notification" in window && Notification.permission === "granted")
          new Notification("Medicare", { body: `Take ${m.name}` });
        m.notified = true;
      }
      updated = true;
    }
  });
  if (updated) save();
}

setInterval(() => {
  updateTimer();
  checkMeds();
}, 1000);
if ("Notification" in window && Notification.permission !== "denied")
  Notification.requestPermission();
