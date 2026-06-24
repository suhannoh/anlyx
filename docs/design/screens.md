# Screens

## Purpose

This document fixes the v0.1 UI screens and layout. Implementation MUST NOT replace the core layout without updating this document.

## v0.1 Primary Surface

Anlyx v0.1 is full-page Live Workspace first.

The primary experience is:

1. The developer runs the real frontend app, usually at `frontend.baseUrl`.
2. The developer runs `anlyx dev`, usually at `http://localhost:4777`.
3. `localhost:4777` serves Anlyx runtime assets, live event ingest/stream endpoints, the Live Workspace, and report data.
4. The real frontend app loads a development-only browser capture runtime through a framework helper or local script injection.
5. When the developer clicks a real app control and it triggers an API request, Anlyx Workspace receives the browser-observed request and updates the selected backend flow.

The real app MUST remain usable as itself. Anlyx MAY show a small capture badge with an "Open workspace" entry point, but it MUST NOT use a large overlay, modal, or drawer as the primary analysis surface.

Legacy static viewer screens are no longer part of the v0.1 product surface. Debug routes MAY exist only as aliases into the Live Workspace shell.

## v0.1 Screens

1. Live Workspace
2. Recent Events
3. Summary / Timing / Diagram request views
4. Evidence Inspector
5. Workspace loading and error states

## Live Workspace

Live Workspace is the main Anlyx UI. It MUST answer the question:

```txt
I just clicked this in the real app. What API fired, and where does that request go?
```

Live Workspace MUST keep a stable shell while the selected request view changes:

- Left sidebar with Anlyx navigation and workspace identity
- Top header with breadcrumb, title, confidence, timestamp, duration, and controls
- Request summary and Summary / Timing / Diagram tabs in a fixed position
- Center content panel that changes by tab
- Right Evidence Inspector with stable width, padding, radius, and typography

Live Workspace MUST include:

- Recent events with method, path, status, duration, confidence, and selected state
- The most recent user action that triggered the request when it can be observed, such as a clicked button, link, tab, form submit, or keyboard activation
- Short-lived user action context preserved across client navigation or full page reload so a clicked link/card can still explain the first API calls on the destination page
- Last matched API event with method, path, status, and latency when available
- Passive implementation traffic, such as session probes, saved-item preloads, page-view tracking, health checks, analytics, metrics, and polling, should remain observable in Recent events but MUST NOT steal the selected main flow from a user's direct action
- Status meaning for common local-development states, especially `401`/`403` login or permission gates and `5xx` server failures
- Matched endpoint label
- Summary view that shows Action -> API -> Controller -> Service/Auth -> Repository -> Database/Result with matched, inferred, blocked, scanned, and not-proven states
- Timing view that shows layer duration, waterfall timing, and bottleneck state
- Timing view SHOULD prefer `backendSpans` when a development-only backend bridge reports them, preserving repeated Service/Repository calls as real backend-observed spans instead of collapsing them into one source-derived layer.
- Diagram view that distinguishes proven executed path from known but not proven downstream path
- Evidence inspector sections for browser-observed request, source-derived backend match, matched controller/service/repository evidence, and "not a runtime trace" notes
- A visible unmatched-request state when an API call cannot be linked to scanned data
- Browser-side API event collection from `fetch` and `XMLHttpRequest`
- Request matching by HTTP method and path against scanned endpoints
- An escape hatch to reopen the Live Workspace from the real app capture badge

Live Workspace SHOULD use a dense, polished local developer-tool layout:

- White panels on a `#F8FAFC` or `#F9FBFF` workspace background
- Subtle `#E2E8F0` borders and restrained shadows
- Blue primary request accents, green confidence/success, red blocked/error, orange decision/result, and purple inferred state
- Stable panel dimensions so tab switching changes only the center content panel
- Compact captured-request summary that separates user action, browser request, and request result into distinct quiet cards
- Main path nodes should share one card system with consistent width, height, type label, metadata, and badge placement
- Long class, method, or handler names should be clamped to two lines or shortened to the most useful class name, with the full value available through the native title tooltip
- Request outcomes such as `401` login-required should remain in the same flow path as Auth/Session and Result nodes; red is reserved for blocked/error states that need attention
- Connector arrows should read like a flowchart, with blue primary-path connectors, amber auth/result connectors, purple inferred emphasis, and muted gray inactive connectors
- Evidence and metadata should be sectioned and scannable instead of always-open large prose panels
- Unmatched requests and true failures should render actionable diagnostic cards with a short cause and next checks, not only a status sentence
- Framework server-side fetches, such as Next.js Server Component data loading, MUST be labeled as scanned or inferred until a real server runtime bridge reports them. They MUST NOT be presented as browser-live requests.

Live Workspace MUST NOT:

- Require the developer to pick endpoints from a list before using the app
- Mutate app requests, responses, local storage, cookies, or application state
- Hide failed, pending, unknown, or unmatched analysis states
- Claim runtime server tracing; collected events are browser-observed local development events only
- Require Next.js for browser capture; React SPA projects must still work through explicit manual URLs and browser-observed API events

## Recent Events

Recent Events MUST include:

- Triggering user action when available
- Method
- Request path
- Match state: `matched`, `unmatched`, or `ignored`
- HTTP status when available
- Relative order of events
- Repeated-event grouping for the same method, path, status, and matched endpoint so polling/auth checks do not flood the workspace

Recent Events SHOULD render as a compact table/list with small method/status/match badges. It SHOULD keep repeated counts, status, latency, and match state as quiet metadata instead of making every row a large card. It SHOULD stay visually quieter than the selected request views and avoid competing with the primary diagram.

Recent Events MUST ignore common local-development implementation noise, including Anlyx runtime requests, Vite internals, Next.js `/_next/*` assets, hot-update files, favicon requests, browser-service config probes such as `/getconfig/*`, and static asset-like URLs. Ignored events are a filtering behavior, not a user-facing error state.

Recent Events MUST NOT become Advanced Replay in v0.1. It is a local UI affordance for recently observed browser requests only.

## Workspace Debug Route

The historical `/_anlyx/viewer` route MAY remain available for compatibility, but it MUST render the same Live Workspace shell. It MUST NOT reintroduce the legacy static viewer with separate Flow Story, Structure, Captures, or Process screens.

Workspace loading and report-load failure states MUST explain the likely cause and next action.

The default product UI MUST be Clean Light. Dark treatment is reserved for optional mode and Dark Replay demo assets.

The visual hierarchy SHOULD match the target references in `docs/design/references/`:

- Dense but readable endpoint/page cards
- Light panels with subtle borders and shadows
- Blue request accents, purple response accents, orange branch accents, and mint database/result accents
- Sectioned inspector content for evidence and metadata

The v0.1.3 visual system is implemented inside the Live Workspace shell. Diagram rendering may use plain React layout or a focused graph renderer in the future, but the UI package MUST NOT keep a separate static viewer dependency stack for React Flow, ELK layout, replay animation, or resizable standalone panels.

## Waiting / Error States

Anlyx MUST keep waiting, failed, unknown, unmatched, and unavailable states visible. These states SHOULD be rendered as diagnostic cards or compact panels, not as blank canvases.

Viewer and graph states MUST include:

- What Anlyx was trying to load or infer
- The observed failure or missing data when available
- A concrete next action, such as running `anlyx scan` or checking backend source configuration
- Language that does not imply runtime tracing when only static scan data is available

## Screen Boundaries

v0.1 MUST NOT include:

- Impact View
- Diff View
- Export View
- Static report view
- Advanced event timeline
- 3D architecture map
