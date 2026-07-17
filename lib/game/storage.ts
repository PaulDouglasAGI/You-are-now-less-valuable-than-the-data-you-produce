import type { SaveData, Difficulty } from "./types";

const KEY = "breachline.save.v1";

export function loadSave(): SaveData {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SaveData;
  } catch {
    return {};
  }
}

export function saveProgress(
  difficulty: Difficulty,
  securedNodeIds: string[],
  flags: string[],
  completedAt?: number,
) {
  if (typeof window === "undefined") return;
  const data = loadSave();
  data[difficulty] = { securedNodeIds, flags, completedAt };
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export function resetSave() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
