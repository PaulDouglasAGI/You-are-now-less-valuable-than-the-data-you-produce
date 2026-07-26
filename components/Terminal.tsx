"use client";

import { useEffect, useRef, useState } from "react";
import type { NodeDef, NodeRunState, TerminalLine } from "@/lib/game/types";
import { initNodeRunState, resolveCommand } from "@/lib/game/engine";
import { applyRandomization, reverseRandomization } from "@/lib/game/randomize";
import type { RunRandomization } from "@/lib/game/randomize";
import CornerFrame from "./CornerFrame";

const TONE_CLASS: Record<TerminalLine["kind"], string> = {
  input: "text-[color:var(--color-text)]",
  output: "text-[color:var(--color-text)]",
  success: "text-[color:var(--color-green)]",
  error: "text-[color:var(--color-red)]",
  warn: "text-[color:var(--color-amber)]",
  system: "text-[color:var(--color-cyan-dim)]",
};

export default function Terminal({
  node,
  carryFlags,
  randomization,
  onSecured,
  onExit,
  onNote,
}: {
  node: NodeDef;
  carryFlags: string[];
  randomization: RunRandomization;
  onSecured: (finalState: NodeRunState) => void;
  onExit: () => void;
  onNote: (text: string, source: string) => void;
}) {
  const [runState, setRunState] = useState<NodeRunState>(() => {
    const base = initNodeRunState(node, carryFlags);
    return { ...base, history: base.history.map((l) => ({ ...l, text: applyRandomization(l.text, randomization) })) };
  });
  const [input, setInput] = useState("");
  const [pastInputs, setPastInputs] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const [justSecured, setJustSecured] = useState(false);
  // index at which the most recent submit()'s output starts — everything from here on is
  // "new" and gets the line-reveal animation; everything before it has already settled.
  // Set directly inside the submit() event handler (not an effect), so this is a plain,
  // idiomatic derived-state value rather than a ref read during render.
  const [revealFrom, setRevealFrom] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onNoteRef = useRef(onNote);
  useEffect(() => {
    onNoteRef.current = onNote;
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [runState.history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    onNoteRef.current(`${node.org} — ${applyRandomization(node.ip, randomization)}`, node.org);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.org, node.ip]);

  function submit() {
    if (justSecured) return;
    const raw = input;
    const canonicalInput = reverseRandomization(raw, randomization);
    const result = resolveCommand(node, runState, canonicalInput);
    const translatedLines = result.lines.map((l, i) =>
      i === 0 ? { ...l, text: `${runState.prompt} ${raw.trim()}` } : { ...l, text: applyRandomization(l.text, randomization) },
    );
    setRevealFrom(runState.history.length);
    setRunState((prev) => ({
      ...result.nextState,
      history: [...prev.history, ...translatedLines],
    }));
    if (raw.trim().length > 0) {
      setPastInputs((p) => [...p, raw]);
    }
    setHistoryIdx(null);
    setInput("");

    if (result.note) {
      onNoteRef.current(applyRandomization(result.note, randomization), node.org);
    }

    if (result.allObjectivesComplete && !runState.secured) {
      setJustSecured(true);
      const finalState: NodeRunState = { ...result.nextState, secured: true };
      setTimeout(() => onSecured(finalState), 1400);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (pastInputs.length === 0) return;
      const idx = historyIdx === null ? pastInputs.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(idx);
      setInput(pastInputs[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === null) return;
      const idx = historyIdx + 1;
      if (idx >= pastInputs.length) {
        setHistoryIdx(null);
        setInput("");
      } else {
        setHistoryIdx(idx);
        setInput(pastInputs[idx]);
      }
    }
  }

  const doneCount = runState.completedObjectives.length;
  const total = node.objectives.length;

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row gap-0 md:gap-4 p-3 md:p-5" onClick={() => inputRef.current?.focus()}>
      {/* sidebar */}
      <div className="md:w-72 flex-shrink-0 flex flex-col gap-3 mb-3 md:mb-0">
        <div className="relative hud-panel p-3">
          <CornerFrame />
          <div className="flex items-center justify-between">
            <span className="font-display font-semibold text-sm text-[color:var(--color-cyan)]">{node.org}</span>
            <button
              onClick={onExit}
              className="text-[10px] tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-red)]"
            >
              DISCONNECT
            </button>
          </div>
          <p className="text-[11px] text-[color:var(--color-text-dim)] mt-1">
            {applyRandomization(node.ip, randomization)} · {runState.prompt}
          </p>
          {!node.hideObjectives && (
            <>
              <div className="mt-3 h-1.5 bg-[color:var(--color-bg-raised)] overflow-hidden">
                <div
                  className="h-full bg-[color:var(--color-cyan)] transition-all duration-500"
                  style={{ width: `${(doneCount / total) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-[color:var(--color-text-dim)]">
                {doneCount}/{total} objectives
              </span>
            </>
          )}
        </div>

        <div className="hud-panel p-3 flex-1 overflow-y-auto">
          <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">
            {node.hideObjectives ? "NO GUIDANCE PROVIDED" : "OBJECTIVES"}
          </span>
          {node.hideObjectives ? (
            <p className="mt-2 text-xs text-[color:var(--color-text-dim)] leading-relaxed">
              This engagement has no objective checklist and no hints. You determine the methodology,
              in whatever order it actually applies — the same way a real assessment works.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-xs">
              {node.objectives.map((o) => {
                const done = runState.completedObjectives.includes(o.id);
                return (
                  <li key={o.id} className={done ? "text-[color:var(--color-green)]" : "text-[color:var(--color-text-dim)]"}>
                    {done ? "[x] " : "[ ] "}
                    {o.label}
                    <div className="text-[10px] text-[color:var(--color-cyan-dim)] ml-4">{o.tactic}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="hud-panel p-3 text-[11px] text-[color:var(--color-text-dim)] leading-relaxed">
          <span className="text-[10px] tracking-widest">SHELL</span>
          <p className="mt-1">
            type <span className="text-[color:var(--color-cyan)]">help</span> for available commands
            {node.hideObjectives
              ? "."
              : (
                <>
                  , <span className="text-[color:var(--color-cyan)]">hint</span> if you&apos;re stuck,{" "}
                  <span className="text-[color:var(--color-cyan)]">objectives</span> to see the checklist.
                </>
              )}
          </p>
          <p className="mt-1">
            hints used: {runState.hintsUsed}/{node.hints.length}
          </p>
          {runState.scopeViolations > 0 && (
            <p className="mt-1 text-[color:var(--color-red)]">
              scope violation{runState.scopeViolations > 1 ? "s" : ""}: {runState.scopeViolations}
            </p>
          )}
        </div>
      </div>

      {/* terminal */}
      <div className="relative flex-1 flex flex-col border border-[color:var(--color-line)] bg-black/60 min-h-0">
        <CornerFrame />
        <div className="flex-shrink-0 flex items-center gap-2 border-b border-[color:var(--color-line)] px-3 py-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--color-red)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--color-amber)]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--color-green)]" />
          <span className="ml-3 text-[11px] text-[color:var(--color-text-dim)] tracking-widest">
            session — {applyRandomization(node.ip, randomization)}
          </span>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 text-[13px] md:text-sm leading-relaxed">
          {runState.history.map((line, i) => {
            const isNew = i >= revealFrom;
            return (
              <div
                key={i}
                className={`${TONE_CLASS[line.kind]} whitespace-pre-wrap break-words ${isNew ? "term-line-in" : ""}`}
                style={isNew ? { animationDelay: `${Math.min(i - revealFrom, 6) * 18}ms` } : undefined}
              >
                {line.text}
              </div>
            );
          })}
          {justSecured && (
            <div className="text-[color:var(--color-green)] mt-3 fade-in font-display tracking-widest">
              [ target secured — closing session... ]
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2 border-t border-[color:var(--color-line)] px-4 py-3">
          <span className="text-[color:var(--color-cyan)] whitespace-nowrap">{runState.prompt}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={justSecured}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="term-input flex-1 bg-transparent outline-none text-[color:var(--color-text)] disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
