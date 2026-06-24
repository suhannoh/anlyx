# Anlyx Roadmap

This roadmap keeps future work visible without expanding the v0.1 scope by accident.

## Current Release

v0.1.3 is the first release intended for normal `npm install anlyx` usage.

It focuses on:

- Spring Boot + Next.js App Router Deep Support
- Live Workspace Mode beside the real local frontend
- Action-first browser capture
- Background request separation
- Summary, Timing, and Diagram request views
- npm packaging fixes for published packages

## Near-Term Priorities

1. CI and contribution hygiene
   - Pull request CI for format, lint, typecheck, tests, and builds
   - CLI entrypoint smoke test after package builds
   - Issue and PR templates
   - Contributor, code of conduct, and security docs

2. Shareable output
   - PNG or SVG export for the currently selected flow
   - Export should preserve confidence and evidence labels
   - Export must not imply runtime tracing when the path is inferred

3. Release hygiene
   - Deprecate older broken npm versions
   - Add changelog/versioning workflow
   - Consider GitHub Actions based publish after manual release steps are stable

4. Adapter confidence
   - Broaden fixture coverage for Spring scanner edge cases
   - Broaden Next.js App Router route discovery fixtures
   - Keep unsupported framework behavior explicit as `unknown`, `pending`, or `failed`

5. Adapter extension path
   - Document the adapter contract as a contributor-facing guide
   - Keep new framework support fixture-first
   - Evaluate a future `defineAdapter()` plugin API before adding many first-party adapters

6. README media
   - Add a shorter 10-15 second top-level demo loop
   - Add separate screenshots for Live Workspace, Recent Events, Timing, and Diagram
   - Keep empty, pending, and failed states visible in docs so first-time users know what to do next

## v0.2 Candidates

- Static report export
- Mermaid export
- PNG or SVG export
- FastAPI Enhanced Support
- Express Enhanced Support
- NestJS Enhanced Support
- React Router Enhanced Support
- Adapter development guide and plugin API
- Impact View
- Advanced Replay
- Incremental scan for large projects
- Stronger cache, external API, and event nodes
- Prisma, TypeORM, or SQLAlchemy DB connection support

## v0.3 Candidates

- Java Agent runtime tracing
- Optional OpenTelemetry trace correlation
- PR Flow Diff
- GitHub Actions report generation
- Adapter SDK
- Plugin system
- LLM-based flow summaries
- Large monorepo support
- Multi-service architecture maps

## Non-Goals For v0.1

The v0.1 scope remains locked by [`v0.1-scope-lock.md`](./v0.1-scope-lock.md). Do not add excluded features without intentionally revising that document first.
