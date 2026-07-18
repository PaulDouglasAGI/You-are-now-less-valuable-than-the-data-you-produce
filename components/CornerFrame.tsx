/** Sci-fi HUD corner brackets, absolutely positioned over a `relative` parent. */
export default function CornerFrame({ color }: { color?: string }) {
  return (
    <div className="corner-frame" style={color ? { ["--cf-color" as string]: color } : undefined}>
      <span className="cf-bl" />
      <span className="cf-br" />
    </div>
  );
}
