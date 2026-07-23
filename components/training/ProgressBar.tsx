export default function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full bg-[color:var(--color-thm-line)]">
      <div
        className="h-full bg-[color:var(--color-thm-accent)] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
