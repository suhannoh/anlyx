# Live Workspace Productization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the current demo-only live workspace into the real Anlyx `dev` product path, so installed projects stream real browser requests into a full-page workspace backed by real scan data.

**Architecture:** Keep the demo as a fixture-backed reference, but move reusable event, matching, and workspace concepts into `@anlyx/core`, `anlyx` CLI dev server, and `@anlyx/ui`. The real product path becomes `real app browser capture -> POST /_anlyx/events -> in-memory event store -> SSE /_anlyx/events/stream -> Workspace UI -> FlowRecord derived from ScanResult`.

**Tech Stack:** TypeScript, React 18, Vite middleware, SSE/EventSource, browser `fetch`/`XMLHttpRequest` interception, Vitest, Testing Library, existing `@anlyx/core` scan schemas.

---

## File Structure

- Create `packages/core/src/live-flow.ts`: shared live event, flow record, layer status, matching, timing, and evidence types.
- Create `packages/core/src/live-flow.test.ts`: method/path matching and FlowRecord derivation tests using fixture-like scan data.
- Modify `packages/core/src/index.ts`: export live-flow API.
- Create `packages/ui/src/workspace/WorkspaceApp.tsx`: product workspace shell that loads report data and subscribes to live events.
- Create `packages/ui/src/workspace/workspace-entry.tsx`: browser entry for `/workspace.html`.
- Create `packages/ui/src/workspace/workspace.css`: workspace visual system adapted from the demo, without fake app panels.
- Modify `packages/ui/src/viewer/ViewerApp.tsx`: leave standalone viewer as fallback/debug, not the live workspace.
- Modify `packages/ui/scripts/copy-viewer-assets.mjs`: copy `workspace.html` and workspace bundle outputs when building UI.
- Modify `packages/ui/vite.overlay.config.ts`: build capture runtime and workspace app assets.
- Create `packages/ui/src/capture/capture-runtime.ts`: install click, fetch, and XHR capture for real projects.
- Create `packages/ui/src/capture/capture-runtime.test.ts`: verify every request method/path/status/duration is sent to ingest.
- Modify `packages/cli/src/dev-command.ts`: add real event ingest, SSE stream, workspace route, capture runtime route, and Workspace Mode browser opening.
- Modify `packages/cli/src/dev-command.test.ts`: cover ingest, stream, route behavior, and `runDevCommand` result fields.
- Modify `packages/cli/src/next.ts`: keep helper dev-only, but point it at capture runtime instead of drawer UI.
- Modify `packages/cli/src/next.test.ts`: verify helper renders capture script only in development.
- Modify docs after behavior changes: `docs/contracts/data-contract.md`, `docs/contracts/config-contract.md`, `docs/design/screens.md`, `docs/acceptance/v0.1-checklist.md`, README files.
- Keep demo files under `apps/demo/src/*` as fixture-backed reference only; do not let demo-only fixtures become product dependencies.

---

## Task 1: Lock Shared Live Data Model

**Files:**

- Create: `packages/core/src/live-flow.ts`
- Create: `packages/core/src/live-flow.test.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `docs/contracts/data-contract.md`

- [ ] **Step 1: Write failing tests for browser event normalization**

Create `packages/core/src/live-flow.test.ts` with tests for:

```ts
import { describe, expect, it } from "vitest";
import type { ScanResult } from "./schema.js";
import { buildFlowRecordFromBrowserEvent, normalizeBrowserEventPath } from "./live-flow.js";

