import type { ChainDef, CommandDef } from "../../types";
import { match, cmd, normalize } from "../../engine";
import { jitteredCoords } from "../../../state-coords";

const IP_FENMORE = "203.0.113.160";
const IP_MERIDIAN = "203.0.113.161";
const IP_BATCHOPS = "203.0.113.162";
const STAGING_CRED = "fen_stg_7c31be0a94";
const REDEEM_PATH = "/api/payments/confirm";

const raceDoubleCredit: CommandDef = {
  id: "race-double-credit",
  tool: "curl",
  help: "fire several webhook confirmations concurrently — sequential curl calls won't reproduce this",
  requiresFlags: ["found_toctou"],
  deniedOutput: ["you haven't confirmed the check-then-credit gap on the webhook endpoint yet — recon it first."],
  match: (input) => {
    const trimmed = input.trim();
    const n = normalize(trimmed);
    if (!n.includes(IP_MERIDIAN.toLowerCase()) || !n.includes(REDEEM_PATH)) return false;
    const hasBackground = /\s&(\s|$)/.test(trimmed);
    const hasWait = /\bwait\b/.test(n);
    const hasLoopConstruct = /\bfor\b[\s\S]*\bin\b/.test(n) || /\bwhile\b/.test(n);
    const hasParallelTool = /\bparallel\b/.test(n) || /\bxargs\s+-p/.test(n);
    const repeatedCurlCalls = (n.match(/\bcurl\b/g) ?? []).length >= 3;
    return hasBackground && hasWait && (hasLoopConstruct || hasParallelTool || repeatedCurlCalls);
  },
  run: () => ({
    completesObjective: "race",
    tone: "success",
    setsFlags: ["race_won"],
    note: "Meridian Payment Rails webhook confirm endpoint — TOCTOU race (CWE-362): one payment confirmed and credited 9 times concurrently.",
    output: [
      "[10 webhook confirmations fired concurrently]",
      "HTTP/1.1 200 OK x9, HTTP/1.1 409 Conflict x1",
      "",
      "[!] the confirm-then-credit pair wasn't atomic — one real payment got credited to the borrower's",
      "    account 9 times over before the ledger caught up.",
    ],
  }),
};

