import type { SaveData, Difficulty, NotebookData } from "./types";

const KEY = "breachline.save.v1";
const NOTEBOOK_KEY = "breachline.notebook.v1";

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

/** the player's own notebook — separate from game progress, never cleared by resetSave() */
export function loadNotebook(): NotebookData {
  if (typeof window === "undefined") return { entries: [], text: "" };
  try {
    const raw = window.localStorage.getItem(NOTEBOOK_KEY);
    if (!raw) return { entries: [], text: "" };
    const parsed = JSON.parse(raw) as Partial<NotebookData>;
    return { entries: parsed.entries ?? [], text: parsed.text ?? "" };
  } catch {
    return { entries: [], text: "" };
  }
}

export function saveNotebook(data: NotebookData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(data));
}

export function resetNotebook() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(NOTEBOOK_KEY);
}
