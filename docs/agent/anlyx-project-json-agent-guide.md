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
```

The normalized output must match the same Project JSON contract.

## Required Workflow

1. Inspect the user's actual project.
2. Identify pages, routes, or screens.
3. Identify user-facing features on each page.
4. Identify meaningful requests and classify their role.
5. Trace known request paths through API, handler/controller, service,
   repository, database, external system, and result layers.
6. Create architecture nodes and edges for the Map tab.
7. Attach evidence and confidence to important claims.
8. Leave `measurements: []` unless real measured data exists.
9. Validate and import the file.
10. Open the local viewer at `http://localhost:4777`.

Commands:

```bash
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev
```

## Top-Level Shape

```json
{
  "schemaVersion": "0.2.0",
  "project": {},
  "areas": [],
  "pages": [],
  "features": [],
  "requests": [],
  "flows": [],
  "architecture": { "nodes": [], "edges": [] },
  "evidence": [],
  "measurements": [],
  "dictionary": { "defaultLanguage": "en", "terms": [] }
}
```

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

## Evidence

Evidence keeps Anlyx honest.

```json
{
  "id": "evidence.home.api",
  "status": "source-matched",
  "label": "Route handler defines GET /api/public/home",
  "source": {
    "file": "src/routes/home.ts",
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

Use `source-matched` for static source evidence. Use `measured` only for real
runtime or telemetry measurements.

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
language. If no preference is known, use English.

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
