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
- [x] Import writes `.anlyx/validation-report.json` with source and coverage warnings.
- [x] `npx anlyx dev` starts the 4777 local viewer.
- [x] `npx anlyx prompt init` prints the Agent setup prompt for first-time authoring.
- [x] `npx anlyx prompt refresh` prints the Agent refresh prompt for updating an existing Project JSON.
- [x] Compatibility imports are not the product centerline.
- [x] Removed live-analysis behavior does not reappear as the default command path.

## Data Contract

- [x] Project JSON accepts legacy `schemaVersion = "0.2.0"` and current `schemaVersion = "0.3.0"`.
- [x] Top-level sections include `project`, `areas`, `pages`, `features`, `requests`, `flows`, `architecture`, `evidence`, `measurements`, and `dictionary`.
- [x] Optional `0.3.0` sections include `coverage`, `overview`, `capabilities`, `dataLifecycles`, and `impactMaps`.
- [x] Missing optional `0.3.0` sections normalize to safe empty defaults for legacy files.
- [x] Pages map to user-visible routes or screens.
- [x] Requests distinguish `primary`, `supporting`, and `background`.
- [x] Flows describe representative request paths.
- [x] Architecture nodes and edges power the Map view.
- [x] Evidence status remains explicit: `source-matched`, `agent-inferred`, `observed`, `not-proven`, or `unknown`.
- [x] `source-matched` source references are validated for missing files, missing symbols, and placeholder line numbers.
- [x] Partial analysis can be represented with detected, modeled, and unmodeled coverage data.
- [x] Sensitive values, secrets, cookies, tokens, and real personal payloads are excluded.

## Viewer

- [x] Header reads project name and metadata from Project JSON.
- [x] Left project navigation includes `Pages`, `Map`, `Overview`, `Capabilities`, and `JSON`; no duplicate top navigation is shown.
- [x] Footer/status strip remains visible in the app layout and shows source, AI Agent, confidence, and last analysis metadata.
- [x] `Pages` shows the page index, story, features, request list, and selected Flow Summary.
- [x] `Map` shows a left-to-right layered architecture map.
- [x] `JSON` shows available JSON files, raw JSON, schema metadata, validation report, coverage status, and counts.
- [x] `Overview` is a primary README-like surface with project intro, stack, and what-it-does content.
- [x] `Overview` does not show generic KPI cards such as total capabilities, connected flows, core entities, or main areas.
- [x] `Capabilities` is a primary verification surface with summary cards, filters, capability rows, and a details rail.
- [x] `Data Lifecycle` and `Impact Map` remain optional data contract sections but are not primary navigation tabs in the default viewer.
- [x] `Evidence` is not a standalone navigation tab.
- [x] Timing UI is removed from Phase 1 default screens.
- [x] Language shell supports Korean, English, Chinese, Japanese, and French.

## Agent Instructions

- [x] Agent setup documentation explains that the user's AI Agent performs project analysis.
- [x] Project JSON guide explains required analysis order and confidence rules.
- [x] Project JSON guide explains source-matched requirements, coverage reporting, and language selection.
- [x] Project JSON guide explains `overview`, `capabilities`, `dataLifecycles`, and `impactMaps` authoring rules.
- [x] Agent docs warn not to generate fake data or fake measurements.
- [x] Agent docs define `anlyx refresh` as a shorthand request for updating an existing `anlyx.project.json`.
- [x] Docs are framework-agnostic and do not assume Zup, Spring Boot, Next.js, or any single stack.

## Local And Security

- [x] Default workflow is local-only.
- [x] Project data is read from local JSON files.
- [x] Generated `.anlyx/` runtime output is ignored by Git.
- [x] Runtime measurements are optional and absent by default.

## Release Readiness

- [x] `corepack pnpm -r build` passes after the beta release documentation update.
- [x] `corepack pnpm test` passes after the beta release documentation update.
- [x] `corepack pnpm --filter anlyx pack --dry-run` verifies publish contents.
- [x] Local tarball install can run `npx anlyx --help`, `prompt`, `validate`, `import`, and `dev`.
- [x] Fresh npm install verifies the published `0.1.6-beta.1` package after npm publish.
