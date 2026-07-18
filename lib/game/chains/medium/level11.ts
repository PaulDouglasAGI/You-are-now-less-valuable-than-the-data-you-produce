import type { ChainDef, CommandDef } from "../../types";
import { match, cmd, normalize } from "../../engine";

const IP = "198.51.100.50";
const REDEEM_PATH = "/redeem";

const raceRedeem: CommandDef = {
  id: "race-redeem",
  tool: "curl",
  help: "fire several redemption requests concurrently — sequential curl calls won't reproduce this",
  requiresFlags: ["found_toctou"],
  deniedOutput: ["you haven't confirmed the check-then-use gap on /redeem yet — recon the status endpoint first."],
  match: (input) => {
    const trimmed = input.trim();
    const n = normalize(trimmed);
    if (!n.includes(IP.toLowerCase()) || !n.includes(REDEEM_PATH)) return false;

    // standalone shell backgrounding ("&" with whitespace/EOL on both sides), not "&" embedded
    // in a query string like "code=1&qty=2" (no surrounding spaces there)
    const hasBackground = /\s&(\s|$)/.test(trimmed);
    const hasWait = /\bwait\b/.test(n);
    const hasLoopConstruct = /\bfor\b[\s\S]*\bin\b/.test(n) || /\bwhile\b/.test(n);
    const hasParallelTool = /\bparallel\b/.test(n) || /\bxargs\s+-p/.test(n);
    const repeatedCurlCalls = (n.match(/\bcurl\b/g) ?? []).length >= 3;

    return hasBackground && hasWait && (hasLoopConstruct || hasParallelTool || repeatedCurlCalls);
  },
  run: () => ({
    completesObjective: "race",
    tone: "success",
    setsFlags: ["race_won"],
    note: "Wrenfield Retail Group coupon endpoint /redeem — TOCTOU race (CWE-362): concurrent requests redeemed $180 against a $20 balance.",
    output: [
      "[10 requests fired concurrently]",
      "HTTP/1.1 200 OK x9, HTTP/1.1 402 Payment Required x1",
      "",
      "[!] balance check and balance deduction were not atomic — 9 of 10 concurrent redemptions",
      "    succeeded against a coupon that should only ever have covered one.",
    ],
  }),
};

