import type { TrainingTool } from "@/lib/game/training";
import CodeBlock from "./CodeBlock";

export default function ToolPanel({ tool }: { tool: TrainingTool }) {
  return (
    <div className="border border-[color:var(--color-thm-line)] bg-[color:var(--color-thm-panel)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-xl font-bold text-[color:var(--color-thm-accent)]">{tool.name}</h2>
        <span className="text-[10px] tracking-widest text-[color:var(--color-thm-text-dim)]">
          RANK #{tool.rank} · {tool.useCount} USES IN-GAME
        </span>
      </div>
      <p className="mt-2 text-sm text-[color:var(--color-thm-text-dim)] leading-relaxed">{tool.blurb}</p>

      {tool.canonicalForm && (
        <div className="mt-4 border-l-2 border-[color:var(--color-thm-accent)] pl-3 py-1">
          <p className="text-[10px] tracking-widest text-[color:var(--color-thm-accent)] mb-1">CANONICAL FORM</p>
          <code className="text-sm text-[color:var(--color-thm-text)]">{tool.canonicalForm}</code>
        </div>
      )}

      <div className="mt-4">
        <p className="text-[10px] tracking-widest text-[color:var(--color-thm-text-dim)] mb-1.5">REFERENCE</p>
        <CodeBlock code={tool.referenceBlock.join("\n")} />
      </div>
    </div>
  );
}
