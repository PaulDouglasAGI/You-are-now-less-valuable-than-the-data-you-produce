export default function GlitchText({
  text,
  className = "",
  as: Tag = "span",
  variant = "glitch",
}: {
  text: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3";
  variant?: "glitch" | "chromatic";
}) {
  return (
    <Tag className={`${variant === "chromatic" ? "chromatic-text" : "glitch"} ${className}`} data-text={text}>
      {text}
    </Tag>
  );
}
