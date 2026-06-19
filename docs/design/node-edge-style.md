# Node and Edge Style

## Purpose

This document fixes how `FlowNode` and `FlowEdge` types should be represented in the v0.1 UI.

## Node Styles

| Type | Required Style |
| --- | --- |
| `page` | Screenshot thumbnail card with route label |
| `endpoint` | Method badge and path |
| `controller` | White card with blue accent border |
| `service` | White card with violet accent border |
| `repository` | White card with emerald accent border |
| `database` | Table or cylinder-like card with database accent |
| `dto` | Document card |
| `schema` | Document card with schema label |
| `externalApi` | External-link card |
| `cache` | Small memory/cache card |
| `utility` | Small secondary card |
| `validator` | Small secondary card |
| `mapper` | Small secondary card |
| `unknown` | Gray warning card |

## Node Content

Nodes SHOULD show:

- Label
- Type badge or visual accent
- Confidence badge when lower than high
- File or path hint when useful

Nodes MUST NOT show large amounts of code inline. Detailed code and metadata belong in the right inspector.

## Edge Styles

| Edge | Required Style |
| --- | --- |
| Main Flow | Solid 2px line |
| Sub Flow | Dashed 1px line |
| Inferred | Dashed line with confidence badge |
| Unknown | Gray dotted line |
| Request | Animated dot moving forward |
| Response | Animated dot moving backward |
| DB | Solid line ending at database node |
| External | Dashed line to external node |
| Cache | Dashed or secondary line |

## Main Flow Rules

Main Flow MUST be visually dominant and readable from left to right or top to bottom.

Sub Flow MUST be secondary and collapsed by default.

## Confidence Display

- `high`: no warning required
- `medium`: amber badge
- `low`: orange warning badge
- `unknown`: gray warning badge and, when needed, unknown node

The UI MUST NOT present low-confidence inferred edges as certain.

## Replay Styling

Replay Lite MAY animate request and response dots on Main Flow edges only. Sub Flow replay is out of v0.1 scope.
