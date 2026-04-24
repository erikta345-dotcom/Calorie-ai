import { createClient } from "@libsql/client";

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
    goalFat REAL DEFAULT 80
  )
`);

console.log("Tables created.");
