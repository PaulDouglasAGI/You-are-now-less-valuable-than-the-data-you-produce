"use client";

import type { Difficulty } from "@/lib/game/types";
import { chains, difficultyOrder, difficultyMeta } from "@/lib/game/chains";
import GlitchText from "./GlitchText";

export default function MainMenu({
  progressFor,
  onSelect,
  onReset,
}: {
  progressFor: (d: Difficulty) => { secured: number; total: number };
  onSelect: (d: Difficulty) => void;
  onReset: () => void;
}) {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-6 py-10 gap-10">
      <div className="text-center">
        <GlitchText
          as="h1"
          text="BREACHLINE"
          className="font-display text-4xl md:text-6xl font-bold tracking-[0.2em] text-[color:var(--color-cyan)] text-glow"
        />
        <p className="mt-3 text-[color:var(--color-text-dim)] text-sm tracking-widest">
          SELECT OPERATION DIFFICULTY
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {difficultyOrder.map((d) => {
          const chain = chains[d];
          const meta = difficultyMeta[d];
          const p = progressFor(d);
          const complete = p.secured === p.total && p.total > 0;
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className="group text-left border border-[color:var(--color-line)] bg-[color:var(--color-panel)]/60 p-6 flex flex-col gap-4 hover:border-[color:var(--color-cyan)] transition-colors"
              style={{ boxShadow: complete ? `0 0 24px -6px ${meta.color}` : undefined }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-display font-bold tracking-[0.25em] text-sm"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </span>
                {complete && (
                  <span className="text-[10px] tracking-widest text-[color:var(--color-green)]">SECURED</span>
                )}
              </div>
              <h2 className="font-display text-xl font-semibold text-[color:var(--color-text)]">{chain.title}</h2>
              <p className="text-xs text-[color:var(--color-cyan-dim)] tracking-widest">{chain.codename}</p>
              <p className="text-sm text-[color:var(--color-text-dim)] leading-relaxed flex-1">{meta.blurb}</p>
              <div className="flex items-center gap-2 text-xs text-[color:var(--color-text-dim)]">
                <span>{chain.nodes.length} target{chain.nodes.length > 1 ? "s" : ""}</span>
                <span className="flex-1 h-px bg-[color:var(--color-line)]" />
                <span>
                  {p.secured}/{p.total} secured
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onReset}
        className="text-[10px] tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-red)] transition-colors"
      >
        [ reset all progress ]
      </button>
    </div>
  );
}
