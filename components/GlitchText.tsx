import type { CSSProperties } from "react";

export default function GlitchText({
  text,
  className = "",
  as: Tag = "span",
  variant = "glitch",
  style,
}: {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3";
  variant?: "glitch" | "chromatic";
  style?: CSSProperties;
}) {
  return (
    <Tag className={`${variant === "chromatic" ? "chromatic-text" : "glitch"} ${className}`} data-text={text} style={style}>
      {text}
    </Tag>
  );
}
