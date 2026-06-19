import type { ConfidenceLevel, EndpointFlow, FlowEdge, FlowNode } from "@anlyx/core";
import type { Edge, Node } from "@xyflow/react";

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
};

export type AnlyxReactFlowNode = Node<AnlyxFlowNodeData, "anlyxNode">;
export type AnlyxReactFlowEdge = Edge<AnlyxFlowEdgeData>;

export type ReactFlowModel = {
  nodes: AnlyxReactFlowNode[];
  edges: AnlyxReactFlowEdge[];
};

const MAIN_X_SPACING = 220;
const SECONDARY_Y_OFFSET = 120;
const SUB_X_SPACING = 180;
const SUB_Y_OFFSET = 180;

export function buildReactFlowModel(flow: EndpointFlow): ReactFlowModel {
  const mainPathSet = new Set(flow.mainPath);
  const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));
  const positionedNodes = new Map<string, AnlyxReactFlowNode>();

  flow.mainPath.forEach((nodeId, index) => {
    const node = nodesById.get(nodeId);

    if (node) {
      positionedNodes.set(node.id, createNode(node, "main", { x: index * MAIN_X_SPACING, y: 0 }));
    }
  });

  flow.nodes
    .filter((node) => !mainPathSet.has(node.id))
    .forEach((node, index) => {
      positionedNodes.set(
        node.id,
        createNode(node, "secondary", { x: index * MAIN_X_SPACING, y: SECONDARY_Y_OFFSET })
      );
    });

  flow.subFlows.forEach((subFlow, subFlowIndex) => {
    const parentPosition = positionedNodes.get(subFlow.parentNodeId)?.position ?? {
      x: subFlowIndex * MAIN_X_SPACING,
      y: 0
    };

    subFlow.nodes.forEach((node, index) => {
      positionedNodes.set(
        node.id,
        createNode(
          node,
          "sub",
          {
            x: parentPosition.x + index * SUB_X_SPACING,
            y: parentPosition.y + SUB_Y_OFFSET + subFlowIndex * 36
          },
          subFlow.id
        )
      );
    });
  });

  return {
    nodes: [...positionedNodes.values()],
    edges: [
      ...flow.edges.map((edge) => createEdge(edge, getEdgeRole(edge, mainPathSet))),
      ...flow.subFlows.flatMap((subFlow) => subFlow.edges.map((edge) => createEdge(edge, "sub")))
    ]
  };
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

function createEdge(edge: FlowEdge, flowRole: AnlyxFlowRole): AnlyxReactFlowEdge {
  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: "smoothstep",
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
