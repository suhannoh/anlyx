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

const nodeTypes = {
  anlyxNode: FlowNodeCard
} satisfies NodeTypes;

export type EndpointMapCanvasProps = {
  endpoint: Endpoint | undefined;
  flow: EndpointFlow | undefined;
  selectedNodeId: string | undefined;
  onSelectNode: (node: FlowNode) => void;
};

export function EndpointMapCanvas({
  endpoint,
  flow,
  selectedNodeId,
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
          onSelectNode
        }
      })) ?? [],
    [model, onSelectNode, selectedNodeId]
  );

  return (
    <main className="anlyx-workspace">
      <header className="anlyx-workspace-header">
        <div>
          <p className="anlyx-eyebrow">Endpoint Map</p>
          <h1>{endpoint ? `${endpoint.method} ${endpoint.path}` : "No endpoint selected"}</h1>
        </div>
        {endpoint ? (
          <StatusBadge tone={endpoint.confidence ?? "unknown"}>
            {endpoint.confidence ?? "unknown"}
          </StatusBadge>
        ) : null}
      </header>

      <section className="anlyx-endpoint-map" role="region" aria-label="Endpoint Map">
        {flow && model && model.nodes.length > 0 ? (
          <>
            <FlowLegend />
            <ul className="anlyx-sr-only" aria-label="Endpoint map node list">
              {nodes.map((node) => (
                <li key={node.id}>
                  <button type="button" onClick={() => onSelectNode(node.data.node)}>
                    Select node {node.data.label}
                  </button>
                </li>
              ))}
            </ul>
            <ReactFlow<AnlyxReactFlowNode, AnlyxReactFlowEdge>
              className="anlyx-react-flow"
              edges={model.edges}
              fitView
              maxZoom={1.25}
              minZoom={0.45}
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
