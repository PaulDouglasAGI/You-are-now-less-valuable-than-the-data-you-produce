"use client";

import type { Difficulty, SaveData } from "@/lib/game/types";
import { missionsByDifficulty, difficultyOrder, difficultyMeta } from "@/lib/game/chains";
import { computeCareerScore } from "@/lib/game/scoring";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

export default function MainMenu({
  progressFor,
  onSelect,
  onReset,
  onOpenReport,
  save,
}: {
  progressFor: (d: Difficulty) => { secured: number; total: number };
  onSelect: (d: Difficulty) => void;
  onReset: () => void;
  onOpenReport: () => void;
  save: SaveData;
}) {
  const score = computeCareerScore(save);
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-6 py-10 gap-10">
      <div className="text-center">
        <GlitchText
          as="h1"
          text="BREACHLINE"
          className="font-statement text-5xl md:text-7xl font-black uppercase tracking-[0.08em] text-[color:var(--color-cyan)] text-glow"
        />
        <p className="mt-3 text-[color:var(--color-text-dim)] text-sm tracking-widest">
          SELECT OPERATION DIFFICULTY
        </p>
        <button
          onClick={onOpenReport}
          className="mt-4 inline-flex items-center gap-3 border border-[color:var(--color-cyan-dim)] px-4 py-2 hover:border-[color:var(--color-cyan)] transition-colors"
        >
          <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">FIELD REPORT</span>
          <span className="text-xs font-display font-bold text-[color:var(--color-cyan)]">
            {score.rank.toUpperCase()} · {score.percent}%
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-6xl">
        {difficultyOrder.map((d, i) => {
          const missions = missionsByDifficulty[d];
          const meta = difficultyMeta[d];
          const p = progressFor(d);
          const complete = p.secured === p.total && p.total > 0;
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              className="group relative text-left hud-panel p-6 flex flex-col gap-4 hover:border-[color:var(--color-cyan)] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 stagger-in"
              style={{ boxShadow: complete ? `0 0 24px -6px ${meta.color}` : undefined, ["--stagger-i" as string]: i }}
            >
              <CornerFrame />
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
              <h2 className="font-display text-xl font-semibold text-[color:var(--color-text)]">
                {missions.length > 1 ? `${missions.length} levels` : missions[0].title}
              </h2>
              <p className="text-xs text-[color:var(--color-cyan-dim)] tracking-widest">
                {missions.length > 1 ? `${missions[0].title} → ${missions[missions.length - 1].title}` : missions[0].codename}
              </p>
              <p className="text-sm text-[color:var(--color-text-dim)] leading-relaxed flex-1">{meta.blurb}</p>
              <div className="flex items-center gap-2 text-xs text-[color:var(--color-text-dim)]">
                <span>{missions.length} mission{missions.length > 1 ? "s" : ""}</span>
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
