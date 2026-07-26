"use client";

import type { TransmissionDef } from "@/lib/game/types";
import GlitchText from "./GlitchText";
import CornerFrame from "./CornerFrame";

export default function Transmission({
  transmission,
  flags,
  onContinue,
  continueLabel,
}: {
  transmission: TransmissionDef;
  /** accumulated chain flags for the run that just finished — used to pick a variant on the finale's transmission */
  flags: string[];
  onContinue: () => void;
  continueLabel: string;
}) {
  const variantKey = transmission.variantLines ? Object.keys(transmission.variantLines).find((k) => flags.includes(k)) : undefined;
  const lines = (variantKey && transmission.variantLines?.[variantKey]) || transmission.lines;
  const isDossier = transmission.format === "dossier";

  return (
    <div className="h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-10">
      <div
        className="relative max-w-3xl w-full hud-panel p-8 md:p-10 fade-in"
        style={{ ["--hp-color" as string]: "var(--color-teal)" }}
      >
        <CornerFrame color="var(--color-teal)" />
        <span className="block text-[11px] tracking-[0.3em] text-[color:var(--color-teal)] scan-in">
          {isDossier ? "INTERCEPTED TRANSMISSION" : "UNBANK CHANNEL"}
        </span>
        <GlitchText
          as="h1"
          text={isDossier ? "RECOVERED DOCUMENT" : transmission.channel ?? "#unbank"}
          className="block font-display text-xl md:text-3xl font-bold text-[color:var(--color-teal)] mt-1 scan-in"
        />

        <div
          className={`mt-6 space-y-2 text-sm leading-relaxed border-t border-[color:var(--color-line)] pt-6 max-h-[50vh] overflow-y-auto ${
            isDossier ? "font-mono" : ""
          }`}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className="stagger-in flex gap-3"
              style={{ ["--stagger-i" as string]: i }}
            >
              {line.timestamp !== undefined && line.timestamp !== "" && (
                <span className="text-[10px] tracking-wider text-[color:var(--color-text-dim)] shrink-0 pt-0.5">
                  {line.timestamp}
                </span>
              )}
              <p className="text-[color:var(--color-text)]">
                <span
                  className={
                    line.handle === "SYSTEM" || line.handle === "DOCUMENT"
                      ? "text-[color:var(--color-text-dim)] italic"
                      : "text-[color:var(--color-teal)] font-semibold"
                  }
                >
                  {line.handle !== "SYSTEM" && line.handle !== "DOCUMENT" ? `<${line.handle}>` : line.handle}
                </span>{" "}
                {line.text}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={onContinue}
          className="mt-8 border border-[color:var(--color-teal)] px-8 py-3 font-display tracking-[0.3em] text-[color:var(--color-teal)] hover:bg-[color:var(--color-teal)] hover:text-black active:scale-[0.97] transition-all duration-150"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
