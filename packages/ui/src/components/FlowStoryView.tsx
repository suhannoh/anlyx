import type { Endpoint, EndpointFlow, FlowNode, PageStoryboard, ScanResult } from "@anlyx/core";
import {
  Braces,
  Code2,
  Database,
  FileText,
  GitBranch,
  Globe2,
  Layers3,
  Maximize2,
  MonitorSmartphone,
  type LucideIcon
} from "lucide-react";

import { ReplayControls } from "./ReplayControls.js";
import { StatusBadge } from "./StatusBadge.js";
import type { ReplayStep } from "../replay/build-replay-steps.js";
import type { ReplayLiteState } from "../replay/use-replay-lite.js";

export type FlowStoryViewProps = {
  data: ScanResult;
  endpoint: Endpoint | undefined;
  flow: EndpointFlow | undefined;
  page: PageStoryboard | undefined;
  replayDisabled: boolean;
  replayLoop: boolean;
  replaySpeed: number;
  replayState: ReplayLiteState;
  replaySteps: ReplayStep[];
  selectedNodeId: string | undefined;
  onPause: () => void;
  onPlay: () => void;
  onRestart: () => void;
  onSelectNode: (node: FlowNode) => void;
  onSpeedChange: (speed: number) => void;
  onToggleLoop: () => void;
};

export function FlowStoryView({
  data,
  endpoint,
  flow,
  page,
  replayDisabled,
  replayLoop,
  replaySpeed,
  replayState,
  replaySteps,
  selectedNodeId,
  onPause,
  onPlay,
  onRestart,
  onSelectNode,
  onSpeedChange,
  onToggleLoop
}: FlowStoryViewProps): JSX.Element {
  const storyPage = page ?? findPageForEndpoint(data, endpoint);
  const screenshot = storyPage?.screenshots[0];
  const stats = getFlowStoryStats(flow);
  const replayStepLabels = buildReplayStepLabels(flow);

  return (
    <main className="anlyx-flow-story">
      <header className="anlyx-flow-story__header">
        <div>
          <p className="anlyx-eyebrow">Flow Story</p>
          <h1>{endpoint ? titleForEndpoint(endpoint) : "Application flow story"}</h1>
          <div className="anlyx-flow-story__summary" aria-label="Flow Story summary">
            <span>{stats.mainSteps} main steps</span>
            <span>{stats.supportCalls} support calls</span>
            <span>{stats.evidenceCount} evidence items</span>
          </div>
        </div>
        <div className="anlyx-flow-story__actions">
          <StatusBadge tone="neutral">Replay Lite</StatusBadge>
          <button className="anlyx-toolbar-button" type="button">
            <Maximize2 size={14} strokeWidth={2.4} />
            Fit view
          </button>
        </div>
      </header>

      <section className="anlyx-flow-story__stage" aria-label="Flow Story canvas">
        <PagePreviewCard page={storyPage} />
        <div className="anlyx-flow-story__request" aria-hidden="true">
          <span>Request</span>
          <i />
        </div>
        <FlowStoryDiagram
          flow={flow}
          replayState={replayState}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />
        <div className="anlyx-flow-story__response" aria-hidden="true">
          <span>Response</span>
        </div>
      </section>

      <ReplayControls
        disabled={replayDisabled}
        loop={replayLoop}
        speed={replaySpeed}
        state={replayState}
        stepLabels={replayStepLabels}
        steps={replaySteps}
        unavailableReason="Replay is unavailable because this flow has no scanned main path."
        onPause={onPause}
        onPlay={onPlay}
        onRestart={onRestart}
        onSpeedChange={onSpeedChange}
        onToggleLoop={onToggleLoop}
      />

      {screenshot?.path ? <span className="anlyx-sr-only">{screenshot.path}</span> : null}
    </main>
  );
}

