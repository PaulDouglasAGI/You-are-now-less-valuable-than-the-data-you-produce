import * as topojson from "topojson-client";
import * as d3geo from "d3-geo";
import statesTopo from "us-atlas/states-albers-10m.json" with { type: "json" };

const EXCLUDE_FIPS = new Set(["02", "15"]); // Alaska, Hawaii — continental only

const allGeoms = statesTopo.objects.states.geometries;
const keepGeoms = allGeoms.filter((g) => !EXCLUDE_FIPS.has(g.id));

const merged = topojson.merge(statesTopo, keepGeoms);
// merged is a GeoJSON Polygon/MultiPolygon geometry object, coordinates already
// in the Albers-USA *projected* plane (not lat/long) since we used the
// pre-projected states-albers-10m.json atlas.

const path = d3geo.geoPath(); // no projection function => operates on planar coords directly
const [[x0, y0], [x1, y1]] = path.bounds(merged);

const TARGET = { x0: 2, y0: 2, x1: 98, y1: 58 };
const srcW = x1 - x0;
const srcH = y1 - y0;
const targetW = TARGET.x1 - TARGET.x0;
const targetH = TARGET.y1 - TARGET.y0;
const scale = Math.min(targetW / srcW, targetH / srcH);
const drawW = srcW * scale;
const drawH = srcH * scale;
const offsetX = TARGET.x0 + (targetW - drawW) / 2;
const offsetY = TARGET.y0 + (targetH - drawH) / 2;

function project([x, y]) {
  return [offsetX + (x - x0) * scale, offsetY + (y - y0) * scale];
}

function ring(coords) {
  return coords.map(project);
}

function ringToPathString(pts) {
  const rounded = pts.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`);
  return "M" + rounded[0] + " L" + rounded.slice(1).join(" L") + " Z";
}

let polygons;
if (merged.type === "Polygon") {
  polygons = [merged.coordinates];
} else if (merged.type === "MultiPolygon") {
  polygons = merged.coordinates;
} else {
  throw new Error("unexpected geometry type: " + merged.type);
}

// collect outer rings only (drop holes — no interior lakes needed for a flat silhouette)
const outerRings = polygons.map((poly) => poly[0]);

function ringArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

// keep only the largest-area ring (the mainland) — offshore islands (Long Island,
// the Keys, etc.) render as stray disconnected blobs at this scale, not "islands"
const ringsByArea = outerRings.map((r) => ({ r, area: ringArea(r) })).sort((a, b) => b.area - a.area);
console.log(
  "TOP 5 RING AREAS (raw units^2):",
  ringsByArea.slice(0, 5).map((x) => Math.round(x.area)),
);
const mainland = ringsByArea[0].r;
console.log("MAINLAND RING POINT COUNT (raw):", mainland.length);

// Douglas-Peucker simplification to cut point density while preserving the
// overall recognizable shape (major peninsulas, gulf coast, etc.)
function perpDist(pt, a, b) {
  const [x, y] = pt, [ax, ay] = a, [bx, by] = b;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - ax, y - ay);
  const t = ((x - ax) * dx + (y - ay) * dy) / len2;
  const px = ax + t * dx, py = ay + t * dy;
  return Math.hypot(x - px, y - py);
}

function douglasPeucker(pts, tolerance) {
  if (pts.length < 3) return pts;
  let maxDist = 0, maxIdx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > tolerance) {
    const left = douglasPeucker(pts.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(pts.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [pts[0], pts[pts.length - 1]];
}

// simplify in RAW (pre-scale) coordinate units; raw bounds span ~940x594, and we
// want the final projected shape (scaled down by ~0.094x) to retain real detail,
// so pick a raw tolerance proportional to that scale factor
const rawTolerance = 1.6 / scale; // ~1.6 units of "final" wiggle allowed
const simplified = douglasPeucker(mainland, rawTolerance);
console.log("MAINLAND RING POINT COUNT (simplified):", simplified.length, "tolerance(raw)=", rawTolerance.toFixed(1));

// Manual smoothing pass over three specific regions where Douglas-Peucker's global
// tolerance left valid-but-visually-spiky detail (Florida's peninsula/panhandle
// transition, the Lake Michigan/Great Lakes notch, and the Chesapeake/Delmarva
// coast) — this is a stylized HUD map, not a literal atlas, so these are dropped
// in favor of a single clean line through the region. Match by the *projected*
// (already-scaled) coordinates, rounded to 1 decimal, since that's what was
// eyeballed against rendered screenshots.
const DROP_PROJECTED_POINTS = new Set([
  "48.7,56.6", "50.1,51.7", "48.1,52.9", // Florida panhandle/peninsula wobble
  "56.9,12.3", "62.6,10.2", "62.1,11.8", "63.1,16.1", "64.5,14.7", "67.3,13.4", "69.9,14.1", // Great Lakes zigzag
  "86,21.2", "85.5,25.2", "84,23.9", "82.6,25.1", "82.9,29.5", "83.7,31.4", // Delmarva/Chesapeake zigzag
]);
const projected = ring(simplified);
const keptIdx = projected
  .map((p, i) => ({ p, i }))
  .filter(({ p }) => !DROP_PROJECTED_POINTS.has(`${Math.round(p[0] * 10) / 10},${Math.round(p[1] * 10) / 10}`));
const smoothed = keptIdx.map(({ i }) => simplified[i]);
console.log("POINT COUNT AFTER MANUAL SMOOTHING:", smoothed.length, "(dropped", simplified.length - smoothed.length, ")");

const fullPath = ringToPathString(ring(smoothed));
console.log("STATE COUNT KEPT:", keepGeoms.length, "of", allGeoms.length);
console.log("SOURCE BOUNDS:", { x0, y0, x1, y1 }, "aspect", (srcW / srcH).toFixed(3));
console.log("SCALE:", scale.toFixed(4), "drawW", drawW.toFixed(1), "drawH", drawH.toFixed(1));
console.log("PATH LENGTH (chars):", fullPath.length);
console.log("---PATH---");
console.log(fullPath);
