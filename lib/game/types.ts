export type Difficulty = "easy" | "medium" | "hard" | "ghost" | "campaign";

export type TerminalLine =
  | { kind: "input"; text: string }
  | { kind: "output"; text: string }
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | { kind: "warn"; text: string }
  | { kind: "system"; text: string };

/** Result of a resolved command, applied to node run state. */
export interface CommandOutcome {
  output: string[];
  setsFlags?: string[];
  completesObjective?: string;
  tone?: "output" | "success" | "warn" | "error";
  /** if set, the shell prompt changes for the rest of this node run (e.g. after a pivot) */
  promptAfter?: string;
  /** if set, a one-line finding worth carrying forward — logged to the player's notebook (creds, keys, endpoints, IDs) */
  note?: string;
}

export interface CommandDef {
  id: string;
  /** matched against the trimmed, lowercased, whitespace-collapsed input */
  match: (input: string) => boolean;
  /** the base tool name this command represents (curl, nmap, ssh, ...), used only to produce a smarter "wrong target" message when the tool is recognized but the specific command doesn't match */
  tool?: string;
  /** shown in `help` when the command is currently reachable */
  help: string;
  /** objective ids that must already be complete for this command to work */
  requiresObjectives?: string[];
  /** discovered flags that must be present for this command to work */
  requiresFlags?: string[];
  /** shown instead of the real output when requirements aren't met */
  deniedOutput?: string[];
  run: (input: string) => CommandOutcome;
}

export interface ObjectiveDef {
  id: string;
  label: string;
  /** MITRE ATT&CK-flavored tactic tag shown next to the objective, purely educational labeling */
  tactic: string;
  requires?: string[];
}

export interface NodeDef {
  id: string;
  org: string;
  city: string;
  state: string;
  /** position on the stylized map, in percent of the map viewBox */
  coords: { x: number; y: number };
  ip: string;
  /** exact canonical secret literal(s) already present in this file's commands/briefing/hints,
   *  opted into per-run randomization. Omit entirely for nodes with no credential step — IP
   *  randomization still applies to those for free. */
  randomizableSecrets?: string[];
  tagline: string;
  briefing: string[];
  initialPrompt: string;
  motd: string[];
  objectives: ObjectiveDef[];
  commands: CommandDef[];
  /** progressive hints, shown in order regardless of which objective is stuck */
  hints: string[];
  debrief: string[];
  /** if set, any command referencing a host outside the engagement's rules of engagement is flagged as a scope violation instead of being resolved normally — fires regardless of tool, doesn't block progress, costs score */
  outOfScope?: { match: (input: string) => boolean; response: string[] };
  /** campaign-only: alternate debrief text keyed by whichever ending flag got set on this run; falls back to `debrief` when unset or when no key matches */
  debriefVariants?: Record<string, string[]>;
}

export interface ChainDef {
  /** unique mission id, e.g. "easy-1" — stable, used as the save-data key */
  id: string;
  difficulty: Difficulty;
  /** 1-based position within its difficulty tier; missions unlock in this order */
  order: number;
  /** base score value for the career scoring model, scaled by effort/difficulty */
  points: number;
  title: string;
  codename: string;
  summary: string;
  briefing: string[];
  debrief: string[];
  nodes: NodeDef[];
}

export interface NodeRunState {
  completedObjectives: string[];
  discoveredFlags: string[];
  history: TerminalLine[];
  hintsUsed: number;
  /** count of commands touching a host outside the engagement's rules of engagement — separate from hintsUsed, never merged into it */
  scopeViolations: number;
  prompt: string;
  secured: boolean;
}

export interface ChainProgress {
  securedNodeIds: string[];
  flags: string[];
  /** total hints used across every node in this mission's run — feeds the scoring model */
  hintsUsed: number;
  /** total scope violations across every node in this mission's run — a separate scoring penalty, distinct from hints */
  scopeViolations: number;
  completedAt?: number;
}

/** keyed by mission id (ChainDef.id), not by difficulty — each mission tracks its own progress */
export type SaveData = Partial<Record<string, ChainProgress>>;

