"use client";

import { useState } from "react";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <div className="border border-[color:var(--color-thm-line)] bg-black/30">
      {label && (
        <div className="px-3 py-1.5 border-b border-[color:var(--color-thm-line)] text-[10px] tracking-widest text-[color:var(--color-thm-text-dim)]">
          {label}
        </div>
      )}
      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <code className="flex-1 min-w-0 text-xs text-[color:var(--color-thm-text)] break-words whitespace-pre-wrap">
          {code}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 text-[10px] tracking-widest text-[color:var(--color-thm-text-dim)] hover:text-[color:var(--color-thm-accent)] transition-colors"
        >
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
    </div>
  );
}
