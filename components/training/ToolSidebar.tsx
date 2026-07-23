import type { TrainingTool } from "@/lib/game/training";
import ProgressBar from "./ProgressBar";

export default function ToolSidebar({
  tools,
  selectedId,
  onSelect,
  completedByTool,
}: {
  tools: TrainingTool[];
  selectedId: string;
  onSelect: (id: string) => void;
  completedByTool: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full md:w-64 flex-shrink-0">
      {tools.map((tool) => {
        const done = completedByTool[tool.id] ?? 0;
        const total = tool.drills.length;
        const complete = done === total && total > 0;
        const active = tool.id === selectedId;
        return (
          <button
            key={tool.id}
            onClick={() => onSelect(tool.id)}
            className={`text-left px-3 py-2.5 border transition-colors ${
              active
                ? "border-[color:var(--color-thm-accent)] bg-[color:var(--color-thm-panel)]"
                : "border-[color:var(--color-thm-line)] hover:border-[color:var(--color-thm-accent-dim)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0 text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-[color:var(--color-thm-line)] text-[color:var(--color-thm-text-dim)]">
                  {tool.rank}
                </span>
                <span className="font-mono text-sm truncate text-[color:var(--color-thm-text)]">{tool.name}</span>
              </div>
              {complete && <span className="text-[color:var(--color-thm-success)] text-xs flex-shrink-0">&#10003;</span>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar pct={total > 0 ? (done / total) * 100 : 0} />
              </div>
              <span className="text-[10px] text-[color:var(--color-thm-text-dim)] flex-shrink-0">
                {done}/{total}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
