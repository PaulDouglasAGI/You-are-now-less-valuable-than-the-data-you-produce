import type { NodeDef } from "./types";

/**
 * A per-node-visit substitution mapping between the mission's canonical (source-code)
 * IP/credential values and this visit's randomized versions. Generated fresh every time
 * a node is (re-)entered — see Game.tsx's handleSelectNode — so replaying a walkthrough's
 * exact literal values stops working, without touching any mission content file's actual
 * match/run logic.
 */
export interface RunRandomization {
  /** canonical target IP -> this visit's randomized IP (host octet only changes) */
  ipMap: Record<string, string>;
  /** canonical secret literal -> this visit's randomized secret (only for opted-in nodes) */
  secretMap: Record<string, string>;
}

/** Randomizes just the last octet of an IPv4 string, preserving the /24 prefix (so a
 *  TEST-NET-3 target stays visibly TEST-NET-3, an internal 10.x box stays internal-looking,
 *  etc). Avoids the network/broadcast octets and the original value. */
export function randomizeIpHostOctet(canonicalIp: string): string {
  const parts = canonicalIp.split(".");
  if (parts.length !== 4) return canonicalIp;
  const original = parseInt(parts[3], 10);
  let candidate: number;
  do {
    candidate = 2 + Math.floor(Math.random() * 252); // 2..253
  } while (candidate === original);
  return `${parts[0]}.${parts[1]}.${parts[2]}.${candidate}`;
}

const RANDOM_WORDS = [
  "Autumn",
  "Winter",
  "Spring",
  "Summer",
  "Harbor",
  "Cinder",
  "Solstice",
  "Meridian",
  "Vantage",
  "Amber",
  "Copper",
  "Denim",
];

/** Regenerates a same-shape secret ("Word" + 2-4 digit year + trailing punctuation, the
 *  overwhelmingly common pattern across this game's credentials). Falls back to a
 *  suffixed variant for secrets that don't match that shape, so every opted-in secret is
 *  still guaranteed to differ from canonical and round-trip exactly through find/replace. */
function randomizeSecret(canonical: string): string {
  const m = canonical.match(/^([A-Za-z]+)(\d{2,4})([^A-Za-z0-9]*)$/);
  if (!m) return `${canonical}-${Math.floor(1000 + Math.random() * 9000)}`;
  const [, , , suffix] = m;
  const word = RANDOM_WORDS[Math.floor(Math.random() * RANDOM_WORDS.length)];
  const year = String(2016 + Math.floor(Math.random() * 9));
  return `${word}${year}${suffix}`;
}

/** Generates ONE substitution mapping for a single node-visit. Call once per visit — never
 *  memoized/cached, so re-visiting a node gets a new mapping. */
export function generateRunRandomization(node: NodeDef): RunRandomization {
  const ipMap: Record<string, string> = { [node.ip]: randomizeIpHostOctet(node.ip) };
  const secretMap: Record<string, string> = {};
  for (const secret of node.randomizableSecrets ?? []) {
    secretMap[secret] = randomizeSecret(secret);
  }
  return { ipMap, secretMap };
}

function allPairs(r: RunRandomization): [string, string][] {
  return [...Object.entries(r.ipMap), ...Object.entries(r.secretMap)];
}

/** OUTBOUND: engine-generated text (canonical) -> what the player sees (randomized). */
export function applyRandomization(text: string, r: RunRandomization): string {
  let out = text;
  for (const [canonical, randomized] of allPairs(r)) out = out.split(canonical).join(randomized);
  return out;
}

/** INBOUND: player's typed text (randomized) -> canonical text, before it reaches resolveCommand(). */
export function reverseRandomization(input: string, r: RunRandomization): string {
  let out = input;
  for (const [canonical, randomized] of allPairs(r)) out = out.split(randomized).join(canonical);
  return out;
}