export const campaignLevel5: ChainDef = {
  id: "campaign-5",
  difficulty: "campaign",
  order: 5,
  points: 390,
  title: "The Ledger Speaks",
  codename: "CAMPAIGN — EPISODE 5: THE LEDGER SPEAKS",
  summary: "Not a missing auth check this time. The platform's own business logic, doing exactly what it was built to do, badly.",
  briefing: [
    "The staging credential from Ledger Systems Group opens a door into Fenmore Loan Servicing — the",
    "platform underneath the complaint log's case #4471, and every subsidiary's actual debt math.",
    "",
    "Nothing here is a missing access check. Every bug in this episode is the system's own logic",
    "failing under conditions nobody load-tested against someone trying to break it on purpose.",
  ],
  debrief: [
    "Three business-logic failures, none of them an injection bug or a broken access check: a payment",
    "endpoint that trusted a client-submitted amount, a webhook confirmation with a check-then-credit",
    "gap wide enough to double-spend through, and a legacy batch importer that deserialized whatever a",
    "file said it was.",
    "",
    "This is the platform the master reconciliation job trusts every night without a second look —",
    "and every one of these findings sits one layer beneath it.",
  ],
  nodes: [
    {
      id: "fenmore",
      org: "Fenmore Loan Servicing",
      city: "Caddo Mills",
      state: "TX",
      coords: jitteredCoords("TX", "campaign-5:fenmore"),
      ip: IP_FENMORE,
      randomizableSecrets: [STAGING_CRED],
      tagline: "Loan-servicing platform underlying most of Concord's subsidiary debt",
      briefing: [
        `TARGET: Fenmore Loan Servicing — staging environment — ${IP_FENMORE}`,
        `YOU HAVE: a staging credential, recovered from Ledger Systems Group — ${STAGING_CRED}`,
        "",
        "Find out whether a payment amount is ever actually checked against what's owed.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "auth", label: "Authenticate to the staging environment with the recovered credential", tactic: "Initial Access", requires: ["recon"] },
        { id: "identify", label: "Locate the payment-submission endpoint", tactic: "Discovery", requires: ["auth"] },
        {
          id: "tamper",
          label: "Submit a manipulated payment amount the server never validates",
          tactic: "Impact",
          requires: ["identify"],
        },
        { id: "secure", label: "Add server-side validation of payment amounts against the actual balance owed", tactic: "Remediation", requires: ["tamper"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`.",
        `Authenticate with the staging credential — \`curl -H "Authorization: Bearer ${STAGING_CRED}" https://<ip>/api/status\`.`,
        "Find the payment endpoint, then check exactly what it trusts from the client — read the response headers and any error text carefully.",
        "If 'amount' is a client-supplied field with no server-side check against the actual balance owed, try submitting a negative amount — that's not a payment, that's a credit you invented.",
      ],
      debrief: [
        "root cause: /api/payments/submit accepted a client-supplied 'amount' field and applied it directly",
        "to the account balance with no server-side validation against what was actually owed — a business",
        "logic flaw (CWE-840) that let a negative 'payment' function as an invented credit.",
        "fix applied: payment amounts now validated server-side against the actual balance and payment",
        "history before being applied.",
      ],
      commands: [
        cmd({
          id: "nmap",
          tool: "nmap",
          requires: [IP_FENMORE],
          help: "nmap -sV <ip>",
          run: () => ({
            completesObjective: "recon",
            tone: "success",
            setsFlags: ["scanned"],
            output: [
              "PORT    STATE SERVICE VERSION",
              "443/tcp open  https   nginx 1.24.0 (Fenmore staging)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.95 seconds",
            ],
          }),
        }),
        cmd({
          id: "auth",
          tool: "curl",
          requires: ["authorization", STAGING_CRED, "api/status"],
          forbids: ["payments"],
          help: `curl -H "Authorization: Bearer ${STAGING_CRED}" https://<ip>/api/status`,
          requiresFlags: ["scanned"],
          run: () => ({
            completesObjective: "auth",
            tone: "success",
            setsFlags: ["authed"],
            output: [
              '{"env":"staging","service":"fenmore-loan-servicing","version":"6.2.0"}',
              "",
              "response header: X-Payments-Endpoint: /api/payments/submit",
            ],
          }),
        }),
        cmd({
          id: "identify",
          tool: "curl",
          requires: ["payments/submit"],
          forbids: ["amount=-"],
          help: `curl -H "Authorization: Bearer ${STAGING_CRED}" https://<ip>/api/payments/submit`,
          requiresFlags: ["authed"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["found_endpoint"],
            output: [
              "HTTP/1.1 400 Bad Request",
              '{"error":"missing fields: account_id, amount"}',
              "",
              "note: 'amount' is submitted by the caller — worth finding out whether it's ever checked",
              "against the account's real balance.",
            ],
          }),
        }),
        cmd({
          id: "tamper",
          tool: "curl",
          requires: ["payments/submit", "amount=-", "account_id"],
          help: `curl -X POST -H "Authorization: Bearer ${STAGING_CRED}" https://<ip>/api/payments/submit -d "account_id=stg-4471&amount=-500.00"`,
          requiresFlags: ["found_endpoint"],
          run: () => ({
            completesObjective: "tamper",
            tone: "success",
            setsFlags: ["tamper_confirmed"],
            note: "Fenmore Loan Servicing — /api/payments/submit applies client-supplied 'amount' with no validation; negative values invent credit (CWE-840)",
            output: [
              "HTTP/1.1 200 OK",
              "",
              '{"account_id":"stg-4471","balance_before":1240.00,"balance_after":1740.00}',
              "",
              "[!] a negative payment amount increased the balance owed instead of decreasing it — or, run",
              "    the other direction, manufactured a credit that was never actually paid.",
            ],
          }),
        }),
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system",
          requiresObjectives: ["tamper"],
          deniedOutput: ["confirm the tamper actually changes a real balance before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] added server-side validation of submitted payment amounts against the real balance",
              "[+] rejected negative or out-of-range amounts at the API layer",
              "[+] documented as a business logic flaw (CWE-840)",
              "",
              "FENMORE LOAN SERVICING: SECURED",
            ],
          }),
        },
      ],
    },
    {
      id: "meridianrails",
      org: "Meridian Payment Rails",
      city: "Bastrop",
      state: "LA",
      coords: jitteredCoords("LA", "campaign-5:meridianrails"),
      ip: IP_MERIDIAN,
      tagline: "Payment processor used by Fenmore's loan-servicing platform",
      briefing: [
        `TARGET: Meridian Payment Rails — webhook confirmation API — ${IP_MERIDIAN}`,
        "KNOWN: Fenmore's payment webhook confirms and credits an account in two separate calls.",
        "",
        "Find out whether that confirmation actually holds a lock between the two.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        {
          id: "identify",
          label: "Confirm the webhook's check-then-credit is two separate, non-atomic calls",
          tactic: "Discovery",
          requires: ["recon"],
        },
        {
          id: "race",
          label: "Win the race by confirming the same webhook payment multiple times concurrently",
          tactic: "Impact",
          requires: ["identify"],
        },
        { id: "secure", label: "Make the confirm-and-credit operation atomic", tactic: "Remediation", requires: ["race"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`. Then check the webhook confirmation endpoint and read how it describes its own process.",
        "Sequential requests will never expose a check-then-use race, no matter how many times you repeat them one after another.",
        "You need requests genuinely in flight together — shell backgrounding (`&`) with `wait`, a loop, or a tool built for concurrency (`parallel`, `xargs -P`).",
      ],
      debrief: [
        "root cause: /api/payments/confirm checked the payment's pending status, then credited the",
        "account in a separate write, with no row lock or atomic check-and-set between the two — a",
        "TOCTOU race condition (CWE-362), identical in shape to the coupon bug found earlier in the",
        "career, just wearing a payment processor's clothes this time.",
        "fix applied: confirm-and-credit replaced with a single atomic conditional update, plus an",
        "idempotency key per webhook delivery.",
        "",
        "MERIDIAN PAYMENT RAILS: SECURED.",
      ],
      commands: [
        cmd({
          id: "nmap",
          tool: "nmap",
          requires: [IP_MERIDIAN],
          help: "nmap -sV <ip>",
          run: () => ({
            completesObjective: "recon",
            tone: "success",
            setsFlags: ["scanned"],
            output: [
              "PORT   STATE SERVICE VERSION",
              "443/tcp open  https   nginx 1.24.0 (Meridian Payment Rails)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 3.85 seconds",
            ],
          }),
        }),
        cmd({
          id: "curl-status",
          tool: "curl",
          requires: ["payments/status"],
          help: "curl https://<ip>/api/payments/status?ref=pay-9931",
          requiresFlags: ["scanned"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["found_toctou"],
            output: [
              "HTTP/1.1 200 OK",
              "",
              '{"ref":"pay-9931","status":"pending","amount":500.00}',
              "",
              "note: confirmation (POST) checks 'pending' status, then credits the account in a separate",
              "write — no row lock held between the two operations.",
            ],
          }),
        }),
        {
          id: "sequential-confirm",
          tool: "curl",
          match: (input) => {
            const trimmed = input.trim();
            const n = normalize(trimmed);
            if (n.split(" ")[0] !== "curl" || !n.includes(REDEEM_PATH)) return false;
            return !/\s&(\s|$)/.test(trimmed);
          },
          help: `curl -X POST https://<ip>${REDEEM_PATH} -d "ref=pay-9931"`,
          requiresFlags: ["found_toctou"],
          run: () => ({
            tone: "output",
            output: [
              "HTTP/1.1 200 OK",
              '{"ref":"pay-9931","credited":500.00,"status":"confirmed"}',
              "",
              "one request, processed correctly, once. sequential confirmation gives the check-then-credit",
              "gap no window to matter. try it another way.",
            ],
          }),
        },
        raceDoubleCredit,
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system",
          requiresObjectives: ["race"],
          deniedOutput: ["confirm the race actually wins before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            output: [
              "[+] replaced the check-then-credit pair with a single atomic conditional update",
              "[+] added an idempotency key requirement per webhook delivery",
              "[+] documented as a TOCTOU race condition (CWE-362)",
              "",
              "MERIDIAN PAYMENT RAILS: SECURED",
            ],
          }),
        },
      ],
    },
    {
      id: "batchops",
      org: "Fenmore Batch Operations",
      city: "Sallisaw",
      state: "OK",
      coords: jitteredCoords("OK", "campaign-5:batchops"),
      ip: IP_BATCHOPS,
      tagline: "Legacy nightly batch-import subsystem feeding the reconciliation pipeline",
      briefing: [
        `TARGET: Fenmore Batch Operations — legacy import service — ${IP_BATCHOPS}`,
        "KNOWN: a Java-based batch importer that's fed nightly files into the reconciliation pipeline",
        "since before anyone currently on staff was hired.",
        "",
        "Find out what it actually does with a file it wasn't expecting.",
      ],
      initialPrompt: "op@breachline:~$",
      motd: [],
      objectives: [
        { id: "recon", label: "Enumerate open services on the target", tactic: "Reconnaissance" },
        { id: "identify", label: "Discover the batch import endpoint and its serialized file format", tactic: "Discovery", requires: ["recon"] },
        { id: "craft", label: "Send a crafted serialized batch file achieving code execution", tactic: "Execution", requires: ["identify"] },
        { id: "loot", label: "Recover the access path this host holds into reconciliation-master", tactic: "Collection", requires: ["craft"] },
        { id: "secure", label: "Replace raw deserialization with a signed, schema-validated import format", tactic: "Remediation", requires: ["loot"] },
      ],
      hints: [
        "Recon first — `nmap -sV <ip>`. A Java stack on an unusual port is worth noting.",
        "Check the import endpoint's expected file format — a long base64 blob starting with the Java serialization magic prefix is a strong tell that uploaded files are deserialized directly, not parsed.",
        "A crafted serialized payload doesn't need to be a valid batch file at all — it just needs to trigger code during deserialization. A Java gadget-chain generator like `ysoserial` builds exactly that — upload its output as the batch file: `curl -F \"batchfile=@<ysoserial-payload-running-bash -c 'id'>\" http://<ip>:8080/import`.",
        "You have code execution as the batch service account. Look at what this host is configured to reach — it feeds the reconciliation pipeline directly.",
      ],
      debrief: [
        "root cause: the legacy batch importer deserialized uploaded files directly into Java objects with",
        "no integrity check and no class allowlist — insecure deserialization (CWE-502), unpatched since",
        "before the current staff, on the one subsystem that feeds the reconciliation job every single",
        "night without anyone in the loop.",
        "fix applied: raw deserialization removed from the import path entirely, replaced with a signed,",
        "schema-validated format.",
        "",
        "FENMORE BATCH OPERATIONS: SECURED.",
      ],
      commands: [
        cmd({
          id: "nmap",
          tool: "nmap",
          requires: [IP_BATCHOPS],
          help: "nmap -sV <ip>",
          run: () => ({
            completesObjective: "recon",
            tone: "success",
            setsFlags: ["scanned"],
            output: [
              "PORT     STATE SERVICE VERSION",
              "8080/tcp open  http    FenmoreBatch 2.1 (Java, Apache Tomcat)",
              "",
              "Nmap done: 1 IP address (1 host up) scanned in 4.15 seconds",
            ],
          }),
        }),
        cmd({
          id: "curl-import",
          tool: "curl",
          requires: [IP_BATCHOPS],
          forbids: ["import"],
          help: "curl -i http://<ip>:8080/      — fetch the web root and inspect headers",
          requiresObjectives: ["recon"],
          run: () => ({
            completesObjective: "identify",
            tone: "success",
            setsFlags: ["found_import"],
            output: [
              "HTTP/1.1 200 OK",
              "",
              "<title>Fenmore Batch Import — Nightly Reconciliation Feed</title>",
              '<form action="/import" method="POST" enctype="multipart/form-data">',
              "  <input type=\"file\" name=\"batchfile\">",
              "</form>",
              "",
              "note: sample batch files start with 'rO0AB' — the base64 encoding of the Java serialization",
              "magic bytes. this importer deserializes uploads directly, it doesn't parse them.",
            ],
          }),
        }),
        {
          id: "craft-payload",
          tool: "curl",
          match: (input) => {
            const n = input.trim().toLowerCase();
            return n.startsWith("curl") && n.includes("import") && n.includes("batchfile=") && n.includes("bash -c");
          },
          help: 'curl -F "batchfile=@<crafted-gadget-chain-payload-running-bash -c \'id\'>" http://<ip>:8080/import',
          requiresFlags: ["found_import"],
          deniedOutput: ["you need a payload that actually triggers a command during deserialization, not just a valid-looking batch file."],
          run: () => ({
            completesObjective: "craft",
            tone: "success",
            setsFlags: ["have_shell"],
            output: [
              "HTTP/1.1 500 Internal Server Error",
              "",
              "uid=997(svc_batch) gid=997(svc_batch) groups=997(svc_batch)",
              "",
              "[+] the importer instantiated the crafted object and executed the embedded command — the",
              "    500 is the app choking on a fake batch file, not a failure of the exploit.",
            ],
          }),
        },
        cmd({
          id: "loot",
          tool: "cat",
          requires: ["reconciliation-access.conf"],
          help: "cat /opt/fenmorebatch/reconciliation-access.conf",
          requiresFlags: ["have_shell"],
          run: () => ({
            completesObjective: "loot",
            tone: "success",
            setsFlags: ["have_loanservicing_cred"],
            note: "Fenmore Batch Operations host holds a standing write-capable credential into reconciliation-master, issued for legitimate nightly batch delivery",
            output: [
              "batch_delivery_role=fenmore-batch-writer",
              "target=reconciliation-master",
              "scope=write",
              "",
              "[!] this legacy batch host has standing write access into the exact job the entire campaign",
              "    has been building toward. it was issued for a legitimate reason, and it's still just as",
              "    dangerous sitting on an unpatched deserialization bug.",
            ],
          }),
        }),
        {
          id: "secure",
          tool: "secure",
          match: match.startsWith("secure system", "secure", "remediate"),
          help: "secure system",
          requiresObjectives: ["loot"],
          deniedOutput: ["confirm what this host's access actually reaches before you file the fix."],
          run: () => ({
            completesObjective: "secure",
            tone: "success",
            setsFlags: ["ep5_complete"],
            output: [
              "[+] removed raw deserialization from the import path entirely",
              "[+] replaced it with a signed, schema-validated batch format",
              "[+] flagged the standing fenmore-batch-writer credential for the reconciliation-master access review",
              "",
              "FENMORE BATCH OPERATIONS: SECURED",
              "",
              "=== EPISODE 5 COMPLETE ===",
            ],
          }),
        },
      ],
    },
  ],
};
