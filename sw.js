const CACHE_NAME = "medicare-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./assets/medInfo.js",
  "./manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  // Open the app when notification is clicked
  e.waitUntil(clients.openWindow("/"));
});
