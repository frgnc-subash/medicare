const CACHE_NAME = "medicare-v1";
const ASSETS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});

// Listener for notifications
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  clients.openWindow("/");
});
