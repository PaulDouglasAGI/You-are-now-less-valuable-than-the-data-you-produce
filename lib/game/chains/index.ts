import type { ChainDef, Difficulty } from "../types";
import { easyMissions } from "./easy";
import { mediumChain } from "./medium";
import { hardChain } from "./hard";

export const missionsByDifficulty: Record<Difficulty, ChainDef[]> = {
  easy: easyMissions,
  medium: [mediumChain],
  hard: [hardChain],
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
    blurb: "Two organizations, one shared cloud provider. Trust boundaries start to matter.",
  },
  hard: {
    label: "HARD",
    color: "var(--color-red)",
    blurb: "Three organizations, full methodology: foothold, privesc, lateral movement, pivot. If you can finish this clean, you're basically OSCP-ready.",
  },
};
