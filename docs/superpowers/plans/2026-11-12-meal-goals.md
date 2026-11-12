# Meal Goals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users optionally split daily calorie and protein goals across meals, edit them, persist them, and see per-meal progress.

**Architecture:** Store a nullable `mealGoals` JSON string on `UserSettings`, following the existing `mealTimes` pattern. Settings exposes six per-meal calorie/protein fields and persists them through the existing settings API. The dashboard derives progress from saved goals and the entries already grouped by meal.

**Tech Stack:** Next.js 14, React, TypeScript, Turso/libSQL SQL migration endpoint.

**Spec:** `docs/superpowers/specs/2026-11-12-meal-goals-design.md`

## Global Constraints

- Keep existing daily calorie and macro goals unchanged.
- Support exactly the existing meal keys: desayuno, snack, comida, merienda, cena, picoteo.
- Empty per-meal values disable progress for that nutrient and meal.
- Rebalancing is explicit so a daily goal edit does not erase custom allocations.

## Review Focus

- Legacy settings with no `mealGoals` must load normally; initialize a balanced editable distribution in the UI.
- Empty values must remain disabled when saved and reloaded.
- Invalid, negative, or excessive API values must be rejected or normalized consistently with existing macro validation.
- Custom allocations must survive daily goal changes until the user explicitly rebalances.
- Dashboard progress must use the correct meal and nutrient totals, and omit disabled targets.

### Task 1: Persist validated meal goals

**Files:**
- Modify: `app/api/settings/route.ts`
- Modify: `app/api/admin/migrate/route.ts`
- Modify: `setup-turso.mjs`
- Modify: `prisma/schema.prisma`
- Create: `lib/meal-goals.ts`
- Create: `tests/meal-goals.test.mjs`
- Create: `tests/meal-goals-migration.test.mjs`
- Create: `tests/fixtures/meal-goals-migration-fixture.mjs`

**Interfaces:**
- Persist and return `mealGoals` as JSON with six meal keys, each containing nullable `calories` and `protein` numeric targets.

- [x] Add idempotent migration for `UserSettings.mealGoals`.
- [x] Validate the optional payload, meal keys, and each non-null numeric target in the existing settings PUT endpoint.
- [x] Preserve omitted fields on partial updates and return the stored JSON in GET/PUT.
- [x] Run `node --experimental-strip-types --test tests/meal-goals.test.mjs tests/meal-goals-migration.test.mjs` for goal splitting, validation, disabled targets, progress percentages, and startup migration.

### Task 2: Configure and rebalance goals

**Files:**
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Load and save the API `mealGoals` object.
- Initialize a missing object by splitting daily calories and protein across six meals, assigning integer remainders deterministically to the first meal keys.

- [x] Add editable calories and protein fields for all six meals, with blank meaning no goal.
- [x] Add explicit “Repartir por igual” action based on current daily goals.
- [x] Save changes through the existing settings PUT request and show its existing success/error feedback.

### Task 3: Show per-meal progress

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Extend dashboard settings with optional `mealGoals`.
- For each meal, read consumed calories and protein and display progress only for configured targets.

- [x] Parse the saved JSON defensively.
- [x] Show consumed/target labels and capped progress bars for calories and protein, including consumed-over-target values.
- [x] Keep the current meal list, entries, and daily summary behavior intact.

### Task 4: Verify

**Files:**
- Verify the migration, settings API types, settings UI, and dashboard build.

- [x] Run `npx tsc --noEmit --incremental false`.
- [x] Run `node --experimental-strip-types --test tests/meal-goals.test.mjs tests/meal-goals-migration.test.mjs`.
- [x] Run `npm run build` using a temporary local SQLite database.
- [x] Review the diff for only meal-goal changes and inspect migration idempotence.