const scanResult: ScanResult = {
  projectName: "sample",
  generatedAt: "2026-06-24T00:00:00.000Z",
  schemaVersion: "0.1",
  endpoints: [
    {
      id: "endpoint:post:/api/account/saved-benefit",
      method: "POST",
      path: "/api/account/saved-benefit",
      supportLevel: "deep",
      handler: "SavedBenefitController.create",
      confidence: "high"
    }
  ],
  flows: [
    {
      endpointId: "endpoint:post:/api/account/saved-benefit",
      nodes: [
        { id: "endpoint", type: "endpoint", label: "POST /api/account/saved-benefit" },
        { id: "controller", type: "controller", label: "SavedBenefitController.create" },
        { id: "service", type: "service", label: "SavedBenefitService.save" },
        { id: "repository", type: "repository", label: "SavedBenefitRepository.insert" },
        { id: "database", type: "database", label: "saved_benefit" }
      ],
      edges: [
        { id: "e1", from: "endpoint", to: "controller", kind: "main" },
        { id: "e2", from: "controller", to: "service", kind: "main" },
        { id: "e3", from: "service", to: "repository", kind: "main" },
        { id: "e4", from: "repository", to: "database", kind: "db" }
      ],
      mainPath: ["endpoint", "controller", "service", "repository", "database"],
      subFlows: []
    }
  ],
  pages: [],
  warnings: []
};

