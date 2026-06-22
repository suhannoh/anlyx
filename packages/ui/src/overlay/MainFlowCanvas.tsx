import type { EndpointFlow, FlowNode } from "@anlyx/core";
import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes
} from "@xyflow/react";
import { useMemo } from "react";

import { AnlyxFlowEdge } from "./AnlyxFlowEdge.js";
import { AnlyxFlowNode, type AnlyxFlowNodeData } from "./AnlyxFlowNode.js";
import { Badge } from "./ui.js";

const nodeTypes = {
  anlyxFlowNode: AnlyxFlowNode
} satisfies NodeTypes;

const edgeTypes = {
  anlyxFlowEdge: AnlyxFlowEdge
} satisfies EdgeTypes;

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
        <h3>Matched backend flow</h3>
        <Badge tone="green">confidence {endpointConfidence ?? "unknown"}</Badge>
      </div>
      <div className="anlyx-flow-rf-canvas" data-testid="anlyx-react-flow-main">
        <ReactFlow
          edgeTypes={edgeTypes}
          edges={model.edges}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          maxZoom={1.05}
          minZoom={0.72}
          nodes={model.nodes}
          nodesConnectable={false}
          nodesDraggable={false}
          nodeTypes={nodeTypes}
          panOnDrag={false}
          proOptions={{ hideAttribution: true }}
          zoomOnDoubleClick={false}
          zoomOnPinch={false}
          zoomOnScroll={false}
        >
          <Background color="rgba(148, 163, 184, .42)" gap={18} size={1} variant={BackgroundVariant.Dots} />
        </ReactFlow>
      </div>
      <p className="anlyx-flow-rf-note">
        Anlyx mapped this request to your scanned backend flow and live browser result.
      </p>
    </section>
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
  const nodeSpecs: AnlyxFlowNodeData[] = [];

  nodeSpecs.push({
    kind: "api",
    label: "API",
    value: `${method} ${path}`,
    badge: "high",
    accent: "blue",
    fullValue: `${method} ${path}`
  });

  if (controller) {
    nodeSpecs.push({
      kind: "controller",
      label: "Controller",
      value: compactHandlerName(controller.label),
      sub: compactClassName(controller.label),
      badge: controller.confidence ?? "unknown",
      accent: "blue",
      fullValue: controller.label
    });
  }

  if (isAuthBlocked) {
    nodeSpecs.push({
      kind: "auth",
      label: "Auth / Session",
      value: "SessionAuthFilter",
      sub: Number(status) === 403 ? "Permission gate" : "Login required",
      badge: `${status} returned`,
      accent: "violet",
      fullValue: "SessionAuthenticationFilter"
    });
  } else {
    for (const node of mainNodes.filter((item) => item.type !== "endpoint" && item.type !== "controller")) {
      nodeSpecs.push(toNodeData(node));
    }
  }

  nodeSpecs.push({
    kind: "result",
    label: "Result",
    value: `${status} ${getStatusShortLabel(status)}`,
    sub: Number(status) >= 400 ? "Request blocked" : "Request completed",
    badge: Number(status) >= 400 ? "blocked" : "observed",
    accent: Number(status) >= 400 ? "amber" : "green",
    fullValue: getStatusLabel(status)
  });

  const nodes = nodeSpecs.map((data, index) => ({
    id: `drawer-node-${index}`,
    type: "anlyxFlowNode",
    position: {
      x: index * 205,
      y: index === 2 && data.kind === "auth" ? 8 : 36
    },
    data
  }));

  const edges = nodes.slice(0, -1).map((node, index) => {
    const target = nodes[index + 1]!;
    return {
      id: `drawer-edge-${index}`,
      source: node.id,
      target: target.id,
      type: "anlyxFlowEdge",
      animated: index === nodes.length - 2 || index === 0,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 13,
        height: 13,
        color: getEdgeColor(index, target.data.kind)
      },
      data: {
        tone: getEdgeTone(index, target.data.kind)
      }
    };
  });

  return { nodes, edges };
}

function getMainNodes(flow: EndpointFlow | null | undefined): FlowNode[] {
  if (!flow || !Array.isArray(flow.mainPath)) {
    return [];
  }
  const byId = new Map(flow.nodes.map((node) => [node.id, node]));
  return flow.mainPath.map((id) => byId.get(id)).filter((node): node is FlowNode => Boolean(node));
}

function toNodeData(node: FlowNode): AnlyxFlowNodeData {
  const kind = getKind(node.type);
  const sub = getNodeSub(kind);
  return {
    kind,
    label: getNodeLabel(kind),
    value: compactHandlerName(node.label),
    badge: node.confidence ?? "unknown",
    accent: getNodeAccent(kind),
    fullValue: node.label,
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

function getEdgeTone(index: number, targetKind: AnlyxFlowNodeData["kind"]): "blue" | "violet" | "amber" | "gray" {
  if (targetKind === "auth") {
    return "violet";
  }
  if (targetKind === "result") {
    return "amber";
  }
  return index === 0 ? "blue" : "violet";
}

function getEdgeColor(index: number, targetKind: AnlyxFlowNodeData["kind"]): string {
  const tone = getEdgeTone(index, targetKind);
  if (tone === "amber") {
    return "#f59e0b";
  }
  if (tone === "violet") {
    return "#7c3aed";
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
