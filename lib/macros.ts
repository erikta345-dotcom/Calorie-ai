export function calcMacros(cal100: number, prot100: number, carbs100: number, fat100: number, grams: number) {
  const f = grams / 100;
  return {
    calories: Math.round(cal100 * f),
    protein: Math.round(prot100 * f * 10) / 10,
    carbs: Math.round(carbs100 * f * 10) / 10,
    fat: Math.round(fat100 * f * 10) / 10,
  };
}
