import type { Endpoint, EndpointFlow, FlowNode } from "@anlyx/core";
import { Background, BackgroundVariant, Controls, ReactFlow, type NodeTypes } from "@xyflow/react";
import { useMemo } from "react";

import { FlowLegend } from "./FlowLegend.js";
import { FlowNodeCard } from "./FlowNodeCard.js";
import { StatusBadge } from "./StatusBadge.js";
import {
  buildReactFlowModel,
  type AnlyxReactFlowEdge,
  type AnlyxReactFlowNode
} from "../flow/build-react-flow-model.js";
import type { ReplayLiteState } from "../replay/use-replay-lite.js";

const nodeTypes = {
  anlyxNode: FlowNodeCard
} satisfies NodeTypes;

export type EndpointMapCanvasProps = {
  endpoint: Endpoint | undefined;
  flow: EndpointFlow | undefined;
  selectedNodeId: string | undefined;
  title?: string;
  eyebrow?: string;
  variant?: "structure" | "process";
  replayState?: ReplayLiteState;
  toolbar?: JSX.Element;
  onSelectNode: (node: FlowNode) => void;
};

export function EndpointMapCanvas({
  endpoint,
  flow,
  selectedNodeId,
  title,
  eyebrow = "Backend Endpoint Map",
  variant = "structure",
  replayState,
  toolbar,
  onSelectNode
}: EndpointMapCanvasProps): JSX.Element {
  const model = useMemo(() => (flow ? buildReactFlowModel(flow) : undefined), [flow]);
  const nodes = useMemo(
    () =>
      model?.nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
        data: {
          ...node.data,
          isReplayActive: replayState?.activeNodeId === node.id,
          onSelectNode
        }
      })) ?? [],
    [model, onSelectNode, replayState?.activeNodeId, selectedNodeId]
  );
  const edges = useMemo(
    () =>
      model?.edges.map((edge) => {
        const isReplayActive = isReplayEdgeActive(edge, replayState?.activeEdge);
        const replayClass =
          isReplayActive && replayState?.phase === "response"
            ? "anlyx-flow-edge--replay-response"
            : isReplayActive
              ? "anlyx-flow-edge--replay-request"
              : "";
        const edgeData = edge.data!;

        return {
          ...edge,
          className: [
            edge.className,
            isReplayActive ? "anlyx-flow-edge--replay-active" : "",
            replayClass
          ]
            .filter(Boolean)
            .join(" "),
          data: {
            edge: edgeData.edge,
            flowRole: edgeData.flowRole,
            ...(edgeData.confidence ? { confidence: edgeData.confidence } : {}),
            isReplayActive
          }
        };
      }) ?? [],
    [model, replayState?.activeEdge]
  );

  return (
    <main className={`anlyx-workspace anlyx-workspace--${variant}`}>
      <header className="anlyx-workspace-header">
        <div>
          <p className="anlyx-eyebrow">{eyebrow}</p>
          <h1>
            {title ?? (endpoint ? `${endpoint.method} ${endpoint.path}` : "No endpoint selected")}
          </h1>
        </div>
        <div className="anlyx-workspace-actions">
          {toolbar}
          {endpoint ? (
            <StatusBadge tone={endpoint.confidence ?? "unknown"}>
              {endpoint.confidence ?? "unknown"}
            </StatusBadge>
          ) : null}
        </div>
      </header>

      <section
        className={`anlyx-endpoint-map anlyx-endpoint-map--${variant}`}
        role="region"
        aria-label={variant === "process" ? "Process Flow map" : "Endpoint Map"}
      >
        {flow && model && model.nodes.length > 0 ? (
          <>
            <FlowLegend variant={variant} />
            <ul className="anlyx-sr-only" aria-label="Endpoint map node list">
              {nodes.map((node) => (
                <li key={node.id}>
                  <button type="button" onClick={() => onSelectNode(node.data.node)}>
                    Select node {node.data.label}
                  </button>
                </li>
              ))}
            </ul>
            <ul className="anlyx-sr-only" aria-label="Replay node state">
              {nodes.map((node) => (
                <li
                  key={node.id}
                  data-replay-active={String(Boolean(node.data.isReplayActive))}
                  data-testid={`replay-node-${node.id}`}
                >
                  {node.id}
                </li>
              ))}
            </ul>
            <ul className="anlyx-sr-only" aria-label="Replay edge state">
              {edges.map((edge) => (
                <li
                  key={edge.id}
                  data-replay-active={String(Boolean(edge.data?.isReplayActive))}
                  data-testid={`replay-edge-${edge.source}-${edge.target}`}
                >
                  {edge.source} to {edge.target}
                </li>
              ))}
            </ul>
            <ReactFlow<AnlyxReactFlowNode, AnlyxReactFlowEdge>
              className="anlyx-react-flow"
              edges={edges}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              maxZoom={1.35}
              minZoom={0.62}
              nodes={nodes}
              nodesConnectable={false}
              nodesDraggable={false}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => onSelectNode(node.data.node)}
              panOnScroll
              proOptions={{ hideAttribution: true }}
              zoomOnDoubleClick={false}
              zoomOnScroll={false}
            >
              <Background color="#dfe5ee" gap={24} variant={BackgroundVariant.Dots} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </>
        ) : (
          <div className="anlyx-endpoint-map-empty">
            <p>No flow available for this endpoint yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function isReplayEdgeActive(
  edge: AnlyxReactFlowEdge,
  activeEdge: ReplayLiteState["activeEdge"] | undefined
): boolean {
  if (!activeEdge) {
    return false;
  }

  return (
    (edge.source === activeEdge.from && edge.target === activeEdge.to) ||
    (edge.source === activeEdge.to && edge.target === activeEdge.from)
  );
}
