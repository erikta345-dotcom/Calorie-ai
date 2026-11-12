import { createClient } from "@libsql/client";
import { spawnSync } from "node:child_process";

const filename = process.argv[2];
const url = `file:./${filename}`;
const initial = createClient({ url });
await initial.execute("CREATE TABLE UserSettings (id TEXT PRIMARY KEY)");
await initial.close();

const run = spawnSync(process.execPath, ["setup-turso.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: url, TURSO_AUTH_TOKEN: "test-only" },
  encoding: "utf8",
});
if (run.status !== 0) throw new Error(run.stderr || run.stdout);
const rerun = spawnSync(process.execPath, ["setup-turso.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: url, TURSO_AUTH_TOKEN: "test-only" },
  encoding: "utf8",
});
if (rerun.status !== 0) throw new Error(rerun.stderr || rerun.stdout);

const migrated = createClient({ url });
const columns = await migrated.execute("PRAGMA table_info(UserSettings)");
await migrated.close();
process.stdout.write(JSON.stringify({ hasMealGoals: columns.rows.some((column) => column.name === "mealGoals") }));
