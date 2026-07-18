"use client";

import type { NodeDef } from "@/lib/game/types";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

export default function NodeComplete({
  node,
  isLastNode,
  onContinue,
}: {
  node: NodeDef;
  isLastNode: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="h-screen w-screen flex items-center justify-center px-6 py-10">
      <div className="relative max-w-2xl w-full border border-[color:var(--color-green)]/50 bg-[color:var(--color-panel)]/70 p-8 md:p-10 fade-in text-center">
        <CornerFrame color="var(--color-green)" />
        <span className="text-[11px] tracking-[0.3em] text-[color:var(--color-green)]">TARGET SECURED</span>
        <GlitchText
          as="h1"
          text={node.org}
          className="block font-statement text-3xl md:text-5xl font-black uppercase text-[color:var(--color-green)] text-glow mt-2"
        />
        <div className="mt-6 space-y-2 text-sm text-left text-[color:var(--color-text)] leading-relaxed border-t border-[color:var(--color-line)] pt-6">
          <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">FINDINGS</span>
          {node.debrief.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        <button
          onClick={onContinue}
          className="mt-8 border border-[color:var(--color-cyan-dim)] px-8 py-3 font-display tracking-[0.3em] text-[color:var(--color-cyan)] hover:bg-[color:var(--color-cyan)] hover:text-black transition-colors"
        >
          {isLastNode ? "VIEW CHAIN SUMMARY" : "RETURN TO MAP"}
        </button>
      </div>
    </div>
  );
}
