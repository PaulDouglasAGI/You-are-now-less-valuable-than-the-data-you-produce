"use client";

import { useState } from "react";
import type { QuizCategory, QuizProgress, QuizQuestion, QuizTier } from "@/lib/game/types";
import {
  QUIZ_TIERS,
  QUIZ_CATEGORIES,
  QUIZ_CATEGORY_LABELS,
  QUIZ_TIER_LABELS,
  QUIZ_PASS_THRESHOLD,
  quizCellKey,
  questionsFor,
  buildQuizSession,
  recordQuizResult,
  currentRank,
} from "@/lib/game/quiz";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

const ACCENT = "var(--color-violet)";

type Phase = "select" | "quiz" | "results";

export default function QuizMode({
  progress,
  onProgressChange,
  onBack,
}: {
  progress: QuizProgress;
  onProgressChange: (next: QuizProgress) => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("select");
  const [tier, setTier] = useState<QuizTier>("easy");
  const [category, setCategory] = useState<QuizCategory | "all">("all");
  const [session, setSession] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const rank = currentRank(progress);

  function startQuiz(t: QuizTier, c: QuizCategory | "all") {
    const built = buildQuizSession(t, c);
    setTier(t);
    setCategory(c);
    setSession(built);
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setPhase("quiz");
  }

  function submitAnswer() {
    if (selected === null || revealed) return;
    setRevealed(true);
    if (selected === session[index].correctIndex) setCorrectCount((n) => n + 1);
  }

  function nextQuestion() {
    if (index + 1 < session.length) {
      setIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      const finalCorrect = correctCount;
      onProgressChange(recordQuizResult(progress, tier, category, finalCorrect, session.length));
      setPhase("results");
    }
  }

  if (phase === "select") {
    return (
      <div className="h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-4xl">
          <button
            onClick={onBack}
            className="text-xs tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-violet)] transition-colors mb-6"
          >
            ← MAIN MENU
          </button>

          <span className="block text-[11px] tracking-[0.3em] text-[color:var(--color-text-dim)]">KNOWLEDGE CHECK</span>
          <GlitchText
            as="h1"
            text="QUIZ MODE"
            className="block font-statement text-4xl md:text-6xl font-black uppercase mt-1 text-[color:var(--color-violet)]"
          />
          <p className="mt-4 text-sm text-[color:var(--color-text-dim)] leading-relaxed max-w-2xl">
            Recall knowledge across nine job-relevant domains — networking, Linux, Windows/AD, web
            vulns, binary exploitation, crypto, cloud, methodology, and defense. Pass a tier&apos;s
            mixed quiz at {Math.round(QUIZ_PASS_THRESHOLD * 100)}% or better to earn that rank.
          </p>

          <div className="mt-6 border border-[color:var(--color-line)] p-4">
            <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">CURRENT RANK</span>
            <p className="mt-1 font-display text-2xl font-bold" style={{ color: ACCENT }}>
              {rank ? QUIZ_TIER_LABELS[rank].toUpperCase() : "UNRANKED"}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {QUIZ_TIERS.map((t) => {
              const cleared = progress.clearedTiers.includes(t);
              const active = t === tier;
              return (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className="px-4 py-2 border text-xs tracking-widest font-display font-bold transition-colors"
                  style={{
                    borderColor: active ? ACCENT : "var(--color-line)",
                    color: active ? ACCENT : cleared ? "var(--color-green)" : "var(--color-text-dim)",
                  }}
                >
                  {QUIZ_TIER_LABELS[t].toUpperCase()}
                  {cleared && " ✓"}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["all", ...QUIZ_CATEGORIES] as const).map((c) => {
              const pool = questionsFor(tier, c);
              const best = progress.bestScores[quizCellKey(tier, c)];
              const label = c === "all" ? "All Categories (Mixed)" : QUIZ_CATEGORY_LABELS[c];
              const disabled = pool.length === 0;
              return (
                <button
                  key={c}
                  onClick={() => !disabled && startQuiz(tier, c)}
                  disabled={disabled}
                  className="relative hud-panel p-4 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-[color:var(--color-violet)]"
                  style={{ ["--hp-color" as string]: c === "all" ? ACCENT : "var(--color-line)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-[color:var(--color-text)]">{label}</span>
                    <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">{pool.length} Qs</span>
                  </div>
                  <span className="mt-1 block text-xs text-[color:var(--color-text-dim)]">
                    {best ? `best: ${best.correct}/${best.total} (${Math.round((best.correct / best.total) * 100)}%)` : "not attempted"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "quiz") {
    const q = session[index];
    const isCorrect = selected === q.correctIndex;
    return (
      <div className="h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-10">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs tracking-widest text-[color:var(--color-text-dim)]">
              {QUIZ_TIER_LABELS[tier].toUpperCase()} · {category === "all" ? "MIXED" : QUIZ_CATEGORY_LABELS[category]}
            </span>
            <span className="text-xs tracking-widest text-[color:var(--color-text-dim)]">
              QUESTION {index + 1}/{session.length}
            </span>
          </div>

          <div className="relative hud-panel p-6 fade-in" style={{ ["--hp-color" as string]: ACCENT }}>
            <CornerFrame color={ACCENT} />
            <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">
              {QUIZ_CATEGORY_LABELS[q.category].toUpperCase()}
            </span>
            <p className="mt-2 text-lg text-[color:var(--color-text)] leading-relaxed">{q.prompt}</p>

            <div className="mt-5 flex flex-col gap-2">
              {q.choices.map((choice, i) => {
                let borderColor = "var(--color-line)";
                let textColor = "var(--color-text)";
                if (revealed) {
                  if (i === q.correctIndex) {
                    borderColor = "var(--color-green)";
                    textColor = "var(--color-green)";
                  } else if (i === selected) {
                    borderColor = "var(--color-red)";
                    textColor = "var(--color-red)";
                  }
                } else if (i === selected) {
                  borderColor = ACCENT;
                  textColor = ACCENT;
                }
                return (
                  <button
                    key={i}
                    onClick={() => !revealed && setSelected(i)}
                    disabled={revealed}
                    className="text-left px-4 py-3 border transition-colors disabled:cursor-default"
                    style={{ borderColor, color: textColor }}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div
                className="mt-5 border-l-2 pl-4 py-1 text-sm leading-relaxed"
                style={{ borderColor: isCorrect ? "var(--color-green)" : "var(--color-red)", color: "var(--color-text-dim)" }}
              >
                <span className="font-display font-bold" style={{ color: isCorrect ? "var(--color-green)" : "var(--color-red)" }}>
                  {isCorrect ? "CORRECT — " : "INCORRECT — "}
                </span>
                {q.explanation}
              </div>
            )}

            <div className="mt-6">
              {!revealed ? (
                <button
                  onClick={submitAnswer}
                  disabled={selected === null}
                  className="w-full border px-6 py-3 font-display tracking-[0.3em] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-[color:var(--color-violet)] hover:enabled:text-black active:scale-[0.98]"
                  style={{ borderColor: ACCENT, color: ACCENT }}
                >
                  SUBMIT
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="w-full border px-6 py-3 font-display tracking-[0.3em] transition-all duration-150 hover:bg-[color:var(--color-violet)] hover:text-black active:scale-[0.98]"
                  style={{ borderColor: ACCENT, color: ACCENT }}
                >
                  {index + 1 < session.length ? "NEXT QUESTION" : "SEE RESULTS"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // phase === "results"
  const passed = session.length > 0 && correctCount / session.length >= QUIZ_PASS_THRESHOLD;
  const percent = session.length > 0 ? Math.round((correctCount / session.length) * 100) : 0;
  return (
    <div className="h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-10">
      <div className="w-full max-w-2xl">
        <div
          className="relative hud-panel p-8 text-center fade-in"
          style={{ ["--hp-color" as string]: passed ? "var(--color-green)" : "var(--color-red)" }}
        >
          <CornerFrame color={passed ? "var(--color-green)" : "var(--color-red)"} />
          <span className="block text-[11px] tracking-[0.3em] text-[color:var(--color-text-dim)]">QUIZ RESULT</span>
          <GlitchText
            as="h1"
            text={passed ? "PASS" : "FAIL"}
            className="block font-statement text-5xl md:text-7xl font-black uppercase mt-1"
            style={{ color: passed ? "var(--color-green)" : "var(--color-red)" }}
          />
          <p className="mt-2 font-display text-2xl font-bold" style={{ color: passed ? "var(--color-green)" : "var(--color-red)" }}>
            {correctCount} / {session.length} ({percent}%)
          </p>
          <p className="mt-2 text-xs text-[color:var(--color-text-dim)]">
            {QUIZ_TIER_LABELS[tier].toUpperCase()} · {category === "all" ? "MIXED" : QUIZ_CATEGORY_LABELS[category]}
          </p>
          {category === "all" && passed && (
            <p className="mt-3 text-sm text-[color:var(--color-violet)]">Rank earned: {QUIZ_TIER_LABELS[tier]}</p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => startQuiz(tier, category)}
              className="flex-1 border px-6 py-3 font-display tracking-[0.3em] transition-all duration-150 hover:bg-[color:var(--color-violet)] hover:text-black active:scale-[0.97]"
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              RETRY
            </button>
            <button
              onClick={() => setPhase("select")}
              className="flex-1 border border-[color:var(--color-line)] px-6 py-3 font-display tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] active:scale-[0.97] transition-all duration-150"
            >
              CHOOSE ANOTHER
            </button>
            <button
              onClick={onBack}
              className="border border-[color:var(--color-line)] px-6 py-3 font-display tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)] active:scale-[0.97] transition-all duration-150"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
