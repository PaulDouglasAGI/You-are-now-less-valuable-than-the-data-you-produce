"use client";

import { useEffect, useState } from "react";
import type { ExamAttempt } from "@/lib/game/types";
import { methodology } from "@/lib/game/methodology";
import { formatRemaining } from "./ExamHud";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

const ROW_LABELS: Record<string, string> = {
  ad: "AD Chain (hard-1, 3 targets)",
  st1: "Standalone #1 (hard-2)",
  st2: "Standalone #2 (hard-3)",
  st3: "Standalone #3 (hard-4)",
};

export default function ExamMode({
  examAttempt,
  onStart,
  onEnterMissions,
  onEndNow,
  onRestart,
  onBack,
}: {
  examAttempt: ExamAttempt | null;
  onStart: () => void;
  onEnterMissions: () => void;
  onEndNow: () => void;
  onRestart: () => void;
  onBack: () => void;
}) {
  const { examDay } = methodology;

  return (
    <div className="h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-3xl">
        <button
          onClick={onBack}
          className="text-xs tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-amber)] transition-colors mb-6"
        >
          ← MAIN MENU
        </button>

        {!examAttempt && (
          <div className="relative hud-panel p-8 fade-in" style={{ ["--hp-color" as string]: "var(--color-amber)" }}>
            <CornerFrame color="var(--color-amber)" />
            <span className="block text-[11px] tracking-[0.3em] text-[color:var(--color-text-dim)]">TIMED ASSESSMENT</span>
            <GlitchText
              as="h1"
              text="EXAM DAY"
              className="block font-statement text-4xl md:text-6xl font-black uppercase mt-1 text-[color:var(--color-amber)]"
            />
            <p className="mt-4 text-sm text-[color:var(--color-text-dim)] leading-relaxed">{examDay.caveat}</p>

            <div className="mt-6 grid grid-cols-2 gap-4 text-center">
              <div className="border border-[color:var(--color-line)] p-4">
                <span className="block text-2xl font-display font-bold text-[color:var(--color-amber)]">{examDay.durationHours}h</span>
                <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">TIME LIMIT</span>
              </div>
              <div className="border border-[color:var(--color-line)] p-4">
                <span className="block text-2xl font-display font-bold text-[color:var(--color-amber)]">
                  {examDay.pointsToPass}/{examDay.pointsTotal}
                </span>
                <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">POINTS TO PASS</span>
              </div>
            </div>

            <div className="mt-6 border border-[color:var(--color-line)] p-4">
              <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">TARGETS</span>
              <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-text)]">
                {examDay.pointRows.map((row) => (
                  <li key={row.id} className="flex justify-between">
                    <span>{ROW_LABELS[row.id] ?? row.name}</span>
                    <span className="text-[color:var(--color-text-dim)]">{row.maxPoints} pts</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-6 text-xs text-[color:var(--color-red)] leading-relaxed">
              The clock is wall-clock time — closing this tab does not pause it. No hints beyond what
              you&apos;d already know; this is a self-assessment, not another guided mission.
            </p>

            <button
              onClick={onStart}
              className="mt-6 w-full border border-[color:var(--color-amber)] px-6 py-3 font-display tracking-[0.3em] text-[color:var(--color-amber)] hover:bg-[color:var(--color-amber)] hover:text-black active:scale-[0.98] transition-all duration-150"
            >
              BEGIN EXAM
            </button>
          </div>
        )}

        {examAttempt && !examAttempt.result && (
          <div className="relative hud-panel p-8 text-center fade-in" style={{ ["--hp-color" as string]: "var(--color-amber)" }}>
            <CornerFrame color="var(--color-amber)" />
            <span className="block text-[11px] tracking-[0.3em] text-[color:var(--color-text-dim)]">EXAM IN PROGRESS</span>
            <ExamCountdown endsAt={examAttempt.endsAt} />
            <p className="mt-4 text-sm text-[color:var(--color-text-dim)]">
              Work the four curated targets under Hard tier. Progress is graded automatically against
              what you actually secure — nobody is watching a checklist for you.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={onEnterMissions}
                className="flex-1 border border-[color:var(--color-cyan-dim)] px-6 py-3 font-display tracking-[0.3em] text-[color:var(--color-cyan)] hover:bg-[color:var(--color-cyan)] hover:text-black active:scale-[0.97] transition-all duration-150"
              >
                ENTER OPERATION MAP
              </button>
              <button
                onClick={onEndNow}
                className="border border-[color:var(--color-line)] px-6 py-3 font-display tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-red)] hover:border-[color:var(--color-red)] active:scale-[0.97] transition-all duration-150"
              >
                END EXAM NOW
              </button>
            </div>
          </div>
        )}

        {examAttempt?.result && (
          <div
            className="relative hud-panel p-8 text-center fade-in"
            style={{ ["--hp-color" as string]: examAttempt.result.passed ? "var(--color-green)" : "var(--color-red)" }}
          >
            <CornerFrame color={examAttempt.result.passed ? "var(--color-green)" : "var(--color-red)"} />
            <span className="block text-[11px] tracking-[0.3em] text-[color:var(--color-text-dim)]">EXAM RESULT</span>
            <GlitchText
              as="h1"
              text={examAttempt.result.passed ? "PASS" : "FAIL"}
              className="block font-statement text-5xl md:text-7xl font-black uppercase mt-1"
              variant="chromatic"
              style={{ color: examAttempt.result.passed ? "var(--color-green)" : "var(--color-red)" }}
            />
            <p
              className="mt-2 font-display text-2xl font-bold"
              style={{ color: examAttempt.result.passed ? "var(--color-green)" : "var(--color-red)" }}
            >
              {examAttempt.result.pointsEarned} / {examAttempt.result.pointsTotal} PTS
            </p>

            <div className="mt-6 border border-[color:var(--color-line)] p-4 text-left">
              <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">BREAKDOWN</span>
              <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-text)]">
                {methodology.examDay.pointRows.map((row) => (
                  <li key={row.id} className="flex justify-between">
                    <span>{ROW_LABELS[row.id] ?? row.name}</span>
                    <span className="text-[color:var(--color-text-dim)]">
                      {examAttempt.result?.rowScores[row.id] ?? 0}/{row.maxPoints} pts
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={onRestart}
                className="flex-1 border border-[color:var(--color-amber)] px-6 py-3 font-display tracking-[0.3em] text-[color:var(--color-amber)] hover:bg-[color:var(--color-amber)] hover:text-black active:scale-[0.97] transition-all duration-150"
              >
                START NEW ATTEMPT
              </button>
              <button
                onClick={onBack}
                className="border border-[color:var(--color-line)] px-6 py-3 font-display tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] active:scale-[0.97] transition-all duration-150"
              >
                BACK TO MENU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExamCountdown({ endsAt }: { endsAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <GlitchText
      as="h1"
      text={formatRemaining(endsAt - now)}
      className="block font-statement text-5xl md:text-7xl font-black mt-2 text-[color:var(--color-amber)]"
    />
  );
}
