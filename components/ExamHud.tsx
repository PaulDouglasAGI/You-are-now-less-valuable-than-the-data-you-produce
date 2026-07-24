"use client";

import { useEffect, useState } from "react";

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamHud({ endsAt, onOpen }: { endsAt: number; onOpen: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = endsAt - now;

  return (
    <button
      onClick={onOpen}
      className="fixed top-4 left-4 z-40 border border-[color:var(--color-amber)] px-3 py-2 font-display text-xs tracking-widest text-[color:var(--color-amber)] bg-black/60 hover:bg-black/80 transition-colors"
    >
      {remaining <= 0 ? "EXAM: TIME EXPIRED" : `EXAM: ${formatRemaining(remaining)}`}
    </button>
  );
}
