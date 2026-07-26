"use client";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[color:var(--color-thm-line)] p-4">
      <span className="text-[10px] tracking-widest text-[color:var(--color-thm-accent)]">{title}</span>
      <div className="mt-2 text-sm text-[color:var(--color-thm-text)] leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <code className="block bg-[color:var(--color-thm-panel)] border border-[color:var(--color-thm-line)] px-3 py-2 text-xs font-mono text-[color:var(--color-thm-text)] whitespace-pre-wrap">
      {children}
    </code>
  );
}

export default function LabSetup({ onBack }: { onBack: () => void }) {
  return (
    <div className="training-theme h-screen w-screen flex flex-col items-center overflow-y-auto px-6 py-8 gap-6">
      <div className="w-full max-w-3xl flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs tracking-widest text-[color:var(--color-thm-text-dim)] hover:text-[color:var(--color-thm-accent)] transition-colors"
        >
          ← TOOL PRACTICE
        </button>
        <span className="text-[10px] tracking-widest text-[color:var(--color-thm-text-dim)]">LAB SETUP</span>
      </div>

      <div className="w-full max-w-3xl">
        <h1 className="font-mono text-3xl md:text-4xl font-bold text-[color:var(--color-thm-accent)]">LAB SETUP</h1>
        <p className="mt-2 text-sm text-[color:var(--color-thm-text-dim)] leading-relaxed">
          Nothing in this game runs a real tool for you. The first time you do this for real — on THM,
          HTB, or your own VM — the environment itself is usually the first thing that fights back.
          None of this is difficulty; it&apos;s just unfamiliar the first time.
        </p>
      </div>

      <div className="w-full max-w-3xl flex flex-col gap-4 pb-10">
        <Section title="1. CHOOSING A PLATFORM">
          <p>
            <strong className="text-[color:var(--color-thm-text)]">Kali or Parrot in a VM</strong> (VirtualBox
            or VMware) — the standard choice. Tools preinstalled, GUI available, and snapshots let you roll back
            after breaking something, which you will.
          </p>
          <p>
            <strong className="text-[color:var(--color-thm-text)]">WSL2</strong> — faster to start, no GUI
            hassle, good for pure command-line work (pwntools, scripting). Weaker for anything needing raw
            network access or a desktop (Burp, GUI recon tools) — WSL2&apos;s networking is NAT&apos;d by default
            and some raw-socket tooling behaves oddly.
          </p>
          <p>
            <strong className="text-[color:var(--color-thm-text)]">A cloud VM</strong> (DigitalOcean, a cheap
            AWS box) — real public IP, no NAT weirdness, good once you&apos;re doing external-facing practice
            (HTB machines, bug bounty). Costs money continuously; snapshot and destroy between sessions if
            budget matters.
          </p>
          <p className="text-[color:var(--color-thm-text-dim)]">
            Recommendation if you have no strong preference yet: Kali in VirtualBox. It&apos;s what most
            walkthroughs assume, which matters when you&apos;re stuck at 1am and need to match someone else&apos;s
            exact steps.
          </p>
        </Section>

        <Section title="2. INSTALLING PWNTOOLS CORRECTLY">
          <p>Always in a virtual environment — never a bare system-wide pip install:</p>
          <Code>{`python3 -m venv venv\nsource venv/bin/activate\npip install --upgrade pip\npip install pwntools`}</Code>
          <p>
            <strong className="text-[color:var(--color-thm-text)]">Missing build tools</strong> — if the install
            fails compiling a dependency, you&apos;re missing headers, not pwntools itself:
          </p>
          <Code>{`sudo apt install -y python3-dev build-essential libssl-dev libffi-dev`}</Code>
          <p>
            <strong className="text-[color:var(--color-thm-text)]">Forgetting to activate the venv</strong> —
            by far the most common &quot;it worked yesterday&quot; complaint. If <code>python3 -c &quot;import pwn&quot;</code>{" "}
            fails with <code>ModuleNotFoundError</code>, check your prompt for the venv name first, before
            reinstalling anything.
          </p>
        </Section>

        <Section title="3. COMMON GOTCHAS">
          <p>
            <strong className="text-[color:var(--color-thm-text)]">&quot;command not found&quot; for a tool you just
            installed</strong> — pip-installed scripts land in <code>~/.local/bin</code>, which isn&apos;t always
            on $PATH by default. Check with <code>echo $PATH</code>; add it in <code>~/.bashrc</code> if it&apos;s
            missing: <code>export PATH=&quot;$HOME/.local/bin:$PATH&quot;</code>.
          </p>
          <p>
            <strong className="text-[color:var(--color-thm-text)]">&quot;Permission denied&quot; on a downloaded exploit
            script</strong> — downloading a file doesn&apos;t make it executable. <code>chmod +x script.py</code>{" "}
            (or run it explicitly as <code>python3 script.py</code>, which sidesteps the executable bit
            entirely).
          </p>
          <p>
            <strong className="text-[color:var(--color-thm-text)]">python2 vs python3</strong> — a lot of older
            public exploit code is still python2-only. If a script errors on <code>print</code> statements or{" "}
            <code>except Exception, e:</code> syntax, that&apos;s the tell. Port it or run it under a python2
            venv (<code>apt install python2</code> still exists on most distros) rather than fighting the syntax
            by hand.
          </p>
          <p>
            <strong className="text-[color:var(--color-thm-text)]">glibc version mismatches</strong> — a ret2libc
            or ROP exploit built against your local glibc will not work against a target running a different
            glibc version; offsets inside libc shift between versions. pwntools&apos; <code>context</code> and a
            matching libc binary (often provided alongside a CTF challenge) exist specifically to solve this —
            don&apos;t assume your own <code>/lib/x86_64-linux-gnu/libc.so.6</code> matches the target&apos;s.
          </p>
          <p>
            <strong className="text-[color:var(--color-thm-text)]">SSH host key changes</strong> — spinning up
            and destroying lab VMs repeatedly on the same IP will eventually trigger &quot;REMOTE HOST IDENTIFICATION
            HAS CHANGED&quot; from your own SSH client. On lab machines you control, clearing the offending line from{" "}
            <code>~/.ssh/known_hosts</code> is normal and expected — doing this against a real, unfamiliar target
            is not something to do reflexively.
          </p>
        </Section>

        <Section title="PRE-FLIGHT CHECKLIST">
          <p>Before starting any real lab session:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>venv activated, <code>python3 -c &quot;import pwn&quot;</code> succeeds with no errors</li>
            <li>VPN or lab network connectivity confirmed (<code>ping</code> the target range) before assuming a box is down</li>
            <li>a scratch directory for this session&apos;s downloaded binaries/scripts, kept separate from other sessions</li>
            <li>a notes file open and being used from the first command, not started after you&apos;re already stuck</li>
            <li>a snapshot taken if you&apos;re about to try something you&apos;re not sure is reversible</li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
