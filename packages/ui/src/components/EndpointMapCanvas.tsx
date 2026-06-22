import type { Endpoint, EndpointFlow, FlowNode } from "@anlyx/core";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  ReactFlow,
  getSmoothStepPath,
  type EdgeProps,
  type EdgeTypes,
  type NodeTypes
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";

import { FlowLegend } from "./FlowLegend.js";
import { FlowNodeCard } from "./FlowNodeCard.js";
import { StatusBadge } from "./StatusBadge.js";
import {
  buildReactFlowModel,
  type AnlyxReactFlowEdge,
  type AnlyxReactFlowNode
} from "../flow/build-react-flow-model.js";
import { layoutWithElk } from "../flow/layout/elk-layout.js";
import type { ReplayLiteState } from "../replay/use-replay-lite.js";

const nodeTypes = {
  anlyxNode: FlowNodeCard
} satisfies NodeTypes;

const edgeTypes = {
  anlyxEdge: FlowEdgeLine
} satisfies EdgeTypes;

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
  const fallbackModel = useMemo(
    () => (flow ? buildReactFlowModel(flow, { variant }) : undefined),
    [flow, variant]
  );
  const [layoutedModel, setLayoutedModel] = useState(fallbackModel);
  const model = layoutedModel ?? fallbackModel;

  useEffect(() => {
    let cancelled = false;

    setLayoutedModel(fallbackModel);

    if (!fallbackModel || isUnitTestRuntime()) {
      return;
    }

    void layoutWithElk(fallbackModel, { variant })
      .then((nextModel) => {
        if (!cancelled) {
          setLayoutedModel(isUsableLayout(nextModel, variant) ? nextModel : fallbackModel);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLayoutedModel(fallbackModel);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackModel, variant]);
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

        const nextData = {
          edge: edgeData.edge,
          flowRole: edgeData.flowRole,
          ...(edgeData.confidence ? { confidence: edgeData.confidence } : {}),
          isReplayActive,
          ...(replayState?.phase ? { replayPhase: replayState.phase } : {})
        };

        return {
          ...edge,
          className: [
            edge.className,
            isReplayActive ? "anlyx-flow-edge--replay-active" : "",
            replayClass
          ]
            .filter(Boolean)
            .join(" "),
          data: nextData
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
              edgeTypes={edgeTypes}
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
          <div className="anlyx-endpoint-map-empty" role="status" aria-label="Flow unavailable">
            <span>Flow unavailable</span>
            <h2>No scanned flow for this endpoint yet</h2>
            <p>
              Anlyx can list this endpoint, but no Controller -&gt; Service -&gt; Repository path
              was found.
            </p>
            <p>
              Check that the backend source directory is configured, then run `anlyx scan` again.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function isUnitTestRuntime(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "test";
}

function isUsableLayout(model: { nodes: AnlyxReactFlowNode[] }, variant: "structure" | "process") {
  const positions = model.nodes.map((node) => node.position);
  const minY = Math.min(...positions.map((position) => position.y));
  const maxY = Math.max(...positions.map((position) => position.y));
  const minX = Math.min(...positions.map((position) => position.x));
  const maxX = Math.max(...positions.map((position) => position.x));
  const height = maxY - minY;
  const width = maxX - minX;

  if (!Number.isFinite(height) || !Number.isFinite(width)) {
    return false;
  }

  const maxHeight = variant === "process" ? 360 : 300;

  return height <= maxHeight && width > 0;
}

function FlowEdgeLine({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data
}: EdgeProps<AnlyxReactFlowEdge>): JSX.Element {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });
  const isReplayActive = Boolean(data?.isReplayActive);
  const flowRole = data?.flowRole ?? "secondary";
  const particleRole = data?.replayPhase === "response" ? "response" : flowRole;
  const className = [
    "anlyx-flow-edge",
    `anlyx-flow-edge--${flowRole}`,
    isReplayActive ? "anlyx-flow-edge--replay-active" : "",
    isReplayActive && data?.replayPhase === "response"
      ? "anlyx-flow-edge--replay-response"
      : isReplayActive
        ? "anlyx-flow-edge--replay-request"
        : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <BaseEdge className={className} path={edgePath} style={style} />
      {isReplayActive ? (
        <circle
          className={`anlyx-flow-particle anlyx-flow-particle--${particleRole}`}
          r={flowRole === "sub" ? 4 : 5}
        >
          <animateMotion dur="1.25s" repeatCount="indefinite" path={edgePath} />
        </circle>
      ) : null}
    </>
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
