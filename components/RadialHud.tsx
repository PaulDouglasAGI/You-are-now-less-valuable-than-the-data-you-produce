export default function RadialHud({
  progress,
  size = 120,
  label,
}: {
  /** 0..1 */
  progress: number;
  size?: number;
  label?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = c * (1 - clamped);

  const tickCount = 48;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const lit = i / tickCount < clamped;
    const angle = (i / tickCount) * Math.PI * 2 - Math.PI / 2;
    const inner = r + 6;
    const outer = r + (i % 4 === 0 ? 11 : 9);
    return {
      x1: cx + inner * Math.cos(angle),
      y1: cy + inner * Math.sin(angle),
      x2: cx + outer * Math.cos(angle),
      y2: cy + outer * Math.sin(angle),
      lit,
    };
  });

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="scan-ring absolute inset-0" style={{ animationDuration: "18s" }}>
        <circle cx={cx} cy={cy} r={r + 15} fill="none" stroke="var(--color-line)" strokeWidth={1} strokeDasharray="0.5 5" />
      </svg>

      <svg width={size} height={size} className="absolute inset-0">
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.lit ? "var(--color-cyan)" : "var(--color-line)"}
            strokeWidth={1}
            opacity={t.lit ? 0.9 : 0.6}
          />
        ))}
      </svg>

      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-line)" strokeWidth={3} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--color-cyan)"
          strokeWidth={3}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-glow"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>

      <svg width={size} height={size} className="absolute inset-0" opacity={0.35}>
        <line x1={cx - r * 0.3} y1={cy} x2={cx + r * 0.3} y2={cy} stroke="var(--color-cyan)" strokeWidth={0.5} />
        <line x1={cx} y1={cy - r * 0.3} x2={cx} y2={cy + r * 0.3} stroke="var(--color-cyan)" strokeWidth={0.5} />
      </svg>

      <div className="flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-[color:var(--color-cyan)] text-glow">
          {Math.round(progress * 100)}%
        </span>
        {label && <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">{label}</span>}
      </div>
    </div>
  );
}
