import { createClient } from "@libsql/client";

if (!process.env.DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.log("Skipping DB setup: env vars not set.");
  process.exit(0);
}

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS FoodEntry (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    meal TEXT NOT NULL,
    name TEXT NOT NULL,
    calories REAL NOT NULL,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    grams REAL DEFAULT 100,
    source TEXT DEFAULT 'manual',
    createdAt TEXT DEFAULT (datetime('now'))
  )
`);

await db.execute(`
  CREATE TABLE IF NOT EXISTS UserSettings (
    id TEXT PRIMARY KEY,
    weight REAL DEFAULT 75,
    goalCalories REAL DEFAULT 2800,
    goalProtein REAL DEFAULT 150,
    goalCarbs REAL DEFAULT 300,
    goalFat REAL DEFAULT 80,
    mealTimes TEXT DEFAULT '{"desayuno":"08:00","comida":"13:30","merienda":"17:00","cena":"20:30","snack":"11:00"}'
  )
`);

try {
  await db.execute(`ALTER TABLE UserSettings ADD COLUMN mealTimes TEXT DEFAULT '{"desayuno":"08:00","comida":"13:30","merienda":"17:00","cena":"20:30","snack":"11:00"}'`);
} catch {}

try {
  await db.execute(`ALTER TABLE FoodEntry ADD COLUMN userId TEXT DEFAULT 'legacy'`);
} catch {}

try {
  await db.execute(`ALTER TABLE FoodEntry ADD COLUMN note TEXT`);
} catch {}

await db.execute(`
  CREATE TABLE IF NOT EXISTS PushSubscription (
    id TEXT PRIMARY KEY,
    userId TEXT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    mealTimes TEXT NOT NULL DEFAULT '{}',
    utcOffset INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now'))
  )
`);

try {
  await db.execute(`ALTER TABLE PushSubscription ADD COLUMN userId TEXT`);
} catch {}

await db.execute(`
  CREATE TABLE IF NOT EXISTS UserPasswords (
    id TEXT PRIMARY KEY,
    passwordHash TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  )
`);

console.log("Tables created.");
