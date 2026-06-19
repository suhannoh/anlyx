# Anlyx

[한국어 문서](./README.ko.md)

Visual flow maps for modern web apps.

Anlyx is an open-source developer tool that turns frontend pages, backend endpoints, services, repositories, and database flows into interactive flow maps and page storyboards.

> Status: v0.1.2 patch release preparation.

Anlyx `0.1.0` is planned to be deprecated because it was published with unresolved
`workspace:*` dependencies. Anlyx `0.1.1` is planned to be deprecated because the
published CLI entrypoint can trigger an unsettled top-level await warning and exit
before running commands. `0.1.2` is the patch release intended for normal
`npm install anlyx` usage after the approved pnpm-based publish.

## Problem

Modern web applications spread one user-facing flow across routes, API endpoints, controllers, services, repositories, database tables, schemas, utilities, and authorization boundaries.

Developers often need to jump between README files, Swagger or OpenAPI docs, frontend route files, backend code, database schemas, and screenshots to answer basic onboarding questions:

- Which page calls this API?
- Which controller and service handle the request?
- Which repository and database table are involved?
- Which helper logic is part of the main path, and which logic is only supporting detail?
- What does the page look like when the API call happens?

Anlyx aims to connect those answers in one visual, shareable map.

## Core Features

- **Endpoint Map**: A Swagger-like endpoint list connected to backend flow nodes such as Controller, Service, Repository, and Database Table.
- **Page Storyboard**: Frontend route cards with screenshot segments, capture status, and API calls observed during capture.
- **Main Flow / Sub Flow**: A readable distinction between the primary request path and supporting calls such as mappers, utilities, validators, cache, or external services.
- **Replay Lite**: A minimal animation that highlights the request and response path through the main flow.

## v0.1 Scope

Deep Support:

- Spring Boot backend analysis
- Next.js App Router page discovery and capture

Basic Support:

- OpenAPI backend import for endpoint lists, request schemas, and response schemas
- Manual frontend URLs for OpenAPI backend projects

v0.1 will focus on the Spring Boot + Next.js App Router combination first. Other backend frameworks are handled only through OpenAPI Basic Support in this phase.

## Usage

When using the published package:

```bash
npx anlyx init
npx anlyx scan
npx anlyx dev
```

Use `anlyx@0.1.2` or newer. Until the 0.1.2 publish is approved and complete, run
the local workspace CLI during development.

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm --filter anlyx exec anlyx init
corepack pnpm --filter anlyx exec anlyx scan
corepack pnpm --filter anlyx exec anlyx dev
```

`anlyx scan` writes `.anlyx/report-data.json`. `anlyx dev` reads that file and serves the local UI; it does not run scan automatically.

## Not Included in v0.1

- FastAPI, Express, or NestJS Deep Support
- React Router Deep Support
- Static HTML export
- Mermaid export
- PNG/SVG export
- GitHub Actions report generation
- Java Agent runtime tracing
- LLM flow summaries

## Development Approach

This repository follows documentation-first development. v0.1 implementation is constrained by the scope lock, contracts, adapter rules, fixture expectations, design direction, and acceptance checklist.

## Development Setup

Anlyx uses a pnpm workspace with TypeScript, ESLint, Prettier, and Vitest. The current
workspace contains tooling, package skeletons, Core data/config validation, adapter utilities,
capture primitives, UI components, and the `anlyx init` / `anlyx scan` / `anlyx dev` commands.

Before npm publication, release packaging is checked with local build and pack dry-runs. See
[`docs/release/npm-publish-preflight.md`](./docs/release/npm-publish-preflight.md).
The manual release sequence is documented in
[`docs/release/v0.1-release-runbook.md`](./docs/release/v0.1-release-runbook.md).
