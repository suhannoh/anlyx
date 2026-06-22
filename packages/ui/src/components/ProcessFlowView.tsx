import type { Endpoint, EndpointFlow, FlowNode } from "@anlyx/core";

import { EndpointMapCanvas } from "./EndpointMapCanvas.js";
import { ProcessTimeline } from "./ProcessTimeline.js";
import { ReplayControls } from "./ReplayControls.js";
import type { ReplayLiteState } from "../replay/use-replay-lite.js";
import type { ReplayStep } from "../replay/build-replay-steps.js";

export type ProcessFlowViewProps = {
  endpoint: Endpoint | undefined;
  flow: EndpointFlow | undefined;
  replayState: ReplayLiteState;
  replaySteps: ReplayStep[];
  replayLoop: boolean;
  replayDisabled: boolean;
  replaySpeed: number;
  selectedNodeId: string | undefined;
  onSelectNode: (node: FlowNode) => void;
  onPause: () => void;
  onPlay: () => void;
  onRestart: () => void;
  onToggleLoop: () => void;
  onSpeedChange: (speed: number) => void;
  onViewStructure: () => void;
};

export function ProcessFlowView({
  endpoint,
  flow,
  replayState,
  replaySteps,
  replayLoop,
  replayDisabled,
  replaySpeed,
  selectedNodeId,
  onSelectNode,
  onPause,
  onPlay,
  onRestart,
  onToggleLoop,
  onSpeedChange,
  onViewStructure
}: ProcessFlowViewProps): JSX.Element {
  const replayStepLabels = buildReplayStepLabels(flow);

  return (
    <div className="anlyx-process-view">
      <ReplayControls
        disabled={replayDisabled}
        loop={replayLoop}
        speed={replaySpeed}
        state={replayState}
        stepLabels={replayStepLabels}
        steps={replaySteps}
        unavailableReason="Process Flow is unavailable because this endpoint has no scanned main path."
        onPause={onPause}
        onPlay={onPlay}
        onRestart={onRestart}
        onSpeedChange={onSpeedChange}
        onToggleLoop={onToggleLoop}
      />
      <EndpointMapCanvas
        eyebrow="Request Process Flow"
        endpoint={endpoint}
        flow={flow}
        replayState={replayState}
        selectedNodeId={selectedNodeId}
        title={
          endpoint
            ? `${endpoint.method} ${endpoint.path}`
            : "Request process flow from scanned graph"
        }
        toolbar={
          <button className="anlyx-toolbar-button" type="button" onClick={onViewStructure}>
            View on Structure
          </button>
        }
        variant="process"
        onSelectNode={onSelectNode}
      />
      <ProcessTimeline flow={flow} state={replayState} steps={replaySteps} />
    </div>
  );
}

function buildReplayStepLabels(flow: EndpointFlow | undefined): Record<string, string> {
  if (!flow) {
    return {};
  }

  return Object.fromEntries(flow.nodes.map((node) => [node.id, node.label]));
}
