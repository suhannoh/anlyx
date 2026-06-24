# Live Workspace Action Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make installed Anlyx behave like the demo: user-triggered browser requests become the selected Live Workspace flow, while passive/background traffic stays visible without stealing focus.

**Architecture:** Keep capture, matching, and workspace rendering separated. The browser runtime marks whether a request came from a fresh user action; core converts that into `FlowRecord.trigger`; Workspace auto-selects only user-action records unless nothing is selected.

**Tech Stack:** TypeScript, React, Vitest, Vite, existing `@anlyx/core`, `@anlyx/ui`, and `@anlyx/cli` packages.

---

## Files

- Modify: `packages/core/src/live-flow.ts`
  - Add `trigger: "user_action" | "background"` to `FlowRecord`.
  - Populate it from `BrowserRequestEvent.action`.
- Modify: `packages/core/src/live-flow.test.ts`
  - Assert action-triggered and background-triggered records.
- Modify: `packages/ui/src/capture/capture-runtime.ts`
  - Expire click context after a short window.
  - Consume the action after attaching it to the next request.
- Modify: `packages/ui/src/capture/capture-runtime.test.ts`
  - Assert action is attached once.
  - Assert stale clicks do not attach to later requests.
- Modify: `packages/ui/src/workspace/WorkspaceApp.tsx`
  - Auto-select streamed records only when `trigger === "user_action"` or no selected record exists.
  - Show trigger in Recent events and inspector.
- Modify: `packages/ui/src/workspace/WorkspaceApp.test.tsx`
  - Assert background streams do not steal selection from a selected user action.
- Modify: `packages/cli/src/dev-command.test.ts`
  - Update fixture records to include `trigger`.
- Modify: `docs/contracts/data-contract.md`
  - Document `FlowRecord.trigger`.

---

### Task 1: Add Trigger To FlowRecord

- [ ] **Step 1: Write core expectations**

Add assertions in `packages/core/src/live-flow.test.ts`:

```ts
expect(record.trigger).toBe("user_action");
expect(backgroundRecord.trigger).toBe("background");
```

- [ ] **Step 2: Implement trigger**

In `packages/core/src/live-flow.ts`, add:

```ts
export type FlowRecordTrigger = "user_action" | "background";
```

Then add `trigger: FlowRecordTrigger` to `FlowRecord` and set:

```ts
trigger: event.action ? "user_action" : "background";
```

- [ ] **Step 3: Verify core**

Run:

```bash
corepack pnpm vitest run packages/core/src/live-flow.test.ts
```

Expected: PASS.

### Task 2: Make Capture Action Context Fresh And Single-Use

- [ ] **Step 1: Write capture runtime tests**

In `packages/ui/src/capture/capture-runtime.test.ts`, add tests that:

- click once, perform two fetches, and expect only the first posted event to include `action`
- click once, advance fake time beyond the action window, perform fetch, and expect no `action`

- [ ] **Step 2: Implement freshness window**

In `packages/ui/src/capture/capture-runtime.ts`, store action as:

```ts
type CapturedAction = BrowserActionEvent & { capturedAt: number };
let latestAction: CapturedAction | undefined;
```

Attach only when:

```ts
latestAction && metadata.startedAt - latestAction.capturedAt <= actionWindowMs;
```

After attaching, clear `latestAction`.

- [ ] **Step 3: Verify capture runtime**

Run:

```bash
corepack pnpm vitest run packages/ui/src/capture/capture-runtime.test.ts
```

Expected: PASS.

### Task 3: Make Workspace Selection Action-First

- [ ] **Step 1: Write Workspace test**

In `packages/ui/src/workspace/WorkspaceApp.test.tsx`, stream:

1. a user-action record
2. a background record

Then assert the title/details still show the first record.

- [ ] **Step 2: Implement selection rule**

In `WorkspaceApp`, replace unconditional streamed selection with:

```ts
setSelectedId((current) => (record.trigger === "user_action" || !current ? record.id : current));
```

- [ ] **Step 3: Show trigger quietly**

Add trigger text to Recent events metadata and inspector request details.

- [ ] **Step 4: Verify Workspace**

Run:

```bash
corepack pnpm vitest run packages/ui/src/workspace/WorkspaceApp.test.tsx
```

Expected: PASS.

### Task 4: Update Contracts And Full Verification

- [ ] **Step 1: Update data contract**

Document:

```ts
trigger: "user_action" | "background";
```

with language that background events remain visible but should not steal the selected main flow.

- [ ] **Step 2: Run verification**

Run:

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm -r --sort run build
corepack pnpm format
```

Expected: all pass.

---

## Self-Review

- Spec coverage: Covers user-action vs passive event behavior, click/request correlation, Workspace selection, and evidence-safe wording.
- Placeholder scan: No TBD or “implement later” steps.
- Type consistency: `FlowRecord.trigger` is introduced once and used by core, CLI fixtures, and Workspace.
