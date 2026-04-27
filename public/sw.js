self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Handle server-sent push (works even when app is closed)
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}

  const title = data.title || "⏰ Calorie AI";
  const body = data.body || "Es la hora de comer";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
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

// Fallback: interval check when app is open/backgrounded
let mealSchedule = {};
let notifiedKeys = {};

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_MEAL_TIMES") {
    mealSchedule = event.data.meals || {};
    const today = new Date().toDateString();
    Object.keys(notifiedKeys).forEach((k) => { if (!k.startsWith(today)) delete notifiedKeys[k]; });
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
