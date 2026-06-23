import type { EndpointFlow, FlowNode } from "@anlyx/core";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  Panel,
  ReactFlow,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes,
  useReactFlow
} from "@xyflow/react";
import { useCallback, useMemo } from "react";

import { AnlyxFlowEdge } from "./AnlyxFlowEdge.js";
import { AnlyxFlowNode, type AnlyxFlowNodeData } from "./AnlyxFlowNode.js";
import { Badge } from "./ui.js";

const nodeTypes = {
  anlyxFlowNode: AnlyxFlowNode
} satisfies NodeTypes;

const edgeTypes = {
  anlyxFlowEdge: AnlyxFlowEdge
} satisfies EdgeTypes;

const NODE_X_GAP = 224;
const MAIN_Y = 76;
const AUTH_Y = 54;
const SUPPORT_Y = 196;

export type MainFlowCanvasProps = {
  flow: EndpointFlow | null | undefined;
  method: string;
  path: string;
  status: string | number;
  endpointConfidence?: string;
};

export function MainFlowCanvas({
  flow,
  method,
  path,
  status,
  endpointConfidence
}: MainFlowCanvasProps): JSX.Element {
  const model = useMemo(
    () => buildDrawerFlowModel({ flow, method, path, status }),
    [flow, method, path, status]
  );

  if (model.nodes.length === 0) {
    return (
      <section className="anlyx-flow-rf-section">
        <div className="anlyx-flow-rf-head">
          <h3>Matched backend flow</h3>
        </div>
        <div className="anlyx-flow-rf-empty">No scanned main flow was inferred yet.</div>
      </section>
    );
  }

  return (
    <section className="anlyx-flow-rf-section">
      <div className="anlyx-flow-rf-head">
        <div>
          <h3>Matched backend flow</h3>
          <p>Live path first, scanned downstream stays muted.</p>
        </div>
        <div className="anlyx-flow-rf-head__badges">
          <Badge tone="blue">{method}</Badge>
          <Badge tone="green">confidence {endpointConfidence ?? "unknown"}</Badge>
        </div>
      </div>
      <div className="anlyx-flow-rf-canvas" data-testid="anlyx-react-flow-main">
        <ReactFlow
          edgeTypes={edgeTypes}
          edges={model.edges}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          maxZoom={1.35}
          minZoom={0.58}
          nodes={model.nodes}
          nodesConnectable={false}
          nodesDraggable={false}
          nodeTypes={nodeTypes}
          panOnDrag
          proOptions={{ hideAttribution: true }}
          zoomOnDoubleClick={false}
          zoomOnPinch
          zoomOnScroll
        >
          <ViewportControls />
          <Background
            color="rgba(148, 163, 184, .42)"
            gap={18}
            size={1}
            variant={BackgroundVariant.Dots}
          />
        </ReactFlow>
      </div>
      <p className="anlyx-flow-rf-note">
        Anlyx mapped this browser-visible request to the scanned backend flow. Muted nodes are
        known code paths; server-side Next.js fetches require the scanned path until a server
        runtime bridge is enabled.
      </p>
    </section>
  );
}

function ViewportControls(): JSX.Element {
  const { fitView, setViewport } = useReactFlow();
  const fit = useCallback(() => {
    void fitView({ padding: 0.18, duration: 160 });
  }, [fitView]);
  const reset = useCallback(() => {
    void setViewport({ x: 20, y: 22, zoom: 0.82 }, { duration: 160 });
  }, [setViewport]);

  return (
    <Panel className="anlyx-flow-rf-controls" position="top-right">
      <button type="button" onClick={fit} title="Fit the full flow into view">
        Fit view
      </button>
      <button type="button" onClick={reset} title="Reset to the default canvas position">
        Reset view
      </button>
    </Panel>
  );
}

