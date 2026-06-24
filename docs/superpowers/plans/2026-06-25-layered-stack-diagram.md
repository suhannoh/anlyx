# Layered Stack Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Live Workspace Diagram tab as a dynamic layered stack flow diagram derived from each selected `FlowRecord`.

**Architecture:** Keep the existing Live Workspace shell and replace only the Diagram content. Add a local mapper inside `WorkspaceApp.tsx` that converts `FlowRecord` layers into a `LayeredDiagramModel`, then render fixed layer columns with dynamically stacked cards and SVG elbow edges computed from node slots. This avoids a new graph dependency while preserving a future path to React Flow/ELK.

**Tech Stack:** React, TypeScript, CSS Grid, inline SVG edges, existing `@anlyx/ui` workspace styles.

---

### Task 1: Add Diagram Model Mapping

**Files:**

- Modify: `packages/ui/src/workspace/WorkspaceApp.tsx`
- Test: `packages/ui/src/workspace/WorkspaceApp.test.tsx`

- [ ] **Step 1: Add local diagram types**

Add local types near `DiagramFlowView`:

```ts
type DiagramLayerId = "browser" | "api" | "application" | "data" | "response";
type DiagramNodeStatus =
  | "observed"
  | "matched"
  | "source_matched"
  | "inferred"
  | "not_proven"
  | "no_evidence"
  | "success"
  | "blocked"
  | "error";
type DiagramEdgeKind = "executed" | "source_matched" | "inferred" | "not_proven" | "blocked";

type LayeredDiagramNode = {
  id: string;
  sourceLayer?: FlowLayer;
  layer: DiagramLayerId;
  kind: FlowLayer["type"];
  title: string;
  subtitle: string;
  detail?: string;
  durationMs?: number;
  step: number;
  status: DiagramNodeStatus;
  isMainPath: boolean;
  evidenceKind: "browser" | "source" | "runtime" | "inferred" | "none";
};

type LayeredDiagramEdge = {
  id: string;
  from: string;
  to: string;
  kind: DiagramEdgeKind;
};

type LayeredDiagramModel = {
  layers: DiagramLayerId[];
  nodes: LayeredDiagramNode[];
  edges: LayeredDiagramEdge[];
};
```

- [ ] **Step 2: Implement `buildLayeredDiagramModel(record, locale)`**

Map the selected `FlowRecord` into layer columns:

```ts
const diagramLayerOrder: DiagramLayerId[] = ["browser", "api", "application", "data", "response"];

function buildLayeredDiagramModel(
  record: FlowRecord,
  locale: WorkspaceLocale
): LayeredDiagramModel {
  const layers = diagramLayers(record);
  const visible = orderDiagramLayers(layers);
  const nodes = visible.map((layer, index) => toLayeredDiagramNode(layer, index + 1, locale));
  const edges = buildLayeredDiagramEdges(nodes, record);
  return { layers: diagramLayerOrder, nodes, edges };
}
```

- [ ] **Step 3: Preserve evidence semantics**

Status conversion must keep observed/source/not-proven distinct:

```ts
function diagramNodeStatus(layer: FlowLayer, record: FlowRecord): DiagramNodeStatus {
  if (layer.execution === "blocked") return "blocked";
  if (layer.type === "result" && record.status && record.status >= 500) return "error";
  if (layer.type === "result" && record.status && record.status < 400) return "success";
  if (isUnprovenLayer(layer)) return "not_proven";
  if (layer.execution === "inferred") return "inferred";
  if (layer.evidenceLevel === "browser_observed") return "observed";
  return "source_matched";
}
```

- [ ] **Step 4: Add tests for dynamic model behavior**

Add tests that render Diagram and assert layer headings plus distinct not-proven text:

```ts
expect(screen.getByText("Browser")).toBeTruthy();
expect(screen.getByText("Application")).toBeTruthy();
expect(screen.getByText("Known but not proven")).toBeTruthy();
```

### Task 2: Replace Diagram Renderer

**Files:**

- Modify: `packages/ui/src/workspace/WorkspaceApp.tsx`
- Modify: `packages/ui/src/workspace/workspace.css`

- [ ] **Step 1: Replace fixed four-card graph with layered board**

`DiagramFlowView` should render:

```tsx
<div className="layered-diagram">
  <LayeredDiagramEdges model={model} hoveredNodeId={hoveredNodeId} />
  {model.layers.map((layer) => (
    <LayeredDiagramColumn key={layer} layer={layer} nodes={nodesByLayer[layer]} />
  ))}
</div>
```

- [ ] **Step 2: Render dynamic node cards**

Each node card must include step, icon, title, subtitle, duration, and evidence/status:

```tsx
<article className={`layered-node layered-node--${node.status}`}>
  <span className="layered-node__step">{node.step}</span>
  <span className={`layered-node__icon layered-node__icon--${node.layer}`}>{icon}</span>
  <strong>{node.title}</strong>
  <small>{node.subtitle}</small>
  <span className="layered-node__duration">{formatDuration(node.durationMs)}</span>
  <span className="layered-node__badge">{statusLabel}</span>
</article>
```

- [ ] **Step 3: Render SVG elbow edges**

Compute edge coordinates from layer and slot indices. Cross-column edges use horizontal/vertical elbow paths; same-column edges use vertical paths.

- [ ] **Step 4: Add hover highlighting**

Hovering a node should add `.is-connected` to connected edges and dim unrelated not-proven nodes.

### Task 3: Visual Polish And Verification

**Files:**

- Modify: `packages/ui/src/workspace/workspace.css`
- Test: `packages/ui/src/workspace/WorkspaceApp.test.tsx`

- [ ] **Step 1: Keep Clean Light background**

Use existing workspace background and white panels. Do not add a dark full-canvas background.

- [ ] **Step 2: Add restrained layer colors**

Use purple browser, blue API, teal application, amber data, and green response accents.

- [ ] **Step 3: Verify**

Run:

```bash
corepack pnpm exec vitest run packages/ui/src/workspace/WorkspaceApp.test.tsx
corepack pnpm --filter @anlyx/ui build
corepack pnpm run lint
corepack pnpm run typecheck
```

- [ ] **Step 4: Visual smoke**

Use Playwright against `http://localhost:4777/_anlyx/viewer`, open Diagram, and save a screenshot for manual inspection.

### Deferred

- Node-click-driven right inspector contents.
- React Flow/ELK migration.
- Dark mode.
- Runtime server trace detail beyond the existing `FlowRecord` data.
- External/cache/feature flag scanner extraction beyond nodes already present in a record.
