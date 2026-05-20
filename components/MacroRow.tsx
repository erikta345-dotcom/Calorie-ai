export default function MacroRow({ cal, prot, carbs, fat }: { cal: number; prot: number; carbs: number; fat: number }) {
  return (
    <div className="flex gap-3 text-xs mt-1">
      <span className="text-brand-400 font-semibold">{Math.round(cal)} kcal</span>
      <span className="text-orange-400">P {Math.round(prot)}g</span>
      <span className="text-blue-400">C {Math.round(carbs)}g</span>
      <span className="text-yellow-400">G {Math.round(fat)}g</span>
    </div>
  );
}