function PagePreviewCard({ page }: { page: PageStoryboard | undefined }): JSX.Element {
  const screenshot = page?.screenshots[0];
  const primaryApiCall = page?.apiCalls[0];

  return (
    <article className="anlyx-page-preview" aria-label="Frontend page preview">
      <div className="anlyx-page-preview__chrome">
        <MonitorSmartphone size={16} strokeWidth={2.4} />
        <span>{page?.route ?? "No page linked"}</span>
      </div>
      <div className="anlyx-page-preview__screen">
        <div className="anlyx-page-preview__topbar">
          <span />
          <span />
          <span />
          <strong>STARBUCKS</strong>
        </div>
        <div className="anlyx-page-preview__hero">
          <div>
            <span>{screenshot?.title ?? "Captured page"}</span>
            <strong>Birthday Reward</strong>
            <p>Enjoy a free drink or food item on your birthday.</p>
          </div>
          <div className="anlyx-page-preview__reward" aria-hidden="true">
            <span />
            <strong>1</strong>
          </div>
        </div>
        <div className="anlyx-page-preview__facts">
          <span>Valid Jan 1 - Dec 31</span>
          <span>Once per year</span>
        </div>
        <div className="anlyx-page-preview__steps">
          <span>Show this reward in store</span>
          <span>Choose drink or food</span>
          <span>Enjoy birthday treat</span>
        </div>
        <div className="anlyx-page-preview__api">
          <strong>{primaryApiCall?.method ?? "GET"}</strong>
          <span>{primaryApiCall?.path ?? "/api/..."}</span>
        </div>
      </div>
      <div className="anlyx-page-preview__meta">
        <StatusBadge tone={page?.captureStatus ?? "pending"}>
          {page?.captureStatus ?? "pending"}
        </StatusBadge>
        <span>{page?.apiCalls.length ?? 0} API calls</span>
        <span>{page?.screenshots.length ?? 0} screenshots</span>
      </div>
    </article>
  );
}

