"use client";

import type { NodeDef } from "@/lib/game/types";
import { applyRandomization } from "@/lib/game/randomize";
import type { RunRandomization } from "@/lib/game/randomize";
import RadialHud from "./RadialHud";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

export default function NodeBriefing({
  node,
  secured,
  randomization,
  onConnect,
  onBack,
}: {
  node: NodeDef;
  secured: boolean;
  randomization: RunRandomization;
  onConnect: () => void;
  onBack: () => void;
}) {
  return (
    <div className="h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-10">
      <div className="relative max-w-4xl w-full grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center hud-panel p-8 md:p-10 fade-in">
        <CornerFrame />
        <div className="flex flex-col items-center gap-3">
          <RadialHud progress={secured ? 1 : 0} label={secured ? "SECURED" : "PENDING"} size={140} />
          <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">TARGET STATUS</span>
        </div>

        <div>
          <span className="block text-[11px] tracking-[0.3em] text-[color:var(--color-cyan-dim)] scan-in">
            TARGET LOCKED
          </span>
          <div className="scan-in" style={{ animationDelay: "90ms" }}>
            <GlitchText
              as="h1"
              text={node.org}
              className="block font-display text-2xl md:text-4xl font-bold text-[color:var(--color-cyan)] mt-1"
            />
          </div>
          <p className="text-sm text-[color:var(--color-text-dim)] mt-1 scan-in" style={{ animationDelay: "180ms" }}>
            {node.city}, {node.state} — IP {applyRandomization(node.ip, randomization)}
          </p>
          <p className="text-sm text-[color:var(--color-text)] mt-2 italic scan-in" style={{ animationDelay: "270ms" }}>
            {node.tagline}
          </p>

          <div className="mt-6 space-y-1.5 text-sm text-[color:var(--color-text)] leading-relaxed">
            {node.briefing.map((line, i) =>
              line === "" ? <div key={i} className="h-2" /> : <p key={i}>{applyRandomization(line, randomization)}</p>
            )}
          </div>

          <div className="mt-6 border border-[color:var(--color-line)] p-3">
            <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">
              MISSION OBJECTIVES ({node.objectives.length})
            </span>
            <ul className="mt-2 space-y-1 text-xs text-[color:var(--color-text-dim)]">
              {node.objectives.map((o) => (
                <li key={o.id}>
                  · {o.label} <span className="text-[color:var(--color-cyan-dim)]">[{o.tactic}]</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={onBack}
              className="border border-[color:var(--color-line)] px-6 py-3 font-display tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] hover:border-[color:var(--color-text-dim)] active:scale-[0.97] transition-all duration-150"
            >
              BACK
            </button>
            <button
              onClick={onConnect}
              className="flex-1 border border-[color:var(--color-cyan-dim)] px-6 py-3 font-display tracking-[0.3em] text-[color:var(--color-cyan)] hover:bg-[color:var(--color-cyan)] hover:text-black active:scale-[0.97] transition-all duration-150"
            >
              {secured ? "RECONNECT" : "CONNECT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
