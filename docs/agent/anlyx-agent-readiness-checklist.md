# Anlyx Agent Readiness Checklist

This checklist helps decide whether an AI coding agent can set up Anlyx in a
user project without getting stuck.

It is not the setup guide and not the schema contract. Use it before claiming
the project is ready.

## Ready When

The target project is ready for Anlyx when the Agent can answer:

- Which package manager installs dev dependencies?
- Where is the project root?
- What command starts the local app?
- What local URL serves the app, if any?
- What backend URL or internal service URL exists, if any?
- Where should `anlyx.config.ts` live?
- Where should `anlyx.project.json` live?
- What pages/routes should appear in the Pages index?
- Which authored areas group those pages?
- Which requests are primary, supporting, background, or external?
- Which source files prove key API calls, handlers, services, repositories,
  jobs, database models/tables, or external calls?
- Which relationships are unknown, inferred, or not proven?
- Can the Agent run validation/import for `anlyx.project.json`?
- Can the Agent open the 4777 viewer?
- Can the Agent confirm the viewer renders authored surfaces from the file,
  including Pages, Map, JSON, and any optional `0.3.0` sections?
- If measurements are requested, can the Agent provide real measured evidence?

If any answer is missing, the Agent may still write partial project JSON, but it
must mark the missing parts as `unknown`, `not-proven`, or leave them empty.

## Required One-Pass Setup Outcome

A successful default setup produces:

```txt
anlyx.config.ts
anlyx.project.json
.anlyx/agent/setup-notes.md   optional but recommended
```

And reports:

- Completed level.
- Viewer URL, normally `http://localhost:4777`.
- Page count.
- Request count.
- Flow count.
- Architecture node/edge count.
- Evidence count.
- Measurement count.
- Known unknowns.

## Likely Blocking Moments

### Package Install

The published package may lag behind the repository, or the project may not
allow dependency installation.

Agent response:

- Report the package manager error.
- Check whether `npx anlyx --help` includes project JSON validate/import
  commands.
- Do not use removed scanner commands as a substitute.
- Still write `anlyx.project.json` if possible.
- Do not claim validation or import succeeded unless it actually ran.

### Missing Project JSON

Anlyx does not infer the user's whole project by itself.

Agent response:

- Read the Project JSON Agent Guide.
- Write `anlyx.project.json`.
- Use explicit uncertainty instead of guessing.

### Confusing Primary Requests With Background Traffic

Many apps fire auth/session/current-user checks before the main page data.

Agent response:

- Classify background implementation traffic as `background`.
- Keep the page/action's meaningful request as `primary`.
- If there is no primary request, leave it absent and explain the page through
  story/features/evidence.

Correct:

```txt
Page: /contact
Primary requests: none
Background: GET /api/account/me
```

Incorrect:

```txt
Page: /contact
Primary request: GET /api/account/me
```

Unless the contact page's main feature truly is the account request.

### Browser Traffic Is Not The Whole App

Important data may be loaded through SSR, route handlers, server components,
loaders, middleware, jobs, or backend-for-frontend code.

Agent response:

- Inspect source, not just browser requests.
- Add source-backed server-side or loader requests when they explain the page.
- Cite source evidence.
- Mark runtime status separately from source evidence.

### Architecture Map Is Empty

The Map view cannot be meaningful without authored architecture nodes and
edges.

Agent response:

- Build `architecture.nodes` from real project entities.
- Build `architecture.edges` from source-backed or explicitly inferred
  relationships.
- Leave the map empty if there is no evidence.
- Do not use demo nodes in a real project file.

### Orphaned Or Unclear Map Data

Nodes without useful relationships make the Map look broken.

Agent response:

- Prefer representative primary paths.
- Use collapsed group nodes for repeated requests/tables.
- Use `displayLabel` for short labels.
- Keep full names in `label` and evidence.
- Do not create disconnected nodes unless they are selected, explicitly
  important, or the relationship is intentionally unknown.

### Measurements Requested

Layer timing is not available from source evidence alone.

Agent response:

- Leave `measurements: []` by default.
- Read the Local Probe Contract before adding probes.
- Use real telemetry/runtime evidence only.
- Do not split one browser request duration across internal layers.
- Do not claim service/repository/database timing without layer-level data.

### Unknown Local Port

The app may not run on port `3000`.

Agent response:

- Inspect scripts and dev server output.
- Use the actual local URL.
- Keep the Anlyx viewer on `4777` unless the user overrides it.

### Authentication Required

The app may require login before meaningful requests or pages are visible.

Agent response:

- Do not store credentials in Anlyx files.
- Use source evidence when runtime access is unavailable.
- Mark protected runtime paths as `not-proven` or `unknown` when needed.

### Security Risk

Project files may accidentally expose secrets or private data.

Agent response:

- Remove tokens, cookies, credentials, raw auth headers, and production records.
- Use schema shapes, relative file paths, symbols, and line ranges.
- Keep Anlyx output local by default.

## Validation Checklist

Before reporting completion:

- `anlyx.project.json` exists.
- `schemaVersion` is `0.2.0` or `0.3.0`.
- `project.id` and `project.name` exist.
- `areas`, `pages`, `features`, `requests`, `flows`, `evidence`, and
  `measurements` are arrays.
- `architecture.nodes` and `architecture.edges` are arrays.
- Every page path is authored, not guessed by the viewer.
- Every request has a role.
- Every flow edge points to existing flow nodes.
- Every architecture edge points to existing architecture nodes.
- Evidence target IDs point to existing objects when possible.
- Measurements are empty or backed by measured evidence.
- The viewer opens locally at `4777`.

## Final Agent Statement

Use a concrete final statement:

```txt
Anlyx Level 2 setup is complete.
Viewer: http://localhost:4777
Data: anlyx.project.json
Pages: 12
Requests: 31
Flows: 18
Map: 84 nodes / 126 edges
Evidence: 76 items
Measurements: 0, so Timing is disabled
Known unknowns: payment webhook runtime path not proven
```

Do not say "fully analyzed" when any major area is still inferred or unknown.
