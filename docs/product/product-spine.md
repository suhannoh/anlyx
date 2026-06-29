# Anlyx Product Spine

## Purpose

This document is the product centerline for Anlyx. When implementation, UI, adapter behavior, or wording feels unclear, use this document to decide whether the work is still aligned.

Anlyx is not a generic network logger, Swagger replacement, static call graph viewer, or production tracing system.

Anlyx is:

```txt
A local Project JSON viewer that shows pages, features, requests, flows,
architecture, evidence, and optional measurements authored by the user's AI Agent.
```

Older analysis experiments may become Project JSON producers later, but they are
not the primary product path.

## Core Question

Every primary Anlyx screen must answer this question before anything else:

```txt
What does this project do, which pages and requests matter, how do they connect
through the architecture, and what evidence supports those claims?
```

The user should not need a first-party deep scanner before Anlyx is useful. An
AI Agent, manual author, runtime capture, telemetry import, or future adapter can
produce Project JSON, then Anlyx validates and visualizes it in the local 4777
viewer.

The default operating assumption is that an AI coding agent performs setup and
project-specific adaptation. Anlyx must therefore be easy for agents to read,
install, configure, validate, and run. Framework flexibility comes from a stable
data contract plus agent-authored project facts, not from Anlyx core owning
every framework integration.

## What Anlyx Must Show

Anlyx must prioritize this chain:

```txt
User action
-> API request / route
-> Controller / middleware / handler
-> Service / policy / mapper support calls
-> Repository
-> Database / external system / queue / job
-> Result / response state
```

The flow does not need to be a perfect runtime trace. It must be honest about
what is observed, measured, source-matched, agent-inferred, manual, not proven,
or unknown.

## Evidence Levels

Anlyx must distinguish these evidence levels in data, UI, and wording.

### 1. Observed Runtime Event

A request, click, server span, database query, or telemetry span observed at
runtime.

Use this for:

- Browser clicks
- Browser fetches
- Server spans
- Database query observations
- Telemetry spans

UI wording may say:

```txt
Observed
Runtime evidence
Measured
```

### 2. Source-Matched Flow

A static best-effort backend path inferred from source code or API schema.

Use this for:

- Controller, Service, Repository, DB, handler, queue, or job nodes backed by source
- OpenAPI endpoint-only flows in Basic Support
- Known downstream calls that were not live-observed

UI wording must say:

```txt
Source-matched flow
Known code path
Evidence-backed
```

### 3. Agent-Inferred Or Manual Link

A likely relationship from agent reasoning or human input without direct runtime
or source proof.

Use this for:

- Likely return mappings
- Likely indirect service calls
- Human notes that explain an unverified relationship
- Framework-specific hints that have not been observed

UI wording must not imply runtime execution or source proof.

### 4. Unknown Or Not-Proven Path

A possible path with insufficient proof, or a relationship that remains unclear.

Use this when Anlyx should preserve uncertainty instead of hiding it.

UI wording must say:

```txt
Unknown
Not proven
Needs evidence
```

It must not say:

```txt
Live request
Runtime trace
Actually passed through
```

## What Anlyx Must Not Become

Anlyx must not drift into these shapes:

- A Chrome DevTools Network clone that lists every request equally.
- A Swagger UI clone that starts from endpoint lists.
- A full static call graph that overwhelms the main path.
- A fake runtime tracer that claims server-side execution without runtime evidence.
- A Next.js-only product.
- A first-party deep analyzer for every framework.

## Primary Product Surface

The primary surface is the local 4777 viewer after Project JSON import.

```txt
anlyx.project.json
-> anlyx validate
-> anlyx import
-> localhost:4777
```

The viewer is organized around `Pages`, `Map`, and `JSON`:

- `Pages` is the default product-readable workspace.
- `Map` shows agent-authored architecture relationships.
- `JSON` exposes the raw Project JSON for agent/human inspection.

Previous live-capture experiments are historical work. They must not be
described as the primary path.

## Input Support Model

### Project JSON

Project JSON is the primary support path.

Anlyx must:

- Validate schema version `0.2.0`
- Validate page, feature, request, flow, architecture, evidence, and measurement relationships
- Render Project JSON in the 4777 viewer
- Show pages, requests, flows, architecture, evidence, and optional measurements
- Keep missing measurements disabled instead of inventing timing

### Agents And Manual Files

Agents and humans may produce Project JSON directly.

Anlyx must:

- Prefer explicit uncertainty over overclaiming
- Reject invalid measured timing
- Keep source evidence separate from runtime evidence
- Treat request and response data as redacted shapes
- Provide instructions precise enough for agents to install, configure, run,
  validate, and repair Project JSON without relying on hidden product knowledge
- Allow agents to create project-local producers or local-only probes when the
  output follows the Project JSON/runtime-event contract

### Legacy Scanners

Spring Boot, Next.js, OpenAPI, and other framework-specific logic should be
treated as possible Project JSON producers, not as the product centerline.

### OpenAPI

OpenAPI is Basic Support only.

OpenAPI-derived Project JSON may show:

- Endpoint
- Method/path
- Request/response schema when available

Anlyx must not invent internal Controller/Service/Repository/DB nodes from OpenAPI alone.

## Main Flow Selection Rules

The main drawer should focus on user-intentful requests.

Promote to the main flow when:

- A Project JSON flow or page entry identifies the user action or primary request.
- The request is not passive implementation traffic.
- The request links to meaningful downstream nodes or has a useful diagnostic.

Keep as secondary/background when:

- Session/account probes such as `GET /api/account/me`, `GET /me`, `GET /session`, `GET /profile`
- Auth support requests such as `POST /api/auth/refresh`, `GET /api/auth/session`, `GET /api/csrf`
- Saved/bookmark/favorite preload reads
- Page-view tracking
- Analytics/telemetry/metrics
- Health checks
- Polling
- Framework dev assets
- Hot reload requests

These requests should remain observable in Recent API events, but they must not steal the main flow.

## Drawer Hierarchy

The Flow Drawer should be ordered like this:

1. Flow summary
2. Main flow diagram
3. Evidence, timing, and uncertainty hints
4. Recent API events
5. Diagnostics / evidence details

The diagram is the product. Recent events are supporting context.

## Design Direction

The UI should feel like a polished local developer tool:

- Clean light by default
- Dense but readable
- Diagram-first
- Restrained color
- Small badges
- Honest confidence labels
- No decorative visuals that distract from the flow

The strongest first impression should be:

```txt
This project has these pages, requests, flows, and architecture links, with
these facts proven and these parts uncertain.
```

## Implementation Guardrails

Before adding or changing a feature, ask:

1. Does this make imported Project JSON easier to understand?
2. Does this separate runtime, source, agent, manual, not-proven, and unknown evidence?
3. Does this preserve the 4777 viewer interaction model?
4. Does this avoid adding a framework-specific primary path?
5. Does this avoid turning Anlyx into a generic network log or fake tracer?
6. Could an AI coding agent follow the docs and wire this up in an arbitrary
   local project without undocumented tribal knowledge?

If the answer is no, do not make the change.

## Current Producer Work Direction

The next producer-specific improvement should not change the product into a
framework-specific system.

It should:

- Emit Project JSON.
- Mark source-only facts as `source-matched`, not `measured`.
- Mark likely but unproven relationships as `agent-inferred` or `not-proven`.
- Explain why runtime evidence is absent when a path is not observed.
- Prefer small project-local producer/probe instructions over permanent
  framework-specific Anlyx core code.
- Use local-only measurement hooks for real timing when available, and label all
  non-measured durations as `estimate` or `unknown`.
