"use client";

import { useMemo, useState } from "react";
import type { TrainingProgress } from "@/lib/game/types";
import { training } from "@/lib/game/training";
import ToolSidebar from "./training/ToolSidebar";
import ToolPanel from "./training/ToolPanel";
import DrillCard from "./training/DrillCard";
import ProgressBar from "./training/ProgressBar";

export default function TrainingMode({
  progress,
  onProgressChange,
  onBack,
}: {
  progress: TrainingProgress;
  onProgressChange: (next: TrainingProgress) => void;
  onBack: () => void;
}) {
  const [selectedId, setSelectedId] = useState(training.tools[0].id);
  const selectedTool = training.tools.find((t) => t.id === selectedId) ?? training.tools[0];

  const completedSet = useMemo(() => new Set(progress.completedDrillIds), [progress.completedDrillIds]);

  const completedByTool = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tool of training.tools) {
      map[tool.id] = tool.drills.filter((d) => completedSet.has(`${tool.id}:${d.id}`)).length;
    }
    return map;
  }, [completedSet]);

  const totalDrills = training.tools.reduce((sum, t) => sum + t.drills.length, 0);
  const totalDone = Object.values(completedByTool).reduce((sum, n) => sum + n, 0);

  function markComplete(toolId: string, drillId: string) {
    const key = `${toolId}:${drillId}`;
    if (completedSet.has(key)) return;
    onProgressChange({ completedDrillIds: [...progress.completedDrillIds, key] });
  }

  function handleResetDrills() {
    if (window.confirm("Reset all Training Mode progress? This can't be undone.")) {
      onProgressChange({ completedDrillIds: [] });
    }
  }

  return (
    <div className="training-theme h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-8 gap-6">
      <div className="w-full max-w-5xl flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs tracking-widest text-[color:var(--color-thm-text-dim)] hover:text-[color:var(--color-thm-accent)] transition-colors"
        >
          ← MAIN MENU
        </button>
        <div className="text-right">
          <span className="block text-[10px] tracking-widest text-[color:var(--color-thm-text-dim)]">TRAINING MODE</span>
          <span className="text-xs text-[color:var(--color-thm-text)]">
            {totalDone}/{totalDrills} drills complete
          </span>
        </div>
      </div>

      <div className="w-full max-w-5xl">
        <h1 className="font-mono text-3xl md:text-4xl font-bold text-[color:var(--color-thm-accent)]">TOOL PRACTICE</h1>
        <p className="mt-1 text-sm text-[color:var(--color-thm-text-dim)]">
          The most-used real tools across every mission in this game, ranked by how often they show up. Read the
          reference, then type the command yourself — no multiple choice.
        </p>
        <div className="mt-3 max-w-sm">
          <ProgressBar pct={totalDrills > 0 ? (totalDone / totalDrills) * 100 : 0} />
        </div>
      </div>

      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6 pb-10">
        <ToolSidebar tools={training.tools} selectedId={selectedId} onSelect={setSelectedId} completedByTool={completedByTool} />

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <ToolPanel tool={selectedTool} />

          <div className="flex flex-col gap-2">
            {selectedTool.drills.map((drill, i) => (
              <DrillCard
                key={drill.id}
                drill={drill}
                number={i + 1}
                completed={completedSet.has(`${selectedTool.id}:${drill.id}`)}
                onCorrect={() => markComplete(selectedTool.id, drill.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleResetDrills}
        className="text-[10px] tracking-widest text-[color:var(--color-thm-text-dim)] hover:text-[color:var(--color-thm-accent)] transition-colors pb-4"
      >
        [ reset training progress ]
      </button>
    </div>
  );
}
