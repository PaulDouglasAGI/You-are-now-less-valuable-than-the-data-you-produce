"use client";

export default function NotebookToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 right-4 z-40 hud-panel px-3 py-2 text-[10px] tracking-widest text-[color:var(--color-cyan)] hover:border-[color:var(--color-cyan)] transition-colors"
    >
      NOTEBOOK <span className="text-[color:var(--color-text-dim)]">⌃N</span>
    </button>
  );
}
