import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

test("startup migration adds mealGoals to an existing UserSettings table", () => {
  const filename = `.meal-goals-migration-${process.pid}.db`;
  try {
    const run = spawnSync(process.execPath, ["tests/fixtures/meal-goals-migration-fixture.mjs", filename], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    assert.deepEqual(JSON.parse(run.stdout), { hasMealGoals: true });
  } finally {
    rmSync(filename, { force: true });
    rmSync(`${filename}-journal`, { force: true });
    rmSync(`${filename}-wal`, { force: true });
    rmSync(`${filename}-shm`, { force: true });
  }
});
