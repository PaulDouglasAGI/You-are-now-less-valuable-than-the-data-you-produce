import type { ChainDef } from "../../types";
import { match, strictCmd } from "../../engine";

const IP = "192.0.2.220";

export const ghostLevel2: ChainDef = {
  id: "ghost-2",
  difficulty: "ghost",
  order: 2,
  points: 200,
  title: "Pattern, Not Meaning",
  codename: "GHOST ASSESSMENT — PATTERN NOT MEANING",
  summary: "The login form blocks one exact string. It doesn't understand SQL — it's matching text. That's not the same thing.",
  briefing: [
    `TARGET: Thornfield Municipal Library System — ${IP}`,
    "OBJECTIVE: bypass authentication on the patron portal and recover patron records.",
    "",
    "The login form is filtered. Find out exactly what it blocks, and exactly what it doesn't —",
    "then get in anyway. Nobody is handing you a working payload for this one.",
  ],
  debrief: [
    "root cause: the login handler built a query directly from user input and tried to defend it by",
    "blocking a literal, case-sensitive keyword ('or') instead of using parameterized queries —",
    "a blocklist standing in for real input handling (SQL injection, CWE-89, plus CWE-693, protection",
    "mechanism failure). Blocking a pattern isn't the same as understanding what the pattern means;",
    "changing the text without changing what the database executes was always going to work.",
    "",
    "THORNFIELD MUNICIPAL LIBRARY SYSTEM: SECURED.",
  ],
  nodes: [
    {
      id: "thornfield",
      org: "Thornfield Municipal Library System",
      city: "Thornfield",
      state: "MA",
      coords: { x: 85, y: 18 },
      ip: IP,
      tagline: "Regional library consortium — patron account portal",
      briefing: [`IP: ${IP}`, "No further information provided."],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Find the patron portal login form", tactic: "Discovery", requires: ["recon"] },
        {
          id: "bypass",
          label: "Construct a working SQL injection auth bypass around the input filter",
          tactic: "Initial Access",
          requires: ["identify"],
        },
        { id: "loot", label: "Recover patron records through the bypassed session", tactic: "Collection", requires: ["bypass"] },
        { id: "secure", label: "Replace the filter with parameterized queries", tactic: "Remediation", requires: ["loot"] },
      ],
      hints: [
        "a filter that blocks input by matching a literal keyword is matching text, not meaning. anything that changes the text without changing what the database actually executes still works.",
        "you don't need the exact word the filter is watching for to break out of a string — and you don't need a tautology at all if you can just comment out the rest of the query instead.",
      ],
      debrief: [],
      commands: [
        strictCmd({
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
              "80/tcp open  http    nginx 1.24.0",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.60 seconds",
            ],
          }),
        }),
        strictCmd({
          id: "curl-root",
          tool: "curl",
          requires: ["http://" + IP],
          forbids: ["login", "api/patrons"],
          help: "curl http://<ip>",
          requiresFlags: ["scanned"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["found_login"],
            output: [
              "HTTP/1.1 200 OK",
              "",
              "<title>Thornfield Library — Patron Portal</title>",
              '<form action="/login" method="POST"><input name="user"><input name="pass"></form>',
              "",
              "note: input is sanitized against known injection patterns before reaching the database.",
            ],
          }),
        }),
        {
          id: "login-blocked",
          tool: "login",
          match: (input) => {
            const trimmed = input.trim();
            if (!trimmed.toLowerCase().startsWith("login ")) return false;
            const payload = trimmed.slice(trimmed.indexOf(" ") + 1);
            return payload.includes("'") && /\bor\b/.test(payload);
          },
          help: "login <username>' ...",
          requiresFlags: ["found_login"],
          run: () => ({
            tone: "error",
            output: [
              "HTTP/1.1 403 Forbidden",
              "",
              "request blocked by input filter.",
              "reason: disallowed keyword detected ('or').",
              "",
              "[!] the filter does a literal, case-sensitive keyword match — it isn't parsing this as SQL at all.",
            ],
          }),
        },
        {
          id: "login-bypass",
          tool: "login",
          match: (input) => {
            const trimmed = input.trim();
            if (!trimmed.toLowerCase().startsWith("login ")) return false;
            const payload = trimmed.slice(trimmed.indexOf(" ") + 1);
            if (!payload.includes("'")) return false;

            const hasLowercaseOr = /\bor\b/.test(payload);
            const hasCaseVariantOr = /\b(oR|Or|OR)\b/.test(payload);
            const hasTautology = /1\s*=\s*1/.test(payload) || /'\s*=\s*'/.test(payload);
            const orBypass = !hasLowercaseOr && hasCaseVariantOr && hasTautology;

            const hasCommentBreak = /--|#|\/\*/.test(payload);
            const commentBypass = hasCommentBreak && !hasLowercaseOr;

            return orBypass || commentBypass;
          },
          help: "login <username>' ...   — the filter only catches one exact form of this",
          requiresFlags: ["found_login"],
          deniedOutput: ["that's not a working authentication bypass — a filter's blind spot isn't the same as a valid query."],
          run: () => ({
            completesObjective: "bypass",
            tone: "success",
            setsFlags: ["authed"],
            promptAfter: "portal@thornfield:~$",
            note: "Thornfield Library — auth bypassed via SQL injection; naive filter only blocked a literal lowercase 'or'",
            output: [
              "HTTP/1.1 302 Found",
              "Set-Cookie: session=patron-bypass-3391",
              "",
              "[+] authenticated with no valid credentials — the filter's keyword match never touched the",
              "    actual query logic.",
            ],
          }),
        },
        strictCmd({
          id: "loot-records",
          tool: "curl",
          requires: ["/api/patrons"],
          help: "curl -H \"Cookie: session=<session>\" http://<ip>/api/patrons",
          requiresFlags: ["authed"],
          run: () => ({
            completesObjective: "loot",
            tone: "success",
            note: "Thornfield Library — full patron record export accessible from the bypassed session",
            output: [
              "HTTP/1.1 200 OK",
              "",
              '[{"patron":"[redacted]","card_no":"[redacted]","outstanding_fines":"$4.20"}, ...]',
              "",
              "[!] every patron record in the consortium, reachable from a single bypassed login.",
            ],
          }),
        }),
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system",
          requiresObjectives: ["loot"],
          deniedOutput: ["confirm the actual data exposure before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] replaced the keyword filter with parameterized queries across the login handler",
              "[+] revoked the active session and forced a review of every other input handler on the site",
              "[+] documented as SQL injection via a blocklist protection failure (CWE-89, CWE-693)",
              "",
              "THORNFIELD MUNICIPAL LIBRARY SYSTEM: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
