export type Difficulty = "easy" | "medium" | "hard";

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
}

export interface CommandDef {
  id: string;
  /** matched against the trimmed, lowercased, whitespace-collapsed input */
  match: (input: string) => boolean;
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
  tagline: string;
  briefing: string[];
  initialPrompt: string;
  motd: string[];
  objectives: ObjectiveDef[];
  commands: CommandDef[];
  /** progressive hints, shown in order regardless of which objective is stuck */
  hints: string[];
  debrief: string[];
}

export interface ChainDef {
  id: Difficulty;
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
  prompt: string;
  secured: boolean;
}

export interface ChainProgress {
  securedNodeIds: string[];
  flags: string[];
  completedAt?: number;
}

export type SaveData = Partial<Record<Difficulty, ChainProgress>>;
