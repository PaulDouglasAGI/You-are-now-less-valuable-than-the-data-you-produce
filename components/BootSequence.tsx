"use client";

import { useEffect, useState } from "react";
import GlitchText from "./GlitchText";

const LINES: { text: string; big?: boolean }[] = [
  { text: "everything is connected now." },
  { text: "traffic signals. water treatment. payroll. hospitals. freight." },
  { text: "a few thousand lines of code hold more control than anyone admits out loud." },
  { text: "most of it was never secured. it just shipped on time." },
  { text: "someone has to find the holes before the wrong person does." },
];

export default function BootSequence({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    if (step < LINES.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 1500);
      return () => clearTimeout(t);
    } else if (!showTitle) {
      const t = setTimeout(() => setShowTitle(true), 600);
      return () => clearTimeout(t);
    }
  }, [step, showTitle]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showTitle && (e.key === "Enter" || e.key === " ")) onDone();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showTitle, onDone]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-6 text-center select-none">
      {!showTitle && (
        <div className="max-w-2xl space-y-5">
          {LINES.slice(0, step).map((l, i) => (
            <p key={i} className="fade-in font-display text-lg md:text-2xl tracking-wide text-[color:var(--color-text)]">
              {l.text}
            </p>
          ))}
        </div>
      )}

      {showTitle && (
        <div className="fade-in flex flex-col items-center gap-6">
          <GlitchText
            as="h1"
            text="BREACHLINE"
            className="font-display text-6xl md:text-8xl font-bold tracking-[0.2em] text-[color:var(--color-cyan)] text-glow"
          />
          <p className="max-w-xl text-sm md:text-base text-[color:var(--color-text-dim)] tracking-wide">
            a terminal-driven hacking trainer. real methodology, fictional targets.
            <br />
            recon → exploit → escalate → pivot → remediate.
          </p>
          <button
            onClick={onDone}
            className="mt-4 border border-[color:var(--color-cyan-dim)] px-8 py-3 font-display tracking-[0.3em] text-[color:var(--color-cyan)] hover:bg-[color:var(--color-cyan)] hover:text-black transition-colors"
          >
            PRESS ENTER
          </button>
        </div>
      )}
    </div>
  );
}
