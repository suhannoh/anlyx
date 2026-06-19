# Anlyx

[한국어 문서](./README.ko.md)

Visual flow maps for modern web apps.

Anlyx is an open-source developer tool that will turn frontend pages, backend endpoints, services, repositories, and database flows into interactive flow maps and page storyboards.

> Status: Planning / Design Docs phase. Product implementation has not started yet.

Anlyx is not currently installable as an npm package. The repository is being prepared with scope, contracts, adapter rules, fixture expectations, and design documents before v0.1 implementation begins.

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

v0.1 will focus on the Spring Boot + Next.js App Router combination first. Other backend frameworks are handled only through OpenAPI Basic Support in this phase.

## Development Approach

This repository follows documentation-first development. The implementation starts only after the v0.1 planning documents, contracts, adapter rules, fixture expectations, design direction, and acceptance checklist are reviewed.

No CLI commands, UI, adapter implementation, or scanner implementation exists yet.

## Development Setup

Anlyx uses a pnpm workspace with TypeScript, ESLint, Prettier, and Vitest. The current
workspace contains tooling, package skeletons, and Core data validation only; CLI commands,
scanners, adapters, capture, and UI behavior are not implemented yet.
