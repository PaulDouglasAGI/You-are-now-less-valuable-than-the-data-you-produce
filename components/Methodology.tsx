"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  MethodologyCard,
  MethodologyCommandBlock,
  MethodologyNote,
  MethodologyNoteTone,
  MethodologyTagColor,
} from "@/lib/game/types";
import { methodology } from "@/lib/game/methodology";
import CornerFrame from "./CornerFrame";

// computed once at module scope — methodology.phases is static content, so this
// never needs to be recomputed per render (and avoids mutating a local during JSX)
const PHASE_TABS = methodology.phases.reduce<{ id: string; navLabel: string; group: "core" | "advanced"; showLabel: boolean }[]>(
  (acc, phase) => {
    const prevGroup = acc[acc.length - 1]?.group;
    acc.push({ id: phase.id, navLabel: phase.navLabel, group: phase.group, showLabel: phase.group !== prevGroup });
    return acc;
  },
  [],
);

const TAG_COLOR_CLASSES: Record<MethodologyTagColor, string> = {
  green: "border-[color:var(--color-green)] text-[color:var(--color-green)]",
  blue: "border-[color:var(--color-cyan)] text-[color:var(--color-cyan)]",
  red: "border-[color:var(--color-red)] text-[color:var(--color-red)]",
  yellow: "border-[color:var(--color-amber)] text-[color:var(--color-amber)]",
};

const NOTE_TONE_COLOR: Record<MethodologyNoteTone, string> = {
  info: "var(--color-cyan)",
  warning: "var(--color-amber)",
  danger: "var(--color-red)",
};

function renderCommandLine(line: string, key: number) {
  if (line.trim() === "") return <div key={key}>&nbsp;</div>;
  if (line.trim().startsWith("#")) {
    return (
      <div key={key} className="text-[color:var(--color-text-dim)]">
        {line}
      </div>
    );
  }
  const re = /\{\{(.+?)\}\}/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push(<span key={`p-${key}-${i}`}>{line.slice(last, m.index)}</span>);
    parts.push(
      <span key={`v-${key}-${i}`} className="text-[color:var(--color-amber)]">
        {m[1]}
      </span>,
    );
    last = re.lastIndex;
    i++;
  }
  if (last < line.length) parts.push(<span key={`p-${key}-${i}`}>{line.slice(last)}</span>);
  return <div key={key}>{parts}</div>;
}

function CommandBlockView({ block }: { block: MethodologyCommandBlock }) {
  return (
    <div className="mt-3 border border-[color:var(--color-line)] bg-black/40">
      <div className="px-3 py-1.5 text-[9px] tracking-widest uppercase text-[color:var(--color-text-dim)] bg-black/30 border-b border-[color:var(--color-line)]">
        {block.label}
      </div>
      <div className="p-3 font-mono text-xs leading-relaxed text-[color:var(--color-text)] overflow-x-auto">
        {block.lines.map((l, i) => renderCommandLine(l, i))}
      </div>
    </div>
  );
}

function NoteView({ note }: { note: MethodologyNote }) {
  const color = NOTE_TONE_COLOR[note.tone];
  return (
    <div className="mt-3 pl-3 py-2 text-xs text-[color:var(--color-text)]" style={{ borderLeft: `2px solid ${color}` }}>
      <strong className="block text-[10px] tracking-widest uppercase mb-1" style={{ color }}>
        {note.title}
      </strong>
      {note.body}
    </div>
  );
}

