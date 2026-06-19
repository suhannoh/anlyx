import type { ConfidenceLevel, EndpointFlow, FlowEdge, FlowNode } from "@anlyx/core";
import type { Edge, Node } from "@xyflow/react";

import { layoutWithFallback, type FlowLayoutVariant } from "./layout/elk-layout.js";

export type AnlyxFlowRole = "main" | "sub" | "secondary";

export type AnlyxFlowNodeData = {
  node: FlowNode;
  label: string;
  type: FlowNode["type"];
  flowRole: AnlyxFlowRole;
  confidence?: ConfidenceLevel;
  subFlowId?: string;
  isReplayActive?: boolean;
  onSelectNode?: (node: FlowNode) => void;
};

export type AnlyxFlowEdgeData = {
  edge: FlowEdge;
  flowRole: AnlyxFlowRole;
  confidence?: ConfidenceLevel;
  isReplayActive?: boolean;
  replayPhase?: "request" | "response" | "idle" | "complete";
};

export type AnlyxReactFlowNode = Node<AnlyxFlowNodeData, "anlyxNode">;
export type AnlyxReactFlowEdge = Edge<AnlyxFlowEdgeData>;

export type ReactFlowModel = {
  nodes: AnlyxReactFlowNode[];
  edges: AnlyxReactFlowEdge[];
};

export type BuildReactFlowModelOptions = {
  variant?: FlowLayoutVariant;
};

export function buildReactFlowModel(
  flow: EndpointFlow,
  options: BuildReactFlowModelOptions = {}
): ReactFlowModel {
  const variant = options.variant ?? "structure";
  const mainPathSet = new Set(flow.mainPath);
  const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));
  const positionedNodes = new Map<string, AnlyxReactFlowNode>();

  flow.mainPath.forEach((nodeId, index) => {
    const node = nodesById.get(nodeId);

    if (node) {
      positionedNodes.set(node.id, createNode(node, "main", { x: index * 220, y: 0 }));
    }
  });

  flow.nodes
    .filter((node) => !mainPathSet.has(node.id))
    .forEach((node, index) => {
      positionedNodes.set(node.id, createNode(node, "secondary", { x: index * 220, y: 120 }));
    });

  flow.subFlows.forEach((subFlow, subFlowIndex) => {
    const parentPosition = positionedNodes.get(subFlow.parentNodeId)?.position ?? {
      x: subFlowIndex * 220,
      y: 0
    };

    subFlow.nodes.forEach((node, index) => {
      positionedNodes.set(
        node.id,
        createNode(
          node,
          "sub",
          {
            x: parentPosition.x + index * 180,
            y: parentPosition.y + 180 + subFlowIndex * 36
          },
          subFlow.id
        )
      );
    });
  });

  return layoutWithFallback(
    {
      nodes: [...positionedNodes.values()],
      edges: [
        ...flow.edges.map((edge, index) => createEdge(edge, getEdgeRole(edge, mainPathSet), index)),
        ...flow.subFlows.flatMap((subFlow, subFlowIndex) =>
          subFlow.edges.map((edge, edgeIndex) =>
            createEdge(edge, "sub", `${subFlowIndex}:${edgeIndex}`)
          )
        )
      ]
    },
    flow.mainPath,
    { variant }
  );
}

function createNode(
  node: FlowNode,
  flowRole: AnlyxFlowRole,
  position: { x: number; y: number },
  subFlowId?: string
): AnlyxReactFlowNode {
  return {
    id: node.id,
    type: "anlyxNode",
    position,
    data: {
      node,
      label: node.label,
      type: node.type,
      flowRole,
      ...(node.confidence ? { confidence: node.confidence } : {}),
      ...(subFlowId ? { subFlowId } : {})
    }
  };
}

function createEdge(
  edge: FlowEdge,
  flowRole: AnlyxFlowRole,
  stableSuffix: string | number
): AnlyxReactFlowEdge {
  return {
    id: `${edge.id}:${stableSuffix}`,
    source: edge.from,
    target: edge.to,
    type: "anlyxEdge",
    animated: false,
    className: `anlyx-flow-edge anlyx-flow-edge--${flowRole}`,
    data: {
      edge,
      flowRole,
      ...(edge.confidence ? { confidence: edge.confidence } : {})
    }
  };
}

function getEdgeRole(edge: FlowEdge, mainPathSet: Set<string>): AnlyxFlowRole {
  if (edge.kind === "sub") {
    return "sub";
  }

  if (mainPathSet.has(edge.from) && mainPathSet.has(edge.to)) {
    return "main";
  }

  return "secondary";
}
