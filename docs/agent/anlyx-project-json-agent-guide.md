# Anlyx Project JSON Agent Guide

This guide is for the user's AI coding Agent. It explains how to author real
project data for Anlyx without depending on a framework-specific scanner.

## Core Rule

Anlyx provides the schema, validator, and local viewer. The user's AI Agent
provides the actual project facts.

Do not use demo data, Zup-only assumptions, fake timings, or guessed backend
paths in a real project file. If a relationship is uncertain, mark it as
`agent-inferred`, `not-proven`, or `unknown`.

## Files

Default file:

```txt
anlyx.project.json
```

Optional split files for large projects:

```txt
.anlyx/project/
  index.json
  project.json
  areas.json
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

The normalized output must match the same Project JSON contract.

## Required Workflow

1. Inspect the user's actual project.
2. Count detected routes, API usages, backend endpoints, and important source
   files before deciding how much to model.
3. Identify pages, routes, or screens.
4. Identify user-facing features on each page.
5. Identify meaningful requests and classify their role.
6. Trace known request paths through API, handler/controller, service,
   repository, database, external system, and result layers.
7. Create architecture nodes and edges for the Map tab.
8. Author `coverage` when the modeled pages/requests/flows are only a subset
   of the detected project.
9. Optionally author Overview, Capabilities, Data Lifecycle, and Impact Map
   sections when you have enough evidence.
10. Attach evidence and confidence to important claims.
11. Leave `measurements: []` unless real measured data exists.
12. Validate and import the file.
13. Open the local viewer at `http://localhost:4777`.

Commands:

```bash
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev
```

## Shortcut: `anlyx refresh`

When the user says `anlyx refresh` to an AI coding Agent, treat it as a request
to update the existing `anlyx.project.json` from the current repository changes.

Do not recreate the whole file unless the file is missing, invalid, or the user
explicitly asks for a full rewrite.

Required refresh workflow:

1. Read the existing `anlyx.project.json` first.
2. Inspect `git diff`, recently changed files, and recent commits before
   scanning unrelated code.
3. Preserve stable IDs for pages, features, capabilities, requests, flows,
   architecture nodes, architecture edges, evidence, lifecycle data, and impact
   maps.
4. Update only affected sections.
5. Add new evidence for new or changed claims.
6. Downgrade stale or uncertain relationships to `agent-inferred`,
   `not-proven`, or `unknown` instead of deleting uncertainty.
7. Update `coverage` when detected counts or modeled scope changed.
8. Keep `measurements: []` unless new real measured evidence exists.
9. Run validation and import.
10. Start the viewer when useful, or report the command the user should run.

Commands:

```bash
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev
```

Before finishing a refresh, report:

- Changed pages, requests, flows, architecture nodes, and capabilities.
- Evidence that was added, removed, or downgraded.
- Any unresolved validation issues.
- What remains uncertain.

## Top-Level Shape

```json
{
  "schemaVersion": "0.3.0",
  "project": {},
  "areas": [],
  "pages": [],
  "features": [],
  "requests": [],
  "flows": [],
  "architecture": { "nodes": [], "edges": [] },
  "evidence": [],
  "measurements": [],
  "dictionary": { "defaultLanguage": "en", "terms": [] },
  "coverage": { "status": "unknown" },
  "overview": {},
  "capabilities": [],
  "dataLifecycles": [],
  "impactMaps": []
}
```

Anlyx still accepts legacy `schemaVersion: "0.2.0"` files. If the new fields are
missing, the importer normalizes them to empty values. Use `0.3.0` when you
author the new project understanding surfaces.

## Project Metadata

Use `project.name` for the viewer project title. Use `project.generatedBy` for
the AI Agent identity shown in the viewer.

```json
{
  "project": {
    "id": "acme-app",
    "name": "Acme App",
    "analyzedAt": "2026-06-28T12:00:00.000Z",
    "frameworkNotes": ["React", "Express", "PostgreSQL"],
    "generatedBy": {
      "kind": "agent",
      "name": "Codex",
      "model": "gpt-5.5"
    }
  }
}
```

## Pages

Pages are the default product-readable entry point. They should be written in
the user's preferred language, while field names remain English.

```json
{
  "id": "page.home",
  "path": "/",
  "title": "Home",
  "areaId": "area.public",
  "description": "Landing page that introduces the product and loads featured data.",
  "featureIds": ["feature.home.hero"],
  "evidenceIds": ["evidence.home.route"],
  "confidence": "high"
}
```

