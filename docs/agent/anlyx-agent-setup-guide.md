# Anlyx Agent Setup Guide

This guide tells AI coding agents how to install, configure, author, validate,
and open Anlyx in a user's local project.

Use this guide with:

- Project JSON authoring: [`anlyx-project-json-agent-guide.md`](./anlyx-project-json-agent-guide.md)
- Data contract: [`../contracts/data-contract.md`](../contracts/data-contract.md)
- Readiness checks: [`anlyx-agent-readiness-checklist.md`](./anlyx-agent-readiness-checklist.md)
- Optional measured timing: [`anlyx-local-probe-contract.md`](./anlyx-local-probe-contract.md)

## Setup Goal

```txt
Install Anlyx
-> inspect the user's project
-> write anlyx.project.json
-> validate/import project data
-> open the local 4777 viewer
```

The default Anlyx path is static, Agent-authored project visualization. The
viewer renders the JSON written by the user's Agent. It does not secretly scan
or infer the user's framework by itself.

## Responsibility Boundary

Anlyx provides:

- Local viewer/runtime on port `4777`.
- JSON schema and validation.
- Pages, Map, Overview, Capabilities, and JSON viewer surfaces.
- Optional Data Lifecycle and Impact Map contract data may exist, but they are
  not primary navigation surfaces in the default viewer.
- Evidence, confidence, and timing-disabled states.

The installing AI Agent provides:

- Project pages, routes, features, requests, flows, architecture nodes, and
  evidence.
- The final `anlyx.project.json` file.
- Conservative status and confidence values.
- Optional measurements only when real local runtime or telemetry evidence
  exists.

Do not claim Anlyx has analyzed the project until the Agent-authored project
file exists and validates.

## Completion Levels

Agents MUST report the completed level.

### Level 1: Project Viewer

Complete when:

- `anlyx.project.json` exists in the project root.
- It follows schema version `0.2.0` or `0.3.0`.
- Validation/import succeeds.
- `anlyx dev` opens the 4777 viewer.
- The viewer shows authored project surfaces from the project file. Pages, Map,
  Overview, Capabilities, and JSON should render in the default viewer.

This is the default expected setup.

### Level 2: Project Viewer With Architecture Map

Complete when Level 1 is done and:

- `architecture.nodes` and `architecture.edges` contain real Agent-authored
  project relationships.
- The Map view shows only authored nodes/edges.
- Empty or unknown architecture is shown as an empty state, not fake demo data.

### Level 3: Project Viewer With Measurements

Complete only when:

- `measurements` contains real local runtime or telemetry data.
- Each measurement points to a real page, request, flow node, architecture node,
  or edge.
- Evidence explains where the measurement came from.
- Timing UI is enabled because measurements exist.

If `measurements` is empty, timing is disabled by design.

## Required Inputs

Before writing files, inspect the target project and identify:

- Project root.
- Package manager and install command.
- Local dev command.
- Frontend URL, if applicable.
- Backend URL, if applicable.
- Frameworks and routing systems.
- Source directories.
- Page/route list.
- Detected page/route count, frontend API usage count, and backend endpoint
  count.
- API clients, route handlers, controllers, services, repositories, jobs,
  database models/tables, and external systems.
- Whether the project contains sensitive data that should be excluded.

Do not assume port `3000`, Next.js, Spring Boot, or any Zup-specific structure.
Zup is only a test project.

## Required Files

Create or update:

```txt
anlyx.project.json
anlyx.config.ts
```

Recommended setup notes:

```txt
.anlyx/agent/setup-notes.md
```

For large projects, split files may be used:

```txt
.anlyx/project/
  index.json
  pages.json
  features.json
  requests.json
  flows.json
  architecture.json
  evidence.json
  measurements.json
  dictionary.json
  coverage.json
```

The CLI may normalize split files into `anlyx.project.json`.

## Install And Run

Preferred local setup:

```bash
npm install -D anlyx@beta
npx anlyx init
npx anlyx prompt init
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev
```

The viewer should open at:

```txt
http://localhost:4777
```

If the published npm package is behind the repository, report that directly.
Do not fall back to removed scanner commands or invent project data.

Prompt helpers:

```bash
npx anlyx prompt init
npx anlyx prompt refresh
```

`prompt init` prints the copy-ready first setup prompt. `prompt refresh` prints
the update prompt for an existing `anlyx.project.json`.

When the user later types `anlyx refresh` in an AI coding Agent, treat that as
the shortcut for the refresh workflow: read the existing project file, inspect
only relevant changed files first, preserve stable IDs, update only affected
sections, validate, import, and report remaining uncertainty.

## Authoring Workflow

1. Discover project pages/routes.
2. Group pages into authored areas.
3. For each page, describe the user-facing story and features.
4. Identify meaningful requests and classify their role:
   `primary`, `supporting`, `background`, or `external`.
5. Write flows from frontend/page meaning to API, handler/controller, service,
   repository, database, external systems, and result when known.
6. Write architecture nodes/edges for the Map view.
7. Attach evidence and confidence to important claims.
8. Leave `measurements: []` unless real measurements exist.
9. Validate and import.
10. Open the 4777 viewer and confirm the authored surfaces match the file.
    Pages, Map, and JSON should always be checked; optional `0.3.0` surfaces
    should be checked when authored.

## Request Role Rules

- `primary`: the page or action's main product behavior.
- `supporting`: necessary supporting request.
- `background`: auth/session/current-user checks, analytics, polling,
  framework revalidation, health checks, metrics, and similar implementation
  traffic.
- `external`: third-party or cross-system request.

Do not promote the first, last, or most visible request to `primary` unless it
actually explains the page/action.

## Evidence Rules

Every important claim SHOULD cite evidence:

- Source file and symbol.
- Route definition.
- API client call.
- Controller/handler method.
- Service/repository/database code.
- Runtime or telemetry record, if actually observed.
- Manual user note, if provided.

Use weaker statuses when uncertain:

```txt
observed
measured
source-matched
agent-inferred
manual
not-proven
unknown
```

Source evidence is not measured runtime evidence.

`source-matched` requires a real file path, a real symbol or endpoint match, and
an actual line number. Do not use `lineStart: 1` as a placeholder. If the Agent
cannot verify the file, symbol, endpoint, or line, use `agent-inferred`,
`not-proven`, or `unknown` instead.

If the authored JSON covers only part of the detected project, add
`coverage.status = "partial"` with detected and modeled counts. Import writes
`.anlyx/validation-report.json`; review its source and coverage warnings before
claiming setup is complete.

## Timing Rules

Measured timing is optional and disabled by default.

Do not create local probes unless the user explicitly wants measured runtime
timing. For the default Anlyx setup, `measurements: []` is correct.

If timing is requested:

- Read the Local Probe Contract.
- Keep the probe local-only.
- Attach measurement evidence.
- Do not attribute browser request duration to internal layers without real
  layer-level spans.

## Security Rules

Anlyx is intended to run locally.

Do not write:

- Secrets, cookies, tokens, private credentials, raw auth headers.
- Production user records.
- Private customer data.
- Full proprietary source files.

Prefer shapes, relative file paths, symbols, and line ranges.

## Final Report Format

When done, report:

- Completed level: 1, 2, or 3.
- Viewer URL.
- File written: `anlyx.project.json` or split files.
- Validation/import result.
- Number of pages, requests, flows, architecture nodes/edges, evidence items,
  and measurements.
- Known unknowns or unverified areas.
