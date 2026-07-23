"use client";

import { useState, type KeyboardEvent } from "react";
import type { TrainingDrill } from "@/lib/game/training";
import { checkDrillAnswer } from "@/lib/training/check";
import CodeBlock from "./CodeBlock";

export default function DrillCard({
  drill,
  number,
  completed,
  onCorrect,
}: {
  drill: TrainingDrill;
  number: number;
  completed: boolean;
  onCorrect: () => void;
}) {
  const [expanded, setExpanded] = useState(!completed);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [revealed, setRevealed] = useState(false);

  function handleCheck() {
    if (!input.trim()) return;
    if (checkDrillAnswer(input, drill)) {
      setStatus("correct");
      onCorrect();
    } else {
      setStatus("incorrect");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleCheck();
  }

  const done = completed || status === "correct";

  return (
    <div className="border border-[color:var(--color-thm-line)] bg-[color:var(--color-thm-panel)]">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span
          className={`flex-shrink-0 w-5 h-5 border flex items-center justify-center text-[10px] ${
            done
              ? "bg-[color:var(--color-thm-success)] border-[color:var(--color-thm-success)] text-black"
              : "border-[color:var(--color-thm-line)] text-[color:var(--color-thm-text-dim)]"
          }`}
        >
          {done ? "✓" : number}
        </span>
        <span className="flex-1 text-sm text-[color:var(--color-thm-text)]">{drill.scenario}</span>
        <span className="text-[color:var(--color-thm-text-dim)] text-xs flex-shrink-0">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setStatus("idle");
              }}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              placeholder="type the command..."
              className="flex-1 min-w-0 bg-black/30 border border-[color:var(--color-thm-line)] px-3 py-2 text-xs font-mono text-[color:var(--color-thm-text)] outline-none focus:border-[color:var(--color-thm-accent)]"
            />
            <button
              onClick={handleCheck}
              className="px-4 py-2 text-xs tracking-widest border border-[color:var(--color-thm-accent)] text-[color:var(--color-thm-accent)] hover:bg-[color:var(--color-thm-accent)] hover:text-black transition-colors flex-shrink-0"
            >
              CHECK
            </button>
          </div>

          {status === "correct" && (
            <p className="text-xs text-[color:var(--color-thm-success)]">Correct — that satisfies this drill.</p>
          )}
          {status === "incorrect" && (
            <p className="text-xs text-[color:var(--color-thm-accent)]">Not quite. Try again, or reveal the answer below.</p>
          )}

          {!revealed && status !== "correct" && (
            <button
              onClick={() => setRevealed(true)}
              className="self-start text-[10px] tracking-widest text-[color:var(--color-thm-text-dim)] hover:text-[color:var(--color-thm-accent)]"
            >
              SHOW ANSWER
            </button>
          )}

          {(revealed || status === "correct") && (
            <div>
              <CodeBlock code={drill.sampleAnswer} label="SAMPLE ANSWER" />
              <p className="mt-2 text-xs text-[color:var(--color-thm-text-dim)] leading-relaxed">{drill.explain}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
