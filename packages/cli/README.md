# Anlyx

CLI for Anlyx Project JSON validation, import, and local viewing.

Anlyx renders `anlyx.project.json` in a local 4777 viewer:

```txt
Pages -> Features -> Requests -> Flows -> Architecture -> Evidence
```

The current primary path is Project JSON first. New setups should start from
`anlyx.project.json`.

## Quick Start

```bash
npm install -D anlyx@beta
npx anlyx prompt init
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev
```

Then open:

```txt
http://localhost:4777
```

## What It Shows

- Pages and page groups authored by the user's AI Agent
- Features and requests connected to each page
- Flow summaries from frontend/request/API through backend/data/result layers
- Architecture Map from agent-authored nodes and edges
- Evidence labels for observed, measured, source-matched, agent-inferred, manual, not-proven, and unknown claims
- Timing only when `measurements` exist
- Raw JSON inspection for `anlyx.project.json`

## Supported

Primary:

- `anlyx.project.json`
- `.anlyx/project/*.json` split project files
- `npx anlyx validate <file>`
- `npx anlyx import <file>`
- `npx anlyx dev` for the local viewer

## Commands

```bash
npx anlyx init
npx anlyx prompt init
npx anlyx prompt refresh
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev
npx anlyx --help
```

See the full documentation on GitHub:

https://github.com/suhannoh/anlyx
