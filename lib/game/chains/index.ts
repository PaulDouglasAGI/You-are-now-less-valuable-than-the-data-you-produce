import type { ChainDef, Difficulty } from "../types";
import { easyMissions } from "./easy";
import { mediumMissions } from "./medium";
import { hardMissions } from "./hard";
import { ghostMissions } from "./ghost";

export const missionsByDifficulty: Record<Difficulty, ChainDef[]> = {
  easy: easyMissions,
  medium: mediumMissions,
  hard: hardMissions,
  ghost: ghostMissions,
};

export const missionsById: Record<string, ChainDef> = Object.fromEntries(
  Object.values(missionsByDifficulty)
    .flat()
    .map((m) => [m.id, m]),
);

export const difficultyOrder: Difficulty[] = ["easy", "medium", "hard", "ghost"];

export const difficultyMeta: Record<Difficulty, { label: string; color: string; blurb: string }> = {
  easy: {
    label: "EASY",
    color: "var(--color-green)",
    blurb: "Short, single-technique levels. Good place to learn the loop before the chains get longer.",
  },
  medium: {
    label: "MEDIUM",
    color: "var(--color-amber)",
    blurb: "Ten single-org web and cloud vulns — SSRF, deserialization, exposed container APIs — building up to two chains across a shared cloud marketplace. Trust boundaries start to matter.",
  },
  hard: {
    label: "HARD",
    color: "var(--color-red)",
    blurb: "Level 1 chains three organizations through full methodology. Levels 2+ drop the story — standalone boxes, next to no hints, get root and prove it. About as close to the real exam as a browser tab gets.",
  },
  ghost: {
    label: "GHOST",
    color: "var(--color-violet)",
    blurb: "No clean signal. Recon has real noise, obvious payloads get blocked, and the syntax has to be exact — no `help` or `hint` here is ever going to hand you the working command. Levels 3-4 add memory corruption and a full Active Directory kill chain; level 5 hands you an unverified scanner report and a host that isn't yours to touch. Levels 6-8 go deeper into binary exploitation — a ROP chain against a non-executable stack, a format-string read/write primitive, and a heap use-after-free. Level 9 runs a second, distinct Active Directory chain built entirely on ACL abuse and DCSync. Levels 10-11 leave memory corruption behind for cryptographic and API-layer bugs — a JWT algorithm-confusion forgery and a GraphQL schema that told you more than the client app ever did. This is the only tier that actually tests unguided discovery and professional judgment.",
  },
};