describe("live flow records", () => {
  it("normalizes absolute request URLs into local API paths", () => {
    expect(normalizeBrowserEventPath("http://localhost:8080/api/account/saved-benefit")).toBe(
      "/api/account/saved-benefit"
    );
  });

  it("matches method and path to scanned endpoint data", () => {
    const record = buildFlowRecordFromBrowserEvent(
      {
        id: "evt_1",
        type: "request",
        method: "POST",
        url: "http://localhost:8080/api/account/saved-benefit",
        path: "/api/account/saved-benefit",
        status: 401,
        durationMs: 56,
        observedAt: "2026-06-24T00:00:01.000Z",
        action: { label: "Save perk", selector: "button[data-action='save']" }
      },
      scanResult
    );

    expect(record.matchState).toBe("matched");
    expect(record.method).toBe("POST");
    expect(record.path).toBe("/api/account/saved-benefit");
    expect(record.layers.map((layer) => layer.type)).toEqual([
      "action",
      "api",
      "controller",
      "service",
      "repository",
      "database",
      "result"
    ]);
    expect(record.layers.find((layer) => layer.type === "service")?.execution).toBe("not_proven");
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
corepack pnpm vitest run packages/core/src/live-flow.test.ts
```

Expected: FAIL because `packages/core/src/live-flow.ts` does not exist yet.

- [ ] **Step 3: Implement the shared model and matcher**

Create `packages/core/src/live-flow.ts` with:

- `BrowserActionEvent`
- `BrowserRequestEvent`
- `FlowLayer`
- `FlowRecord`
- `normalizeBrowserEventPath(urlOrPath: string): string`
- `buildFlowRecordFromBrowserEvent(event, scanResult): FlowRecord`

Rules:

- Match by `method + normalized path`.
- Support dynamic scanned path params such as `/api/public/benefits/{id}` and `/api/public/benefits/:id`.
- For `401`, `403`, `409`, mark downstream service/repository/database as `not_proven`.
- For `2xx`, mark scanned downstream layers as `scanned` unless runtime proof exists.
- Add `Evidence` entries that say `browser_observed`, `source_derived`, `inferred`, or `not_proven`.
- Do not claim runtime server traces.

- [ ] **Step 4: Export the API**

Modify `packages/core/src/index.ts`:

```ts
export * from "./live-flow.js";
```

- [ ] **Step 5: Update data contract**

Add a `Live Workspace Records` section to `docs/contracts/data-contract.md` documenting:

- Browser-observed request event
- Action context
- FlowRecord
- Layer execution values: `executed`, `inferred`, `blocked`, `scanned`, `not_proven`, `unknown`
- Evidence levels and wording rules

- [ ] **Step 6: Verify**

Run:

```bash
corepack pnpm vitest run packages/core/src/live-flow.test.ts packages/core/src/schema.test.ts
corepack pnpm format
```

Expected: all pass.

---

## Task 2: Product Capture Runtime

**Files:**

- Create: `packages/ui/src/capture/capture-runtime.ts`
- Create: `packages/ui/src/capture/capture-runtime.test.ts`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/vite.overlay.config.ts`

- [ ] **Step 1: Write failing capture tests**

Create tests that install the runtime in JSDOM-like globals and assert:

- Click context is captured before the next request.
- `fetch("/api/public/benefits")` posts one event to `/_anlyx/events`.
- XHR `POST /api/account/saved-benefit` posts one event to `/_anlyx/events`.
- Anlyx internal paths `/_anlyx/*`, Vite dev paths, static assets, and favicon are ignored.

Run:

```bash
corepack pnpm vitest run packages/ui/src/capture/capture-runtime.test.ts
```

Expected: FAIL because runtime module does not exist.

- [ ] **Step 2: Implement capture runtime**

Create `installAnlyxCaptureRuntime(options)` with:

- `runtimeBaseUrl`, defaulting to `window.__ANLYX_RUNTIME_BASE_URL__` or `http://localhost:4777`
- `ingestPath`, defaulting to `/_anlyx/events`
- click listener in capture phase
- fetch wrapper preserving original request/response behavior
- XHR wrapper preserving original request/response behavior
- duration measurement with `performance.now()`
- event POST using original fetch when possible
- uninstall function that restores original fetch/XHR and removes click listener

- [ ] **Step 3: Build browser entry**

Export a small browser entry that calls:

```ts
installAnlyxCaptureRuntime();
```

Expose a safe global:

```ts
window.__ANLYX_CAPTURE_INSTALLED__ = true;
```

- [ ] **Step 4: Update UI build config**

Update `packages/ui/vite.overlay.config.ts` so the build emits:

- `overlay-ui.js` for legacy UI if still needed temporarily
- `capture.js` for the new product runtime
- `workspace.js` and `workspace.css` after Task 4

- [ ] **Step 5: Verify**

Run:

```bash
corepack pnpm vitest run packages/ui/src/capture/capture-runtime.test.ts
corepack pnpm --filter @anlyx/ui build
```

Expected: all pass and `dist/overlay/capture.js` exists.

---

## Task 3: Local Server Event Ingest and SSE

**Files:**

- Modify: `packages/cli/src/dev-command.ts`
- Modify: `packages/cli/src/dev-command.test.ts`
- Modify: `docs/contracts/config-contract.md`

- [ ] **Step 1: Write failing server tests**

Add tests proving:

- `POST /_anlyx/events` accepts a valid browser request event and returns `202`.
- `GET /_anlyx/events/stream` returns `text/event-stream`.
- Ingested events are converted to FlowRecords using real `reportData`.
- SSE clients receive `event: flow` messages.
- `GET /_anlyx/capture.js` serves the capture runtime asset with CORS headers.
- `GET /_anlyx/workspace` serves the workspace page.

- [ ] **Step 2: Add in-memory event store**

Inside `createAnlyxDevPlugin`, create per-server state:

- `events: FlowRecord[]`
- `sseClients: Set<ServerResponse>`
- `pushFlow(record)`
- `serializeSseEvent("flow", record)`
- max retained events: 100

- [ ] **Step 3: Add ingest route**

In middleware:

- Handle `OPTIONS /_anlyx/events`.
- Handle `POST /_anlyx/events`.
- Read request body.
- Validate minimal event shape.
- Use `buildFlowRecordFromBrowserEvent(event, options.reportData)`.
- Store and broadcast.
- Return `{ accepted: true, id }`.

- [ ] **Step 4: Add stream route**

In middleware:

- Handle `GET /_anlyx/events/stream`.
- Set `content-type: text/event-stream`.
- Send retained records immediately.
- Keep connection alive with comments every 15 seconds.
- Remove clients on close.

- [ ] **Step 5: Update CORS**

Allow:

```txt
GET, POST, OPTIONS
content-type
```

- [ ] **Step 6: Verify**

Run:

```bash
corepack pnpm vitest run packages/cli/src/dev-command.test.ts
corepack pnpm --filter anlyx build
```

Expected: all pass.

---

## Task 4: Product Workspace UI in `@anlyx/ui`

**Files:**

- Create: `packages/ui/src/workspace/WorkspaceApp.tsx`
- Create: `packages/ui/src/workspace/workspace-entry.tsx`
- Create: `packages/ui/src/workspace/workspace.css`
- Create: `packages/ui/src/workspace/WorkspaceApp.test.tsx`
- Modify: `packages/ui/scripts/copy-viewer-assets.mjs`
- Modify: `packages/ui/package.json`

- [ ] **Step 1: Write failing workspace tests**

Tests should render `WorkspaceApp` with mocked fetch/EventSource and assert:

- Loading state while `/api/report-data` loads.
- Empty state before first live event.
- Recent events list updates after `flow` SSE message.
- Latest event auto-selects.
- Selecting an older event updates Summary, Timing, Diagram, and Inspector.
- `401` flow displays `blocked` and `not proven executed` copy.

- [ ] **Step 2: Extract reusable view pieces from demo**

Move only product-safe pieces from `apps/demo/src/LiveWorkspace.tsx` into workspace files:

- `WorkspaceShell`
- `WorkspaceSidebar`
- `WorkspaceHeader`
- `FlowTabs`
- `RecentEvents`
- `SummaryFlowView`
- `TimingWaterfallView`
- `DiagramFlowView`
- `FlowInspectorPanel`

Do not move:

- Benefits Studio fake app panel
- demo fixture imports
- demo runtime installer

- [ ] **Step 3: Load real data**

Workspace should:

- `fetch("/api/report-data")` for initial scan data.
- open `new EventSource("/_anlyx/events/stream")`.
- store `FlowRecord[]`.
- use an empty state explaining that the user should click the real app.
- never require fake buttons.

- [ ] **Step 4: Add workspace HTML entry**

Create `workspace-entry.tsx` that renders `WorkspaceApp`.

Add `workspace.html` equivalent to viewer HTML, loading workspace bundle and CSS.

- [ ] **Step 5: Verify visual shell**

Run:

```bash
corepack pnpm vitest run packages/ui/src/workspace/WorkspaceApp.test.tsx
corepack pnpm --filter @anlyx/ui build
```

Expected: all pass and workspace assets are generated.

---

## Task 5: Make `anlyx dev` Workspace Mode the Real Main Path

**Files:**

- Modify: `packages/cli/src/dev-command.ts`
- Modify: `packages/cli/src/dev-command.test.ts`
- Modify: `packages/cli/src/next.ts`
- Modify: `packages/cli/src/next.test.ts`
- Modify: `docs/acceptance/v0.1-checklist.md`

- [ ] **Step 1: Update dev command result**

Change `runDevCommand` so Workspace Mode returns:

```ts
{
  url: "http://localhost:4777/_anlyx/workspace",
  frontendUrl: config.frontend.baseUrl,
  captureScriptTag: '<script src="http://localhost:4777/_anlyx/capture.js" defer></script>'
}
```

- [ ] **Step 2: Open workspace and real app intentionally**

If `openBrowser` is true:

- open `frontend.baseUrl`
- open `server.url + "/_anlyx/workspace"`

Do not open the old inject info page as the primary experience.

- [ ] **Step 3: Serve compatibility paths**

Keep these for compatibility:

- `/_anlyx/viewer`
- `/api/report-data`
- `/_anlyx/report-data`
- `/_anlyx/overlay.js` only as legacy alias or deprecation path

- [ ] **Step 4: Update Next helper**

`AnlyxDevOverlay` can remain temporarily as a compatibility name, but it should inject capture runtime and render at most a small badge/open-workspace link.

Required wording:

```txt
Anlyx capturing · Open workspace
```

It must not render Flow Drawer.

- [ ] **Step 5: Verify**

Run:

```bash
corepack pnpm vitest run packages/cli/src/dev-command.test.ts packages/cli/src/next.test.ts
corepack pnpm --filter anlyx build
```

Expected: all pass.

---

## Task 6: Demo Remains Fixture-Backed, Product Uses Real Scan Data

**Files:**

- Modify: `apps/demo/src/LiveWorkspace.tsx`
- Modify: `apps/demo/src/anlyxDemoFlow.ts`
- Modify: `apps/demo/src/anlyxLiveRuntime.ts`
- Modify: `apps/demo/vite.config.ts`
- Add or modify demo tests if present.

- [ ] **Step 1: Keep demo isolated**

Ensure `apps/demo` imports shared types/helpers from `@anlyx/core` where possible, but keeps fixture-backed API endpoints local.

- [ ] **Step 2: Prevent demo code from becoming product path**

Search:

```bash
rg -n "BenefitsStudio|demoFlow|DemoLiveEvent|installAnlyxDemoRuntime" packages
```

Expected: no matches in `packages/*`.

- [ ] **Step 3: Confirm demo still works**

Run:

```bash
corepack pnpm demo:build
```

Then use browser smoke:

- Open `/anlyx/demo`.
- Click `Search benefits`.
- Click `Save perk`.
- Confirm real fixture API requests still appear in demo workspace.

---

## Task 7: End-to-End Installed Project Smoke

**Files:**

- Modify: `packages/cli/src/acceptance-smoke.test.ts`
- Modify: `scripts/pack-local-install.mjs` only if packaging misses new assets.
- Modify: `docs/acceptance/v0.1-checklist.md`

- [ ] **Step 1: Add smoke expectations**

Acceptance smoke should verify:

- Packaged `anlyx` includes workspace HTML/assets and capture runtime.
- `anlyx dev` serves `/_anlyx/workspace`.
- `/_anlyx/capture.js` loads.
- `POST /_anlyx/events` accepts an event.
- `GET /_anlyx/events/stream` receives the FlowRecord.
- The FlowRecord is derived from fixture `report-data.json`, not demo fixtures.

- [ ] **Step 2: Run full verification**

Run:

```bash
corepack pnpm test
corepack pnpm build
corepack pnpm lint
corepack pnpm format
corepack pnpm pack:local
```

Expected: all pass.

---

## Task 8: Remove or Demote Drawer Main UX

**Files:**

- Modify: `packages/ui/src/overlay/*`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/vite.overlay.config.ts`
- Modify: README files.

- [ ] **Step 1: Search all drawer references**

Run:

```bash
rg -n "FlowDrawer|Flow Drawer|drawer|overlay" packages docs README.md README.ko.md
```

- [ ] **Step 2: Decide deletion vs legacy quarantine**

Preferred now:

- Keep legacy files only if needed for backward compatibility tests.
- Stop exporting Flow Drawer as the main UI.
- Mark legacy overlay routes as debug/compat only.

- [ ] **Step 3: Update docs and README**

README first-run should say:

```bash
npm i -D anlyx
npx anlyx init
npx anlyx dev
```

Then:

```txt
Use your local app normally. Keep Anlyx Workspace open beside it.
```

- [ ] **Step 4: Verify no main-path drawer wording remains**

Run:

```bash
rg -n "Flow Drawer|drawer reacts|opens a drawer|main Anlyx UI" docs README.md README.ko.md packages
```

Expected: no main-path wording. Legacy references must explicitly say compatibility/debug.

---

## Execution Order and Stop Points

1. Task 1 must land first because every later layer depends on shared FlowRecord semantics.
2. Task 2 can run in parallel with Task 3 after Task 1 types are agreed.
3. Task 4 starts after Task 1 and Task 3 because it needs FlowRecord and live stream.
4. Task 5 starts after Task 2 and Task 4.
5. Task 6 runs after Task 4 so the demo can optionally reuse shared view types without driving product behavior.
6. Task 7 is the release gate.
7. Task 8 is cleanup after the workspace path is working.

Do not merge a task unless its targeted tests pass.

---

## Risks

- CORS and same-origin behavior: capture runtime runs in the app origin while ingest is on the Anlyx runtime origin.
- Fetch/XHR wrapping must preserve app behavior exactly.
- SSE connections can hang tests if not closed carefully.
- Dynamic path matching must not over-match unrelated endpoints.
- The workspace must stay honest: browser request is live, backend path is scanned/inferred/not proven unless runtime proof exists.
- `AnlyxDevOverlay` naming is now misleading; keep it only as temporary compatibility if deleting it would break public API too early.

---

## Self-Review

- Spec coverage: covers real browser capture, actual fetch/XHR requests, event ingest, SSE stream, real ScanResult matching, workspace UI, demo isolation, installed-project smoke, and drawer demotion.
- Placeholder scan: no task uses TBD/TODO/fill-in-later language. Each task has concrete files, commands, and expected results.
- Type consistency: `BrowserRequestEvent`, `FlowRecord`, `FlowLayer`, and evidence terminology are introduced in Task 1 and reused consistently later.
