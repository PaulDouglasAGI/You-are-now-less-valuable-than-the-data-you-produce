import type { ChainDef } from "../../types";
import { match, cmd } from "../../engine";

const IP = "203.0.113.51";

export const easyLevel1: ChainDef = {
  id: "easy-1",
  difficulty: "easy",
  order: 1,
  points: 50,
  title: "Quiet Pantry",
  codename: "OPERATION QUIET PANTRY",
  summary: "One login page. One documented default password. See how fast 'nobody would guess that' falls apart.",
  briefing: [
    "Millbrook, Vermont — a volunteer-run food pantry that feeds around 300 families a month runs its",
    "entire donor and volunteer database through a $40/month CMS platform nobody on staff really",
    "understands.",
    "",
    "Nobody installed this themselves. Nobody's ever logged in as an administrator to double-check it.",
    "That's exactly the kind of gap that gets found by accident — or on purpose.",
    "",
    "This one is about reading what software tells you about itself, and knowing that 'default'",
    "never means 'safe.'",
  ],
  debrief: [
    "root cause: PantryTrack CMS ships with a documented default admin account for first-time setup",
    "(admin / pantry123) — CWE-1392 (use of default credentials). Nobody at the pantry ever changed it.",
    "This is consistently one of the single most common findings in real assessments of small",
    "nonprofits and volunteer-run sites: the software was never insecure by design, it was just",
    "never finished being set up.",
    "",
    "fix applied: default account disabled, forced password reset, finding documented for whoever",
    "manages the platform next.",
  ],
  nodes: [
    {
      id: "harborlight",
      org: "Harbor Light Food Pantry",
      city: "Millbrook",
      state: "VT",
      coords: { x: 87, y: 14.6 },
      ip: IP,
      randomizableSecrets: ["pantry123"],
      tagline: "Community food bank — volunteer & donor management portal",
      briefing: [
        "TARGET: Harbor Light Food Pantry donor/volunteer portal",
        `IP: ${IP}`,
        "KNOWN: small nonprofit, off-the-shelf CMS platform, no in-house IT staff",
        "",
        "Quick external check: find out what's running the site, and whether it's still on factory settings.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [
        "session notes.txt:",
        "  \"Board member asked us to take a look after hearing about a similar org getting hit.",
        "   Probably fine. Check anyway.\" — dispatch",
      ],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Identify the CMS platform running the portal", tactic: "Discovery", requires: ["recon"] },
        {
          id: "access",
          label: "Log in using the vendor's unchanged default credentials",
          tactic: "Initial Access",
          requires: ["identify"],
        },
        { id: "secure", label: "Force a password reset and disable the default account", tactic: "Remediation", requires: ["access"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`. Service banners sometimes name the exact software running, which tells you a lot before you've even touched the web app.",
        "Check the web root — `curl http://<ip>`. Look at what the page — and its HTML comments — tell you about what's running it.",
        "PantryTrack CMS ships with a documented default admin account for first-time setup. A lot of small orgs never get around to changing it. Try `login admin pantry123` against the admin panel you just found.",
        "You're in. This is a defensive exercise — force the change: `secure system`.",
      ],
      debrief: [
        "root cause: PantryTrack CMS's vendor-documented default admin credentials were never rotated",
        "after install.",
        "fix applied: default account disabled, admin password reset and made unique, finding logged.",
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
              "Starting Nmap 7.94 ( https://nmap.org )",
              `Nmap scan report for portal.harborlightpantry.example (${IP})`,
              "Host is up (0.041s latency).",
              "",
              "PORT   STATE SERVICE VERSION",
              "80/tcp open  http    PantryTrack CMS 2.1",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.92 seconds",
            ],
          }),
        }),
        cmd({
          id: "curl-root",
          tool: "curl",
          requires: [IP],
          forbids: ["/admin"],
          help: "curl http://<ip>      — fetch the web root",
          requiresObjectives: ["recon"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["found_admin_path"],
            output: [
              "HTTP/1.1 200 OK",
              "Server: nginx",
              "",
              "<title>Harbor Light Food Pantry — Volunteer Portal</title>",
              '<a href="/admin">Staff Login</a>',
              "<!-- Powered by PantryTrack CMS v2.1 — vendor docs: pantrytrack.example/docs/quickstart -->",
              "",
              "tip: the quickstart guide a vendor publishes publicly is exactly the kind of thing worth knowing about.",
            ],
          }),
        }),
        {
          id: "login",
          tool: "login",
          match: (input) => /^login\s+\S+\s+\S+$/.test(input.trim().toLowerCase()),
          help: "login <username> <password>   — authenticate to /admin",
          requiresFlags: ["found_admin_path"],
          deniedOutput: ["/admin redirects to a login form — you haven't confirmed what CMS this is yet."],
          run: (input) => {
            const parts = input.trim().split(/\s+/);
            const user = parts[1]?.toLowerCase().replace(/^["']|["']$/g, "");
            const pass = parts[2]?.replace(/^["']|["']$/g, "");
            if (user === "admin" && pass === "pantry123") {
              return {
                completesObjective: "access",
                tone: "success",
                promptAfter: "admin@harborlight-portal:~$",
                note: "Harbor Light Food Pantry admin — admin : pantry123 (PantryTrack CMS default, never changed)",
                output: [
                  "[+] authenticated as admin",
                  "",
                  "=== PantryTrack CMS — Admin Dashboard ===",
                  "donors | volunteers | inventory | settings",
                  "",
                  "ALERT: this account is using the PantryTrack factory default password.",
                ],
              };
            }
            return {
              tone: "error",
              output: [`[-] authentication failed for user '${parts[1] ?? ""}'`],
            };
          },
        },
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system         — reset the password and disable the default account",
          requiresObjectives: ["access"],
          deniedOutput: ["you need to actually get into the admin dashboard before you can push a remediation."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] forced password reset on the admin account",
              "[+] disabled PantryTrack's built-in default-credentials fallback",
              "[+] documented the finding for the pantry's board",
              "",
              "HARBOR LIGHT FOOD PANTRY: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
