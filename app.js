let reminders = JSON.parse(localStorage.getItem("meds")) || [];
let currentMode = "rel",
  relHours = 0.5,
  showHistory = false,
  audioUnlocked = false;
const alarm = new Audio();
alarm.loop = true;

window.onload = () => {
  const now = new Date();
  document.getElementById("absDate").value = now.toISOString().split("T")[0];
  document.getElementById("absTime").value = now.toTimeString().slice(0, 5);
  render();
};

function unlockAudio() {
  if (audioUnlocked) return;
  alarm.src =
    "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
  alarm
    .play()
    .then(() => {
      alarm.pause();
      audioUnlocked = true;
      document.getElementById("statusDot").style.background = "#00e676";
    })
    .catch(() => {});
}

function switchMode(mode) {
  currentMode = mode;
  document.getElementById("modeRel").style.display =
    mode === "rel" ? "block" : "none";
  document.getElementById("modeAbs").style.display =
    mode === "abs" ? "block" : "none";
  document.getElementById("tabRel").classList.toggle("active", mode === "rel");
  document.getElementById("tabAbs").classList.toggle("active", mode === "abs");
}

function adjustHours(amount) {
  relHours = Math.max(0.5, relHours + amount);
  document.getElementById("hrDisplay").innerText = relHours;
}

function previewSound() {
  if (!audioUnlocked) unlockAudio();
  alarm.src = `assets/sounds/${document.getElementById("soundSelect").value}.mp3`;
  alarm.loop = false;
  alarm.play().catch(() => {});
  setTimeout(() => {
    if (!alarm.loop) alarm.pause();
  }, 2000);
}

function addReminder() {
  const nameInput = document.getElementById("medName").value.trim();
  if (!nameInput) return;
  let targetTime;
  if (currentMode === "rel") {
    targetTime = Date.now() + relHours * 3600000;
  } else {
    const d = document.getElementById("absDate").value,
      t = document.getElementById("absTime").value;
    if (!d || !t) return;
    targetTime = new Date(`${d}T${t}`).getTime();
  }
  if (targetTime <= Date.now()) return alert("Select future time");
  let info = "";
  if (typeof medDatabase !== "undefined") {
    const key = Object.keys(medDatabase).find(
      (k) => k.toLowerCase() === nameInput.toLowerCase(),
    );
    info = key ? medDatabase[key] : "";
  }
  reminders.push({
    id: Date.now(),
    name: nameInput,
    targetTime,
    sound: document.getElementById("soundSelect").value,
    info,
    status: "active",
    notified: false,
  });
  document.getElementById("medName").value = "";
  save();
}

function save() {
  localStorage.setItem("meds", JSON.stringify(reminders));
  render();
}

function toggleHistory() {
  showHistory = !showHistory;
  document.getElementById("historyLabel").innerText = showHistory
    ? "Hide History"
    : "Show History";
  render();
}

function clearHistory() {
  if (confirm("Delete all history logs?")) {
    reminders = reminders.filter((m) => m.status !== "completed");
    save();
  }
}

function render() {
  const list = document.getElementById("reminderList"),
    search = document.getElementById("searchInput").value.toLowerCase(),
    clearBtn = document.getElementById("clearBtn");
  list.innerHTML = "";
  let filtered = reminders.filter((m) => m.name.toLowerCase().includes(search));
  const historyExists = reminders.some((m) => m.status === "completed");
  clearBtn.style.display = showHistory && historyExists ? "block" : "none";
  if (!showHistory) filtered = filtered.filter((m) => m.status !== "completed");
  filtered
    .sort((a, b) => {
      if (a.status === "pending") return -1;
      if (b.status === "pending") return 1;
      if (a.status === "completed") return 1;
      if (b.status === "completed") return -1;
      return a.targetTime - b.targetTime;
    })
    .forEach((m) => {
      const d = new Date(m.targetTime);
      const div = document.createElement("div");
      div.className = `med-item ${m.status}`;
      div.innerHTML = `<div class="med-content"><div class="med-header"><span class="med-name">${m.name}</span><span class="status-tag">${m.status}</span></div><div style="font-size:12px;color:var(--text-variant);">${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>${m.info ? `<div style="font-size:13px;color:var(--text-variant);margin-top:8px;border-top:1px solid var(--outline);padding-top:8px">${m.info}</div>` : ""}${m.status === "pending" ? `<button class="action-btn" onclick="confirmTake(${m.id})">Mark as Taken</button>` : ""}<div class="del-link" onclick="remove(${m.id})">Delete</div></div>`;
      list.appendChild(div);
    });
}

function confirmTake(id) {
  const m = reminders.find((r) => r.id === id);
  if (m) m.status = "completed";
  alarm.pause();
  save();
}

function remove(id) {
  reminders = reminders.filter((r) => r.id !== id);
  if (!reminders.some((m) => m.status === "pending")) alarm.pause();
  save();
}

function updateTimer() {
  const container = document.getElementById("timerContainer"),
    pending = reminders.filter((m) => m.status === "pending"),
    active = reminders
      .filter((m) => m.status === "active")
      .sort((a, b) => a.targetTime - b.targetTime);
  if (pending.length > 0) {
    container.style.display = "block";
    container.style.borderColor = "var(--error)";
    document.getElementById("timerTitle").innerText = "OVERDUE";
    document.getElementById("countdown").innerText = "TAKE NOW";
    document.getElementById("countdown").style.color = "var(--error)";
    if (audioUnlocked && alarm.paused) {
      alarm.src = `assets/sounds/${pending[0].sound}.mp3`;
      alarm.loop = true;
      alarm.play().catch(() => {});
    }
    return;
  }
  if (active.length === 0) {
    container.style.display = "none";
    return;
  }
  const diff = active[0].targetTime - Date.now();
  container.style.display = "block";
  document.getElementById("countdown").style.color = "var(--primary)";
  document.getElementById("timerTitle").innerText = "NEXT: " + active[0].name;
  const h = Math.floor(diff / 3600000),
    m = Math.floor((diff % 3600000) / 60000),
    s = Math.floor((diff % 60000) / 1000);
  document.getElementById("countdown").innerText =
    `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

setInterval(() => {
  updateTimer();
  const now = Date.now();
  reminders.forEach((m) => {
    if (m.status === "active" && now >= m.targetTime) {
      m.status = "pending";
      save();
      if ("Notification" in window && Notification.permission === "granted")
        new Notification("Medicare", {
          body: `Take ${m.name}`,
          icon: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
        });
    }
  });
}, 1000);
if ("Notification" in window) Notification.requestPermission();
