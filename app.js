async function addReminder() {
  const name = document.getElementById("medName").value;
  const time = document.getElementById("remindTime").value;

  if (!name || !time) return alert("Please fill in both fields");

  // 1. Get Medicine Info from openFDA
  const infoDiv = document.createElement("div");
  infoDiv.className = "card";
  infoDiv.innerHTML = `<strong>${name}</strong> - Reminder set for ${time}<br><p class="info">Fetching info...</p>`;
  document.getElementById("reminderList").appendChild(infoDiv);

  try {
    const response = await fetch(
      `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${name}"&limit=1`,
    );
    const data = await response.json();

    if (data.results) {
      const usage = data.results[0].indications_and_usage || ["No info found"];
      infoDiv.querySelector(".info").innerText =
        usage[0].substring(0, 200) + "...";
    } else {
      infoDiv.querySelector(".info").innerText =
        "Medicine info not found in FDA database.";
    }
  } catch (err) {
    infoDiv.querySelector(".info").innerText = "Offline: Info unavailable.";
  }

  // 2. Set Local Notification
  scheduleNotification(name, time);
}

function scheduleNotification(name, time) {
  if (!("Notification" in window)) return;

  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      const [hours, minutes] = time.split(":");
      const now = new Date();
      const target = new Date();
      target.setHours(hours, minutes, 0);

      let delay = target.getTime() - now.getTime();
      if (delay < 0) delay += 86400000; // Schedule for tomorrow if time passed

      setTimeout(() => {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification("Medicine Time!", {
            body: `It's time to take your ${name}.`,
            icon: "https://cdn-icons-png.flaticon.com/512/822/822143.png",
            vibrate: [200, 100, 200],
          });
        });
      }, delay);
    }
  });
}