Do not attach previous-page requests to the current page. If a page has no API
request, leave the request references empty and describe the page with story,
features, and evidence.

## Features And Requests

Features explain what the user can do. Requests explain the network or backend
work that supports those features.

```json
{
  "id": "feature.home.hero",
  "pageId": "page.home",
  "name": "Featured benefits",
  "description": "Shows highlighted benefits on the landing page.",
  "requestIds": ["request.home.public"],
  "evidenceIds": ["evidence.home.feature"],
  "confidence": "high"
}
```

```json
{
  "id": "request.home.public",
  "method": "GET",
  "path": "/api/public/home",
  "role": "primary",
  "purpose": "data-load",
  "flowId": "flow.home.public",
  "evidenceIds": ["evidence.home.api"],
  "confidence": "high"
}
```

Request roles:

- `primary`: the page or action's main behavior.
- `supporting`: necessary supporting data.
- `background`: auth/session/current-user checks, analytics, polling, metrics,
  and similar implementation traffic.
- `external`: third-party or cross-system calls.

## Flows

Flows are ordered layer summaries. Use them to explain a request path from
frontend/page meaning to the backend/data result.

```json
{
  "id": "flow.home.public",
  "requestId": "request.home.public",
  "name": "Load home data",
  "layers": [
    {
      "id": "layer.home.frontend",
      "kind": "frontend",
      "label": "HomePage",
      "status": "source-matched",
      "confidence": "high"
    },
    {
      "id": "layer.home.api",
      "kind": "api",
      "label": "GET /api/public/home",
      "status": "source-matched",
      "confidence": "high"
    },
    {
      "id": "layer.home.service",
      "kind": "service",
      "label": "HomeService.load",
      "status": "agent-inferred",
      "confidence": "medium"
    }
  ],
  "layerIds": ["layer.home.frontend", "layer.home.api", "layer.home.service"],
  "confidence": "medium"
}
```

Recommended order:

```txt
frontend -> request -> api -> controller/handler -> service -> repository -> database/external -> result
```

## Architecture Map

The Map tab renders only authored `architecture.nodes` and
`architecture.edges`. Build it from real project relationships.

```json
{
  "architecture": {
    "nodes": [
      {
        "id": "node.home.page",
        "kind": "frontend",
        "label": "HomePage",
        "displayLabel": "Home",
        "domain": "Public",
        "confidence": "high"
      },
      {
        "id": "node.home.service",
        "kind": "service",
        "label": "HomeService.load",
        "displayLabel": "HomeService",
        "domain": "Public",
        "confidence": "medium"
      }
    ],
    "edges": [
      {
        "id": "edge.home.page-service",
        "source": "node.home.page",
        "target": "node.home.service",
        "role": "primary",
        "confidence": "medium"
      }
    ]
  }
}
```

Edge roles:

- `primary`: the main readable path.
- `shared`: shared dependency revealed through Map interactions.
- `aggregate`: collapsed representative connection.
- `context`: supporting context.

Avoid disconnected nodes unless they are intentionally important and the missing
relationship is documented as unknown.

## Overview

Use `overview` for a light, human-readable project summary. Keep it factual and
short. It should help a new reader decide where to go next.

```json
{
  "overview": {
    "summary": "Anlyx is a local Project JSON viewer for AI Agent-authored project maps.",
    "projectType": "Local developer documentation viewer",
    "mainPurpose": "Render validated project facts without uploading source code.",
    "actors": [
      {
        "id": "actor.agent",
        "name": "AI Agent",
        "role": "external",
        "description": "Authors anlyx.project.json from project inspection.",
        "evidenceIds": ["ev.agent-guide"],
        "confidence": "high"
      }
    ],
    "coreEntities": [
      {
        "id": "entity.project-data",
        "name": "ProjectData",
        "kind": "core-entity",
        "dataRefs": [{ "kind": "model", "name": "ProjectData" }],
        "evidenceIds": ["ev.project-schema"],
        "confidence": "high"
      }
    ],
    "mainAreas": [],
    "implementation": [],
    "suggestedReadingPath": [
      {
        "id": "reading.pages",
        "label": "Pages",
        "target": "pages",
        "description": "Inspect page-level requests and flows."
      }
    ],
    "evidenceIds": ["ev.project-schema"],
    "confidence": "high"
  }
}
```

Do not use the Overview to market the project. Prefer concrete purpose, actors,
data, and implementation facts.

## Capabilities

