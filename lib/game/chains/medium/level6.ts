import type { ChainDef } from "../../types";
import { match, cmd } from "../../engine";

const IP = "198.51.100.35";

export const mediumLevel6: ChainDef = {
  id: "medium-6",
  difficulty: "medium",
  order: 6,
  points: 100,
  title: "Object Permanence",
  codename: "OPERATION OBJECT PERMANENCE",
  summary: "A session cookie that's really a serialized object will do whatever deserializing that object does — including things nobody wrote on purpose.",
  briefing: [
    "Palisade Records Management stores scanned court and county filings for a handful of small",
    "jurisdictions in western Colorado. Their document portal keeps session state in a cookie that,",
    "on closer look, isn't a token at all — it's a serialized object, sent to the browser and read",
    "straight back.",
    "",
    "Whatever reads that cookie back in has to rebuild the object it describes. Find out what happens",
    "if the object you hand it isn't the one it expected.",
  ],
  debrief: [
    "root cause: the portal deserialized the 'sessiondata' cookie directly into a server-side object",
    "with no integrity check and no restriction on what classes could be instantiated, allowing a crafted",
    "serialized payload to trigger arbitrary code execution during deserialization — insecure",
    "deserialization (CWE-502).",
    "",
    "PALISADE RECORDS MANAGEMENT: SECURED.",
  ],
  nodes: [
    {
      id: "palisade",
      org: "Palisade Records Management",
      city: "Palisade",
      state: "CO",
      coords: { x: 35.6, y: 29.4 },
      ip: IP,
      tagline: "County document-filing archive — Java-based portal",
      briefing: [
        "TARGET: Palisade Records Management document portal",
        `IP: ${IP}`,
        "KNOWN: session state stored as a serialized object in a cookie, not a signed token.",
        "",
        "Find out what deserializing an attacker-crafted object actually does.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [
        "session notes.txt:",
        "  \"Portal's been on the same Java stack since it was built for the county. Nobody's",
        "   re-reviewed the session mechanism since.\" — dispatch",
      ],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Discover the serialized session cookie", tactic: "Discovery", requires: ["recon"] },
        { id: "craft", label: "Send a crafted serialized payload achieving code execution", tactic: "Execution", requires: ["identify"] },
        { id: "loot", label: "Read the document index from the compromised host", tactic: "Collection", requires: ["craft"] },
        { id: "secure", label: "Replace raw deserialization with a signed, allowlisted session format", tactic: "Remediation", requires: ["loot"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`. A Java stack on an unusual port is worth noting.",
        "Hit the web root and look at the Set-Cookie header closely — a long base64 blob starting with a Java serialization magic prefix is a strong tell it's a serialized object, not a signed token.",
        "A crafted serialized payload doesn't need to be a valid session object at all — it just needs to trigger code during deserialization. A Java gadget-chain generator like `ysoserial` builds exactly that; send its output as the 'sessiondata' cookie against the dashboard route: `curl -H \"Cookie: sessiondata=<gadget-chain-payload-running-bash -c 'id'>\" http://<ip>:8080/dashboard`.",
        "You have code execution as the service account. Look for a document index file on this host.",
      ],
      debrief: [
        "root cause: /dashboard deserialized the raw 'sessiondata' cookie into a Java object with no",
        "integrity check (no signature) and no class allowlist, so a crafted gadget-chain payload executed",
        "arbitrary code during deserialization.",
        "fix applied: session storage replaced with a signed, allowlisted format; raw object deserialization",
        "removed from the request path entirely.",
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
              "8080/tcp open  http    PalisadeDocs 3.4 (Java, Apache Tomcat)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 4.20 seconds",
            ],
          }),
        }),
        cmd({
          id: "curl-root",
          tool: "curl",
          requires: [IP],
          forbids: ["dashboard"],
          help: "curl -i http://<ip>:8080/      — fetch the web root and inspect headers",
          requiresObjectives: ["recon"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["found_cookie"],
            output: [
              "HTTP/1.1 200 OK",
              "Set-Cookie: sessiondata=rO0ABXNyAC5jb20ucGFsaXNhZGVkb2NzLnNlc3Npb24uVXNlclNlc3Npb24...",
              "",
              "<title>Palisade Records Management — Document Portal</title>",
              "",
              "note: 'rO0AB' is the base64 encoding of the Java serialization magic bytes — that cookie is a",
              "raw serialized object, not a signed token.",
            ],
          }),
        }),
        {
          id: "craft-payload",
          tool: "curl",
          match: (input) => {
            const n = input.trim().toLowerCase();
            return n.startsWith("curl") && n.includes("dashboard") && n.includes("sessiondata=") && n.includes("bash -c");
          },
          help: 'curl -H "Cookie: sessiondata=<crafted-gadget-chain-payload-running-bash -c \'id\'>" http://<ip>:8080/dashboard',
          requiresFlags: ["found_cookie"],
          deniedOutput: ["you need a payload that actually triggers a command during deserialization, not just a valid-looking cookie."],
          run: () => ({
            completesObjective: "craft",
            tone: "success",
            setsFlags: ["have_shell"],
            output: [
              "HTTP/1.1 500 Internal Server Error",
              "",
              "uid=999(svc_docs) gid=999(svc_docs) groups=999(svc_docs)",
              "",
              "[+] the deserializer instantiated the crafted object and executed the embedded command —",
              "    the 500 is the app choking on a fake session, not a failure of the exploit.",
            ],
          }),
        },
        cmd({
          id: "cat-index",
          tool: "cat",
          requires: ["document-index.txt"],
          help: "cat /opt/palisadedocs/document-index.txt",
          requiresFlags: ["have_shell"],
          run: () => ({
            completesObjective: "loot",
            tone: "success",
            note: "Palisade Records Management — internal document index recovered via deserialization RCE",
            output: [
              "case_no,county,status",
              "PR-2024-0119,mesa,sealed",
              "PR-2024-0203,mesa,sealed",
              "",
              "[!] sealed filing metadata was reachable from a single crafted cookie.",
            ],
          }),
        }),
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system         — replace raw deserialization with a signed session format",
          requiresObjectives: ["loot"],
          deniedOutput: ["confirm what the deserialization bug actually exposes before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] replaced raw object session cookies with a signed, allowlisted session format",
              "[+] removed unrestricted deserialization from the request path",
              "[+] documented as insecure deserialization (CWE-502)",
              "",
              "PALISADE RECORDS MANAGEMENT: SECURED",
            ],
          }),
        },
      ],
    },
  ],
};
