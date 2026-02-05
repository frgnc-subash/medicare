let reminders = JSON.parse(localStorage.getItem("meds")) || [];

setInterval(mainLoop, 1000);
renderReminders();

function mainLoop() {
  updateTimer();
  checkNotifications();
}

function addReminder() {
  const nameEl = document.getElementById("medName");
  const hoursEl = document.getElementById("hoursDelay");
  const dateEl = document.getElementById("exactDateTime");
  const name = nameEl.value.trim();
  let targetTime = 0;

  if (!name) return alert("Enter medicine name");

  if (hoursEl.value) {
    targetTime = Date.now() + parseFloat(hoursEl.value) * 3600000;
  } else if (dateEl.value) {
    targetTime = new Date(dateEl.value).getTime();
  } else {
    return alert("Set a time!");
  }

  if (targetTime <= Date.now()) return alert("Time must be in the future!");

  const formattedName =
    name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const info =
    typeof medDatabase !== "undefined"
      ? medDatabase[formattedName] || "No info found."
      : "Med info file missing.";

  reminders.push({
    id: Date.now(),
    name: formattedName,
    targetTime: targetTime,
    info: info,
    status: "active", // active, pending, completed
    notified: false,
  });

  saveAndRender();
  nameEl.value = "";
  hoursEl.value = "";
  dateEl.value = "";
}

function updateTimer() {
  const container = document.getElementById("timerContainer");
  const nameLabel = document.getElementById("nextMedName");
  const countdownLabel = document.getElementById("countdown");
  const titleLabel = document.getElementById("timerTitle");

  const activeMeds = reminders.filter((m) => m.status === "active");
  const pendingMeds = reminders.filter((m) => m.status === "pending");

  if (pendingMeds.length > 0) {
    container.style.display = "block";
    container.style.background = "linear-gradient(135deg, #d32f2f, #b71c1c)";
    titleLabel.innerText = "Dose Overdue!";
    nameLabel.innerText = pendingMeds[0].name;
    countdownLabel.innerText = "TAKE NOW";
    return;
  }

  if (activeMeds.length === 0) {
    container.style.display = "none";
    return;
  }

  activeMeds.sort((a, b) => a.targetTime - b.targetTime);
  const nextMed = activeMeds[0];
  const diff = nextMed.targetTime - Date.now();

  container.style.display = "block";
  container.style.background = "linear-gradient(135deg, #1a73e8, #0d47a1)";
  titleLabel.innerHTML = `Next Dose: <span id="nextMedName">${nextMed.name}</span>`;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  countdownLabel.innerText = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function checkNotifications() {
  const now = Date.now();
  let changed = false;

  reminders.forEach((med) => {
    if (med.status === "active" && now >= med.targetTime) {
      med.status = "pending";
      if (!med.notified) {
        sendNotification(
          "Medicare Alert",
          `It's time to take your ${med.name}!`,
        );
        med.notified = true;
      }
      changed = true;
    }
  });

  if (changed) saveAndRender();
}

function confirmTaken(id) {
  const med = reminders.find((m) => m.id === id);
  if (med) {
    med.status = "completed";
    saveAndRender();
  }
}

function sendNotification(title, body) {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    reg.showNotification(title, {
      body: body,
      icon: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
      vibrate: [300, 100, 300],
      requireInteraction: true, // Notification stays until user interacts
      tag: "medication-alert",
    });
  });
}

function saveAndRender() {
  localStorage.setItem("meds", JSON.stringify(reminders));
  renderReminders();
}

function renderReminders() {
  const list = document.getElementById("reminderList");
  if (!list) return;
  list.innerHTML = "";

  const sorted = [...reminders].sort((a, b) => b.id - a.id);

  sorted.forEach((med) => {
    const div = document.createElement("div");
    div.className = `card med-item ${med.status}`;

    let statusHtml = `<span class="status-badge status-due">Scheduled</span>`;
    let actionHtml = "";

    if (med.status === "pending") {
      statusHtml = `<span class="status-badge status-pending">Overdue</span>`;
      actionHtml = `<button onclick="confirmTaken(${med.id})" class="btn-confirm">I have taken this</button>`;
    } else if (med.status === "completed") {
      statusHtml = `<span class="status-badge status-done">Taken</span>`;
    }

    const dateObj = new Date(med.targetTime);
    const timeStr = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = dateObj.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });

    div.innerHTML = `
            ${statusHtml}
            <strong>${med.name}</strong><br>
            <small>${dateStr} at ${timeStr}</small>
            <div class="info">${med.info}</div>
            ${actionHtml}
            <button class="del-btn" onclick="deleteMed(${med.id})">Delete</button>
        `;
    list.appendChild(div);
  });
}

function deleteMed(id) {
  reminders = reminders.filter((m) => m.id !== id);
  saveAndRender();
}

function testNotification() {
  Notification.requestPermission().then((p) => {
    if (p === "granted") {
      alert("Lock your screen. Notification coming in 5s.");
      setTimeout(
        () =>
          sendNotification("Medicare Test", "This is your medicine reminder!"),
        5000,
      );
    } else {
      alert("Notifications are blocked!");
    }
  });
}
