export const MEAL_GOAL_MEALS = ["desayuno", "snack", "comida", "merienda", "cena", "picoteo"] as const;

export type MealGoalKey = (typeof MEAL_GOAL_MEALS)[number];
export type MealGoal = { calories: number | null; protein: number | null };
export type MealGoals = Record<MealGoalKey, MealGoal>;

function splitGoal(total: number, precision: number): number[] {
  const units = Math.max(0, Math.round((Number.isFinite(total) ? total : 0) * precision));
  const perMeal = Math.floor(units / MEAL_GOAL_MEALS.length);
  const remainder = units % MEAL_GOAL_MEALS.length;
  return MEAL_GOAL_MEALS.map((_, index) => (perMeal + (index < remainder ? 1 : 0)) / precision);
}

export function createBalancedMealGoals(calories: number, protein: number): MealGoals {
  const calorieGoals = splitGoal(calories, 1);
  const proteinGoals = splitGoal(protein, 10);
  return Object.fromEntries(MEAL_GOAL_MEALS.map((meal, index) => [meal, {
    calories: calorieGoals[index],
    protein: proteinGoals[index],
  }])) as MealGoals;
}

export function parseMealGoals(value: unknown): MealGoals | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== MEAL_GOAL_MEALS.length || MEAL_GOAL_MEALS.some((meal) => !Object.hasOwn(record, meal))) return null;

  const result = {} as MealGoals;
  for (const meal of MEAL_GOAL_MEALS) {
    const rawGoal = record[meal];
    if (!rawGoal || typeof rawGoal !== "object" || Array.isArray(rawGoal)) return null;
    const goal = rawGoal as Record<string, unknown>;
    if (Object.keys(goal).length !== 2 || !Object.hasOwn(goal, "calories") || !Object.hasOwn(goal, "protein")) return null;
    for (const nutrient of ["calories", "protein"] as const) {
      const target = goal[nutrient];
      if (target !== null && (typeof target !== "number" || !Number.isFinite(target) || target < 0 || target > 10000)) return null;
    }
    result[meal] = { calories: goal.calories as number | null, protein: goal.protein as number | null };
  }
  return result;
}

export function mealGoalPercent(consumed: number, target: number): number {
  if (!Number.isFinite(consumed) || consumed <= 0) return 0;
  if (!Number.isFinite(target) || target <= 0) return 100;
  return Math.min((consumed / target) * 100, 100);
}
