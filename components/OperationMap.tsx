"use client";

import type { ChainDef } from "@/lib/game/types";
import { difficultyMeta } from "@/lib/game/chains";
import UsMap, { type NodeStatus } from "./UsMap";

export default function OperationMap({
  chain,
  statusFor,
  onSelectNode,
  onBack,
}: {
  chain: ChainDef;
  statusFor: (nodeId: string) => NodeStatus;
  onSelectNode: (nodeId: string) => void;
  onBack: () => void;
}) {
  const meta = difficultyMeta[chain.difficulty];
  const securedCount = chain.nodes.filter((n) => statusFor(n.id) === "secured").length;

  return (
    <div className="h-screen w-screen flex flex-col px-4 md:px-8 py-4 md:py-6 gap-4">
      <div className="flex items-center justify-between border-b border-[color:var(--color-line)] pb-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-xs tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-cyan)] transition-colors"
          >
            ← MENU
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold tracking-[0.2em] text-xs" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className="font-display text-lg font-semibold text-[color:var(--color-text)]">{chain.title}</span>
            </div>
            <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">{chain.codename}</span>
          </div>
        </div>
        <div className="text-xs tracking-widest text-[color:var(--color-text-dim)]">
          {securedCount}/{chain.nodes.length} SECURED
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-5xl">
          <UsMap nodes={chain.nodes} statusFor={statusFor} onSelect={onSelectNode} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 text-[10px] tracking-widest text-[color:var(--color-text-dim)] pb-1">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-green)" }} />
          SECURED
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--color-cyan)" }} />
          ACTIVE TARGET
        </span>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-text-dim)" }} />
          LOCKED
        </span>
      </div>
    </div>
  );
}
