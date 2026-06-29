import ELKConstructor from "elkjs/lib/elk.bundled.js";
import type { ELK, ElkNode } from "elkjs/lib/elk-api.js";

import type { ReactFlowModel } from "../build-react-flow-model.js";

export type FlowLayoutVariant = "structure" | "process";

export type LayoutOptions = {
  variant: FlowLayoutVariant;
};

const Elk = ELKConstructor as unknown as new () => ELK;
const elk = new Elk();

const NODE_WIDTH = 196;
const NODE_HEIGHT = 92;
const STRUCTURE_MAIN_Y = 0;
const STRUCTURE_SECONDARY_Y = 145;
const PROCESS_REQUEST_Y = 0;
const PROCESS_BRANCH_Y = 145;
const MAIN_X_SPACING = 232;
const BRANCH_X_SPACING = 190;

export async function layoutWithElk(
  model: ReactFlowModel,
  options: LayoutOptions
): Promise<ReactFlowModel> {
  if (model.nodes.length === 0) {
    return model;
  }

  const graph: ElkNode = {
    id: "anlyx-flow",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": options.variant === "process" ? "72" : "84",
      "elk.spacing.nodeNode": options.variant === "process" ? "44" : "52",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP"
    },
    children: model.nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    })),
    edges: model.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  const layoutedGraph = await elk.layout(graph);
  const positions = new Map<string, { x: number; y: number }>(
    layoutedGraph.children?.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]) ?? []
  );

  return {
    nodes: model.nodes.map((node) => ({
      ...node,
      position: positions.get(node.id) ?? node.position
    })),
    edges: model.edges
  };
}

export function layoutWithFallback(
  model: ReactFlowModel,
  mainPath: string[],
  options: LayoutOptions
): ReactFlowModel {
  const mainPathIndex = new Map(mainPath.map((nodeId, index) => [nodeId, index]));
  let secondaryIndex = 0;

  return {
    nodes: model.nodes.map((node) => {
      const pathIndex = mainPathIndex.get(node.id);

      if (pathIndex !== undefined) {
        return {
          ...node,
          position: {
            x: pathIndex * MAIN_X_SPACING,
            y: options.variant === "process" ? PROCESS_REQUEST_Y : STRUCTURE_MAIN_Y
          }
        };
      }

      const nextSecondaryIndex = secondaryIndex++;

      return {
        ...node,
        position: {
          x: Math.max(1, Math.floor(nextSecondaryIndex / 2) + 1) * BRANCH_X_SPACING,
          y:
            (options.variant === "process" ? PROCESS_BRANCH_Y : STRUCTURE_SECONDARY_Y) +
            (nextSecondaryIndex % 2) * 116
        }
      };
    }),
    edges: model.edges
  };
}
