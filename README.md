<p align="center">
  <img src="./docs/assets/brand/anlyx-logo-card.png" alt="Anlyx" width="460" />
</p>

<h3 align="center">Review AI-generated codebase maps locally.</h3>

<p align="center">
  Anlyx validates <code>anlyx.project.json</code> from your coding agent and opens
  a local workspace for pages, API flows, architecture paths, evidence, and unknowns.
</p>

<p align="center">
  <a href="https://suhannoh.github.io/anlyx/"><strong>Live Demo</strong></a>
  ·
  <a href="https://suhannoh.github.io/anlyx/docs">Docs Site</a>
  ·
  <a href="https://suhannoh.github.io/anlyx/demo">Workspace Demo</a>
  ·
  <a href="#quick-start">Quick Start</a>
  ·
  <a href="#agent-first-workflow">Agent-First Workflow</a>
  ·
  <a href="./README.ko.md">한국어</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/anlyx"><img alt="npm" src="https://img.shields.io/npm/v/anlyx?color=2563eb"></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/github/license/suhannoh/anlyx?color=0f172a"></a>
  <a href="https://github.com/suhannoh/anlyx/actions/workflows/ci.yml"><img alt="ci" src="https://img.shields.io/github/actions/workflow/status/suhannoh/anlyx/ci.yml?branch=main&label=ci"></a>
  <a href="https://suhannoh.github.io/anlyx/"><img alt="demo" src="https://img.shields.io/badge/demo-GitHub%20Pages-16a34a"></a>
</p>

## What It Does

Anlyx is a local viewer for reviewing AI-generated codebase maps.

It is built for the AI Agent era: ask your coding agent to inspect a repository
and write `anlyx.project.json`. Anlyx validates that file and renders it as a
local review workspace on `localhost:4777`.

Anlyx answers:

```txt
What pages exist, what do they do, which requests do they trigger,
how do those requests travel through the system, and what evidence supports it?
```

Anlyx is not an automatic deep scanner for every framework. Instead:

- The user's AI Agent owns project analysis.
- Anlyx owns the schema, validation, local viewer, and visual language.
- Real project facts come from `anlyx.project.json`, not demo mocks.
- Optional runtime measurements are shown only when measured data exists.

## Fastest Start: Ask Your Coding Agent

The recommended first run is not to hand-write JSON. Paste this into Codex,
Claude Code, Cursor, or another coding agent inside the project you want to map:

```txt
Install Anlyx with npm install -D anlyx@beta.
Read https://github.com/suhannoh/anlyx and the Project JSON agent guide.
Analyze this repository and create anlyx.project.json.
Include pages, requests, flows, architecture nodes, evidence, overview, and capabilities when you can support them.
Do not invent facts. Mark uncertain links as agent-inferred, not-proven, or unknown.
Run:
  npx anlyx validate anlyx.project.json
  npx anlyx import anlyx.project.json
  npx anlyx dev
Open http://localhost:4777 and report what is source-matched, inferred, or still unknown.

Remember this shortcut for later:
When I type "anlyx refresh", update the existing anlyx.project.json from current repository changes instead of recreating everything.
```

This is the core Anlyx workflow:

```txt
AI Agent analyzes your repo
-> writes anlyx.project.json
-> Anlyx validates and imports it
-> localhost:4777 shows the local review workspace
```

## Why Developers Use It

| Instead of...                                                | Anlyx gives you...                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Asking an agent for prose that disappears                    | A validated project JSON file that can be reopened locally                |
| Reading code before understanding the product                | Pages, features, requests, flows, evidence, and architecture in one place |
| Mixing guessed paths with real evidence                      | Explicit `observed`, `source-matched`, `agent-inferred`, and unknown data |
| Waiting for one built-in analyzer to support every framework | Agent-authored JSON for any stack the user's agent can inspect            |
| Sending architecture data to a remote service                | A local-only 4777 viewer                                                  |
| Trusting fake timing                                         | Timing disabled unless real `measurements` are present                    |

## Quick Start

```bash
npm install -D anlyx@beta
npx anlyx prompt init
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev
```

Then open the local viewer:

```txt
http://localhost:4777
```

The primary file is:

```txt
anlyx.project.json
```

For later updates, ask your coding agent to run the refresh shortcut:

```txt
anlyx refresh
```

Or print a copy-ready refresh prompt from the CLI:

```bash
npx anlyx prompt refresh
```

