import { normalize } from "@/lib/game/engine";
import type { TrainingDrill } from "@/lib/game/training";

/** Checks a typed drill answer against its accepted requires/forbids token lists. */
export function checkDrillAnswer(input: string, drill: TrainingDrill): boolean {
  const n = normalize(input);
  if (!drill.accepted.requires.every((r) => n.includes(normalize(r)))) return false;
  if (drill.accepted.forbids?.some((f) => n.includes(normalize(f)))) return false;
  return true;
}
