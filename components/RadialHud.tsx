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

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
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
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>

      <div className="flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-[color:var(--color-cyan)]">
          {Math.round(progress * 100)}%
        </span>
        {label && <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">{label}</span>}
      </div>
    </div>
  );
}