function StepList({
  steps,
  groupKey,
  checked,
  onToggle,
}: {
  steps: string[];
  groupKey: string;
  checked: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="mt-3 flex flex-col gap-1.5">
      {steps.map((s, i) => {
        const key = `${groupKey}:${i}`;
        const done = checked.has(key);
        return (
          <li key={key} className="flex items-start gap-2">
            <button
              onClick={() => onToggle(key)}
              className="mt-0.5 flex-shrink-0 w-3.5 h-3.5 border flex items-center justify-center text-[9px] leading-none"
              style={{
                borderColor: done ? "var(--color-green)" : "var(--color-line)",
                background: done ? "var(--color-green)" : "var(--color-bg-raised)",
                color: "#000",
              }}
              aria-label={done ? "mark not done" : "mark done"}
            >
              {done ? "✓" : ""}
            </button>
            <span className={`text-xs leading-relaxed ${done ? "line-through text-[color:var(--color-text-dim)]" : "text-[color:var(--color-text)]"}`}>
              {s}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function CardView({
  card,
  expanded,
  onToggleExpand,
  checked,
  onToggleStep,
}: {
  card: MethodologyCard;
  expanded: boolean;
  onToggleExpand: () => void;
  checked: Set<string>;
  onToggleStep: (key: string) => void;
}) {
  return (
    <div
      className="border border-[color:var(--color-line)]"
      style={{ borderLeft: `3px solid ${card.critical ? "var(--color-red)" : "var(--color-cyan-dim)"}` }}
    >
      <button onClick={onToggleExpand} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="text-[10px] font-mono text-[color:var(--color-text-dim)] w-10 flex-shrink-0">{card.number}</span>
        <span className="font-display text-sm font-bold tracking-wide uppercase text-[color:var(--color-text)] flex-1">{card.title}</span>
        <span className="flex gap-1.5 flex-shrink-0">
          {card.tags.map((t) => (
            <span key={t.label} className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 border ${TAG_COLOR_CLASSES[t.color]}`}>
              {t.label}
            </span>
          ))}
        </span>
        <span className="text-[color:var(--color-text-dim)] text-xs flex-shrink-0">{expanded ? "▼" : "▶"}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[color:var(--color-line)] pt-3">
          {card.steps && <StepList steps={card.steps} groupKey={card.id} checked={checked} onToggle={onToggleStep} />}
          {card.commandBlocks?.map((b, i) => <CommandBlockView key={i} block={b} />)}
          {card.notes?.map((n, i) => <NoteView key={i} note={n} />)}
          {card.subsections?.map((sub, si) => (
            <div key={si} className="mt-4 pt-3 border-t border-[color:var(--color-line)]">
              <div className="text-[10px] tracking-widest uppercase text-[color:var(--color-cyan-dim)]">{sub.heading}</div>
              {sub.steps && <StepList steps={sub.steps} groupKey={`${card.id}:${si}`} checked={checked} onToggle={onToggleStep} />}
              {sub.commandBlocks?.map((b, i) => <CommandBlockView key={i} block={b} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function passColor(total: number, pointsToPass: number) {
  if (total >= pointsToPass) return "var(--color-green)";
  if (total >= 40) return "var(--color-amber)";
  return "var(--color-red)";
}

export default function Methodology({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<string>(methodology.phases[0].id);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(methodology.phases.map((p) => p.cards[0]?.id).filter(Boolean) as string[]),
  );
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [examPoints, setExamPoints] = useState<Record<string, number>>({});

  const activePhase = useMemo(() => methodology.phases.find((p) => p.id === activeTab) ?? null, [activeTab]);
  const isExamDay = activeTab === "examday";

  // the panel stays mounted (returns null when closed rather than unmounting) so its
  // useState doesn't naturally reset on its own — the point tracker is meant to be a
  // scratch calculator, not real progress, so explicitly clear it whenever the panel closes
  useEffect(() => {
    if (!open) setExamPoints({});
  }, [open]);

  if (!open) return null;

  function toggleExpand(cardId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function toggleStep(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setRowPoints(rowId: string, value: number) {
    setExamPoints((prev) => {
      const cur = prev[rowId] ?? 0;
      return { ...prev, [rowId]: cur === value ? 0 : value };
    });
  }

  const examTotal = Object.values(examPoints).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full sm:w-[720px] lg:w-[860px] h-full border-l border-[color:var(--color-line)] flex flex-col slide-in-right"
        style={{ background: "var(--color-bg-raised)" }}
      >
        <CornerFrame />
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[color:var(--color-line)]">
          <div>
            <h2 className="font-display text-lg font-bold text-[color:var(--color-cyan)] tracking-widest">METHODOLOGY REFERENCE</h2>
            <p className="text-[10px] text-[color:var(--color-text-dim)] tracking-widest">⌃M or ESC to close</p>
          </div>
          <button
            onClick={onClose}
            className="text-[color:var(--color-text-dim)] hover:text-[color:var(--color-red)] text-xl leading-none px-2"
            aria-label="Close methodology"
          >
            ×
          </button>
        </div>

        <div className="flex-shrink-0 flex items-center gap-1 px-4 border-b border-[color:var(--color-line)] overflow-x-auto">
          {PHASE_TABS.map((phase) => (
            <div key={phase.id} className="flex items-center flex-shrink-0">
              {phase.showLabel && (
                <span className="mr-2 ml-1 text-[9px] tracking-[0.2em] text-[color:var(--color-text-dim)] uppercase">
                  {phase.group === "core" ? "core" : "advanced"}
                </span>
              )}
              <button
                onClick={() => setActiveTab(phase.id)}
                className={`px-3 py-2.5 text-[10px] tracking-widest uppercase whitespace-nowrap border-b-2 ${
                  activeTab === phase.id
                    ? "border-[color:var(--color-cyan)] text-[color:var(--color-cyan)]"
                    : "border-transparent text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"
                }`}
              >
                {phase.navLabel}
              </button>
            </div>
          ))}
          <div className="flex items-center flex-shrink-0">
            <span className="mr-2 ml-1 text-[9px] tracking-[0.2em] text-[color:var(--color-text-dim)] uppercase">&nbsp;</span>
            <button
              onClick={() => setActiveTab("examday")}
              className={`px-3 py-2.5 text-[10px] tracking-widest uppercase whitespace-nowrap border-b-2 ${
                isExamDay
                  ? "border-[color:var(--color-cyan)] text-[color:var(--color-cyan)]"
                  : "border-transparent text-[color:var(--color-text-dim)] hover:text-[color:var(--color-text)]"
              }`}
            >
              ⬡ EXAM DAY
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!isExamDay && activePhase && (
            <div className="flex flex-col gap-3">
              {activePhase.cards.map((card) => (
                <CardView
                  key={card.id}
                  card={card}
                  expanded={expanded.has(card.id)}
                  onToggleExpand={() => toggleExpand(card.id)}
                  checked={checked}
                  onToggleStep={toggleStep}
                />
              ))}
            </div>
          )}

          {isExamDay && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-[color:var(--color-line)] px-4 py-3">
                  <div className="text-[9px] tracking-widest uppercase text-[color:var(--color-text-dim)] mb-1">Exam Duration</div>
                  <div className="font-display text-2xl font-bold text-[color:var(--color-amber)]">{methodology.examDay.durationHours}:00</div>
                </div>
                <div className="border border-[color:var(--color-line)] px-4 py-3">
                  <div className="text-[9px] tracking-widest uppercase text-[color:var(--color-text-dim)] mb-1">Points to Pass</div>
                  <div className="font-display text-2xl font-bold text-[color:var(--color-green)]">
                    {methodology.examDay.pointsToPass} / {methodology.examDay.pointsTotal}
                  </div>
                </div>
                <div className="border border-[color:var(--color-line)] px-4 py-3">
                  <div className="text-[9px] tracking-widest uppercase text-[color:var(--color-text-dim)] mb-1">Report Window</div>
                  <div className="font-display text-2xl font-bold text-[color:var(--color-text)]">+{methodology.examDay.reportWindowHours}:00</div>
                </div>
              </div>

              <div className="border border-[color:var(--color-line)] p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-sm font-bold tracking-widest uppercase text-[color:var(--color-text)]">Points Tracker</span>
                  <span className="font-mono text-xl" style={{ color: passColor(examTotal, methodology.examDay.pointsToPass) }}>
                    {examTotal} <span className="text-sm text-[color:var(--color-text-dim)]">/ {methodology.examDay.pointsTotal} pts</span>
                    {examTotal >= methodology.examDay.pointsToPass ? " ✓ PASS" : ""}
                  </span>
                </div>
                <p className="text-[10px] text-[color:var(--color-text-dim)] mb-3">{methodology.examDay.caveat}</p>
                <div className="flex flex-col gap-3">
                  {methodology.examDay.pointRows.map((row) => {
                    const pts = examPoints[row.id] ?? 0;
                    return (
                      <div key={row.id} className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[color:var(--color-text)] w-32 flex-shrink-0">{row.name}</span>
                        <span className="font-mono text-[10px] text-[color:var(--color-text-dim)] w-20 flex-shrink-0 text-center">
                          {row.maxPoints} pts total
                        </span>
                        <div className="flex gap-1.5 flex-shrink-0">
                          {row.partial && (
                            <button
                              onClick={() => setRowPoints(row.id, row.partial!.points)}
                              className="font-mono text-[10px] px-2 py-1 border"
                              style={{
                                borderColor: pts === row.partial.points ? "var(--color-amber)" : "var(--color-line)",
                                background: pts === row.partial.points ? "rgba(255,176,32,0.15)" : "var(--color-bg-raised)",
                                color: pts === row.partial.points ? "var(--color-amber)" : "var(--color-text-dim)",
                              }}
                            >
                              {row.partial.label}
                            </button>
                          )}
                          <button
                            onClick={() => setRowPoints(row.id, row.full.points)}
                            className="font-mono text-[10px] px-2 py-1 border"
                            style={{
                              borderColor: pts === row.full.points ? "var(--color-green)" : "var(--color-line)",
                              background: pts === row.full.points ? "rgba(53,255,156,0.15)" : "var(--color-bg-raised)",
                              color: pts === row.full.points ? "var(--color-green)" : "var(--color-text-dim)",
                            }}
                          >
                            {row.full.label}
                          </button>
                        </div>
                        <div className="flex-1 h-1 bg-black/30 overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{ width: `${(pts / row.maxPoints) * 100}%`, background: "var(--color-cyan)" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {methodology.examDay.mindset.map((card) => (
                  <div key={card.heading} className="border border-[color:var(--color-line)] p-4">
                    <h3 className="text-[11px] font-bold tracking-widest uppercase text-[color:var(--color-cyan)] mb-2">⬡ {card.heading}</h3>
                    <ul className="flex flex-col gap-1.5">
                      {card.items.map((item, i) => (
                        <li key={i} className="text-xs text-[color:var(--color-text)] pl-3 relative">
                          <span className="absolute left-0 text-[color:var(--color-cyan-dim)]">›</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-t border-[color:var(--color-line)]">
          <span className="text-[10px] text-[color:var(--color-text-dim)]">
            reference only — not tied to save data{isExamDay ? ", and the point tracker resets each time you reopen this panel" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
