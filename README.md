# BREACHLINE

A terminal-driven hacking training game. Real methodology, fictional targets.

CtOS/Watch Dogs-style dark-cyan HUD aesthetic. The "game" is a US map of chained,
fictional organizations — recon → exploit → escalate → pivot → remediate, typed out
in an actual command shell, no minigames. Built as a study tool for practicing the
mental loop pentesting actually runs on, not for exploit trivia.

Three difficulties, each a complete, self-contained operation:

| Difficulty | Chain | Targets | Techniques |
|---|---|---|---|
| Easy | Grid Exposure | 1 org | recon, directory enumeration, exposed backup file, credential reuse |
| Medium | Shared Infrastructure | 2 orgs | IDOR / broken object-level auth, multi-tenant pivoting, trust-the-header RCE |
| Hard | The Long Way In | 3 orgs | unrestricted file upload, sudo privesc, SSH key harvesting, internal pivoting, over-scoped API credentials |

Nothing here targets real infrastructure. All IPs use the RFC 5737 documentation
ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`); every organization,
IP, and vulnerable service is invented for this game.

## Running it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Progress is saved locally in the browser (localStorage) —
no account, no backend, no database.

## Stack

Next.js (App Router) + React + TypeScript + Tailwind CSS v4. No external game engine,
no fetch/network calls from the "terminal" — every command's output is scripted data
in `lib/game/chains/*.ts`, resolved by a small command-matching engine in
`lib/game/engine.ts`.

## Structure

```
lib/game/
  types.ts        — core data model (chains, nodes, objectives, commands)
  engine.ts        — command resolution / matching
  storage.ts        — localStorage save/load
  chains/
    easy.ts, medium.ts, hard.ts   — the actual mission content
components/
  Game.tsx         — top-level screen state machine
  Terminal.tsx       — the interactive shell
  UsMap.tsx         — the stylized operation map
  ...
```
