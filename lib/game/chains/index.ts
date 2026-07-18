import type { ChainDef, Difficulty } from "../types";
import { easyMissions } from "./easy";
import { mediumMissions } from "./medium";
import { hardMissions } from "./hard";

export const missionsByDifficulty: Record<Difficulty, ChainDef[]> = {
  easy: easyMissions,
  medium: mediumMissions,
  hard: hardMissions,
};

export const missionsById: Record<string, ChainDef> = Object.fromEntries(
  Object.values(missionsByDifficulty)
    .flat()
    .map((m) => [m.id, m]),
);

export const difficultyOrder: Difficulty[] = ["easy", "medium", "hard"];

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
};