Use `capabilities` for readable product behavior. A capability should explain
what an actor can do, where it starts, which request or flow supports it, and
what data or visible result changes.

```json
{
  "capabilities": [
    {
      "id": "capability.load-project-json",
      "actorRole": "user",
      "name": "Load Project JSON",
      "description": "The local viewer loads the current anlyx.project.json.",
      "entry": {
        "type": "page",
        "label": "Viewer workspace",
        "pageId": "page.workspace",
        "path": "/"
      },
      "pageIds": ["page.workspace"],
      "featureIds": ["feature.pages"],
      "requestIds": ["request.project-data"],
      "flowIds": ["flow.project-data"],
      "dataRefs": [{ "kind": "model", "name": "ProjectData", "operation": "read" }],
      "status": "connected",
      "visibleResult": "The workspace renders Pages, Map, Overview, Capabilities, and JSON from ProjectData.",
      "evidenceIds": ["ev.dev-command"],
      "confidence": "high"
    }
  ]
}
```

Status rules:

- `connected`: screen, request/flow, and data are connected.
- `ui-only`: UI is known, but request/flow is not found.
- `api-only`: API is known, but product entry is unclear.
- `data-only`: data is known, but product behavior is unclear.
- `inferred`: relationship is plausible but not proven.
- `unknown`: not enough evidence.

## Data Lifecycles

Use `dataLifecycles` for core entities whose product state or visibility changes
matter. Do not generate a lifecycle for every table.

```json
{
  "dataLifecycles": [
    {
      "id": "lifecycle.project-data",
      "entity": {
        "id": "entity.project-data",
        "name": "ProjectData",
        "kind": "core-entity"
      },
      "name": "ProjectData lifecycle",
      "description": "How authored project facts become validated viewer data.",
      "stageIds": ["stage.authored", "stage.loaded", "stage.rendered"],
      "stages": [
        {
          "id": "stage.authored",
          "name": "Authored JSON",
          "description": "The AI Agent writes anlyx.project.json.",
          "actorRole": "external",
          "state": "authored",
          "dataRefs": [{ "kind": "model", "name": "ProjectData", "operation": "create" }],
          "confidence": "high"
        }
      ],
      "transitions": [],
      "evidenceIds": ["ev.project-schema"],
      "confidence": "medium"
    }
  ]
}
```

When a transition is unclear, omit it or mark its evidence as `unknown` /
`not-proven`; do not fill gaps with confident fiction.

## Impact Maps

Use `impactMaps` to show product impact scope. It is not a raw source dependency
graph. Prefer central fields, entities, permissions, status values, or public
visibility flags whose changes affect multiple surfaces.

```json
{
  "impactMaps": [
    {
      "id": "impact.project-data",
      "name": "ProjectData impact",
      "description": "What changes when the ProjectData contract changes.",
      "target": {
        "id": "target.project-data",
        "kind": "entity",
        "label": "ProjectData",
        "dataRef": { "kind": "model", "name": "ProjectData" }
      },
      "impactLevel": "high",
      "affected": {
        "pageIds": ["page.workspace", "page.map", "page.json"],
        "requestIds": ["request.project-data"],
        "dataRefs": [{ "kind": "model", "name": "ArchitectureGraph" }],
        "businessEffects": [
          {
            "id": "effect.viewer-rendering",
            "label": "Viewer rendering changes",
            "severity": "high"
          }
        ]
      },
      "summary": ["Changing ProjectData can affect every viewer surface."],
      "evidenceIds": ["ev.project-schema"],
      "confidence": "medium"
    }
  ]
}
```

Evidence remains support data. Do not add an `Evidence` tab or duplicate all
evidence details into these human-facing sections.

### Optional Map Inspector Data Contracts

The Map canvas should stay focused on the full project structure. If you know
what a node receives or returns, add compact optional contract metadata so the
right inspector can explain DTOs, entities, JSON shapes, and transforms.

Do not make this metadata mandatory. Many projects will not expose enough source
or schema information to prove every DTO. Missing contract metadata is valid and
will be shown as `No contract authored`.

Recommended shape:

```json
{
  "id": "node.project-api",
  "kind": "api",
  "label": "GET /api/project-data",
  "displayLabel": "Project data",
  "metadata": {
    "contracts": {
      "endpoint": "GET /api/project-data",
      "input": {
        "name": "None",
        "shape": null
      },
      "output": {
        "name": "ProjectData",
        "kind": "dto",
        "shape": {
          "schemaVersion": "string",
          "project": "ProjectInfo",
          "pages": "ProjectPage[]",
          "features": "ProjectFeature[]",
          "architecture": "ArchitectureGraph"
        }
      },
      "relatedModels": [
        "ProjectData",
        "ArchitectureNode",
        "ArchitectureEdge"
      ]
    }
  },
  "confidence": "high"
}
```

