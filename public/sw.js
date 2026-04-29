self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(
  self.clients.claim().then(() =>
    self.clients.matchAll({ type: "window" }).then((clients) =>
      clients.forEach((c) => c.postMessage({ type: "REQUEST_MEAL_TIMES" }))
    )
  )
));

// IndexedDB helpers for persisting meal times across SW restarts
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("calorie-ai", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function dbGet(db, key) {
  return new Promise((resolve) => {
    const req = db.transaction("kv").objectStore("kv").get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}
function dbSet(db, key, value) {
  return new Promise((resolve) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

// Handle server-sent push (works even when app is closed)
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "⏰ Calorie AI", {
      body: data.body || "Es la hora de comer",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "meal",
      renotify: true,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("/");
    })
  );
});

let mealSchedule = {};
let notifiedKeys = {};

// Load persisted meal times on SW startup
openDB().then((db) => dbGet(db, "mealSchedule")).then((saved) => {
  if (saved && typeof saved === "object") mealSchedule = saved;
}).catch(() => {});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_MEAL_TIMES") {
    mealSchedule = event.data.meals || {};
    const today = new Date().toDateString();
    Object.keys(notifiedKeys).forEach((k) => { if (!k.startsWith(today)) delete notifiedKeys[k]; });
    // Persist to IndexedDB
    openDB().then((db) => dbSet(db, "mealSchedule", mealSchedule)).catch(() => {});
  }
});

function pad(n) { return String(n).padStart(2, "0"); }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function checkMeals() {
  const now = new Date();
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const today = now.toDateString();
  for (const [meal, time] of Object.entries(mealSchedule)) {
    if (!time) continue;
    const key = `${today}_${meal}`;
    if (time === currentTime && !notifiedKeys[key]) {
      notifiedKeys[key] = true;
      self.registration.showNotification("⏰ Calorie AI", {
        body: `Son las ${currentTime}, ¡es la hora de ${capitalize(meal)}!`,
        icon: "/icons/icon-192.png",
        tag: `meal-${meal}`,
        renotify: false,
      });
    }
  }
}

setInterval(checkMeals, 30000);
