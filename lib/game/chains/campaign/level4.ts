import type { ChainDef } from "../../types";
import { match, cmd } from "../../engine";
import { jitteredCoords } from "../../../state-coords";

const IP_GATEWAY = "203.0.113.158";
const IP_INTERNAL = "203.0.113.159";
const DEFAULT_USER = "admin";
const DEFAULT_PASS = "admin";

export const campaignLevel4: ChainDef = {
  id: "campaign-4",
  difficulty: "campaign",
  order: 4,
  points: 260,
  title: "The Gateway",
  codename: "CAMPAIGN — EPISODE 4: THE GATEWAY",
  summary: "An employee left a door open on purpose. Confirm it twice before you walk through it.",
  briefing: [
    "fee1000d's tip, relayed secondhand: a remote-access gateway a facilities contractor installed",
    "years ago for on-site maintenance, never decommissioned when the contract ended. Still reachable.",
    "Still on whatever password it shipped with.",
    "",
    "This is the one lead in the whole campaign that came from a person instead of a misconfiguration",
    "scan. Verify everything twice, same as the tip said. But it's real.",
  ],
  debrief: [
    "The gateway was exactly what the tip described: a facilities-management remote-access box, still",
    "answering, still on its factory password, four years after the contract that justified installing",
    "it ended. Nobody's decommissioning checklist ever included 'and confirm the remote-access gateway",
    "is actually gone.'",
    "",
    "From there, one hop reached an internal operations share nobody expected external eyes to ever",
    "see — including the complaint log that's the reason someone on the inside reached out in the",
    "first place.",
  ],
  nodes: [
    {
      id: "gateway",
      org: "Wellstone Remote Access",
      city: "Corrington",
      state: "PA",
      coords: jitteredCoords("PA", "campaign-4:gateway"),
      ip: IP_GATEWAY,
      tagline: "Decommissioned-in-name-only facilities remote-access gateway",
      briefing: [
        `TARGET: Wellstone Remote Access gateway — ${IP_GATEWAY}`,
        `TIP: default vendor credentials, never changed — ${DEFAULT_USER} : ${DEFAULT_PASS}`,
        "",
        "Confirm it's actually still there before you trust a tip that came from a person, not a scan.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Locate the gateway's login interface", tactic: "Discovery", requires: ["recon"] },
        { id: "access", label: "Authenticate with the unchanged default vendor credentials", tactic: "Initial Access", requires: ["identify"] },
        { id: "enum", label: "Enumerate the internal network segment this gateway still reaches", tactic: "Discovery", requires: ["access"] },
        { id: "secure", label: "Decommission the gateway for real and rotate every credential on it", tactic: "Remediation", requires: ["enum"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`. A facilities-management box usually announces itself pretty plainly in its banner.",
        `Try the tip exactly as given: \`login ${DEFAULT_USER} ${DEFAULT_PASS}\`.`,
        "Once you're in, check what internal hosts this gateway can still reach — it was never meant to still have that access, but nobody ever revoked it.",
      ],
      debrief: [
        "root cause: a vendor remote-access appliance was never decommissioned after the facilities",
        "contract that justified it ended, and was still running on its unchanged factory credentials",
        "(CWE-1392, use of default credentials) with standing network access it should have lost years",
        "earlier.",
        "fix applied: the gateway was fully decommissioned and removed from the network, not just relocked.",
      ],
      commands: [
        cmd({
          id: "nmap",
          tool: "nmap",
          requires: [IP_GATEWAY],
          help: "nmap -sV <ip>",
          run: () => ({
            completesObjective: "recon",
            tone: "success",
            setsFlags: ["scanned"],
            output: [
              "PORT   STATE SERVICE VERSION",
              "80/tcp open  http    Wellstone Facilities Gateway v2.3 (EOL 2021)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.80 seconds",
            ],
          }),
        }),
        cmd({
          id: "curl-root",
          tool: "curl",
          requires: [IP_GATEWAY],
          forbids: ["login", "reachable-hosts"],
          help: "curl http://<ip>      — fetch the login page",
          requiresObjectives: ["recon"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["found_login"],
            output: [
              "HTTP/1.1 200 OK",
              "",
              "<title>Wellstone Remote Access — Sign In</title>",
              "<!-- installed for Concord facilities maintenance, contract ref FM-2019-114 -->",
            ],
          }),
        }),
        {
          id: "login",
          tool: "login",
          match: (input) => /^login\s+\S+\s+\S+$/.test(input.trim().toLowerCase()),
          help: `login ${DEFAULT_USER} ${DEFAULT_PASS}`,
          requiresFlags: ["found_login"],
          deniedOutput: ["the login page is up but you haven't got anything to try against it yet."],
          run: (input) => {
            const parts = input.trim().split(/\s+/);
            const user = parts[1]?.toLowerCase().replace(/^["']|["']$/g, "");
            const pass = parts[2]?.replace(/^["']|["']$/g, "");
            if (user === DEFAULT_USER && pass === DEFAULT_PASS) {
              return {
                completesObjective: "access",
                tone: "success",
                promptAfter: "admin@wellstone-gw:~$",
                setsFlags: ["have_access"],
                note: `Wellstone Remote Access — ${DEFAULT_USER}:${DEFAULT_PASS} (unchanged vendor default, tip confirmed accurate)`,
                output: [
                  "[+] authenticated as admin",
                  "",
                  "=== Wellstone Facilities Gateway ===",
                  "device-status | tunnel-config | reachable-hosts",
                  "",
                  "the tip held. this box never got decommissioned, it just got forgotten.",
                ],
              };
            }
            return { tone: "error", output: [`[-] authentication failed for user '${parts[1] ?? ""}'`] };
          },
        },
        cmd({
          id: "enum-hosts",
          tool: "curl",
          requires: ["reachable-hosts"],
          help: "curl http://<ip>/reachable-hosts",
          requiresFlags: ["have_access"],
          run: () => ({
            completesObjective: "enum",
            tone: "success",
            setsFlags: ["know_internal_ops"],
            note: `Wellstone gateway still reaches internal host concord-internal-ops (${IP_INTERNAL})`,
            output: [
              "HTTP/1.1 200 OK",
              "",
              `[{"host":"concord-internal-ops","ip":"${IP_INTERNAL}","last_seen":"active"}]`,
              "",
              "[+] a facilities-maintenance gateway with a live route to an internal operations host.",
              "    nobody revoked that route when the contract ended, either.",
            ],
          }),
        }),
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system",
          requiresObjectives: ["enum"],
          deniedOutput: ["confirm what this gateway still reaches before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] fully decommissioned the gateway and removed it from the network",
              "[+] rotated every credential stored on the appliance",
              "[+] documented as a stale vendor appliance with default credentials (CWE-1392)",
              "",
              "WELLSTONE REMOTE ACCESS: SECURED",
            ],
          }),
        },
      ],
    },
    {
      id: "internalops",
      org: "Concord Internal Operations",
      city: "Corrington",
      state: "CT",
      coords: jitteredCoords("CT", "campaign-4:internalops"),
      ip: IP_INTERNAL,
      tagline: "Internal staff operations share — never designed for outside reachability",
      briefing: [
        `TARGET: Concord Internal Operations — ${IP_INTERNAL}`,
        "YOU HAVE: a live network route from the Wellstone gateway.",
        "",
        "Find out what a share designed only for people already inside the building actually holds.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "access", label: "Reach the internal file share via the gateway's route", tactic: "Lateral Movement", requires: ["recon"] },
        { id: "loot", label: "Recover the internal complaint log and the loan-servicing network location", tactic: "Collection", requires: ["access"] },
        { id: "secure", label: "Segment this host away from any facilities-adjacent network", tactic: "Remediation", requires: ["loot"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`. This host was never meant to be reachable from outside, so don't expect much hardening on what's already exposed by the route you have.",
        "The share doesn't require its own login — being reachable at all was the only control it had. Try `curl http://<ip>/share/`.",
        "One file in that share is worth reading in full — a complaint log tends to explain a whistleblower's motive better than any press release ever will.",
      ],
      debrief: [
        "root cause: this host had no network-level segmentation from the facilities-maintenance",
        "gateway that was supposed to have been retired years earlier — its only real access control was",
        "the assumption that nothing outside the corporate network could ever reach it (CWE-284).",
        "fix applied: segmented away from any facilities-adjacent network path, share access restricted",
        "to authenticated internal staff only.",
        "",
        "CONCORD INTERNAL OPERATIONS: SECURED.",
      ],
      commands: [
        cmd({
          id: "nmap",
          tool: "nmap",
          requires: [IP_INTERNAL],
          help: "nmap -sV <ip>",
          run: () => ({
            completesObjective: "recon",
            tone: "success",
            setsFlags: ["scanned"],
            output: [
              "PORT   STATE SERVICE VERSION",
              "445/tcp open  microsoft-ds",
              "80/tcp open  http    nginx 1.24.0 (internal ops share)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.90 seconds",
            ],
          }),
        }),
        cmd({
          id: "curl-share",
          tool: "curl",
          requires: ["share"],
          forbids: ["complaints"],
          help: "curl http://<ip>/share/",
          requiresFlags: ["scanned"],
          run: () => ({
            completesObjective: "access",
            tone: "success",
            setsFlags: ["have_share"],
            output: [
              "HTTP/1.1 200 OK",
              "",
              "Index of /share",
              "  policy-drafts/",
              "  billing-escalations.csv",
              "  complaints-log-2025.txt",
              "",
              "[+] no login wall at all — being unreachable from outside was the only protection this ever had.",
            ],
          }),
        }),
        cmd({
          id: "loot",
          tool: "curl",
          requires: ["complaints-log"],
          help: "curl http://<ip>/share/complaints-log-2025.txt",
          requiresFlags: ["have_share"],
          run: () => ({
            completesObjective: "loot",
            tone: "success",
            setsFlags: ["have_complaint_log"],
            note: "Concord Internal Operations — internal complaint log documents a disputed balance zeroed then quietly re-added; also names 'fenmore-loan-servicing.internal' as the platform of record",
            output: [
              "HTTP/1.1 200 OK",
              "",
              '"...case #4471: balance disputed and zeroed 2024-08-02 per manager override. balance',
              ' re-applied 2024-10-15, no customer notification sent, ref: fenmore-loan-servicing.internal"',
              "",
              "[!] this is the exact pattern fee1000d described in the first transmission — on the record,",
              "    in Concord's own files, not secondhand.",
            ],
          }),
        }),
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system",
          requiresObjectives: ["loot"],
          deniedOutput: ["confirm what the share actually exposes before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            setsFlags: ["ep4_complete"],
            output: [
              "[+] segmented this host away from any facilities-adjacent network path",
              "[+] restricted the share to authenticated internal staff sessions",
              "[+] escalated the complaint-log finding as a standalone compliance issue, independent of this assessment",
              "",
              "CONCORD INTERNAL OPERATIONS: SECURED",
              "",
              "=== EPISODE 4 COMPLETE ===",
            ],
          }),
        },
      ],
    },
  ],
};