export function buildDrawerFlowModel({
  flow,
  method,
  path,
  status
}: {
  flow: EndpointFlow | null | undefined;
  method: string;
  path: string;
  status: string | number;
}): { nodes: Node<AnlyxFlowNodeData>[]; edges: Edge[] } {
  const isAuthBlocked = Number(status) === 401 || Number(status) === 403;
  const mainNodes = getMainNodes(flow);
  const controller = mainNodes.find((node) => node.type === "controller");
  const supportNodes = mainNodes.filter(
    (item) => item.type !== "endpoint" && item.type !== "controller"
  );
  const nodes: Node<AnlyxFlowNodeData>[] = [];
  const edges: Edge[] = [];

  nodes.push(
    createFlowNode("api", 0, MAIN_Y, {
      kind: "api",
      label: "API",
      value: `${method} ${path}`,
      badge: "high",
      accent: "blue",
      fullValue: `${method} ${path}`,
      step: "01",
      state: "taken"
    })
  );

  if (controller) {
    nodes.push(
      createFlowNode("controller", NODE_X_GAP, MAIN_Y, {
        kind: "controller",
        label: "Controller",
        value: compactHandlerName(controller.label),
        sub: compactHandlerClassName(controller.label),
        badge: controller.confidence ?? "unknown",
        accent: "blue",
        fullValue: controller.label,
        step: "02",
        state: "taken"
      })
    );
  }

  if (isAuthBlocked) {
    const authX = controller ? NODE_X_GAP * 2 : NODE_X_GAP;
    const resultX = controller ? NODE_X_GAP * 3 : NODE_X_GAP * 2;
    nodes.push(
      createFlowNode("auth", authX, AUTH_Y, {
        kind: "auth",
        label: "Auth / Session",
        value: "Auth gate inferred",
        sub: Number(status) === 403 ? "Likely permission gate" : "Likely login gate",
        badge: `inferred ${status}`,
        accent: "violet",
        fullValue: "Inferred from the browser 401/403 result, not a runtime server trace.",
        step: controller ? "03" : "02",
        state: "taken"
      })
    );
    nodes.push(
      createFlowNode(
        "result",
        resultX,
        AUTH_Y,
        getResultNodeData(status, { step: controller ? "04" : "03" })
      )
    );

    supportNodes.forEach((node, index) => {
      nodes.push(
        createFlowNode(
          `support-${index}`,
          authX + index * NODE_X_GAP,
          SUPPORT_Y,
          toNodeData(node, true)
        )
      );
    });

    edges.push(
      createFlowEdge("api-controller", "api", controller ? "controller" : "auth", "blue", true)
    );
    if (controller) {
      edges.push(createFlowEdge("controller-auth", "controller", "auth", "violet", true));
    }
    edges.push(createFlowEdge("auth-result", "auth", "result", "amber", true));
    supportNodes.forEach((_, index) => {
      edges.push(
        createFlowEdge(
          `support-${index}`,
          index === 0 ? (controller ? "controller" : "api") : `support-${index - 1}`,
          `support-${index}`,
          "gray",
          false
        )
      );
    });

    return { nodes, edges };
  }

  supportNodes.forEach((node, index) => {
    nodes.push(
      createFlowNode(
        `support-${index}`,
        (index + (controller ? 2 : 1)) * NODE_X_GAP,
        MAIN_Y,
        toNodeData(node)
      )
    );
  });
  nodes.push(
    createFlowNode(
      "result",
      (supportNodes.length + (controller ? 2 : 1)) * NODE_X_GAP,
      MAIN_Y,
      getResultNodeData(status, {
        step: String(supportNodes.length + (controller ? 3 : 2)).padStart(2, "0")
      })
    )
  );

  nodes.slice(0, -1).forEach((node, index) => {
    const target = nodes[index + 1]!;
    edges.push(
      createFlowEdge(
        `main-${index}`,
        node.id,
        target.id,
        getEdgeTone(index, target.data.kind),
        true
      )
    );
  });

  return { nodes, edges };
}

function createFlowNode(
  id: string,
  x: number,
  y: number,
  data: AnlyxFlowNodeData
): Node<AnlyxFlowNodeData> {
  return {
    id,
    type: "anlyxFlowNode",
    position: { x, y },
    data
  };
}

function createFlowEdge(
  id: string,
  source: string,
  target: string,
  tone: "blue" | "violet" | "amber" | "gray",
  animated: boolean
): Edge {
  return {
    id: `drawer-edge-${id}`,
    source,
    target,
    type: "anlyxFlowEdge",
    animated,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 10,
      height: 10,
      color: getEdgeColor(tone)
    },
    data: { tone }
  };
}

function getResultNodeData(
  status: string | number,
  options: { step?: string } = {}
): AnlyxFlowNodeData {
  return {
    kind: "result",
    label: "Result",
    value: `${status} ${getStatusShortLabel(status)}`,
    sub: Number(status) >= 400 ? "Request blocked" : "Request completed",
    badge: Number(status) >= 400 ? "blocked" : "observed",
    accent: Number(status) >= 400 ? "amber" : "green",
    fullValue: getStatusLabel(status),
    ...(options.step ? { step: options.step } : {}),
    state: Number(status) >= 400 ? "blocked" : "taken"
  };
}

