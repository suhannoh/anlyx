# Live Workspace Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the old drawer/overlay product path and tighten the v0.1 Live Workspace runtime so installed Anlyx and the demo share the same capture contract.

**Architecture:** Keep the full-page Workspace as the primary UI served by the local Anlyx runtime. Keep a tiny development script at the legacy `/_anlyx/overlay.js` URL for compatibility, but make it install only the browser capture runtime plus a small "Open workspace" badge. Remove the React drawer bundle from the build and expose a small capture-runtime subpath so the demo can avoid importing all of `@anlyx/ui`.

**Tech Stack:** TypeScript, React, Vite, Vitest, pnpm workspaces, local CLI middleware.

---

### Task 1: Remove Legacy Drawer Runtime From CLI

**Files:**

- Modify: `packages/cli/src/dev-command.ts`
- Modify: `packages/cli/src/dev-command.test.ts`

- [ ] **Step 1: Replace `getOverlayClientScript()` with a compact capture badge script**

Keep `/_anlyx/overlay.js` as a compatibility alias, but the returned string must only:

```ts
export function getOverlayClientScript(): string {
  return String.raw`
(() => {
  if (window.__ANLYX_CAPTURE_BADGE_INSTALLED__) return;
  window.__ANLYX_CAPTURE_BADGE_INSTALLED__ = true;
  const currentScript = document.currentScript;
  const runtimeBaseUrl = currentScript && currentScript.src ? new URL(currentScript.src).origin : window.location.origin;
  window.__ANLYX_RUNTIME_BASE_URL__ = runtimeBaseUrl;
  installCaptureRuntime();
  installCaptureBadge();
  // helpers omitted here must only create /_anlyx/capture.js and the badge
})();
`;
}
```

- [ ] **Step 2: Delete unreachable drawer string code**

Remove the old second `return String.raw` block inside `getOverlayClientScript()` so these strings no longer exist in `packages/cli/src/dev-command.ts`:

```txt
__ANLYX_RENDER_FLOW_DRAWER__
overlay-ui.js
overlay-ui.css
anlyx-drawer
renderReactDrawer
```

- [ ] **Step 3: Update CLI tests**

Keep tests asserting:

```ts
expect(script).toContain("/_anlyx/capture.js");
expect(script).toContain("Open workspace");
expect(script).not.toContain("__ANLYX_RENDER_FLOW_DRAWER__");
expect(script).not.toContain("overlay-ui.js");
```

- [ ] **Step 4: Verify CLI runtime tests**

Run:

```bash
corepack pnpm vitest run packages/cli/src/dev-command.test.ts
```

Expected: all tests pass.

### Task 2: Stop Building The Drawer Bundle

**Files:**

- Modify: `packages/ui/vite.overlay.config.ts`
- Modify: `packages/ui/package.json`
- Delete: `packages/ui/src/overlay/*`
- Delete: `packages/ui/src/readme-demo/*`
- Modify: `docs/assets/readme/anlyx-demo.html`

- [ ] **Step 1: Change Vite runtime build to capture only**

`packages/ui/vite.overlay.config.ts` should build only:

```ts
lib: {
  entry: resolve(packageRoot, "src/capture/capture-entry.ts"),
  fileName: () => "capture.js",
  formats: ["iife"],
  name: "AnlyxCaptureRuntime"
}
```

with:

```ts
outDir: "dist/overlay";
```

- [ ] **Step 2: Remove overlay source files and tests**

Delete the drawer-specific files under:

```txt
packages/ui/src/overlay/
packages/ui/src/readme-demo/
```

- [ ] **Step 3: Remove readme demo HTML reference**

If `docs/assets/readme/anlyx-demo.html` only points at the deleted readme demo entry, replace it with a static note:

```html
<p>Anlyx demo now lives in apps/demo and uses the full-page Live Workspace.</p>
```

- [ ] **Step 4: Verify UI build no longer emits overlay-ui**

Run:

```bash
corepack pnpm --filter @anlyx/ui build
```

Expected: `dist/overlay/capture.js` exists, and no new `dist/overlay/overlay-ui.js` is emitted.

### Task 3: Add Capture Runtime Subpath Export

**Files:**

- Modify: `packages/ui/package.json`
- Modify: `apps/demo/src/anlyxLiveRuntime.ts`
- Test: `apps/demo` build

- [ ] **Step 1: Add package export**

Add:

```json
"./capture-runtime": {
  "types": "./dist/capture/capture-runtime.d.ts",
  "default": "./dist/capture/capture-runtime.js"
}
```

- [ ] **Step 2: Change demo import**

Use:

```ts
import { installAnlyxCaptureRuntime } from "@anlyx/ui/capture-runtime";
```

instead of importing from `@anlyx/ui`.

- [ ] **Step 3: Verify demo build**

Run:

```bash
corepack pnpm --filter @anlyx/demo build
```

Expected: build passes. Bundle size warning should be reduced or gone; if Vite still warns, report it honestly.

### Task 4: Align Docs And Helper Names

**Files:**

- Modify: `docs/contracts/config-contract.md`
- Modify: `packages/cli/src/next.ts`
- Modify: `packages/cli/src/next.test.ts`
- Modify: `packages/cli/src/cli-entrypoint.test.ts`

- [ ] **Step 1: Update docs language**

Replace "overlay script" wording with "capture script" while keeping compatibility path notes:

```txt
/_anlyx/overlay.js remains a compatibility alias that installs capture runtime and badge.
/_anlyx/capture.js is the direct browser capture runtime asset.
```

- [ ] **Step 2: Keep existing Next helper API but clarify behavior**

Do not break `AnlyxDevOverlay` in this pass. It may still return `/_anlyx/overlay.js`, but tests should describe it as the development capture helper, not a drawer overlay.

- [ ] **Step 3: Verify tests**

Run:

```bash
corepack pnpm vitest run packages/cli/src/next.test.ts packages/cli/src/cli-entrypoint.test.ts
```

Expected: all tests pass.

### Task 5: Final Verification

**Files:**

- No new files.

- [ ] **Step 1: Search for forbidden drawer main-flow strings**

Run:

```bash
rg -n "FlowDrawer|__ANLYX_RENDER_FLOW_DRAWER__|overlay-ui|anlyx-drawer|Flow Drawer" packages apps docs -g '!**/dist/**'
```

Expected: no product/runtime references remain. Historical superseded docs may mention old overlay/drawer only when clearly marked superseded.

- [ ] **Step 2: Run focused tests**

Run:

```bash
corepack pnpm vitest run packages/cli/src/dev-command.test.ts packages/ui/src/workspace/WorkspaceApp.test.tsx packages/ui/src/capture/capture-runtime.test.ts packages/core/src/live-flow.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Run full build and format**

Run:

```bash
corepack pnpm -r --sort run build
corepack pnpm format
```

Expected: both pass.

- [ ] **Step 4: Report remaining risks**

Report whether:

```txt
legacy drawer files are deleted
capture helper remains backward compatible
demo uses product capture runtime
workspace tests/build passed
```
