import type { ChainDef, Difficulty } from "../types";
import { easyChain } from "./easy";
import { mediumChain } from "./medium";
import { hardChain } from "./hard";

export const chains: Record<Difficulty, ChainDef> = {
  easy: easyChain,
  medium: mediumChain,
  hard: hardChain,
};

export const difficultyOrder: Difficulty[] = ["easy", "medium", "hard"];

export const difficultyMeta: Record<Difficulty, { label: string; color: string; blurb: string }> = {
  easy: {
    label: "EASY",
    color: "var(--color-green)",
    blurb: "One target, one chain of mistakes. Good place to learn the loop.",
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
