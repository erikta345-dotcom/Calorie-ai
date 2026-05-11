type Props = {
  consumed: number;
  goal: number;
  size?: number;
};

export default function CalorieRing({ consumed, goal, size = 160 }: Props) {
  const pct = Math.min(consumed / goal, 1);
  const r = 45;
  const circ = 2 * Math.PI * r;
  const dash = pct >= 1 ? circ + 10 : pct * circ;
  const remaining = Math.max(goal - consumed, 0);

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {/* Track */}
      <circle
        cx="60" cy="60" r={r}
        fill="none"
        stroke="var(--ring-track)"
        strokeWidth="12"
      />
      {/* Progress */}
      <circle
        cx="60" cy="60" r={r}
        fill="none"
        stroke={pct >= 1 ? "#f97316" : "#84cc16"}
        strokeWidth="12"
        strokeLinecap="butt"
        strokeDasharray={`${dash} ${circ}`}
       strokeDashoffset={0}
  transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
      {/* Calorías */}
      <text x="60" y="52" textAnchor="middle" className="fill-gray-900 dark:fill-white" fontSize="20" fontWeight="bold">
        {Math.round(consumed)}
      </text>
      <text x="60" y="64" textAnchor="middle" fill="var(--ring-muted-text)" fontSize="8">
        kcal comidas
      </text>
      <text x="60" y="76" textAnchor="middle" fill={pct >= 1 ? "#f97316" : "#84cc16"} fontSize="8">
        {remaining > 0 ? `${Math.round(remaining)} restantes` : "¡Meta!"}
      </text>
    </svg>
  );
}