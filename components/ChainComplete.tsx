"use client";

import type { ChainDef } from "@/lib/game/types";
import { difficultyMeta } from "@/lib/game/chains";
import GlitchText from "./GlitchText";

export default function ChainComplete({
  chain,
  onMenu,
}: {
  chain: ChainDef;
  onMenu: () => void;
}) {
  const meta = difficultyMeta[chain.id];
  return (
    <div className="h-screen w-screen flex items-center justify-center px-6 py-10">
      <div className="max-w-3xl w-full border border-[color:var(--color-cyan)]/50 bg-[color:var(--color-panel)]/70 p-8 md:p-10 fade-in text-center">
        <span className="text-[11px] tracking-[0.3em]" style={{ color: meta.color }}>
          {meta.label} OPERATION COMPLETE
        </span>
        <GlitchText
          as="h1"
          text={chain.title}
          className="block font-display text-3xl md:text-5xl font-bold text-[color:var(--color-cyan)] text-glow mt-2"
        />
        <p className="mt-1 text-xs tracking-widest text-[color:var(--color-text-dim)]">{chain.codename}</p>

        <div className="mt-6 space-y-2 text-sm text-left text-[color:var(--color-text)] leading-relaxed border-t border-[color:var(--color-line)] pt-6">
          {chain.debrief.map((line, i) =>
            line === "" ? <div key={i} className="h-2" /> : <p key={i}>{line}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-[color:var(--color-text-dim)] tracking-widest">
          <span>{chain.nodes.length} targets secured</span>
          <span className="w-px h-4 bg-[color:var(--color-line)]" />
          <span>{chain.nodes.reduce((n, node) => n + node.objectives.length, 0)} objectives completed</span>
        </div>

        <button
          onClick={onMenu}
          className="mt-8 border border-[color:var(--color-cyan-dim)] px-8 py-3 font-display tracking-[0.3em] text-[color:var(--color-cyan)] hover:bg-[color:var(--color-cyan)] hover:text-black transition-colors"
        >
          BACK TO OPERATIONS
        </button>
      </div>
    </div>
  );
}
