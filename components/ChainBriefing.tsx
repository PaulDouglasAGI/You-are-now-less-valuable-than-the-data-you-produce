"use client";

import type { ChainDef } from "@/lib/game/types";
import { difficultyMeta } from "@/lib/game/chains";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

export default function ChainBriefing({
  chain,
  onBegin,
  onBack,
}: {
  chain: ChainDef;
  onBegin: () => void;
  onBack: () => void;
}) {
  const meta = difficultyMeta[chain.difficulty];
  return (
    <div className="h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-10">
      <div className="relative max-w-3xl w-full hud-panel p-8 md:p-10 fade-in">
        <CornerFrame />
        <div className="flex items-center justify-between mb-2">
          <span className="font-display font-bold tracking-[0.25em] text-sm" style={{ color: meta.color }}>
            {meta.label} OPERATION
          </span>
          <span className="text-xs text-[color:var(--color-text-dim)] tracking-widest">{chain.codename}</span>
        </div>
        <GlitchText as="h1" text={chain.title} className="font-statement text-4xl md:text-5xl font-black uppercase text-[color:var(--color-cyan)] text-glow" />

        <div className="mt-6 space-y-3 text-sm md:text-base leading-relaxed text-[color:var(--color-text)]">
          {chain.briefing.map((line, i) =>
            line === "" ? <div key={i} className="h-2" /> : <p key={i}>{line}</p>
          )}
        </div>

        <div className="mt-8 flex items-center gap-4">
          <span className="text-xs text-[color:var(--color-text-dim)] tracking-widest">
            {chain.nodes.length} target{chain.nodes.length > 1 ? "s" : ""} in this chain
          </span>
          <span className="flex-1 h-px bg-[color:var(--color-line)]" />
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={onBack}
            className="border border-[color:var(--color-line)] px-6 py-3 font-display tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] hover:border-[color:var(--color-text-dim)] active:scale-[0.97] transition-all duration-150"
          >
            BACK
          </button>
          <button
            onClick={onBegin}
            className="flex-1 border border-[color:var(--color-cyan-dim)] px-6 py-3 font-display tracking-[0.3em] text-[color:var(--color-cyan)] hover:bg-[color:var(--color-cyan)] hover:text-black active:scale-[0.97] transition-all duration-150"
          >
            BEGIN OPERATION
          </button>
        </div>
      </div>
    </div>
  );
}
