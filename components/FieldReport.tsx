"use client";

import { computeCareerScore } from "@/lib/game/scoring";
import type { SaveData } from "@/lib/game/types";
import { difficultyMeta } from "@/lib/game/chains";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

const rankColor: Record<string, string> = {
  Recruit: "var(--color-text-dim)",
  "Trainee Analyst": "var(--color-text)",
  "Associate Operator": "var(--color-amber)",
  Operator: "var(--color-cyan)",
  "Senior Operator": "var(--color-cyan)",
  "Principal Operator": "var(--color-green)",
};

export default function FieldReport({ save, onBack }: { save: SaveData; onBack: () => void }) {
  const score = computeCareerScore(save);
  const color = rankColor[score.rank] ?? "var(--color-cyan)";

  return (
    <div className="h-screen w-screen flex flex-col items-center px-6 py-10 overflow-y-auto">
      <div className="w-full max-w-3xl">
        <button
          onClick={onBack}
          className="text-xs tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-cyan)] transition-colors mb-6"
        >
          ← MAIN MENU
        </button>

        <div className="relative hud-panel p-8 text-center fade-in">
          <CornerFrame color={color} />
          <span className="block text-[11px] tracking-[0.3em] text-[color:var(--color-text-dim)]">FIELD REPORT</span>
          <GlitchText
            as="h1"
            text={score.rank.toUpperCase()}
            className="block font-statement text-4xl md:text-6xl font-black uppercase mt-1 text-glow"
          />
          <p className="mt-2 font-display text-2xl font-bold" style={{ color }}>
            {score.totalPoints} / {score.maxPoints} PTS
          </p>
          <p className="text-sm text-[color:var(--color-text-dim)] tracking-widest mt-1">{score.percent}% CAREER SCORE</p>
        </div>

        <div className="mt-6 hud-panel p-6 fade-in" style={{ animationDelay: "70ms" }}>
          <h2 className="font-display text-sm tracking-[0.25em] text-[color:var(--color-cyan)] mb-4">
            SKILL BREAKDOWN
          </h2>
          <div className="space-y-3">
            {score.tacticBreakdown.map((stat) => {
              const pct = stat.possible > 0 ? Math.round((stat.earned / stat.possible) * 100) : 0;
              return (
                <div key={stat.tactic}>
                  <div className="flex items-center justify-between text-xs text-[color:var(--color-text-dim)] tracking-widest mb-1">
                    <span>{stat.tactic}</span>
                    <span>
                      {Math.round(stat.earned)}/{Math.round(stat.possible)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[color:var(--color-line)]">
                    <div
                      className="h-full bg-[color:var(--color-cyan)] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 hud-panel p-6 fade-in" style={{ animationDelay: "140ms" }}>
          <h2 className="font-display text-sm tracking-[0.25em] text-[color:var(--color-cyan)] mb-4">
            MISSION LOG
          </h2>
          <div className="space-y-2">
            {score.perMission.map((m) => {
              const meta = difficultyMeta[m.difficulty];
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 text-xs py-2 border-b border-[color:var(--color-line)] last:border-b-0"
                >
                  <span
                    className="w-14 flex-shrink-0 tracking-widest font-semibold"
                    style={{ color: m.secured ? meta.color : "var(--color-text-dim)" }}
                  >
                    {meta.label}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[color:var(--color-text)]">{m.title}</span>
                  {m.secured ? (
                    <>
                      {m.hintsUsed > 0 && (
                        <span className="text-[color:var(--color-amber)] tracking-widest">
                          {m.hintsUsed} hint{m.hintsUsed > 1 ? "s" : ""}
                        </span>
                      )}
                      {m.scopeViolations > 0 && (
                        <span className="text-[color:var(--color-red)] tracking-widest">
                          {m.scopeViolations} scope violation{m.scopeViolations > 1 ? "s" : ""}
                        </span>
                      )}
                      <span className="text-[color:var(--color-green)] tracking-widest w-20 text-right">
                        {Math.round(m.earnedPoints)}/{m.points}
                      </span>
                    </>
                  ) : (
                    <span className="text-[color:var(--color-text-dim)] tracking-widest w-20 text-right">
                      —/{m.points}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-[color:var(--color-text-dim)] text-center leading-relaxed mt-6 pb-10">
          This is a self-training scorecard, not a certification — a strong talking point in an interview,
          not a substitute for one.
        </p>
      </div>
    </div>
  );
}
