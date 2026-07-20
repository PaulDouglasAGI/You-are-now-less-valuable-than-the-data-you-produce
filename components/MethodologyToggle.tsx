"use client";

export default function MethodologyToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="hud-panel px-3 py-2 text-[10px] tracking-widest text-[color:var(--color-cyan)] hover:border-[color:var(--color-cyan)] active:scale-[0.96] transition-all duration-150"
    >
      METHODOLOGY <span className="text-[color:var(--color-text-dim)]">⌃M</span>
    </button>
  );
}
