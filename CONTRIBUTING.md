# Contributing to Anlyx

Thanks for taking a look at Anlyx.

Anlyx is an action-first local developer tool. Its core question is:

```txt
I just clicked this in the real app. What API fired, and where does that request go in the backend?
```

## Current Scope

v0.1 Deep Support is intentionally limited to:

- Spring Boot backend scanning
- Next.js App Router page discovery and capture

Basic Support includes:

- OpenAPI endpoint import
- Manual frontend URLs
- Raw overlay script injection for non-Next React apps

Please check [`docs/product/v0.1-scope-lock.md`](./docs/product/v0.1-scope-lock.md) before adding framework support or changing product behavior.

For new framework work, start with the [`Adapter Development Guide`](./docs/adapters/adapter-development.md). New adapters should be fixture-first and confidence-aware.

## Development Setup

```bash
corepack enable
corepack pnpm install
corepack pnpm build
```

Useful commands:

```bash
corepack pnpm format
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm -r build
```

## Project Structure

- `packages/cli`: published `anlyx` CLI package
- `packages/core`: shared config, schema, and report aggregation
- `packages/ui`: viewer and injected overlay UI
- `packages/adapter-spring`: Spring Boot endpoint and flow scanning
- `packages/adapter-next`: Next.js App Router page discovery
- `packages/adapter-openapi`: OpenAPI import support
- `packages/capture`: capture and route matching utilities
- `docs/contracts`: data, config, and adapter contracts
- `docs/adapters/adapter-development.md`: guide for future framework adapters
- `docs/product`: PRD, scope lock, and product direction
- `fixtures`: sample projects and expected report output

## Pull Requests

Before opening a PR:

1. Keep the change focused and reviewable.
2. Update docs/contracts when public behavior or data shape changes.
3. Add or update fixture-based tests for scanner and adapter behavior.
4. Run the verification commands listed above.

CI runs formatting, lint, typecheck, tests, and package builds on pull requests.

## Release Notes

Public package publishing is maintainer-only. Release packages are verified with pnpm pack dry-runs so monorepo `workspace:*` dependencies are resolved before publishing.