The refresh workflow reads the existing `anlyx.project.json`, checks changed
files first, preserves stable IDs, updates only affected sections, then runs
validate/import again.

For large projects, agents may split it under:

```txt
.anlyx/project/
  index.json
  project.json
  overview.json
  pages.json
  features.json
  capabilities.json
  requests.json
  flows.json
  architecture.json
  evidence.json
  dataLifecycles.json
  impactMaps.json
  measurements.json
  dictionary.json
```

## Current Viewer

The local 4777 viewer is organized around five surfaces:

| Surface      | Purpose                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| Pages        | Product-readable page index, page story, features, requests, flow summary, and evidence |
| Map          | Agent-authored architecture map from frontend/page/request to backend/data nodes        |
| Overview     | README-like project introduction from authored overview and stack facts                 |
| Capabilities | Product behavior verification surface from authored capabilities                        |
| JSON         | Readable raw `anlyx.project.json` inspection surface                                    |

Timing is intentionally optional. If the project file has no real
`measurements`, the UI shows timing as disabled rather than pretending that
source analysis is runtime data.

## Agent-First Workflow

Give your coding agent these instructions:

```txt
Read docs/agent/anlyx-agent-setup-guide.md first.
Read docs/agent/anlyx-project-json-agent-guide.md for the project JSON contract.
Read docs/agent/anlyx-agent-implementation-contract.md for file and naming rules.
Read docs/agent/anlyx-agent-readiness-checklist.md before reporting completion.
Read docs/agent/anlyx-local-probe-contract.md only if real timing is required.

Install Anlyx in this project.
Analyze the actual application structure, routes, requests, backend layers,
data stores, and evidence.
Write anlyx.project.json without inventing facts.
Run anlyx validate, anlyx import, and anlyx dev.
Open http://localhost:4777.
```

The agent may analyze Spring Boot, Next.js, Express, NestJS, FastAPI, Rails,
Laravel, Django, or another stack. Anlyx does not require the project to match
any sample app. The output must match the Anlyx Project JSON contract.

## Data Contract

The top-level shape is:

```json
{
  "schemaVersion": "0.3.0",
  "project": {},
  "overview": {},
  "areas": [],
  "pages": [],
  "features": [],
  "capabilities": [],
  "requests": [],
  "flows": [],
  "architecture": {},
  "evidence": [],
  "dataLifecycles": [],
  "impactMaps": [],
  "measurements": [],
  "dictionary": { "defaultLanguage": "en", "terms": [] }
}
```

See:

- [`docs/contracts/data-contract.md`](./docs/contracts/data-contract.md)
- [`docs/agent/anlyx-project-json-agent-guide.md`](./docs/agent/anlyx-project-json-agent-guide.md)
- [`docs/agent/anlyx-agent-setup-guide.md`](./docs/agent/anlyx-agent-setup-guide.md)
- [`docs/agent/anlyx-agent-readiness-checklist.md`](./docs/agent/anlyx-agent-readiness-checklist.md)

Legacy `anlyx.flow.json` files are still documented as historical imports, but
new setups should use `anlyx.project.json`.

## Security Model

Anlyx is local-first.

- Prefer the local 4777 viewer.
- Do not upload project JSON to GitHub or public issue trackers by default.
- Redact secrets, tokens, cookies, credentials, production records, and personal data.
- Store only shapes, references, source evidence, and redacted examples.
- Mark missing evidence as `unknown` or `not-proven` instead of guessing.

## Demo Assets

The public site lives in `apps/demo`:

```bash
corepack pnpm docs:readme-demo
corepack pnpm demo:dev
corepack pnpm demo:build
```

The GitHub Pages site is configured for `https://suhannoh.github.io/anlyx/`.

## Development Setup

Anlyx uses a pnpm workspace with TypeScript, ESLint, Prettier, and Vitest.

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm format
corepack pnpm -r build
```

Release packaging is checked with local build and pack dry-runs. See
[`docs/release/npm-publish-preflight.md`](./docs/release/npm-publish-preflight.md)
and [`docs/release/release-runbook.md`](./docs/release/release-runbook.md).

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md),
[`SECURITY.md`](./SECURITY.md), the [`Roadmap`](./docs/product/roadmap.md), and
the [`Adapter Development Guide`](./docs/adapters/adapter-development.md).

## Release Notes

See [`docs/release/v0.1.6-beta.1.md`](./docs/release/v0.1.6-beta.1.md) for the
current beta release notes draft.
