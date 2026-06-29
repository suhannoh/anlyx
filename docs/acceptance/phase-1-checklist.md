# Anlyx Phase 1 Acceptance Checklist

This checklist defines the accepted Phase 1 product surface after the Project
JSON pivot. Older live-analysis experiments are historical unless a current
document explicitly reintroduces them.

## Product Boundary

- [x] Anlyx is a local architecture viewer for AI-agent-authored Project JSON.
- [x] The primary input is `anlyx.project.json`.
- [x] Split files under `.anlyx/project/*.json` are supported as an authoring convenience.
- [x] The viewer runs locally on `localhost:4777`.
- [x] The viewer does not invent project facts, missing paths, or timing measurements.
- [x] Framework-specific analysis belongs to the user's AI Agent, not to Anlyx runtime inference.
- [x] Timing remains disabled unless real `measurements` exist.

## CLI

- [x] `npx anlyx validate anlyx.project.json` validates Project JSON.
- [x] `npx anlyx import anlyx.project.json` normalizes the active Project JSON source.
- [x] `npx anlyx dev` starts the 4777 local viewer.
- [x] Compatibility imports are not the product centerline.
- [x] Removed live-analysis behavior does not reappear as the default command path.

## Data Contract

- [x] Project JSON uses `schemaVersion = "0.2.0"`.
- [x] Top-level sections include `project`, `areas`, `pages`, `features`, `requests`, `flows`, `architecture`, `evidence`, `measurements`, and `dictionary`.
- [x] Pages map to user-visible routes or screens.
- [x] Requests distinguish `primary`, `supporting`, and `background`.
- [x] Flows describe representative request paths.
- [x] Architecture nodes and edges power the Map view.
- [x] Evidence status remains explicit: `source-matched`, `agent-inferred`, `observed`, `not-proven`, or `unknown`.
- [x] Sensitive values, secrets, cookies, tokens, and real personal payloads are excluded.

## Viewer

- [x] Header reads project name and metadata from Project JSON.
- [x] Top navigation includes `Pages`, `Map`, and `JSON`.
- [x] Footer/status strip remains visible in the app layout and shows source, AI Agent, confidence, and last analysis metadata.
- [x] `Pages` shows the page index, story, features, request list, and selected Flow Summary.
- [x] `Map` shows a left-to-right layered architecture map.
- [x] `JSON` shows available JSON files, raw JSON, schema metadata, and counts.
- [x] Timing UI is removed from Phase 1 default screens.
- [x] Language shell supports Korean, English, Chinese, Japanese, and French.

## Agent Instructions

- [x] Agent setup documentation explains that the user's AI Agent performs project analysis.
- [x] Project JSON guide explains required analysis order and confidence rules.
- [x] Agent docs warn not to generate fake data or fake measurements.
- [x] Docs are framework-agnostic and do not assume Zup, Spring Boot, Next.js, or any single stack.

## Local And Security

- [x] Default workflow is local-only.
- [x] Project data is read from local JSON files.
- [x] Generated `.anlyx/` runtime output is ignored by Git.
- [x] Runtime measurements are optional and absent by default.

## Release Readiness

- [ ] `corepack pnpm -r build` passes after the final cleanup commit.
- [ ] `corepack pnpm test` passes after the final cleanup commit.
- [ ] `corepack pnpm --filter anlyx pack --dry-run` verifies publish contents.
- [ ] Local tarball install can run `npx anlyx --help`, `validate`, `import`, and `dev`.
