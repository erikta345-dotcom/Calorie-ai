import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const result = await db.execute(
  "SELECT author, stars, message, createdAt FROM Feedback ORDER BY createdAt DESC"
);

for (const r of result.rows) {
  console.log(`\n⭐${r.stars} — ${r.author} (${String(r.createdAt).slice(0, 10)})`);
  console.log(`  ${r.message}`);
}
console.log(`\nTotal: ${result.rows.length}`);
