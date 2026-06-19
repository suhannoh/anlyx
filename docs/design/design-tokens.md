# Design Tokens

## Purpose

This document fixes the visual token direction for Anlyx v0.1.

## Themes

Default:

- Clean Light

Optional:

- Dark Mode

Demo:

- Dark Replay

The main product UI MUST be readable in Clean Light first. Dark Replay MAY be used for README or landing demo imagery.

## Light Theme Colors

| Role           | Token                  | Value     |
| -------------- | ---------------------- | --------- |
| Background     | `color.background`     | `#F7F8FB` |
| Panel          | `color.panel`          | `#FFFFFF` |
| Canvas         | `color.canvas`         | `#FAFAFA` |
| Border         | `color.border`         | `#E5E7EB` |
| Text Primary   | `color.text.primary`   | `#111827` |
| Text Secondary | `color.text.secondary` | `#6B7280` |
| Grid           | `color.grid`           | `#E5E7EB` |

## Dark Theme Colors

| Role           | Token                       | Value     |
| -------------- | --------------------------- | --------- |
| Background     | `color.dark.background`     | `#0B0F14` |
| Panel          | `color.dark.panel`          | `#111827` |
| Canvas         | `color.dark.canvas`         | `#0D1117` |
| Border         | `color.dark.border`         | `#1F2937` |
| Text Primary   | `color.dark.text.primary`   | `#F9FAFB` |
| Text Secondary | `color.dark.text.secondary` | `#9CA3AF` |
| Glow Accent    | `color.dark.glow`           | `#67E8F9` |

## HTTP Method Colors

| Method    | Token                 | Value     |
| --------- | --------------------- | --------- |
| GET       | `color.method.get`    | `#10B981` |
| POST      | `color.method.post`   | `#3B82F6` |
| PUT/PATCH | `color.method.update` | `#F59E0B` |
| DELETE    | `color.method.delete` | `#EF4444` |

## Node Accent Colors

| Node         | Token                   | Value     |
| ------------ | ----------------------- | --------- |
| Controller   | `color.node.controller` | `#2563EB` |
| Service      | `color.node.service`    | `#7C3AED` |
| Repository   | `color.node.repository` | `#059669` |
| Database     | `color.node.database`   | `#A16207` |
| DTO / Schema | `color.node.dto`        | `#64748B` |
| Sub Flow     | `color.edge.sub`        | `#64748B` |
| Unknown      | `color.node.unknown`    | `#9CA3AF` |

## Confidence Colors

| Confidence | Token                      | Value     |
| ---------- | -------------------------- | --------- |
| High       | `color.confidence.high`    | `#16A34A` |
| Medium     | `color.confidence.medium`  | `#D97706` |
| Low        | `color.confidence.low`     | `#EA580C` |
| Unknown    | `color.confidence.unknown` | `#6B7280` |

## Spacing and Shape

- Base spacing SHOULD use 4px increments.
- Panels SHOULD use 1px borders.
- Cards SHOULD use 8px border radius or less.
- Node accent borders SHOULD be visible without requiring saturated backgrounds.
- Typography SHOULD prioritize scanability over decorative display styles.

## Motion

Allowed:

- Active node highlight
- Request or response dot moving along an edge
- DB pulse when reached
- Sub Flow fade or scale on expand
- Selection emphasis
- Dim non-selected paths

MUST NOT use:

- Excessive glassmorphism
- 3D nodes
- Background particles
- Always-on glow for every node
- Dark-only product UI
- Decoration that reduces information readability
