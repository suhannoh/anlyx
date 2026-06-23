# Anlyx Roadmap

This roadmap keeps future work visible without expanding the v0.1 scope by accident.

## Current Release

v0.1.3 is the first release intended for normal `npm install anlyx` usage.

It focuses on:

- Spring Boot + Next.js App Router Deep Support
- Inject Mode on the real local frontend
- Action-first Flow Drawer
- Background request separation
- React Flow backend diagrams
- npm packaging fixes for published packages

## Near-Term Priorities

1. CI and contribution hygiene
   - Pull request CI for format, lint, typecheck, tests, and builds
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

## v0.2 Candidates

- Static report export
- Mermaid export
- PNG or SVG export
- FastAPI Enhanced Support
- Express Enhanced Support
- React Router Enhanced Support
- Impact View
- Advanced Replay
- Stronger cache, external API, and event nodes
- Prisma, TypeORM, or SQLAlchemy DB connection support

## v0.3 Candidates

- Java Agent runtime tracing
- PR Flow Diff
- GitHub Actions report generation
- Adapter SDK
- Plugin system
- LLM-based flow summaries
- Large monorepo support
- Multi-service architecture maps

## Non-Goals For v0.1

The v0.1 scope remains locked by [`v0.1-scope-lock.md`](./v0.1-scope-lock.md). Do not add excluded features without intentionally revising that document first.
