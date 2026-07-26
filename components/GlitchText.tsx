import type { CSSProperties } from "react";

export default function GlitchText({
  text,
  className = "",
  as: Tag = "span",
  style,
}: {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3";
  /** kept for call-site compatibility; the flat theme renders both variants identically */
  variant?: "glitch" | "chromatic";
  style?: CSSProperties;
}) {
  return (
    <Tag className={className} style={style}>
      {text}
    </Tag>
  );
}