/** campaign-only narrative interstitial, shown between episodes on the "transmission" screen */
export interface TransmissionDef {
  /** mission id this transmission plays after (or "campaign-start" for the cold open before episode 1) */
  after: string;
  /** "chatlog" for the recurring IRC-style unbank channel; "dossier" for the finale's leaked-document epilogue */
  format: "chatlog" | "dossier";
  channel?: string;
  lines: { handle: string; text: string; timestamp?: string }[];
  /** finale-only: alternate closing lines keyed by whichever ending flag got set, checked before falling back to `lines` */
  variantLines?: Record<string, { handle: string; text: string; timestamp?: string }[]>;
}

export interface NotebookEntry {
  id: string;
  source: string;
  text: string;
  ts: number;
}

export interface NotebookData {
  entries: NotebookEntry[];
  text: string;
}

/** A single timed Exam Day run — wall-clock start/end, a snapshot of mission progress taken at
 *  the moment the exam started (so pre-existing progress doesn't retroactively count), and the
 *  graded result once the clock runs out or the player submits early. */
export interface ExamAttempt {
  startedAt: number;
  endsAt: number;
  startSnapshot: Partial<Record<string, { securedNodeIds: string[]; flags: string[] }>>;
  result?: {
    endedAt: number;
    pointsEarned: number;
    pointsTotal: number;
    passed: boolean;
    rowScores: Record<string, number>;
  };
}

/** Training Mode progress — a flat set of "toolId:drillId" strings, separate from mission SaveData. */
export interface TrainingProgress {
  completedDrillIds: string[];
}

/** Quiz Mode's difficulty ladder — doubles as the rank a player has earned. */
export type QuizTier = "easy" | "medium" | "hard" | "elite" | "world-class";

/** Recall-knowledge domains a working pentester/analyst is expected to have cold — deliberately
 *  distinct from Training Mode (tool syntax) and missions (applied technique in a scenario). */
export type QuizCategory =
  | "networking"
  | "linux"
  | "windows-ad"
  | "web"
  | "binexp"
  | "crypto"
  | "cloud"
  | "methodology"
  | "defense";

export interface QuizQuestion {
  id: string;
  category: QuizCategory;
  tier: QuizTier;
  prompt: string;
  choices: string[];
  correctIndex: number;
  /** shown after answering regardless of correctness — the actual teaching moment */
  explanation: string;
}

/** Quiz Mode progress — best score per "tier:category" cell (category "all" = the mixed quiz for
 *  that tier), plus the tiers cleared at >=70% on their mixed quiz, which is the rank ladder. */
export interface QuizProgress {
  bestScores: Record<string, { correct: number; total: number; at: number }>;
  clearedTiers: QuizTier[];
}

export type MethodologyTagColor = "green" | "blue" | "red" | "yellow";

export interface MethodologyTag {
  label: string;
  color: MethodologyTagColor;
}

export interface MethodologyCommandBlock {
  label: string;
  /** each entry is one rendered line; a leading "#" marks a dimmed comment line, {{TOKEN}} marks a highlighted variable span */
  lines: string[];
}

export type MethodologyNoteTone = "info" | "warning" | "danger";

export interface MethodologyNote {
  tone: MethodologyNoteTone;
  title: string;
  body: string;
}

export interface MethodologySubsection {
  heading: string;
  steps?: string[];
  commandBlocks?: MethodologyCommandBlock[];
}

export interface MethodologyCard {
  id: string;
  /** source-style numbering, e.g. "01.1", "05.0" — purely cosmetic */
  number: string;
  title: string;
  tags: MethodologyTag[];
  steps?: string[];
  commandBlocks?: MethodologyCommandBlock[];
  notes?: MethodologyNote[];
  subsections?: MethodologySubsection[];
  /** red left-border treatment for the handful of "read this first" strategy cards */
  critical?: boolean;
}

export interface MethodologyPhase {
  id: string;
  /** short nav label, e.g. "01 · RECON" */
  navLabel: string;
  title: string;
  group: "core" | "advanced";
  cards: MethodologyCard[];
}

export interface MindsetCard {
  heading: string;
  items: string[];
}

export interface ExamPointRow {
  id: string;
  name: string;
  maxPoints: number;
  partial?: { label: string; points: number };
  full: { label: string; points: number };
}

export interface MethodologyData {
  phases: MethodologyPhase[];
  examDay: {
    caveat: string;
    durationHours: number;
    pointsToPass: number;
    pointsTotal: number;
    reportWindowHours: number;
    pointRows: ExamPointRow[];
    mindset: MindsetCard[];
  };
}
