/**
 * Approximate state centroids in the same projected coordinate space as
 * `US_SILHOUETTE` (viewBox "0 0 100 60") — derived via the same Albers-USA
 * projection/rescale pipeline as the outline itself (see
 * scripts/derive-state-centroids.mjs), so these line up correctly against
 * the redrawn map. Covers only the real state codes actually used across
 * mission content; add more here if new missions introduce new states.
 */
export const STATE_CENTROIDS: Record<string, { x: number; y: number }> = {
  WA: { x: 15.7, y: 6.3 },
  OR: { x: 13.7, y: 13.4 },
  ID: { x: 22.7, y: 14.6 },
  MT: { x: 31.1, y: 10.2 },
  WY: { x: 33, y: 19.2 },
  CO: { x: 35.3, y: 28.1 },
  SD: { x: 44.5, y: 17 },
  NE: { x: 44.9, y: 23.3 },
  KS: { x: 47, y: 30 },
  MN: { x: 53.5, y: 13.2 },
  MO: { x: 56.9, y: 30.2 },
  IL: { x: 62, y: 26.3 },
  IN: { x: 66.8, y: 26.2 },
  MI: { x: 67.1, y: 16.5 },
  OH: { x: 72.3, y: 24.6 },
  PA: { x: 80, y: 22.1 },
  NC: { x: 79.5, y: 33.8 },
  VT: { x: 86.4, y: 13.6 },
  NH: { x: 88.2, y: 14 },
  MA: { x: 88.7, y: 17.1 },
  CT: { x: 87.6, y: 18.7 },
  TX: { x: 44.9, y: 45 },
  LA: { x: 58.4, y: 45.9 },
  OK: { x: 48.4, y: 36.3 },
};

/** small stable string hash — not cryptographic, just needs to be deterministic */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

/**
 * A state's real centroid, offset by a small deterministic amount so multiple
 * mission nodes in the same state don't all stack on one point. `seedKey`
 * should be unique and stable per node (e.g. `${missionId}:${nodeId}`) so the
 * same node always lands in the same spot across re-renders/rebuilds.
 */
export function jitteredCoords(state: string, seedKey: string, spread = 1.5): { x: number; y: number } {
  const base = STATE_CENTROIDS[state];
  if (!base) throw new Error(`no centroid for state "${state}" — add it to STATE_CENTROIDS`);
  const h = hashString(seedKey);
  const dx = (((h & 0xff) / 255) * 2 - 1) * spread;
  const dy = (((h >> 8) & 0xff) / 255) * 2 * spread - spread;
  return { x: Math.round((base.x + dx) * 10) / 10, y: Math.round((base.y + dy) * 10) / 10 };
}
