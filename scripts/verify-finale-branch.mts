import { campaignLevel6 } from "../lib/game/chains/campaign/level6";
import { resolveCommand, initNodeRunState } from "../lib/game/engine";

const production = campaignLevel6.nodes.find((n) => n.id === "production")!;
const carryFlags = ["prod_write_ready", "authed_prod", "scanned", "maintenance_window"];

function testBranch(input: string, expectFlag: string) {
  const state = initNodeRunState(production, carryFlags);
  const result = resolveCommand(production, state, input);
  const ok = result.nextState.discoveredFlags.includes(expectFlag) && result.justCompletedObjective === "resolve";
  console.log(`"${input}" -> objective=${result.justCompletedObjective} flags=${result.nextState.discoveredFlags.join(",")} :: ${ok ? "OK" : "FAIL"}`);
  if (!ok) process.exitCode = 1;

  // confirm the debriefVariants lookup Game.tsx performs would pick the right lines
  const variantKey = production.debriefVariants
    ? Object.keys(production.debriefVariants).find((k) => result.nextState.discoveredFlags.includes(k))
    : undefined;
  console.log(`  debriefVariants match: ${variantKey ?? "NONE"} (expected ${expectFlag})`);
  if (variantKey !== expectFlag) process.exitCode = 1;
}

testBranch("wipe ledger", "ending_wipe");
testBranch("leak evidence", "ending_leak");

// also confirm the *other* branch command does NOT fire when its sibling phrase is typed
const state = initNodeRunState(production, carryFlags);
const crossResult = resolveCommand(production, state, "wipe ledger");
const leakFired = crossResult.nextState.discoveredFlags.includes("ending_leak");
console.log(`cross-check: "wipe ledger" never sets ending_leak :: ${leakFired ? "FAIL" : "OK"}`);
if (leakFired) process.exitCode = 1;
