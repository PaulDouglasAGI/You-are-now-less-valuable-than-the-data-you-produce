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

function currentUser(prompt: string): string {
  const m = prompt.match(/^([a-zA-Z0-9_.-]+)@/);
  return m ? m[1] : "op";
}

function currentHost(prompt: string): string {
  const m = prompt.match(/@([a-zA-Z0-9_.-]+):/);
  return m ? m[1] : "breachline";
}

function uidFor(user: string): number {
  if (user === "root") return 0;
  if (user === "www-data") return 33;
  if (user.startsWith("svc")) return 999;
  return 1000;
}

function homeFor(user: string): string {
  if (user === "root") return "/root";
  if (user === "www-data") return "/var/www/html";
  return `/home/${user}`;
}

/**
 * Realistic-but-generic responses for common real tools that aren't specific to any
 * objective in the current node. Without this, trying `ssh` on a box that shows port 22
 * open in nmap (very natural, and realistic — plenty of real targets have SSH open
 * without it being your way in) hits a bare "command not recognized," which breaks the
 * whole premise that this is a real shell. A real terminal recognizes the command and
 * fails with a real error; it doesn't pretend the tool doesn't exist.
 */
interface GenericFallback {
  output: string[];
  tone: "error" | "output" | "warn";
}

function genericToolFallback(firstToken: string, trimmed: string, state: NodeRunState): GenericFallback | null {
  const user = currentUser(state.prompt);
  const host = currentHost(state.prompt);
  const targetMatch = trimmed.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
  const target = targetMatch ? targetMatch[1] : "the target";
  const lower = trimmed.toLowerCase();
  const args = trimmed.trim().split(/\s+/).slice(1);
  const lastArg = args[args.length - 1];

  switch (firstToken) {
    case "ssh":
      return { tone: "error", output: ["Permission denied (publickey,password)."] };
    case "telnet":
      return { tone: "error", output: [`telnet: Unable to connect to remote host: Connection refused`] };
    case "ftp":
    case "sftp":
      return { tone: "error", output: [`ftp: connect: Connection refused`] };
    case "nc":
    case "netcat":
      return { tone: "error", output: [`(UNKNOWN) [${target}] connect failed: Connection refused`] };
    case "whoami":
      return { tone: "output", output: [user] };
    case "id":
      return {
        tone: "output",
        output: [`uid=${uidFor(user)}(${user}) gid=${uidFor(user)}(${user}) groups=${uidFor(user)}(${user})`],
      };
    case "pwd":
      return { tone: "output", output: [homeFor(user)] };
    case "hostname":
      return { tone: "output", output: [host] };
    case "uname":
      return {
        tone: "output",
        output: lower.includes("-a")
          ? [`Linux ${host} 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux`]
          : ["Linux"],
      };
    case "ping":
      return {
        tone: "output",
        output: [
          `PING ${target} 56(84) bytes of data.`,
          `64 bytes from ${target}: icmp_seq=1 ttl=57 time=28.4 ms`,
          `--- ${target} ping statistics ---`,
          `1 packets transmitted, 1 received, 0% packet loss`,
        ],
      };
    case "ls":
      return { tone: "output", output: ["total 0"] };

    case "wget":
      return {
        tone: "error",
        output: [
          `Resolving ${target} (${target})... ${target}`,
          `Connecting to ${target}:80... connected.`,
          "HTTP request sent, awaiting response... 403 Forbidden",
          "ERROR 403: Forbidden.",
        ],
      };
    case "dig":
      return {
        tone: "error",
        output: [
          "; <<>> DiG 9.18.24 <<>>",
          ";; global options: +cmd",
          ";; connection timed out; no servers could be reached",
        ],
      };
    case "nslookup":
    case "host":
      return { tone: "error", output: [";; connection timed out; no servers could be reached"] };
    case "traceroute":
    case "tracert":
      return {
        tone: "output",
        output: [
          `traceroute to ${target} (${target}), 30 hops max, 60 byte packets`,
          " 1  * * *",
          " 2  * * *",
          " 3  * * *",
        ],
      };
    case "netstat":
    case "ss":
      return {
        tone: "output",
        output: [
          "Active Internet connections (only servers)",
          "Proto Recv-Q Send-Q Local Address           Foreign Address         State",
        ],
      };
    case "ip":
    case "ifconfig":
      return {
        tone: "output",
        output: [
          "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500",
          "        inet 10.10.14.7  netmask 255.255.255.0  broadcast 10.10.14.255",
          "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536",
          "        inet 127.0.0.1  netmask 255.0.0.0",
        ],
      };
    case "arp":
      return {
        tone: "output",
        output: [
          "Address       HWtype  HWaddress           Flags Mask   Iface",
          "10.10.14.1    ether   02:42:ac:11:00:01   C            eth0",
        ],
      };

    case "nikto":
      return {
        tone: "output",
        output: [
          "- Nikto v2.5.0",
          "---------------------------------------------------------------------------",
          `+ Target IP:          ${target}`,
          `+ Target Hostname:    ${target}`,
          "+ Target Port:        80",
          "---------------------------------------------------------------------------",
          "+ Server may leak inodes via ETags.",
          "+ The X-Content-Type-Options header is not set.",
          "+ 0 host(s) tested",
        ],
      };
    case "dirb":
    case "dirbuster":
      return {
        tone: "output",
        output: [
          "DIRB v2.22",
          "By The Dark Raver",
          "---------------------------",
          `URL_BASE: http://${target}/`,
          "---------------------------",
          `+ http://${target}/index.html (CODE:200|SIZE:612)`,
          "---------------------------",
          "DOWNLOADED: 4612 - FOUND: 1",
        ],
      };
    case "whatweb":
      return { tone: "output", output: [`http://${target} [200 OK] Country[RESERVED][ZZ], IP[${target}]`] };
    case "wpscan":
      return {
        tone: "output",
        output: [`[+] URL: http://${target}/`, "[!] The remote website is up, but does not seem to be running WordPress."],
      };

    case "enum4linux":
    case "enum4linux-ng":
      return {
        tone: "error",
        output: ["Starting enum4linux v0.9.5", `[-] Could not connect to ${target} on 445/tcp — no SMB service detected.`],
      };
    case "smbclient":
      return { tone: "error", output: ["protocol negotiation failed: NT_STATUS_CONNECTION_REFUSED"] };

    case "hydra":
      return {
        tone: "output",
        output: [
          "Hydra v9.5 (c) 2023 by van Hauser/THC - for legal purposes only",
          "[DATA] max 16 tasks per 1 server, overall 16 tasks, 100 login tries",
          `[STATUS] attack finished for ${target} (waiting for children to complete tests)`,
          "1 of 1 target completed, 0 valid passwords found",
        ],
      };
    case "john":
      return { tone: "error", output: ["Using default input encoding: UTF-8", "No password hashes loaded (see FAQ)"] };
    case "hashcat":
      return { tone: "error", output: ["No hashes loaded."] };

    case "msfconsole":
      return {
        tone: "warn",
        output: [
          "[*] Starting the Metasploit Framework console...",
          "note: this environment models exploitation as discrete recon/exploit commands, not an",
          "interactive multi-stage console — there's no msf6 session to attach to here. work the",
          "chain one command at a time instead.",
        ],
      };

    case "sudo":
      return lower.includes("-l")
        ? { tone: "error", output: [`Sorry, user ${user} may not run sudo on ${host}.`] }
        : { tone: "error", output: [`${user} is not in the sudoers file.  This incident will be reported.`] };
    case "crontab":
      return { tone: "output", output: [`no crontab for ${user}`] };
    case "ps":
      return {
        tone: "output",
        output: ["  PID TTY          TIME CMD", "    1 pts/0    00:00:00 bash", "   42 pts/0    00:00:00 ps"],
      };
    case "env":
      return {
        tone: "output",
        output: [
          "SHELL=/bin/bash",
          `USER=${user}`,
          `HOME=${homeFor(user)}`,
          "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          "LANG=en_US.UTF-8",
        ],
      };
    case "which": {
      const known = ["bash", "python3", "curl", "nc", "ssh", "nmap", "cat", "ls", "grep", "find", "vi", "vim", "nano", "gcc", "perl"];
      const wanted = lastArg?.toLowerCase();
      if (wanted && known.includes(wanted)) return { tone: "output", output: [`/usr/bin/${wanted}`] };
      return {
        tone: "error",
        output: [`which: no ${wanted ?? ""} in (/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin)`],
      };
    }
    case "man":
      return lastArg
        ? { tone: "error", output: [`No manual entry for ${lastArg}`] }
        : { tone: "output", output: ["What manual page do you want?", "For example, try 'man man'."] };
    case "tcpdump":
      return {
        tone: "error",
        output: ["tcpdump: eth0: You don't have permission to capture on that device", "(socket: Operation not permitted)"],
      };

    case "history": {
      const inputs = state.history
        .filter((l) => l.kind === "input")
        .map((l) => l.text.replace(/^.*?[$#]\s?/, ""));
      return { tone: "output", output: inputs.map((t, i) => `  ${i + 1}  ${t}`) };
    }

    case "cd":
      return { tone: "output", output: [] };
    case "mkdir":
    case "touch":
    case "rm":
      return args.length > 0
        ? { tone: "output", output: [] }
        : { tone: "error", output: [`${firstToken}: missing operand`, `Try '${firstToken} --help' for more information.`] };
    case "cp":
    case "mv":
      return args.length >= 2
        ? { tone: "output", output: [] }
        : { tone: "error", output: [`${firstToken}: missing file operand`, `Try '${firstToken} --help' for more information.`] };
    case "echo":
      return { tone: "output", output: [args.join(" ").replace(/^["']|["']$/g, "")] };
    case "grep":
      return lastArg
        ? { tone: "error", output: [`grep: ${lastArg}: No such file or directory`] }
        : { tone: "output", output: [] };
    case "strings":
      return lastArg
        ? { tone: "error", output: [`strings: '${lastArg}': No such file or directory`] }
        : { tone: "error", output: ["strings: no input files"] };
    case "file":
      return lastArg
        ? { tone: "error", output: [`${lastArg}: cannot open (No such file or directory)`] }
        : { tone: "error", output: ["file: missing operand"] };

    case "python3":
    case "python":
      return args.length > 0
        ? { tone: "output", output: [] }
        : {
            tone: "warn",
            output: [
              "Python 3.10.12 (main, Nov  6 2024, 20:22:13)",
              "[GCC 11.4.0] on linux",
              'Type "help", "copyright", "credits" or "license" for more information.',
              ">>>",
              "note: nested interactive interpreters aren't modeled here — try a specific one-liner instead.",
            ],
          };
    case "perl":
      return args.length > 0
        ? { tone: "output", output: [] }
        : { tone: "warn", output: ["note: an interactive perl session isn't modeled here — try a specific one-liner instead."] };

    default:
      return null;
  }
}

export interface ResolveResult {
  lines: TerminalLine[];
  nextState: NodeRunState;
  justCompletedObjective?: string;
  allObjectivesComplete: boolean;
  /** a finding worth logging to the player's notebook, if this command surfaced one */
  note?: string;
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
    const genericOutput = toolKnown ? null : genericToolFallback(firstToken, trimmed, state);
    if (toolKnown) {
      lines.push({
        kind: "error",
        text: `${firstToken}: nothing useful there yet — wrong target, or you're missing a piece from an earlier step. try 'hint'.`,
      });
    } else if (genericOutput) {
      for (const l of genericOutput.output) lines.push({ kind: genericOutput.tone, text: l });
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

  return { lines, nextState, justCompletedObjective, allObjectivesComplete, note: outcome.note };
}

function requirementsMet(cmd: CommandDef, state: NodeRunState): boolean {
  const objectivesOk = (cmd.requiresObjectives ?? []).every((id) => state.completedObjectives.includes(id));
  const flagsOk = (cmd.requiresFlags ?? []).every((f) => state.discoveredFlags.includes(f));
  return objectivesOk && flagsOk;
}
