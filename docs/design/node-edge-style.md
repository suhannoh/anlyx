# Node and Edge Style

## Purpose

This document fixes how Project JSON architecture and flow nodes should be
represented in the current viewer UI.

## Node Styles

| Type          | Required Style                                   |
| ------------- | ------------------------------------------------ |
| `page`        | Screenshot thumbnail card with route label       |
| `endpoint`    | Method badge and path                            |
| `controller`  | White card with blue accent border               |
| `service`     | White card with violet accent border             |
| `repository`  | White card with emerald accent border            |
| `database`    | Table or cylinder-like card with database accent |
| `dto`         | Document card                                    |
| `schema`      | Document card with schema label                  |
| `externalApi` | External-link card                               |
| `cache`       | Small memory/cache card                          |
| `utility`     | Small secondary card                             |
| `validator`   | Small secondary card                             |
| `mapper`      | Small secondary card                             |
| `unknown`     | Gray warning card                                |

## Node Content

Nodes SHOULD show:

- Label
- Type badge or visual accent
- Confidence badge when lower than high
- File or path hint when useful

Nodes MUST NOT show large amounts of code inline. Detailed code and metadata belong in the right inspector.

## Edge Styles

| Edge      | Required Style                                                                  |
| --------- | ------------------------------------------------------------------------------- |
| Main Flow | Solid 2px line                                                                  |
| Sub Flow  | Dashed 1px line                                                                 |
| Inferred  | Dashed line with confidence badge                                               |
| Unknown   | Gray dotted line                                                                |
| Request   | Animated dot moving forward                                                     |
| Response  | Static response marker unless real measurement or replay data explicitly exists |
| DB        | Solid line ending at database node                                              |
| External  | Dashed line to external node                                                    |
| Cache     | Dashed or secondary line                                                        |

## Scan Map Edge Roles

Scan Map edges use a smaller role system for project-wide architecture
inspection:

- `primary_path`: visible by default; muted blue-gray, readable left-to-right.
- `aggregate`: visible by default for collapsed group to representative path
  connections.
- `shared_dependency`: hidden or quiet by default; revealed by hover or focused
  path context.
- `low_confidence`: hidden from the default map unless explicitly inspected.

When a request or API node is focused, its `primary_path`/`aggregate` edges
SHOULD animate forward with a restrained cyan/teal dash motion. The animation is
a local replay affordance for visual comprehension, not a claim of production
runtime tracing.

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

Timing and replay animation are future/optional work. They must not be shown as
measured runtime behavior unless real measurement evidence exists.
