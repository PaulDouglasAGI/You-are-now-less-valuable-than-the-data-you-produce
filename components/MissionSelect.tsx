"use client";

import type { ChainDef, Difficulty } from "@/lib/game/types";
import { difficultyMeta } from "@/lib/game/chains";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

export type MissionStatus = "locked" | "unlocked" | "secured";

export default function MissionSelect({
  difficulty,
  missions,
  statusFor,
  onSelect,
  onBack,
}: {
  difficulty: Difficulty;
  missions: ChainDef[];
  statusFor: (missionId: string) => MissionStatus;
  onSelect: (missionId: string) => void;
  onBack: () => void;
}) {
  const meta = difficultyMeta[difficulty];
  const securedCount = missions.filter((m) => statusFor(m.id) === "secured").length;

  return (
    <div className="h-screen w-screen flex flex-col items-center px-6 py-10 overflow-y-auto">
      <div className="w-full max-w-3xl">
        <button
          onClick={onBack}
          className="text-xs tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-cyan)] transition-colors mb-6"
        >
          ← DIFFICULTY SELECT
        </button>

        <div className="text-center mb-8">
          <span className="block font-display font-bold tracking-[0.25em] text-sm" style={{ color: meta.color }}>
            {meta.label} TIER
          </span>
          <GlitchText
            as="h1"
            text="SELECT LEVEL"
            className="block font-statement text-4xl md:text-5xl font-black uppercase text-[color:var(--color-cyan)] text-glow mt-1"
          />
          <p className="text-xs text-[color:var(--color-text-dim)] tracking-widest mt-2">
            {securedCount}/{missions.length} SECURED
          </p>
        </div>

        <div className="flex flex-col gap-4 pb-10">
          {missions.map((mission, i) => {
            const status = statusFor(mission.id);
            const locked = status === "locked";
            const secured = status === "secured";
            return (
              <button
                key={mission.id}
                onClick={() => !locked && onSelect(mission.id)}
                disabled={locked}
                className={`group relative text-left hud-panel p-5 flex items-center gap-5 transition-all duration-200 stagger-in ${
                  locked
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:border-[color:var(--color-cyan)] hover:-translate-y-0.5 active:scale-[0.99] active:translate-y-0"
                }`}
                style={{ ["--stagger-i" as string]: i }}
              >
                <CornerFrame color={secured ? "var(--color-green)" : undefined} />
                <div
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center border font-display text-xl font-bold"
                  style={{
                    borderColor: secured ? "var(--color-green)" : locked ? "var(--color-line)" : "var(--color-cyan)",
                    color: secured ? "var(--color-green)" : locked ? "var(--color-text-dim)" : "var(--color-cyan)",
                  }}
                >
                  {mission.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-[color:var(--color-text)]">{mission.title}</h3>
                    {secured && <span className="text-[10px] tracking-widest text-[color:var(--color-green)]">SECURED</span>}
                    {locked && <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">LOCKED</span>}
                  </div>
                  <p className="text-xs text-[color:var(--color-cyan-dim)] tracking-widest">{mission.codename}</p>
                  <p className="text-sm text-[color:var(--color-text-dim)] mt-1 leading-relaxed">{mission.summary}</p>
                  <p className="text-[10px] text-[color:var(--color-text-dim)] mt-2 tracking-widest">
                    {mission.nodes.length} target{mission.nodes.length > 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
