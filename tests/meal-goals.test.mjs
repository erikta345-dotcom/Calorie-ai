import test from "node:test";
import assert from "node:assert/strict";
import { createBalancedMealGoals, parseMealGoals, mealGoalPercent } from "../lib/meal-goals.ts";

test("splits daily goals evenly and assigns integer remainders deterministically", () => {
  const goals = createBalancedMealGoals(2000, 121);

  assert.deepEqual(Object.values(goals).map((goal) => goal.calories), [334, 334, 333, 333, 333, 333]);
  assert.deepEqual(Object.values(goals).map((goal) => goal.protein), [20.2, 20.2, 20.2, 20.2, 20.1, 20.1]);
  assert.equal(Object.values(goals).reduce((sum, goal) => sum + Number(goal.calories), 0), 2000);
  assert.equal(Object.values(goals).reduce((sum, goal) => sum + Number(goal.protein), 0), 121);
});

test("parses saved goals while preserving disabled targets", () => {
  const raw = Object.fromEntries(["desayuno", "snack", "comida", "merienda", "cena", "picoteo"].map((meal) => [meal, { calories: null, protein: 20 }]));

  assert.deepEqual(parseMealGoals(JSON.stringify(raw)), raw);
  assert.equal(parseMealGoals("not-json"), null);
});

test("rejects missing meals and invalid numeric targets", () => {
  assert.equal(parseMealGoals({ desayuno: { calories: -1, protein: null } }), null);
  assert.equal(parseMealGoals({ desayuno: { calories: 100, protein: 10 }, snack: { calories: 100, protein: 10 } }), null);
});

test("caps meal progress and safely handles a zero target", () => {
  assert.equal(mealGoalPercent(50, 200), 25);
  assert.equal(mealGoalPercent(300, 200), 100);
  assert.equal(mealGoalPercent(0, 0), 0);
});
