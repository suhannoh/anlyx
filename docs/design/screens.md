# Screens

## Purpose

This document fixes the v0.1 UI screens and layout. Implementation MUST NOT replace the core layout without updating this document.

## v0.1 Screens

1. Endpoint Map
2. Page Storyboard
3. Replay Lite

## Global Layout

Anlyx SHOULD use a three-panel developer-tool layout:

- Left sidebar for navigation, search, endpoints, and pages
- Center canvas or storyboard workspace
- Right inspector for selected item details
- Bottom replay control area when a flow is selected

The default product UI MUST be Clean Light. Dark treatment is reserved for optional mode and Dark Replay demo assets.

## Endpoint Map

Left sidebar MUST include:

- Project name
- Technology badges
- Endpoint / Pages / Replay tabs
- Search input
- Endpoint list with method badges

Center MUST include:

- Selected endpoint header
- Flow canvas
- Frontend Page to Endpoint to Controller to Service to Repository to Database flow
- Main Flow and Sub Flow distinction
- Zoom, pan, and fit controls

Right inspector MUST include:

- Selected node type
- Class, method, or label
- File path
- Line number when available
- Confidence badge
- Used by pages
- Sub flows
- DB tables
- Request and response schema information

Bottom MUST include:

- Replay Lite controls
- Current active node
- Main Flow progress state

## Page Storyboard

Page Storyboard MUST include:

- Page route
- File path
- Capture status
- Screenshot segments
- API calls
- Linked endpoint IDs when available
- Failed capture empty state with the reason

The failed capture state MUST be visible. It MUST NOT be hidden behind a generic empty state.

## Replay Lite

Replay Lite screen or mode MUST reuse the selected Endpoint Map data and focus on the Main Flow. It MUST NOT introduce a separate advanced timeline in v0.1.

## Screen Boundaries

v0.1 MUST NOT include:

- Impact View
- Diff View
- Export View
- Static report view
- Advanced event timeline
- 3D architecture map
