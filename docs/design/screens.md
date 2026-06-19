# Screens

## Purpose

This document fixes the v0.1 UI screens and layout. Implementation MUST NOT replace the core layout without updating this document.

## v0.1 Screens

1. Structure
2. Connected Frontend
3. Process Flow

## Global Layout

Anlyx SHOULD use a three-panel developer-tool layout:

- Left sidebar for navigation, search, endpoints, and pages
- Center canvas or storyboard workspace
- Right inspector for selected item details
- Bottom replay control area when a flow is selected
- Left and right panels are resizable and collapsible. The state SHOULD persist in local storage.
- Only the left list, center workspace, and inspector scroll independently. The root shell MUST remain `100dvh` with hidden body overflow.

The default product UI MUST be Clean Light. Dark treatment is reserved for optional mode and Dark Replay demo assets.

The visual hierarchy SHOULD match the target references in `docs/design/references/`:

- Dense but readable endpoint/page cards
- Light panels with subtle borders and shadows
- Blue request accents, purple response accents, orange branch accents, and mint database/result accents
- Floating legend cards and section-card inspector structure

## Structure

Left sidebar MUST include:

- Project name
- Technology badges
- Structure / Connected Frontend / Process Flow tabs
- Search input
- Endpoint list with method badges

Center MUST include:

- Selected endpoint header
- Flow canvas
- Endpoint to Controller to Service to Repository to Database structure
- Main Flow and Sub Flow distinction
- Zoom, pan, and fit controls
- Type-specific node cards with icon marks, confidence pills, and selected/active states
- Main Flow blue solid edges, Sub Flow orange/purple dashed edges, and muted unknown edges

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
- Details, Metadata, Confidence, Linked pages, Sub flows, and DB tables as separate section cards
- Metadata copy affordance when metadata is available

When Process Flow is active, bottom or lower-center controls MUST include:

- Process Flow replay controls
- Current active node
- Main Flow progress state

## Connected Frontend

Connected Frontend MUST include:

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

Process Flow MUST reuse the selected scanned `EndpointFlow` data and focus on the Main Flow. It MAY show a lightweight step rail derived from `EndpointFlow.mainPath`, but it MUST NOT introduce runtime event tracing or a separate advanced event timeline in v0.1.

Process Flow SHOULD feel visually different from Structure:

- Request path uses blue glow and active edge motion
- Branch calls use orange dashed connectors and smaller utility cards
- Database arrival uses mint/green emphasis
- Response path uses purple return language and reverse traversal
- The subtitle or controls MUST state that replay is generated from the scanned static flow graph

## Screen Boundaries

v0.1 MUST NOT include:

- Impact View
- Diff View
- Export View
- Static report view
- Advanced event timeline
- 3D architecture map