export const mediumLevel11: ChainDef = {
  id: "medium-11",
  difficulty: "medium",
  order: 11,
  points: 110,
  title: "Check, Then Use",
  codename: "OPERATION CHECK THEN USE",
  summary: "The balance check and the balance deduction are two separate calls. Nothing stops you from winning that gap ten times before it closes.",
  briefing: [
    "Wrenfield Retail Group runs an online storefront with a gift-card and coupon system bolted on",
    "by a small in-house team. Functionally it works fine — one request at a time.",
    "",
    "Nobody ever asked what happens when it isn't one request at a time.",
  ],
  debrief: [
    "root cause: the coupon-redemption endpoint checked the remaining balance and deducted it in two",
    "separate, non-atomic operations — a classic time-of-check-to-time-of-use race condition",
    "(CWE-362). Sequential requests never expose the gap; concurrent requests blow straight through",
    "it, since every request reads the same 'not yet spent' balance before any of them finish writing.",
    "",
    "This isn't an injection bug or a broken access check — it's the system's own logic failing under",
    "conditions nobody tested for. That's a distinct skill from finding a bad regex: recognizing when",
    "a business process assumes things happen one at a time.",
    "",
    "WRENFIELD RETAIL GROUP: SECURED.",
  ],
  nodes: [
    {
      id: "wrenfield",
      org: "Wrenfield Retail Group",
      city: "Wrenfield",
      state: "OH",
      coords: { x: 60, y: 27 },
      ip: IP,
      tagline: "Online storefront — gift-card and coupon platform",
      briefing: [
        "TARGET: Wrenfield Retail Group coupon platform",
        `IP: ${IP}`,
        "KNOWN: a coupon-redemption API with a client-visible balance-check endpoint.",
        "",
        "Find out whether that balance check actually holds under concurrent load.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [
        "session notes.txt:",
        "  \"Finance flagged a coupon that somehow got redeemed for way more than its face value.",
        "   Nobody could explain how — 'it always worked fine when we tested it.'\" — dispatch",
      ],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        {
          id: "identify",
          label: "Confirm the balance check and redemption are separate, non-atomic calls",
          tactic: "Discovery",
          requires: ["recon"],
        },
        {
          id: "race",
          label: "Win the race by redeeming the same coupon multiple times concurrently",
          tactic: "Impact",
          requires: ["identify"],
        },
        { id: "secure", label: "Make the check-and-deduct atomic", tactic: "Remediation", requires: ["race"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`. Then check the coupon status endpoint and read what it tells you about how redemption actually works.",
        "One request at a time will never show you anything wrong, no matter how many times you repeat it sequentially — the bug only exists in the gap between two requests that happen at the same moment.",
        "You need requests genuinely in flight together, not one after another — shell backgrounding (`&`) with `wait`, a loop, or a tool built for concurrency (`parallel`, `xargs -P`).",
      ],
      debrief: [
        "root cause: /redeem read the coupon's remaining balance, then deducted it in a separate write,",
        "with no row lock or atomic check-and-set between the two — every concurrent request read the",
        "same pre-deduction balance.",
        "fix applied: redemption now uses an atomic conditional update (decrement-if-sufficient in a",
        "single query), with an idempotency key per redemption attempt.",
      ],
      commands: [
        cmd({
          id: "nmap",
          tool: "nmap",
          requires: [IP],
          help: "nmap -sV <ip>",
          run: () => ({
            completesObjective: "recon",
            tone: "success",
            setsFlags: ["scanned"],
            output: [
              "PORT   STATE SERVICE VERSION",
              "80/tcp open  http    Node.js Express (Wrenfield coupon API)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.65 seconds",
            ],
          }),
        }),
        cmd({
          id: "curl-status",
          tool: "curl",
          requires: ["coupons/status"],
          help: "curl http://<ip>/api/coupons/status?code=WELCOME20",
          requiresFlags: ["scanned"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["found_toctou"],
            output: [
              "HTTP/1.1 200 OK",
              "",
              '{"code":"WELCOME20","balance":20.00}',
              "",
              "note: balance check (GET) and redemption (POST) are separate calls — no row lock is held",
              "between verifying the balance and deducting it.",
            ],
          }),
        }),
        {
          id: "sequential-redeem",
          tool: "curl",
          match: (input) => {
            const trimmed = input.trim();
            const n = normalize(trimmed);
            if (n.split(" ")[0] !== "curl" || !n.includes(REDEEM_PATH)) return false;
            // only a *standalone* backgrounding "&" (surrounded by whitespace/EOL) means this is
            // actually the race attempt — an "&" inside the URL's own query string doesn't count
            return !/\s&(\s|$)/.test(trimmed);
          },
          help: 'curl -X POST http://<ip>/redeem -d "code=WELCOME20"',
          requiresFlags: ["found_toctou"],
          run: () => ({
            tone: "output",
            output: [
              "HTTP/1.1 200 OK",
              '{"redeemed": 20.00, "remaining_balance": 0.00}',
              "",
              "one request, processed correctly, remaining balance $0.00 — firing sequentially gives",
              "the check-then-use gap no window to matter. try it another way.",
            ],
          }),
        },
        raceRedeem,
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system",
          requiresObjectives: ["race"],
          deniedOutput: ["confirm the race actually wins before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] replaced the check-then-deduct pair with a single atomic conditional update",
              "[+] added an idempotency key requirement per redemption attempt",
              "[+] documented as a TOCTOU race condition (CWE-362)",
              "",
              "WRENFIELD RETAIL GROUP: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