function getMainNodes(flow: EndpointFlow | null | undefined): FlowNode[] {
  if (!flow || !Array.isArray(flow.mainPath)) {
    return [];
  }
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  return flow.mainPath.map((id) => byId.get(id)).filter((node): node is FlowNode => Boolean(node));
}

function toNodeData(node: FlowNode, blockedByAuth = false): AnlyxFlowNodeData {
  const kind = getKind(node.type);
  const sub = blockedByAuth
    ? `Scanned ${getNodeSub(kind)?.toLowerCase() ?? "step"}`
    : getNodeSub(kind);
  return {
    kind,
    label: getNodeLabel(kind),
    value: compactHandlerName(node.label),
    badge: blockedByAuth ? "scanned" : (node.confidence ?? "unknown"),
    accent: blockedByAuth ? "gray" : getNodeAccent(kind),
    fullValue: node.label,
    state: blockedByAuth ? "scanned" : "taken",
    ...(sub ? { sub } : {})
  };
}

function getKind(type: FlowNode["type"]): AnlyxFlowNodeData["kind"] {
  if (type === "service") {
    return "service";
  }
  if (type === "repository") {
    return "repository";
  }
  if (type === "database") {
    return "database";
  }
  return "service";
}

function getNodeLabel(kind: AnlyxFlowNodeData["kind"]): string {
  if (kind === "repository") {
    return "Repository";
  }
  if (kind === "database") {
    return "Database";
  }
  return "Service";
}

function getNodeSub(kind: AnlyxFlowNodeData["kind"]): string | undefined {
  if (kind === "repository") {
    return "Data access";
  }
  if (kind === "database") {
    return "Persistence";
  }
  return "Business logic";
}

function getNodeAccent(kind: AnlyxFlowNodeData["kind"]): AnlyxFlowNodeData["accent"] {
  if (kind === "database") {
    return "green";
  }
  if (kind === "repository") {
    return "amber";
  }
  return "violet";
}

function getEdgeTone(
  index: number,
  targetKind: AnlyxFlowNodeData["kind"]
): "blue" | "violet" | "amber" | "gray" {
  if (targetKind === "auth") {
    return "violet";
  }
  if (targetKind === "result") {
    return "amber";
  }
  return index === 0 ? "blue" : "violet";
}

function getEdgeColor(tone: "blue" | "violet" | "amber" | "gray"): string {
  if (tone === "amber") {
    return "#f59e0b";
  }
  if (tone === "violet") {
    return "#7c3aed";
  }
  if (tone === "gray") {
    return "#94a3b8";
  }
  return "#2563eb";
}

function compactHandlerName(label: string): string {
  if (!label) {
    return "Unknown";
  }
  if (label.includes("#")) {
    const [className, methodName] = label.split("#");
    return `${compactClassName(className ?? "")}#${methodName ?? ""}`;
  }
  return compactClassName(label);
}

function compactHandlerClassName(label: string): string {
  if (!label) {
    return "Unknown";
  }
  if (label.includes("#")) {
    const [className] = label.split("#");
    return compactClassName(className ?? "");
  }
  return compactClassName(label);
}

function compactClassName(label: string): string {
  const parts = String(label).split(".");
  return parts[parts.length - 1] || label;
}

function getStatusShortLabel(status: string | number): string {
  const numeric = Number(status);
  if (numeric === 401) {
    return "Auth required";
  }
  if (numeric === 403) {
    return "Permission denied";
  }
  if (numeric >= 500) {
    return "Server error";
  }
  if (numeric >= 400) {
    return "Client error";
  }
  if (numeric >= 200 && numeric < 300) {
    return "OK";
  }
  return "Observed";
}

function getStatusLabel(status: string | number): string {
  const numeric = Number(status);
  if (numeric === 401) {
    return "login required · 401";
  }
  if (numeric === 403) {
    return "permission denied · 403";
  }
  if (numeric >= 500) {
    return `server error · ${status}`;
  }
  if (numeric >= 400) {
    return `client error · ${status}`;
  }
  if (numeric >= 200 && numeric < 300) {
    return `success · ${status}`;
  }
  return `status ${status}`;
}
