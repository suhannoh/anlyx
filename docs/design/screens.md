# Screens

## Purpose

This document fixes the v0.1 UI screens and layout. Implementation MUST NOT replace the core layout without updating this document.

## v0.1 Primary Surface

Anlyx v0.1 is injected-overlay-first.

The primary experience is:

1. The developer runs the real frontend app, usually at `frontend.baseUrl`.
2. The developer runs `anlyx dev`, usually at `http://localhost:4777`.
3. `localhost:4777` serves Anlyx runtime assets, report data, and the standalone debug viewer.
4. The developer adds the `AnlyxDevOverlay` helper from `anlyx/next` to the real frontend app during local development. Raw script injection remains a fallback/debug path.
5. When the developer clicks a real app control and it triggers an API request, Anlyx opens a right-side Flow Drawer for the matched endpoint.

The standalone viewer remains available as a fallback/debug surface. It is no longer the default product experience in Inject Mode.

## v0.1 Screens

1. Interactive Overlay
2. Flow Drawer
3. API Event Timeline
4. Standalone Viewer

## Interactive Overlay

Interactive Overlay MUST sit on top of the real local app without replacing the app UI.

Inject Mode MUST include:

- A floating Anlyx button fixed to the viewport
- A collapsed state that does not cover the app's primary content
- A right-side drawer that opens after a matched API event
- A visible unmatched-request state when an API call cannot be linked to scanned data
- Browser-side API event collection from `fetch` and `XMLHttpRequest`
- Request matching by HTTP method and path against scanned endpoints
- An escape hatch to open the standalone viewer

Inject Mode MUST NOT:

- Require the developer to pick endpoints from a list before using the app
- Mutate app requests, responses, local storage, cookies, or application state
- Hide failed, pending, unknown, or unmatched analysis states
- Claim runtime server tracing; collected events are browser-observed local development events only

## Flow Drawer

Flow Drawer is the main Anlyx UI in Inject Mode. It MUST answer the question:

```txt
I just clicked this in the real app. What API fired, and where does that request go?
```

Flow Drawer MUST include:

- Last matched API event with method, path, status, and latency when available
- Matched endpoint label
- Main Flow path using scanned `EndpointFlow.mainPath`
- Support calls derived from non-main flow nodes/edges or `EndpointFlow.subFlows`
- Confidence badges for endpoint, nodes, edges, and evidence
- File path and line number when available
- Linked frontend pages when available
- A compact empty state for unmatched requests
- A compact error state when report data cannot be loaded

Flow Drawer SHOULD use a narrow, readable layout:

- Top summary for the request
- Horizontal or vertical main path cards depending on drawer width
- Support calls grouped below the main path
- Evidence and metadata collapsed into small sections rather than always-open large panels

## API Event Timeline

Inject Mode SHOULD keep a small recent-event timeline inside the drawer.

The timeline MUST include:

- Method
- Request path
- Match state: `matched`, `unmatched`, or `ignored`
- HTTP status when available
- Relative order of events

The timeline MUST NOT become Advanced Replay in v0.1. It is a local UI affordance for recently observed browser requests only.

## Standalone Viewer

Standalone Viewer is the fallback/debug surface for scanned output. It MAY keep the existing developer-tool layout:

- Left sidebar for search, pages, endpoints, services, and debug navigation
- Center Flow Story, graph canvas, or storyboard workspace
- Right inspector for selected item details and analysis evidence
- Bottom replay control area when a flow is selected or shown in Flow Story

Standalone Viewer MUST be reachable in Inject Mode from an Anlyx-owned path such as `/_anlyx/viewer`.

Standalone Viewer MUST include:

- Flow Story
- Structure
- Captures
- Process

The default product UI MUST be Clean Light. Dark treatment is reserved for optional mode and Dark Replay demo assets.

The visual hierarchy SHOULD match the target references in `docs/design/references/`:

- Dense but readable endpoint/page cards
- Light panels with subtle borders and shadows
- Blue request accents, purple response accents, orange branch accents, and mint database/result accents
- Sectioned inspector content for evidence and metadata

The v0.1.2 visual system keeps React Flow as the graph engine for the Standalone Viewer and uses focused UI libraries:

- `elkjs` for structure/process graph layout, with deterministic fallback layout when async layout fails or is unavailable.
- `motion` for active node pulse, replay step transitions, and restrained moving particles.
- `react-resizable-panels` for standalone viewer panel resizing and collapse behavior.
- `lucide-react` for consistent type and action icons.

These dependencies are visual-system support only. They MUST NOT introduce runtime tracing, a Java agent, OpenTelemetry, or a replacement graph engine.

## Flow Story

Flow Story belongs to the Standalone Viewer and compact Flow Drawer.

Flow Story MUST combine the selected frontend page, matched endpoint, backend flow graph, selected-node inspector, and Replay Lite controls when shown in the Standalone Viewer.

Flow Story MUST include:

- Selected endpoint title using `Controller#handler` when available
- Matched page preview when a scanned page calls the selected endpoint
- Page capture status, API call count, and screenshot count
- Request connector from page preview into the endpoint node
- Main Flow graph using scanned `EndpointFlow` nodes and edges
- Branch calls as smaller orange dashed relationships
- Response return language using purple dashed path styling
- Replay Lite controls visible without switching screens
- A right inspector that shows Details, Analysis evidence, Calls, Metadata, Confidence, Linked pages, Sub flows, and DB tables where applicable

Flow Story MUST NOT invent runtime traces. Replay and evidence remain generated from the scanned static flow graph.

## Captures

Captures MUST include:

- Page route
- File path
- Capture status
- Screenshot segments
- API calls
- Linked endpoint IDs when available
- Page to Endpoint relationship panel
- Failed capture empty state with the reason
- Pending capture state explaining that `--skip-capture` leaves screenshots/API calls empty
- Product-style placeholder segment cards when screenshots are not captured yet

The failed capture state MUST be visible. It MUST NOT be hidden behind a generic empty state.

## Process Flow

Process Flow MUST reuse the selected scanned `EndpointFlow` data and focus on the Main Flow. It MAY show a lightweight step rail derived from `EndpointFlow.mainPath`, but it MUST NOT introduce production runtime tracing or a separate advanced event timeline in v0.1.

Process Flow SHOULD feel visually different from Structure:

- Request path uses blue glow and active edge motion
- Branch calls use orange dashed connectors and smaller utility cards
- Database arrival uses mint/green emphasis
- Response path uses purple return language and reverse traversal
- Active request/response edges MAY render a moving particle on top of the existing React Flow edge geometry
- The subtitle or controls MUST state that replay is generated from the scanned static flow graph

## Screen Boundaries

v0.1 MUST NOT include:

- Impact View
- Diff View
- Export View
- Static report view
- Advanced event timeline
- 3D architecture map