For service or mapper nodes, prefer short transform summaries:

```json
{
  "metadata": {
    "contracts": {
      "input": { "name": "anlyx.project.json" },
      "output": { "name": "ProjectData", "kind": "dto" },
      "transforms": [
        "validate schema",
        "normalize split files",
        "build workspace model"
      ],
      "mapping": "Raw split files -> normalized project model"
    }
  }
}
```

Rules:

- Use relative paths, DTO names, entity names, and redacted shape summaries.
- Keep `shape` to the important 5-8 fields. Do not paste full source types.
- Use `source-matched` evidence only when the DTO/entity/shape is backed by
  source, schema, OpenAPI, or generated types and you can point to the actual
  file, symbol, and line.
- Use `agent-inferred` or omit fields when the model relationship is a reasoned
  guess.
- Never include secrets, sample production records, tokens, cookies, or personal
  data in shapes.

## Evidence

Evidence keeps Anlyx honest.

```json
{
  "id": "evidence.home.api",
  "status": "source-matched",
  "label": "Route handler defines GET /api/public/home",
  "source": {
    "filePath": "src/routes/home.ts",
    "symbol": "getHome",
    "lineStart": 14,
    "lineEnd": 34
  },
  "targetIds": ["request.home.public", "layer.home.api"],
  "confidence": "high"
}
```

Allowed statuses:

```txt
observed
measured
source-matched
agent-inferred
manual
not-proven
unknown
```

Use `source-matched` only when all of these are true:

- `filePath` exists in the repository.
- The named class, function, symbol, endpoint, DTO, or schema appears in that
  file.
- `lineStart` points to the actual symbol or endpoint location.
- Frontend request paths and backend endpoint paths match by real code, not by
  naming similarity.

Do not use `lineStart: 1` as a placeholder. If you cannot find the real line,
omit the line or downgrade the claim to `agent-inferred`, `not-proven`, or
`unknown`.

Use `measured` only for real runtime or telemetry measurements.

## Coverage

Coverage keeps partial analysis honest.

Before writing the final JSON, compare detected project size with modeled
Project JSON size. If the modeled subset is smaller, set `coverage.status` to
`partial`.

```json
{
  "coverage": {
    "status": "partial",
    "detected": {
      "pages": 46,
      "backendEndpoints": 89
    },
    "modeled": {
      "pages": 13,
      "requests": 17,
      "flows": 7,
      "architectureNodes": 42
    },
    "unmodeled": {
      "pages": ["/admin/publish", "/admin/import/ai-json"],
      "requests": [],
      "endpoints": ["GET /api/admin/reviews"],
      "notes": ["Admin maintenance and collection flows need a second pass."]
    }
  }
}
```

Do not imply complete coverage unless detected and modeled counts match, or the
user explicitly asked for a representative subset.

## Measurements

Measurements are optional and disabled by default.

Use:

```json
"measurements": []
```

Only add measurements when the user explicitly asks for runtime timing and the
Agent has real local telemetry or runtime evidence. Do not split one browser
duration into fake service/repository/database timings.

## Language

Viewer shell translations are limited to:

```txt
ko, en, zh, ja, fr
```

Project text such as page descriptions, feature names, request explanations,
and evidence labels should be authored by the user's AI Agent in the user's
language. Prefer the user's conversation language and the product UI language.
Keep API paths, filenames, class names, functions, enums, and DTO names in their
original code form. If no preference is known, use English.

## Security

Keep Anlyx local-first.

- Do not commit private project JSON by default.
- Do not include secrets, tokens, cookies, credentials, raw authorization
  headers, production records, or personal data.
- Prefer relative file paths, symbols, redacted examples, and schema shapes.
- Mark sensitive or unavailable relationships as unknown rather than copying
  private data.

## Completion Statement

When done, report concrete counts and gaps:

```txt
Anlyx Level 2 setup is complete.
Viewer: http://localhost:4777
Data: anlyx.project.json
Pages: 12
Requests: 31
Flows: 18
Map: 84 nodes / 126 edges
Evidence: 76
Measurements: 0, so Timing is disabled
Known unknowns: payment webhook runtime path not proven
```
