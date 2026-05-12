type Props = {
  label: string;
  consumed: number;
  goal: number;
  color: string;
  unit?: string;
};

export default function MacroBar({ label, consumed, goal, color, unit = "g" }: Props) {
  const pct = Math.min((consumed / goal) * 100, 100);
  return (
    <div className="flex-1">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-gray-500 dark:text-zinc-400">{label}</span>
        <span className="text-xs font-bold text-gray-700 dark:text-zinc-200">
          {Math.round(consumed)}<span className="text-gray-400 dark:text-zinc-500 font-normal">/{goal}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: color + "25" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
