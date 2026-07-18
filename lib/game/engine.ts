import type { CommandDef, CommandOutcome, NodeDef, NodeRunState, TerminalLine } from "./types";

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

/** convenience matcher builders for command defs (used for the handful of pseudo-commands that aren't real CLI tools, e.g. `login`, `secure`) */
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

/**
 * Declarative command builder for real CLI-tool invocations (curl, nmap, ssh, cat, ...).
 *
 * A command matches when the input's first word equals `tool` (so flag order, quoting,
 * extra flags like -s/-v/-L, http vs https, trailing slashes etc. never break a match),
 * every string in `requires` appears somewhere in the input, and no string in `forbids`
 * does. `forbids` is what keeps two commands against the same tool from both matching a
 * more specific one's input (e.g. a directory listing vs a specific file inside it) —
 * order in the commands array never matters.
 */
export function cmd(opts: {
  id: string;
  tool: string;
  requires?: string[];
  forbids?: string[];
  help: string;
  requiresObjectives?: string[];
  requiresFlags?: string[];
  deniedOutput?: string[];
  run: (input: string) => CommandOutcome;
}): CommandDef {
  const requires = (opts.requires ?? []).map(normalize);
  const forbids = (opts.forbids ?? []).map(normalize);
  const tool = normalize(opts.tool);
  return {
    id: opts.id,
    tool,
    help: opts.help,
    requiresObjectives: opts.requiresObjectives,
    requiresFlags: opts.requiresFlags,
    deniedOutput: opts.deniedOutput,
    run: opts.run,
    match: (input) => {
      const n = normalize(input);
      const firstToken = n.split(" ")[0];
      if (firstToken !== tool) return false;
      if (!requires.every((r) => n.includes(r))) return false;
      if (forbids.some((f) => n.includes(f))) return false;
      return true;
    },
  };
}

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

  const matched = findCommand(node, trimmed);

  if (!matched) {
    const firstToken = n.split(" ")[0];
    const toolKnown = node.commands.some((c) => c.tool === firstToken);
    if (toolKnown) {
      lines.push({
        kind: "error",
        text: `${firstToken}: nothing useful there yet — wrong target, or you're missing a piece from an earlier step. try 'hint'.`,
      });
    } else {
      lines.push({ kind: "error", text: `command not recognized: ${firstToken}. try 'help'.` });
    }
    return { lines, nextState: state, allObjectivesComplete: false };
  }
  const cmd = matched;

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
