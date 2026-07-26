"use client";

import { useEffect, useRef, useState } from "react";
import GlitchText from "./GlitchText";
import RadialHud from "./RadialHud";
import { US_SILHOUETTE } from "@/lib/us-silhouette";

const LINES = [
  "everything is connected now.",
  "traffic signals. water treatment. payroll. hospitals. freight.",
  "a few thousand lines of code hold more control than anyone admits out loud.",
  "most of it was never secured. it just shipped on time.",
  "someone has to find the holes before the wrong person does.",
];

type Stage = "burst" | "line" | "authorizing" | "title";

const AUTH_STEPS = [
  "TRACING UPLINK...",
  "NEGOTIATING HANDSHAKE...",
  "VERIFYING OPERATOR CREDENTIALS...",
  "AUTHORIZING ACCESS...",
];

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export default function BootSequence({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<Stage>("burst");
  const [lineIdx, setLineIdx] = useState(0);
  const [lineOpacity, setLineOpacity] = useState(0);
  const [authProgress, setAuthProgress] = useState(0);
  const abortedRef = useRef(false);

  useEffect(() => {
    const aborted = abortedRef;
    async function run() {
      for (let i = 0; i < LINES.length; i++) {
        if (aborted.current) return;
        setLineIdx(i);
        setStage("burst");
        await wait(260);
        if (aborted.current) return;
        setStage("line");
        setLineOpacity(1);
        await wait(1500);
        if (aborted.current) return;
        setLineOpacity(0);
        await wait(260);
      }
      if (aborted.current) return;
      setStage("authorizing");

      const start = Date.now();
      const duration = 1800;
      while (Date.now() - start < duration) {
        if (aborted.current) return;
        setAuthProgress(Math.min(1, (Date.now() - start) / duration));
        await wait(40);
      }
      if (aborted.current) return;
      setAuthProgress(1);
      await wait(400);
      if (aborted.current) return;
      setStage("title");
    }
    run();
    return () => {
      aborted.current = true;
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (stage === "title" && (e.key === "Enter" || e.key === " ")) onDone();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [stage, onDone]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center px-6 text-center select-none relative overflow-hidden">
      {(stage === "authorizing" || stage === "title") && (
        <svg
          viewBox="0 0 100 60"
          className="absolute inset-0 w-full h-full opacity-20 pointer-events-none fade-in"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d={US_SILHOUETTE} fill="none" stroke="var(--color-cyan)" strokeWidth="0.2" />
        </svg>
      )}

      {(stage === "line" || stage === "burst") && (
        <div className="max-w-3xl relative z-10">
          <p
            className="font-statement text-3xl md:text-5xl font-black uppercase tracking-tight text-[color:var(--color-text)] transition-opacity duration-300"
            style={{ opacity: lineOpacity }}
          >
            {LINES[lineIdx]}
          </p>
        </div>
      )}

      {stage === "authorizing" && (
        <div className="flex flex-col items-center gap-4 fade-in relative z-10">
          <RadialHud progress={authProgress} label="ESTABLISHING UPLINK" size={140} />
          <div className="flex flex-col items-center gap-1">
            {AUTH_STEPS.slice(0, Math.min(AUTH_STEPS.length - 1, Math.floor(authProgress * AUTH_STEPS.length)) + 1).map(
              (s, i) => (
                <p key={i} className="text-xs tracking-[0.3em] text-[color:var(--color-cyan-dim)] scan-in">
                  {s}
                </p>
              ),
            )}
          </div>
        </div>
      )}

      {stage === "title" && (
        <div className="fade-in flex flex-col items-center gap-6 relative z-10">
          <GlitchText
            as="h1"
            text="BREACHLINE"
            variant="chromatic"
            className="font-display text-6xl md:text-8xl font-bold tracking-[0.2em] text-[color:var(--color-cyan)]"
          />
          <p className="max-w-xl text-sm md:text-base text-[color:var(--color-text-dim)] tracking-wide">
            a terminal-driven hacking trainer. real methodology, fictional targets.
            <br />
            recon → exploit → escalate → pivot → remediate.
          </p>
          <button
            onClick={onDone}
            className="mt-4 border border-[color:var(--color-cyan-dim)] px-8 py-3 font-display tracking-[0.3em] text-[color:var(--color-cyan)] hover:bg-[color:var(--color-cyan)] hover:text-black active:scale-[0.97] transition-all duration-150"
          >
            PRESS ENTER
          </button>
        </div>
      )}
    </div>
  );
}
