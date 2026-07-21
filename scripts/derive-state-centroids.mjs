import * as topojson from "topojson-client";
import * as d3geo from "d3-geo";
import statesTopo from "us-atlas/states-albers-10m.json" with { type: "json" };

// Real state names used across BREACHLINE's mission content (grep-confirmed),
// mapped to their FIPS codes so we can pull the exact same projected geometry
// used for the outline itself — guarantees centroids land correctly relative
// to the redrawn silhouette, since both go through the identical transform.
const STATE_FIPS = {
  WA: "53", OR: "41", ID: "16", MT: "30", WY: "56", CO: "08", SD: "46",
  NE: "31", KS: "20", MN: "27", MO: "29", IL: "17", IN: "18", MI: "26",
  OH: "39", PA: "42", NC: "37", VT: "50", NH: "33", MA: "25", CT: "09",
  TX: "48", LA: "22", OK: "40",
};

const allGeoms = statesTopo.objects.states.geometries;
const byFips = new Map(allGeoms.map((g) => [g.id, g]));

const EXCLUDE_FIPS = new Set(["02", "15"]);
const keepGeoms = allGeoms.filter((g) => !EXCLUDE_FIPS.has(g.id));
const merged = topojson.merge(statesTopo, keepGeoms);
const path = d3geo.geoPath();
const [[x0, y0], [x1, y1]] = path.bounds(merged);
const TARGET = { x0: 2, y0: 2, x1: 98, y1: 58 };
const srcW = x1 - x0, srcH = y1 - y0;
const targetW = TARGET.x1 - TARGET.x0, targetH = TARGET.y1 - TARGET.y0;
const scale = Math.min(targetW / srcW, targetH / srcH);
const drawW = srcW * scale, drawH = srcH * scale;
const offsetX = TARGET.x0 + (targetW - drawW) / 2;
const offsetY = TARGET.y0 + (targetH - drawH) / 2;
function project([x, y]) {
  return [offsetX + (x - x0) * scale, offsetY + (y - y0) * scale];
}

console.log("export const STATE_CENTROIDS: Record<string, { x: number; y: number }> = {");
for (const [abbr, fips] of Object.entries(STATE_FIPS)) {
  const geom = byFips.get(fips);
  if (!geom) {
    console.log(`  // MISSING FIPS ${fips} for ${abbr}`);
    continue;
  }
  const feature = topojson.feature(statesTopo, geom);
  const [cx, cy] = path.centroid(feature);
  const [px, py] = project([cx, cy]);
  console.log(`  ${abbr}: { x: ${Math.round(px * 10) / 10}, y: ${Math.round(py * 10) / 10} },`);
}
console.log("};");
