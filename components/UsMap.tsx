"use client";

import type { NodeDef } from "@/lib/game/types";

/** stylized, simplified continental-US silhouette — not cartographically precise, built for the HUD aesthetic */
const US_SILHOUETTE =
  "M66,4 L69,7 L67.5,9.5 L70,11 L68,13 L70.5,14 L69,15 L71.5,17 L70,18.5 L70.5,20.5 L69.5,22.5 L70.5,23.5 " +
  "L70,25.5 L71.5,26.5 L71,28.5 L72.5,29 L70,31 L69,33.5 L70.5,36 L69.5,40 L70.5,44 L69,47 L67,45.5 L65.5,43 " +
  "L64,40 L62,38.5 L59,39 L56,39.5 L52,40 L49,38.5 L46,39.5 L43,41 L40.5,43 L37,41.5 L34,40 L32,38.5 L30,37 " +
  "L27,36.5 L23,35.5 L19.5,34.5 L17.5,33 L16.5,30 L15,27 L14,23.5 L14.5,20 L14,17 L15,14 L16.5,12 L15.5,10 " +
  "L17.5,9 L22,8.5 L27,8.5 L33,8 L39,7.8 L44,8 L47,7.5 L46,9.5 L49,11 L52,10 L54.5,9 L56,11.5 L54.5,14 L57,15 " +
  "L58,17.5 L60,16.5 L61.5,14 L62.5,15 L61.5,18 L64,19 L63,16 L64.5,13 L66,11 L65,8 Z";

export type NodeStatus = "locked" | "unlocked" | "secured";

export default function UsMap({
  nodes,
  statusFor,
  onSelect,
}: {
  nodes: NodeDef[];
  statusFor: (nodeId: string) => NodeStatus;
  onSelect: (nodeId: string) => void;
}) {
  const ordered = nodes;

  return (
    <div className="relative w-full aspect-[100/62]">
      <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full overflow-visible">
        <defs>
          <pattern id="mapgrid" width="2" height="2" patternUnits="userSpaceOnUse">
            <path d="M 2 0 L 0 0 0 2" fill="none" stroke="rgba(41,241,227,0.08)" strokeWidth="0.1" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="0.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={US_SILHOUETTE}
          fill="url(#mapgrid)"
          stroke="var(--color-cyan-dim)"
          strokeWidth="0.25"
          opacity="0.85"
        />
        <path d={US_SILHOUETTE} fill="rgba(41,241,227,0.04)" />

        {/* chain connective lines between nodes in order */}
        {ordered.slice(1).map((node, i) => {
          const prev = ordered[i];
          const s1 = statusFor(prev.id);
          const s2 = statusFor(node.id);
          const active = s1 === "secured";
          return (
            <line
              key={`link-${prev.id}-${node.id}`}
              x1={prev.coords.x}
              y1={prev.coords.y}
              x2={node.coords.x}
              y2={node.coords.y}
              stroke={active ? "var(--color-cyan)" : "var(--color-line)"}
              strokeWidth={active ? 0.3 : 0.2}
              strokeDasharray={s2 === "locked" ? "0.8 0.8" : undefined}
              opacity={active ? 0.9 : 0.5}
            />
          );
        })}

        {ordered.map((node) => {
          const status = statusFor(node.id);
          const color =
            status === "secured" ? "var(--color-green)" : status === "unlocked" ? "var(--color-cyan)" : "var(--color-text-dim)";
          return (
            <g
              key={node.id}
              transform={`translate(${node.coords.x}, ${node.coords.y})`}
              className={status !== "locked" ? "cursor-pointer" : "cursor-not-allowed"}
              onClick={() => status !== "locked" && onSelect(node.id)}
            >
              {status === "unlocked" && (
                <circle r="2.2" fill="none" stroke={color} strokeWidth="0.15" className="pulse-dot" opacity="0.7" pointerEvents="none" />
              )}
              <circle r="0.9" fill={status === "locked" ? "var(--color-bg-raised)" : color} stroke={color} strokeWidth="0.25" filter="url(#glow)" pointerEvents="none" />
              {/* generous invisible hit target, independent of label overlap between nearby nodes */}
              <circle r="3.2" fill="transparent" pointerEvents="all" />
              <text
                x="0"
                y="-2.4"
                textAnchor="middle"
                fontSize="2.1"
                fill={color}
                fontFamily="var(--font-display)"
                fontWeight={600}
                opacity={status === "locked" ? 0.5 : 1}
                pointerEvents="none"
              >
                {node.org.toUpperCase()}
              </text>
              <text x="0" y="4" textAnchor="middle" fontSize="1.5" fill="var(--color-text-dim)" pointerEvents="none">
                {node.city}, {node.state}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
