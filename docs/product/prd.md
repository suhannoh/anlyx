# PRD - Anlyx Project JSON Viewer

## Product Statement

Anlyx is a local architecture visualization viewer for AI Agent-authored
project data.

The user's AI Agent analyzes the target project, writes real project facts into
`anlyx.project.json`, and Anlyx validates, normalizes, and renders that data in
the local 4777 viewer.

Anlyx does not need to own every framework scanner. Framework flexibility comes
from the Project JSON contract plus clear agent instructions.

## Primary Workflow

```txt
AI Agent analyzes the user's project
-> AI Agent writes anlyx.project.json
-> npx anlyx validate anlyx.project.json
-> npx anlyx import anlyx.project.json
-> npx anlyx dev
-> open http://localhost:4777
```

## Product Principles

- Local first: project architecture data stays on the user's machine by default.
- JSON first: Anlyx consumes authored Project JSON instead of inventing project
  structure.
- Agent compatible: setup and authoring docs must be precise enough for a user's
  AI Agent to follow.
- Framework neutral: any framework can be supported when the Agent writes valid
  Project JSON.
- Evidence aware: observed, measured, source-matched, agent-inferred, manual,
  not-proven, and unknown claims remain distinct.
- No fake real-project data: demo/mock data must never appear in a user's real
  imported project.
- Timing optional: measurements are disabled unless real `measurements` data is
  present.

## Users

- Developers onboarding into an unfamiliar project.
- Maintainers explaining project structure to contributors.
- Product owners or planners who need a readable page/request map.
- Junior engineers learning how screens, APIs, services, and data connect.
- AI coding agents that need a stable contract for project analysis output.

## Core Surfaces

### Pages

The default workspace. It shows:

- Areas and pages.
- User-facing page story.
- Features.
- Important requests with role labels.
- Flow summaries from frontend intent to backend/data result.
- Evidence and confidence when available.

### Map

The architecture map. It shows:

- Page/request/API/controller/service/repository/database/result relationships.
- Left-to-right architecture paths.
- Shared hubs and grouped nodes when authored in Project JSON.
- Only real authored architecture data in real project mode.

### JSON

The raw data reader. It shows:

- Available Project JSON files.
- Raw JSON.
- Schema version and validation state.
- Project metadata.
- Section counts.
- Timing-disabled state when no measurements exist.

## Data Source

The primary input is:

```txt
anlyx.project.json
```

Large projects may use split files under:

```txt
.anlyx/project/
```

The normalized viewer data must still follow the Project JSON contract.

## AI Agent Responsibilities

The user's AI Agent is responsible for project-specific facts:

- Pages and routes.
- Features and user-facing descriptions.
- Requests and request roles.
- Flow steps.
- Architecture nodes and edges.
- Evidence.
- Optional measurements, only when real runtime or telemetry data exists.
- Project dictionary/localized content.

The Agent must not assume Next.js, Spring Boot, port 3000, Zup-specific folders,
or any specific framework.

## Anlyx Responsibilities

Anlyx is responsible for:

- Schema and validation.
- Local import.
- Local 4777 viewer.
- Pages, Map, and JSON rendering.
- Clear empty states for missing sections.
- Local-only behavior by default.
- Multi-language viewer chrome for Korean, English, Chinese, Japanese, and
  French.

## Phase 1 Scope

Phase 1 is complete when:

- `anlyx.project.json` is the primary documented path.
- `npx anlyx validate/import/dev` supports the Project JSON workflow.
- The viewer opens at `localhost:4777`.
- Pages, Map, and JSON render from authored data.
- Timing is hidden or disabled when `measurements` is empty.
- Agent setup and authoring instructions are current.
- Older analysis experiments no longer define the product direction.

## Out Of Scope For Phase 1

- Production tracing.
- Remote hosted analysis.
- Uploading project architecture to GitHub by default.
- Runtime timing without real measurement data.
- First-party deep support for every framework.
- Reintroducing demo data into real project mode.
- Treating OpenAPI alone as proof of internal controller/service/repository
  structure.

## Success Criteria

Anlyx succeeds when a user can install it in a local project, ask their AI Agent
to author valid Project JSON, open `localhost:4777`, and understand the
project's pages, requests, architecture, evidence, and uncertainty without
reading the whole codebase first.
