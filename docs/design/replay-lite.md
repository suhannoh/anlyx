# Replay Lite / Process Flow

## Purpose

Replay Lite powers the Process Flow view. It helps users understand request and response movement through the scanned Main Flow. It is intentionally small in v0.1 and MUST NOT imply live runtime tracing.

## v0.1 Behavior

Replay Lite MUST:

1. Start the request dot from the Frontend Page node.
2. Highlight the Endpoint node.
3. Highlight the Controller node.
4. Highlight the Service node.
5. Highlight the Repository node.
6. Pulse the Database node.
7. Move a response dot in the reverse direction.
8. Return to the Frontend Page node.
9. Allow repeat playback.

The visual treatment SHOULD separate the inferred phases:

- Request path: blue active edge, glow, and travel motion
- Branch calls: orange dashed connectors and compact utility cards
- Database arrival: mint/green node emphasis and pulse
- Response path: purple reverse traversal derived from `mainPath`
- Complete state: final response delivered marker

The implementation MAY use `motion` and React Flow custom edge rendering for the moving particle and active-step transitions. Motion MUST communicate the current inferred step only; it MUST NOT imply measured latency, live traffic, or runtime traces.

## Controls

v0.1 MUST provide:

- Play
- Pause
- Restart
- Loop on/off
- Main Flow only mode
- Basic replay speed selection
- A lightweight step rail derived from `EndpointFlow.mainPath`

## Data Source

Replay Lite MUST use `EndpointFlow.mainPath` and matching `FlowNode` / `FlowEdge` entries.

Request animation MUST traverse `EndpointFlow.mainPath` in forward order.

Response animation MUST traverse `EndpointFlow.mainPath` in reverse order.

The UI MUST use each adjacent node pair in `mainPath` to find an existing edge. When rendering the response path, the UI SHOULD reuse the existing edge geometry in reverse. `FlowEdge.kind = "response"` may remain in the Data Contract for explicit future response edges, but v0.1 fixtures are not required to store response edges.

If required nodes are missing, the UI MUST show an unavailable or unknown state rather than inventing a path.

## Explicit Non-goals

v0.1 MUST NOT implement:

- Step-by-step debugging
- Sub Flow replay
- Timeline event log
- Node-level runtime metrics
- Runtime tracing

## Visual Direction

The default product UI remains Clean Light. Process Flow MAY use stronger blue/purple/orange/mint accents than Structure, but it MUST still describe replay as generated from the scanned static flow graph. Dark Replay MAY be used for demo imagery and optional dark mode.

Graph layout MAY be produced by `elkjs` for product runtime rendering. If ELK layout fails, the UI MUST fall back to deterministic request-row and branch-row positions instead of hiding the diagram.
