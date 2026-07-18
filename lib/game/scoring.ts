import type { ChainDef, ChainProgress, SaveData } from "./types";
import { missionsById } from "./chains";

export const HINT_PENALTY = 0.15;
export const SCOPE_VIOLATION_PENALTY = 0.15;
export const MIN_SCORE_FLOOR = 0.4;

export type Rank =
  | "Recruit"
  | "Trainee Analyst"
  | "Associate Operator"
  | "Operator"
  | "Senior Operator"
  | "Principal Operator";

export interface TacticStat {
  tactic: string;
  earned: number;
  possible: number;
}

export interface MissionScore {
  id: string;
  title: string;
  difficulty: ChainDef["difficulty"];
  points: number;
  earnedPoints: number;
  hintsUsed: number;
  scopeViolations: number;
  secured: boolean;
  completedAt?: number;
}

export interface CareerScore {
  totalPoints: number;
  maxPoints: number;
  percent: number;
  rank: Rank;
  tacticBreakdown: TacticStat[];
  perMission: MissionScore[];
}

/** hints and scope violations each cost 15% of a mission's value, floored at 40% so neither ever zeroes it out — tracked separately, since a scope violation is a rules-of-engagement breach, not an assisted step */
export function missionEarnedPoints(mission: ChainDef, progress: ChainProgress | undefined): number {
  if (!progress?.completedAt) return 0;
  const multiplier = Math.max(
    MIN_SCORE_FLOOR,
    1 - HINT_PENALTY * progress.hintsUsed - SCOPE_VIOLATION_PENALTY * (progress.scopeViolations ?? 0),
  );
  return mission.points * multiplier;
}

function rankFor(percent: number): Rank {
  if (percent <= 0) return "Recruit";
  if (percent <= 30) return "Trainee Analyst";
  if (percent <= 55) return "Associate Operator";
  if (percent <= 75) return "Operator";
  if (percent <= 90) return "Senior Operator";
  return "Principal Operator";
}

export function computeCareerScore(save: SaveData): CareerScore {
  const missions = Object.values(missionsById);
  const tacticMap = new Map<string, TacticStat>();
  const perMission: MissionScore[] = [];

  let totalPoints = 0;
  let maxPoints = 0;

  for (const mission of missions) {
    const progress = save[mission.id];
    const earned = missionEarnedPoints(mission, progress);
    totalPoints += earned;
    maxPoints += mission.points;

    perMission.push({
      id: mission.id,
      title: mission.title,
      difficulty: mission.difficulty,
      points: mission.points,
      earnedPoints: earned,
      hintsUsed: progress?.hintsUsed ?? 0,
      scopeViolations: progress?.scopeViolations ?? 0,
      secured: Boolean(progress?.completedAt),
      completedAt: progress?.completedAt,
    });

    const objectives = mission.nodes.flatMap((n) => n.objectives);
    if (objectives.length === 0) continue;
    const possiblePerObjective = mission.points / objectives.length;
    const earnedPerObjective = earned / objectives.length;

    for (const objective of objectives) {
      const stat = tacticMap.get(objective.tactic) ?? { tactic: objective.tactic, earned: 0, possible: 0 };
      stat.earned += earnedPerObjective;
      stat.possible += possiblePerObjective;
      tacticMap.set(objective.tactic, stat);
    }
  }

  const percent = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  return {
    totalPoints: Math.round(totalPoints),
    maxPoints,
    percent,
    rank: rankFor(percent),
    tacticBreakdown: Array.from(tacticMap.values()).sort((a, b) => b.possible - a.possible),
    perMission,
  };
}
