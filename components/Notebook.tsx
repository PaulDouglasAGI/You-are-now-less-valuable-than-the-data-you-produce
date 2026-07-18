"use client";

import { useState } from "react";
import type { NotebookData } from "@/lib/game/types";
import CornerFrame from "./CornerFrame";

function formatEntry(source: string, text: string) {
  return `[${source}] ${text}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function Notebook({
  open,
  notebook,
  onClose,
  onTextChange,
  onClear,
}: {
  open: boolean;
  notebook: NotebookData;
  onClose: () => void;
  onTextChange: (text: string) => void;
  onClear: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!open) return null;

  async function copyEntry(id: string, source: string, text: string) {
    const ok = await copyToClipboard(formatEntry(source, text));
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1200);
    }
  }

  async function copyAll() {
    const dump = notebook.entries.map((e) => formatEntry(e.source, e.text)).join("\n");
    const ok = await copyToClipboard(dump);
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1200);
    }
  }

  function handleClear() {
    if (window.confirm("Clear the entire notebook? This can't be undone.")) {
      onClear();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full sm:w-[440px] h-full border-l border-[color:var(--color-line)] flex flex-col fade-in"
        style={{ background: "var(--color-bg-raised)" }}
      >
        <CornerFrame />
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[color:var(--color-line)]">
          <div>
            <h2 className="font-display text-lg font-bold text-[color:var(--color-cyan)] tracking-widest">
              FIELD NOTEBOOK
            </h2>
            <p className="text-[10px] text-[color:var(--color-text-dim)] tracking-widest">⌃N or ESC to close</p>
          </div>
          <button
            onClick={onClose}
            className="text-[color:var(--color-text-dim)] hover:text-[color:var(--color-red)] text-xl leading-none px-2"
            aria-label="Close notebook"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)]">
                CASE FILE — auto-captured findings ({notebook.entries.length})
              </span>
              {notebook.entries.length > 0 && (
                <button
                  onClick={copyAll}
                  className="text-[10px] tracking-widest text-[color:var(--color-cyan)] hover:text-[color:var(--color-text)]"
                >
                  {copiedAll ? "COPIED" : "COPY ALL"}
                </button>
              )}
            </div>
            {notebook.entries.length === 0 ? (
              <p className="text-xs text-[color:var(--color-text-dim)] italic">
                nothing captured yet — creds, keys, and endpoints you recover will show up here automatically.
              </p>
            ) : (
              <ul className="space-y-2">
                {notebook.entries.map((e) => (
                  <li
                    key={e.id}
                    className="group border border-[color:var(--color-line)] bg-black/30 p-2 text-xs flex items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] tracking-widest text-[color:var(--color-cyan-dim)]">{e.source}</span>
                      <p className="text-[color:var(--color-text)] break-words font-mono">{e.text}</p>
                    </div>
                    <button
                      onClick={() => copyEntry(e.id, e.source, e.text)}
                      className="flex-shrink-0 text-[10px] tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-cyan)] opacity-60 group-hover:opacity-100"
                    >
                      {copiedId === e.id ? "COPIED" : "COPY"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 flex flex-col min-h-[200px]">
            <span className="text-[10px] tracking-widest text-[color:var(--color-text-dim)] mb-2">
              FIELD NOTES — freeform, yours to keep
            </span>
            <textarea
              value={notebook.text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="jot down anything worth remembering across nodes and chains..."
              spellCheck={false}
              className="flex-1 min-h-[160px] w-full resize-none bg-black/30 border border-[color:var(--color-line)] p-3 text-xs font-mono text-[color:var(--color-text)] outline-none focus:border-[color:var(--color-cyan-dim)]"
            />
          </div>
        </div>

        <div className="flex-shrink-0 px-5 py-3 border-t border-[color:var(--color-line)] flex justify-between items-center">
          <span className="text-[10px] text-[color:var(--color-text-dim)]">saved locally in this browser</span>
          <button
            onClick={handleClear}
            className="text-[10px] tracking-widest text-[color:var(--color-text-dim)] hover:text-[color:var(--color-red)]"
          >
            CLEAR NOTEBOOK
          </button>
        </div>
      </div>
    </div>
  );
}
