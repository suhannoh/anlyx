# Anlyx Product Spine

## Purpose

This document is the product centerline for Anlyx. When implementation, UI, adapter behavior, or wording feels unclear, use this document to decide whether the work is still aligned.

Anlyx is not a generic network logger, Swagger replacement, static call graph viewer, or production tracing system.

Anlyx is:

```txt
An interaction-first local development tool that shows what happened after I used the real app, and how that request maps into the scanned backend flow.
```

## Core Question

Every primary Anlyx screen must answer this question before anything else:

```txt
I just clicked this in the real app. What API fired, and where does that request go in the backend?
```

The user should not start by selecting an endpoint from a list. The user should use the app normally, then Anlyx should explain the resulting flow.

## What Anlyx Must Show

Anlyx must prioritize this chain:

```txt
User action
-> Browser-observed API request
-> Matched scanned backend endpoint
-> Controller
-> Service / policy / mapper support calls
-> Repository
-> Database table
-> Result / response state
```

The flow does not need to be a perfect runtime trace in v0.1. It must be honest about what is live, what is scanned, and what is inferred.

## Evidence Levels

Anlyx must distinguish these evidence levels in data, UI, and wording.

### 1. Live Browser Event

A request observed by the development-only browser capture runtime through `fetch` or `XMLHttpRequest`.

Use this for:

- React SPA user actions
- Next.js client component requests
- Form submits
- Button-triggered API calls
- Client navigation follow-up API calls when they are not passive noise

UI wording may say:

```txt
Captured request
Browser-observed
User action
```

### 2. Scanned Backend Flow

A static best-effort backend path inferred from source code or API schema.

Use this for:

- Controller, Service, Repository, DB nodes from Spring Boot
- OpenAPI endpoint-only flow in Basic Support
- Known downstream calls that were not live-observed

UI wording must say:

```txt
Scanned backend flow
Known code path
Confidence high/medium/low/unknown
```

### 3. Scanned Frontend / Page Link

A page route or manual URL known from a frontend adapter or capture.

Use this for:

- Next.js App Router page files
- Manual frontend URLs for React SPA/Vite/CRA/custom apps
- Playwright-captured page API calls

UI wording must not imply a live click if the evidence came from capture or scan only.

### 4. Inferred Server-Side Fetch

A likely server-side frontend fetch, such as a Next.js Server Component data load, inferred from scanned page code or capture context.

Use this only as an honest hint until a server runtime bridge exists.

UI wording must say:

```txt
Scanned server-side fetch
Inferred from page code
Not browser-live
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
- A generic all-framework deep analyzer in v0.1.

## Primary Product Surface

The primary surface is a separate full-page Anlyx Workspace that listens to the real local app.

```txt
localhost:3000 or 5173 or another frontend.baseUrl = real app
localhost:4777 = Anlyx runtime assets, live workspace, report data, debug viewer
```

The developer uses the app normally and keeps Anlyx Workspace open beside it. A small capture badge in the app is allowed as an entry point, but a large overlay, modal, or drawer is not the primary product experience.

## Frontend Support Model

### Next.js App Router

Next.js App Router is the v0.1 frontend Deep Support path.

Anlyx may:

- Discover `app/**/page.*`
- Link scanned pages to backend endpoints
- Capture representative pages with Playwright
- Install the development-only browser capture runtime from a Next.js helper or equivalent local script
- Show server-side data fetches as scanned/inferred until a real server bridge exists

### React SPA / Vite / CRA / Custom React Router

React SPA compatibility is required, but React Router Deep Support is not part of v0.1.

Anlyx must support these apps through:

- `frontend.type = "manual"`
- Explicit URL list
- Development-only browser capture script
- Browser-observed `fetch` and `XMLHttpRequest`
- Spring backend flow matching

Anlyx must not require Next.js for browser capture or the live workspace.

## Backend Support Model

### Spring Boot

Spring Boot is the v0.1 backend Deep Support path.

Anlyx should infer:

- Endpoint
- Controller
- Service
- Repository
- Database table
- Main Flow
- Support calls
- Confidence and evidence

### OpenAPI

OpenAPI is Basic Support only.

Anlyx may show:

- Endpoint
- Method/path
- Request/response schema when available

Anlyx must not invent internal Controller/Service/Repository/DB nodes from OpenAPI alone.

## Main Flow Selection Rules

The workspace selection should focus on user-intentful requests.

Promote to the main flow when:

- A recent user action caused a browser API request.
- The request is not passive implementation traffic.
- The request matches a scanned endpoint or has a meaningful unmatched diagnostic.

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

These requests should remain observable in Recent events, but they must not steal the selected main flow.

## Workspace Hierarchy

The full-page Workspace should be ordered like this:

1. Recent events list
2. Selected request summary with method, path, status, duration, and confidence
3. Summary / Timing / Diagram tabs for the same selected request
4. Evidence inspector with live browser evidence, scanned backend match, inferred or not-proven states, and notes
5. Diagnostics when a request is unmatched, failed, pending, or unknown

The workspace is the product. Recent events are the entry point, and the selected request explains the backend path.

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
This click went to this endpoint, through this backend path.
```

## Implementation Guardrails

Before adding or changing a feature, ask:

1. Does this make the user's recent app interaction easier to understand?
2. Does this separate live evidence from scanned or inferred evidence?
3. Does this work for React SPA through the common browser-capture path?
4. Does this keep Next-specific behavior inside the Next adapter or a clearly named Next integration?
5. Does this avoid turning Anlyx into a generic network log?

If the answer is no, do not make the change in v0.1.

## Current Next Work Direction

The next Next.js-specific improvement should not change the common browser-capture and workspace system into a Next-only system.

It should:

- Use Next adapter scan/capture data to identify likely server-side page data fetches.
- Show those as scanned/inferred hints, not live requests.
- Explain why browser capture did not observe them.
- Keep React SPA behavior browser-live and manual-URL based.
