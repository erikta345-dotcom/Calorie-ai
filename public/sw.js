let mealSchedule = {};
let notifiedKeys = {};

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_MEAL_TIMES") {
    mealSchedule = event.data.meals || {};
    // Reset daily notifications on new schedule
    const today = new Date().toDateString();
    Object.keys(notifiedKeys).forEach((k) => {
      if (!k.startsWith(today)) delete notifiedKeys[k];
    });
  }
});

function pad(n) {
  return String(n).padStart(2, "0");
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
        badge: "/icons/icon-192.png",
        tag: `meal-${meal}`,
        renotify: false,
        silent: false,
      });
    }
  }
}

// Check every 30 seconds for tighter timing
setInterval(checkMeals, 30000);
