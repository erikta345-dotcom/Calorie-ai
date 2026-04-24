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
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-medium">
          {Math.round(consumed)}<span className="text-zinc-500">/{goal}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
