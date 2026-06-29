# Anlyx Roadmap

This roadmap keeps future work visible without expanding the current product
direction by accident.

## Current Direction

Anlyx is moving from flow-first visualization to project-first visualization.

The primary product surface is:

```txt
anlyx.project.json -> local 4777 viewer
```

The user's AI Agent analyzes the target project and authors the JSON. Anlyx
validates, normalizes, and renders it.

Current focus:

- `anlyx.project.json` as the primary input format.
- Pages-first workspace for product and onboarding understanding.
- Map view for agent-authored architecture relationships.
- JSON view for direct inspection and debugging.
- Evidence labels that keep observed, source-matched, agent-inferred,
  measured, not-proven, and unknown claims separate.
- Timing disabled by default unless real `measurements` exist.
- Local-only workflow on port `4777`.

Previous analysis experiments are compatibility/internal context only. New
product work should start from Project JSON.

## Near-Term Priorities

1. Project JSON product contract
   - Keep `docs/contracts/data-contract.md` aligned with schema and validator behavior.
   - Keep agent authoring instructions focused on real project analysis.
   - Support both single-file `anlyx.project.json` and split `.anlyx/project/*.json`.
   - Never let the real viewer invent project pages, requests, architecture nodes, or timings.

2. Pages workspace
   - Make the Pages view the default comprehension surface.
   - Show areas, pages, features, requests, flow summaries, evidence, and missing data clearly.
   - Keep copy concise enough for developers, product owners, and new team members.
   - Support Korean, English, Chinese, Japanese, and French viewer chrome.

3. Architecture Map
   - Render only Agent-authored architecture nodes and edges in real project mode.
   - Keep the Map legible as a left-to-right project architecture view.
   - Distinguish page/request/API/controller/service/repository/database/result nodes.
   - Keep demo/mock graph data isolated to demo mode.

4. JSON Reader
   - Make `anlyx.project.json` readable for debugging.
   - Show schema version, validation state, counts, project metadata, and missing optional sections.
   - Keep raw JSON copy/export local.

5. Agent setup reliability
   - Keep setup, readiness, implementation, and project JSON guides aligned.
   - Add a smoke test that installs Anlyx into a separate sample project and opens 4777.
   - The smoke test must distinguish static Project JSON success from optional timing success.

6. Optional measurements
   - Keep runtime measurement as an optional enhancement, not the core requirement.
   - Document how agents can add local-only probes when the user explicitly wants timing.
   - Do not claim measured timing from source-derived order or inferred architecture.

7. Release hygiene
   - Deprecate older broken npm versions.
   - Add changelog/versioning workflow.
   - Keep package exports aligned with documented CLI and viewer behavior.

## v0.2 Candidates

- Stronger Project JSON validator and migration tooling.
- Split-file Project JSON import.
- Better Pages detail design.
- Better Map polish, grouping, and inspector interactions.
- Project diff between two imported snapshots.
- Static HTML or local bundle export.
- PNG/SVG export for selected pages or maps.
- Agent setup smoke-test fixtures for multiple stacks.

## v0.3 Candidates

- Optional OpenTelemetry import.
- Optional local runtime measurement adapters.
- PR architecture diff.
- Multi-service project maps.
- Plugin or producer SDK for external tools.
- Large monorepo support.
- Team onboarding report generation from Project JSON.

## Non-Goals For The Current Direction

- Framework-specific first-party analysis claims.
- Remote hosted project analysis.
- Uploading private architecture data to GitHub by default.
- Treating AI prose as trusted evidence.
- Fake demo data in a user's real project viewer.
- Timing claims without real `measurements`.