function FlowStoryDiagram({
  flow,
  replayState,
  selectedNodeId,
  onSelectNode
}: {
  flow: EndpointFlow | undefined;
  replayState: ReplayLiteState;
  selectedNodeId: string | undefined;
  onSelectNode: (node: FlowNode) => void;
}): JSX.Element {
  if (!flow) {
    return (
      <div className="anlyx-flow-story__diagram anlyx-flow-story__diagram--empty">
        <p>No scanned backend flow available for this endpoint.</p>
      </div>
    );
  }

  const nodesById = new Map(flow.nodes.map((node) => [node.id, node]));
  const mainNodes = flow.mainPath
    .map((nodeId) => nodesById.get(nodeId))
    .filter((node): node is FlowNode => Boolean(node))
    .filter((node) => node.type !== "page");
  const supportingNodes = flow.subFlows.flatMap((subFlow) => subFlow.nodes);

  return (
    <div className="anlyx-flow-story__diagram" role="region" aria-label="Flow Story path">
      <div className="anlyx-flow-story__diagram-head">
        <div>
          <span>Main path</span>
          <strong>{mainNodes.length} steps</strong>
        </div>
        <div>
          <span>Support</span>
          <strong>{supportingNodes.length} calls</strong>
        </div>
      </div>
      <div className="anlyx-flow-story__lane" aria-label="Main request path">
        {mainNodes.map((node, index) => (
          <FlowStoryStep
            key={node.id}
            isActive={replayState.activeNodeId === node.id}
            isSelected={selectedNodeId === node.id}
            node={node}
            stepNumber={index + 1}
            showArrow={index < mainNodes.length - 1}
            onSelectNode={onSelectNode}
          />
        ))}
      </div>

      {supportingNodes.length > 0 ? (
        <div className="anlyx-flow-story__support">
          <div className="anlyx-flow-story__support-heading">
            <GitBranch size={15} strokeWidth={2.5} />
            <span>Support calls from service</span>
          </div>
          <div className="anlyx-flow-story__support-grid">
            {supportingNodes.map((node) => (
              <FlowStorySupportNode
                key={node.id}
                isActive={replayState.activeNodeId === node.id}
                isSelected={selectedNodeId === node.id}
                node={node}
                onSelectNode={onSelectNode}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FlowStoryStep({
  node,
  isActive,
  isSelected,
  stepNumber,
  showArrow,
  onSelectNode
}: {
  node: FlowNode;
  isActive: boolean;
  isSelected: boolean;
  stepNumber: number;
  showArrow: boolean;
  onSelectNode: (node: FlowNode) => void;
}): JSX.Element {
  const Icon = getFlowStoryIcon(node.type);

  return (
    <div className="anlyx-flow-story__step-wrap">
      <button
        className={[
          "anlyx-flow-story__step",
          `anlyx-flow-story__step--${node.type}`,
          isActive ? "anlyx-flow-story__step--active" : "",
          isSelected ? "anlyx-flow-story__step--selected" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        type="button"
        onClick={() => onSelectNode(node)}
        aria-label={`Select ${node.type} step ${stepNumber}: ${node.label}`}
      >
        <span className="anlyx-flow-story__step-number">{String(stepNumber).padStart(2, "0")}</span>
        <span className="anlyx-flow-story__step-icon" aria-hidden="true">
          <Icon size={16} strokeWidth={2.5} />
        </span>
        <span className="anlyx-flow-story__step-type">{node.type}</span>
        <strong>{node.label}</strong>
        <StatusBadge tone={node.confidence ?? "unknown"} label="confidence">
          {node.confidence ?? "unknown"}
        </StatusBadge>
      </button>
      {showArrow ? <span className="anlyx-flow-story__arrow" aria-hidden="true" /> : null}
    </div>
  );
}

function FlowStorySupportNode({
  node,
  isActive,
  isSelected,
  onSelectNode
}: {
  node: FlowNode;
  isActive: boolean;
  isSelected: boolean;
  onSelectNode: (node: FlowNode) => void;
}): JSX.Element {
  const Icon = getFlowStoryIcon(node.type);

  return (
    <button
      className={[
        "anlyx-flow-story__support-node",
        isActive ? "anlyx-flow-story__support-node--active" : "",
        isSelected ? "anlyx-flow-story__support-node--selected" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      type="button"
      onClick={() => onSelectNode(node)}
      aria-label={`Select support call ${node.label}`}
    >
      <Icon size={15} strokeWidth={2.5} />
      <span>{node.type}</span>
      <strong>{node.label}</strong>
      <StatusBadge tone={node.confidence ?? "unknown"} label="confidence">
        {node.confidence ?? "unknown"}
      </StatusBadge>
    </button>
  );
}

function findPageForEndpoint(
  data: ScanResult,
  endpoint: Endpoint | undefined
): PageStoryboard | undefined {
  if (!endpoint) {
    return data.pages[0];
  }

  return (
    data.pages.find((page) =>
      page.apiCalls.some((apiCall) => apiCall.endpointId === endpoint.id)
    ) ?? data.pages[0]
  );
}

function titleForEndpoint(endpoint: Endpoint): string {
  const handler =
    endpoint.controller && endpoint.handler
      ? `${endpoint.controller}#${endpoint.handler}`
      : undefined;

  return handler ?? `${endpoint.method} ${endpoint.path}`;
}

function getFlowStoryStats(flow: EndpointFlow | undefined): {
  mainSteps: number;
  supportCalls: number;
  evidenceCount: number;
} {
  if (!flow) {
    return { evidenceCount: 0, mainSteps: 0, supportCalls: 0 };
  }

  return {
    mainSteps: flow.mainPath.filter((nodeId) => !nodeId.startsWith("page:")).length,
    supportCalls: flow.subFlows.reduce((count, subFlow) => count + subFlow.nodes.length, 0),
    evidenceCount:
      flow.nodes.reduce((count, node) => count + (node.evidence?.length ?? 0), 0) +
      flow.edges.reduce((count, edge) => count + (edge.evidence?.length ?? 0), 0) +
      flow.subFlows.reduce(
        (count, subFlow) =>
          count +
          subFlow.nodes.reduce((nodeCount, node) => nodeCount + (node.evidence?.length ?? 0), 0) +
          subFlow.edges.reduce((edgeCount, edge) => edgeCount + (edge.evidence?.length ?? 0), 0),
        0
      )
  };
}

function buildReplayStepLabels(flow: EndpointFlow | undefined): Record<string, string> {
  if (!flow) {
    return {};
  }

  return Object.fromEntries(flow.nodes.map((node) => [node.id, node.label]));
}

function getFlowStoryIcon(type: FlowNode["type"]): LucideIcon {
  switch (type) {
    case "endpoint":
      return Globe2;
    case "controller":
      return Code2;
    case "service":
      return Layers3;
    case "repository":
      return Braces;
    case "database":
      return Database;
    case "mapper":
    case "validator":
    case "utility":
      return GitBranch;
    default:
      return FileText;
  }
}
