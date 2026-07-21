"use client";

import type { ChainDef } from "@/lib/game/types";
import { difficultyMeta } from "@/lib/game/chains";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

export default function ChainComplete({
  chain,
  onMenu,
  continueLabel,
}: {
  chain: ChainDef;
  onMenu: () => void;
  continueLabel?: string;
}) {
  const meta = difficultyMeta[chain.difficulty];
  return (
    <div className="h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-10">
      <div
        className="relative max-w-3xl w-full hud-panel p-8 md:p-10 fade-in glitch-flicker-once text-center"
        style={{ ["--hp-color" as string]: `color-mix(in srgb, ${meta.color} 50%, transparent)` }}
      >
        <CornerFrame color={meta.color} />
        <span className="block text-[11px] tracking-[0.3em]" style={{ color: meta.color }}>
          {meta.label} OPERATION COMPLETE
        </span>
        <GlitchText
          as="h1"
          text={chain.title}
          variant="chromatic"
          className="block font-statement text-4xl md:text-6xl font-black uppercase text-[color:var(--color-cyan)] mt-2"
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
          className="mt-8 border border-[color:var(--color-cyan-dim)] px-8 py-3 font-display tracking-[0.3em] text-[color:var(--color-cyan)] hover:bg-[color:var(--color-cyan)] hover:text-black active:scale-[0.97] transition-all duration-150"
        >
          {continueLabel ?? "BACK TO LEVEL SELECT"}
        </button>
      </div>
    </div>
  );
}
