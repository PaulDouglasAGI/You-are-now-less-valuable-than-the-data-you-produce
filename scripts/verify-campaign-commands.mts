// Content-QA tool: confirms every campaign command's own `help` text (the exact syntax shown
// to the player) resolves back to that same command as the first match — catches the class of
// bug where one command's loose `requires`/`forbids` shadows a more specific sibling command.
// Run with `npx tsx scripts/verify-campaign-commands.mts`. The one expected exception is any
// command (like a TOCTOU race) whose `help` is intentionally descriptive prose, not literal
// syntax — those are documented inline at the call site.
import { campaignMissions } from "../lib/game/chains/campaign/index";
import type { CommandDef, NodeDef } from "../lib/game/types";

function findCommand(commands: CommandDef[], input: string): CommandDef | undefined {
  return commands.find((c) => c.match(input));
}

let problems = 0;

function placeholderFill(help: string, node: NodeDef): string {
  // help text uses <ip> as a placeholder in some strings; real commands embed the literal IP directly.
  // some help strings also have a trailing "  — comment" a player wouldn't actually type.
  const withIp = help.replace(/<ip>/g, node.ip);
  return withIp.split(/\s+—\s+/)[0].trim();
}

for (const chain of campaignMissions) {
  for (const node of chain.nodes) {
    for (const c of node.commands) {
      if (!c.help) continue;
      const input = placeholderFill(c.help, node);
      const matched = findCommand(node.commands, input);
      if (!matched) {
        console.log(`[NO MATCH] ${chain.id}/${node.id} :: cmd "${c.id}" help text doesn't match itself: "${input}"`);
        problems++;
      } else if (matched.id !== c.id) {
        console.log(
          `[WRONG MATCH] ${chain.id}/${node.id} :: cmd "${c.id}" help text "${input}" matched "${matched.id}" instead`,
        );
        problems++;
      }
    }
  }
}

if (problems === 0) {
  console.log("OK — every command's help text resolves to itself as the first match.");
} else {
  console.log(`\n${problems} problem(s) found.`);
  process.exit(1);
}
