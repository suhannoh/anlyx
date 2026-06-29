# Screens

This document defines the current Anlyx viewer screens. It supersedes older
screen contracts for the Phase 1 Project JSON product.

## Product Surface

Anlyx renders AI-agent-authored Project JSON in a local viewer.

```txt
anlyx.project.json -> validate -> import -> localhost:4777
```

The viewer MUST stay local-first, data-driven, and framework-agnostic. It must
not infer missing project details, generate demo-only facts, or present fake
timing measurements as real observations.

## App Shell

The app shell contains:

- Header with Anlyx wordmark, version, OSS badge, active project selector, and language selector.
- Top navigation tabs: `Pages`, `Map`, and `JSON`.
- Left page index where relevant.
- Main content area.
- Visible footer/status strip with source file, AI Agent, confidence, and last analysis metadata.

Header and footer metadata MUST come from Project JSON when present:

- `project.name`
- `project.metadata.sourceFile`
- `project.generatedBy.name`
- `project.analyzedAt`
- aggregate confidence derived from supplied project data

The shell supports Korean, English, Chinese, Japanese, and French labels. The
project content itself is authored by the user's AI Agent in the user's chosen
language.

## Pages

`Pages` is the default explanation surface. It is optimized for developers,
planners, reviewers, and new teammates who need to understand a project without
opening source code first.

It MUST show:

- Page index grouped by `areas`.
- Selected page title, path, and source confidence.
- Story or description from Project JSON.
- Feature summaries for the selected page.
- Request list for the selected page.
- Flow Summary for the selected request.
- Evidence status when available.

It MUST NOT:

- Wrap every section in heavy repeated dashboard cards.
- Show Timing controls in Phase 1.
- Invent a flow when no request or flow data exists.
- Treat background requests as the primary user-facing flow unless the Project JSON marks them as primary.

Flow Summary is selected from:

1. The selected request when the user chooses one.
2. The page's primary request when there is no explicit selection.
3. An empty state when no representative flow exists.

## Map

`Map` is a left-to-right layered architecture map. It is not a pure force graph.
It reads like:

```txt
Request Group -> Request -> API Endpoint -> Controller -> Service -> Repository -> DB Table
```

Map MUST:

- Render from Project JSON `architecture.nodes`, `architecture.edges`, `requests`, and `flows`.
- Keep the graph as the main content.
- Use deterministic layered placement.
- Show primary request paths by default.
- Hide noisy secondary/shared dependencies until hover or focus when needed.
- Collapse repeated or low-priority frontend/database details into group nodes.
- Avoid orphan dots, ghost edges, and unexplained lane labels.
- Use connected node-edge rendering so edges attach cleanly to nodes.
- Show tooltip details on hover.

Map SHOULD:

- Make request paths visually stronger than contextual shared edges.
- Keep DB terminals meaningful with labels or collapsed table groups.
- Use display labels on the canvas and full labels in tooltips.
- Keep controls compact and secondary.

Map MUST NOT:

- Reintroduce random scatter placement as the default view.
- Show fake demo nodes when Project JSON data is missing.
- Show domain lane labels such as `BENEFITS` or `AUTH` as persistent background decoration.

## JSON

`JSON` is the raw-data confidence surface. It lets the user inspect exactly what
the AI Agent wrote and what the viewer is rendering.

It MUST show:

- Available JSON files: `anlyx.project.json` and split files under `.anlyx/project/*.json` when present.
- The selected JSON file content.
- Schema version and validation status.
- Project metadata.
- Section counts for areas, pages, features, requests, flows, architecture, evidence, measurements, and dictionary.
- Timing disabled state only as metadata when `measurements` is empty.

It MUST NOT:

- Show a separate Timing feature panel in Phase 1.
- Hide validation problems.
- Merge split JSON contents in a way that obscures the original authored files.

## Timing

Timing is a Phase 2 surface. Phase 1 can display that measurements are absent,
but it MUST NOT provide a Timing tab or pretend measured runtime data exists.

When timing returns, measured durations must come from explicit `measurements`
or runtime/telemetry evidence. Agent estimates must remain visually distinct
from observed measurements.

## Empty And Unknown States

Anlyx should be honest before it is impressive.

- Missing page data: show an empty page state.
- Missing requests: show that no requests were authored.
- Missing flow: show that no representative backend path exists.
- Missing measurements: keep timing disabled.
- Low confidence: show the confidence state instead of hiding the item.

## Visual Principles

- Clean light product UI.
- Dense enough for real projects, but not card-inside-card clutter.
- Nodes, paths, and JSON facts are more important than decoration.
- UI controls should look clickable and use pointer cursors.
- Text should fit its container and avoid oversized hero-style typography.
- No fake data in product views.
