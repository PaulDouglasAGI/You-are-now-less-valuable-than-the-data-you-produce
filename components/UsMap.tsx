"use client";

import type { NodeDef } from "@/lib/game/types";
import { US_SILHOUETTE } from "@/lib/us-silhouette";

export type NodeStatus = "locked" | "unlocked" | "secured";

const CENTER = { x: 43, y: 25 };

function statusColor(status: NodeStatus) {
  return status === "secured" ? "var(--color-green)" : status === "unlocked" ? "var(--color-cyan)" : "var(--color-text-dim)";
}

/** approximate SVG-unit width of a label string at the given font size, for sizing the tag box */
function labelWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.62 + fontSize * 1.4;
}

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

        {/* radar ping, centered roughly over the continental landmass */}
        <g opacity="0.5" pointerEvents="none">
          <circle cx={CENTER.x} cy={CENTER.y} r="1" fill="none" stroke="var(--color-cyan)" strokeWidth="0.25" className="ping-ring" style={{ animationDelay: "0s" }} />
          <circle cx={CENTER.x} cy={CENTER.y} r="1" fill="none" stroke="var(--color-cyan)" strokeWidth="0.25" className="ping-ring" style={{ animationDelay: "1.2s" }} />
          <circle cx={CENTER.x} cy={CENTER.y} r="1" fill="none" stroke="var(--color-cyan)" strokeWidth="0.25" className="ping-ring" style={{ animationDelay: "2.4s" }} />
        </g>

        <path d={US_SILHOUETTE} fill="url(#mapgrid)" stroke="var(--color-cyan-dim)" strokeWidth="0.25" opacity="0.85" />
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

        {ordered.map((node, i) => {
          const status = statusFor(node.id);
          const color = statusColor(status);
          const dirRight = i % 2 === 0;
          const dx = dirRight ? 5 : -5;
          const elbowX = node.coords.x + dx;
          // stagger the leader height per node so nearby nodes' tags land on different rows,
          // otherwise long org names on closely-spaced nodes overlap regardless of left/right side
          const tier = i % 3;
          const elbowY = node.coords.y - 6 - tier * 5.5;
          const nameSize = 1.7;
          const nameW = labelWidth(node.org.toUpperCase(), nameSize);
          const tagX = dirRight ? elbowX : elbowX - nameW;
          const tagY = elbowY - nameSize - 1.2;
          const cut = 1.2;

          const clickable = status !== "locked";

          return (
            // the whole node — leader line, label tag, and dot — is one clickable unit,
            // since a player will naturally try clicking the readable label, not just the tiny dot
            <g
              key={node.id}
              className={clickable ? "cursor-pointer" : "cursor-not-allowed"}
              onClick={() => clickable && onSelect(node.id)}
            >
              <g opacity={status === "locked" ? 0.45 : 0.9}>
                <polyline
                  points={`${node.coords.x},${node.coords.y} ${elbowX},${elbowY} ${dirRight ? elbowX + nameW : elbowX - nameW},${elbowY}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.18"
                  pointerEvents="none"
                />
                <polygon
                  points={
                    dirRight
                      ? `${tagX},${tagY} ${tagX + nameW - cut},${tagY} ${tagX + nameW},${tagY + cut} ${tagX + nameW},${tagY + nameSize + 2.6} ${tagX},${tagY + nameSize + 2.6}`
                      : `${tagX + cut},${tagY} ${tagX + nameW},${tagY} ${tagX + nameW},${tagY + nameSize + 2.6} ${tagX},${tagY + nameSize + 2.6} ${tagX},${tagY + cut}`
                  }
                  fill="rgba(5,8,10,0.82)"
                  stroke={color}
                  strokeWidth="0.15"
                />
                <text x={tagX + nameW / 2} y={tagY + nameSize + 0.3} textAnchor="middle" fontSize={nameSize} fill={color} fontFamily="var(--font-display)" fontWeight={600}>
                  {node.org.toUpperCase()}
                </text>
                <text x={tagX + nameW / 2} y={tagY + nameSize + 2.1} textAnchor="middle" fontSize="1.4" fill="var(--color-text-dim)" fontFamily="var(--font-mono)">
                  {node.city}, {node.state}
                </text>
              </g>

              <g transform={`translate(${node.coords.x}, ${node.coords.y})`}>
                {status === "unlocked" && (
                  <circle r="2.2" fill="none" stroke={color} strokeWidth="0.15" className="pulse-dot" opacity="0.7" pointerEvents="none" />
                )}
                <circle r="0.9" fill={status === "locked" ? "var(--color-bg-raised)" : color} stroke={color} strokeWidth="0.25" filter="url(#glow)" pointerEvents="none" />
                {/* generous invisible hit target around the dot itself */}
                <circle r="3.2" fill="transparent" />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
