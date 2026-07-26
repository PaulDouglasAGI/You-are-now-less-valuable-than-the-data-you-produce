/** No-op: the flat theme uses plain panel borders instead of corner-bracket chrome. Kept as a
 *  component so call sites don't need to change. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CornerFrame(props: { color?: string }) {
  return null;
}
