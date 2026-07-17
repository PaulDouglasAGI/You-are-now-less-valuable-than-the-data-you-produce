import type { CommandDef, NodeDef, NodeRunState, TerminalLine } from "./types";

export function initNodeRunState(node: NodeDef, carryFlags: string[] = []): NodeRunState {
  return {
    completedObjectives: [],
    discoveredFlags: [...carryFlags],
    history: [
      { kind: "system", text: `connecting to ${node.ip} ...` },
      { kind: "system", text: `connection established. session type: shell` },
      ...node.motd.map((line): TerminalLine => ({ kind: "output", text: line })),
    ],
    hintsUsed: 0,
    prompt: node.initialPrompt,
    secured: false,
  };
}

/** normalizes input for matching: trim, collapse whitespace, lowercase */
export function normalize(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

/** convenience matcher builders for command defs */
export const match = {
  exact: (...phrases: string[]) => (input: string) => {
    const n = normalize(input);
    return phrases.some((p) => n === normalize(p));
  },
  startsWith: (...prefixes: string[]) => (input: string) => {
    const n = normalize(input);
    return prefixes.some((p) => n === normalize(p) || n.startsWith(normalize(p) + " "));
  },
  includesAll: (...tokens: string[]) => (input: string) => {
    const n = normalize(input);
    return tokens.every((t) => n.includes(normalize(t)));
  },
};

export interface ResolveResult {
  lines: TerminalLine[];
  nextState: NodeRunState;
  justCompletedObjective?: string;
  allObjectivesComplete: boolean;
}

function findCommand(node: NodeDef, input: string): CommandDef | undefined {
  return node.commands.find((c) => c.match(input));
}

export function resolveCommand(node: NodeDef, state: NodeRunState, rawInput: string): ResolveResult {
  const input = rawInput;
  const trimmed = input.trim();
  const lines: TerminalLine[] = [{ kind: "input", text: `${state.prompt} ${trimmed}` }];

  if (trimmed.length === 0) {
    return { lines, nextState: state, allObjectivesComplete: false };
  }

  const n = normalize(trimmed);

  // built-in global commands
  if (n === "help") {
    const reachable = node.commands.filter((c) => requirementsMet(c, state));
    lines.push({ kind: "output", text: "available commands:" });
    for (const c of reachable) lines.push({ kind: "output", text: `  ${c.help}` });
    lines.push({ kind: "output", text: "  hint            — get a nudge if you're stuck" });
    lines.push({ kind: "output", text: "  objectives       — show mission checklist" });
    lines.push({ kind: "output", text: "  clear            — clear the screen" });
    return { lines, nextState: state, allObjectivesComplete: false };
  }

  if (n === "objectives" || n === "obj") {
    lines.push({ kind: "output", text: `-- ${node.org} :: objectives --` });
    for (const o of node.objectives) {
      const done = state.completedObjectives.includes(o.id);
      const mark = done ? "[x]" : "[ ]";
      lines.push({
        kind: done ? "success" : "output",
        text: `  ${mark} ${o.label}  (${o.tactic})`,
      });
    }
    return { lines, nextState: state, allObjectivesComplete: false };
  }

  if (n === "hint") {
    const idx = Math.min(state.hintsUsed, node.hints.length - 1);
    const hintText = node.hints[idx] ?? "no further hints available — trust your recon.";
    lines.push({ kind: "warn", text: `hint: ${hintText}` });
    const nextState: NodeRunState = {
      ...state,
      hintsUsed: Math.min(state.hintsUsed + 1, node.hints.length),
    };
    return { lines, nextState, allObjectivesComplete: false };
  }

  if (n === "clear") {
    return {
      lines: [],
      nextState: { ...state, history: [] },
      allObjectivesComplete: false,
    };
  }

  const cmd = findCommand(node, trimmed);

  if (!cmd) {
    lines.push({ kind: "error", text: `command not recognized: ${trimmed.split(" ")[0]}. try 'help'.` });
    return { lines, nextState: state, allObjectivesComplete: false };
  }

  if (!requirementsMet(cmd, state)) {
    const denied = cmd.deniedOutput ?? ["access denied or target unreachable at this stage."];
    for (const l of denied) lines.push({ kind: "error", text: l });
    return { lines, nextState: state, allObjectivesComplete: false };
  }

  const outcome = cmd.run(trimmed);
  const tone = outcome.tone ?? "output";
  for (const l of outcome.output) lines.push({ kind: tone, text: l });

  const newFlags = new Set(state.discoveredFlags);
  for (const f of outcome.setsFlags ?? []) newFlags.add(f);

  const newObjectives = new Set(state.completedObjectives);
  let justCompletedObjective: string | undefined;
  if (outcome.completesObjective && !newObjectives.has(outcome.completesObjective)) {
    newObjectives.add(outcome.completesObjective);
    justCompletedObjective = outcome.completesObjective;
    const obj = node.objectives.find((o) => o.id === outcome.completesObjective);
    if (obj) {
      lines.push({ kind: "success", text: `[+] objective complete: ${obj.label}` });
    }
  }

  const nextState: NodeRunState = {
    ...state,
    discoveredFlags: Array.from(newFlags),
    completedObjectives: Array.from(newObjectives),
    prompt: outcome.promptAfter ?? state.prompt,
  };

  const allObjectivesComplete = node.objectives.every((o) => nextState.completedObjectives.includes(o.id));

  return { lines, nextState, justCompletedObjective, allObjectivesComplete };
}

function requirementsMet(cmd: CommandDef, state: NodeRunState): boolean {
  const objectivesOk = (cmd.requiresObjectives ?? []).every((id) => state.completedObjectives.includes(id));
  const flagsOk = (cmd.requiresFlags ?? []).every((f) => state.discoveredFlags.includes(f));
  return objectivesOk && flagsOk;
}
