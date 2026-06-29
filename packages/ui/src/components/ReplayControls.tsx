import { Pause, Play, RefreshCw, Repeat2 } from "lucide-react";

import type { ReplayLiteState } from "../replay/use-replay-lite.js";
import type { ReplayStep } from "../replay/build-replay-steps.js";

export type ReplayControlsProps = {
  state: ReplayLiteState;
  steps: ReplayStep[];
  stepLabels?: Record<string, string>;
  loop: boolean;
  disabled?: boolean;
  speed: number;
  unavailableReason?: string;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onToggleLoop: () => void;
  onSpeedChange: (speed: number) => void;
};

export function ReplayControls({
  state,
  steps,
  stepLabels = {},
  loop,
  speed,
  disabled = false,
  unavailableReason,
  onPlay,
  onPause,
  onRestart,
  onToggleLoop,
  onSpeedChange
}: ReplayControlsProps): JSX.Element {
  const currentStepNumber =
    state.phase === "idle" ? 0 : Math.min(state.currentStepIndex + 1, steps.length);
  const currentStep =
    state.phase === "idle" || state.phase === "complete"
      ? undefined
      : steps[state.currentStepIndex];
  const focusLabel = currentStep ? formatStepNode(currentStep.nodeId, stepLabels) : "Ready";
  const edgeLabel = formatStepEdge(currentStep, stepLabels);
  const phaseLabel = formatReplayPhase(state.phase);

  return (
    <section className="anlyx-replay" aria-label="Process Flow controls">
      <div className="anlyx-replay__top">
        <div>
          <p className="anlyx-eyebrow">Replay from scanned flow graph</p>
          <div className="anlyx-replay__buttons" aria-label="Process Flow actions">
            <button
              className="anlyx-replay__button--primary"
              type="button"
              disabled={disabled || state.isPlaying}
              onClick={onPlay}
            >
              <Play size={14} strokeWidth={2.5} />
              <span>Play</span>
            </button>
            <button type="button" disabled={disabled || !state.isPlaying} onClick={onPause}>
              <Pause size={14} strokeWidth={2.5} />
              <span>Pause</span>
            </button>
            <button type="button" disabled={disabled} onClick={onRestart}>
              <RefreshCw size={14} strokeWidth={2.5} />
              <span>Restart</span>
            </button>
            <button type="button" aria-pressed={loop} disabled={disabled} onClick={onToggleLoop}>
              <Repeat2 size={14} strokeWidth={2.5} />
              <span>Loop {loop ? "on" : "off"}</span>
            </button>
          </div>
        </div>
        <div className="anlyx-replay__state">
          <span>
            Step {currentStepNumber}/{steps.length}
          </span>
          <span>Phase: {state.phase}</span>
          <label>
            Speed
            <select
              aria-label="Replay speed"
              disabled={disabled}
              value={speed}
              onChange={(event) => onSpeedChange(Number(event.currentTarget.value))}
            >
              <option value={1100}>0.75x</option>
              <option value={800}>1x</option>
              <option value={520}>1.5x</option>
            </select>
          </label>
          <span>Main Flow only</span>
        </div>
      </div>

      <div className="anlyx-replay__focus" role="group" aria-label="Replay focus">
        <div>
          <span className="anlyx-replay__phase">{phaseLabel}</span>
          <strong>{focusLabel}</strong>
          <p>{edgeLabel}</p>
        </div>
        <ol className="anlyx-replay__rail" aria-label="Replay step rail">
          {steps.map((step, index) => (
            <li
              key={`${step.phase}:${step.nodeId}:${step.index}`}
              className={index === state.currentStepIndex ? "anlyx-replay__rail-step--active" : ""}
              aria-current={index === state.currentStepIndex ? "step" : undefined}
              title={`${formatReplayPhase(step.phase)}: ${formatStepNode(step.nodeId, stepLabels)}`}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
            </li>
          ))}
        </ol>
      </div>
      {disabled && unavailableReason ? (
        <p className="anlyx-replay__empty">{unavailableReason}</p>
      ) : null}
    </section>
  );
}

function formatReplayPhase(phase: ReplayLiteState["phase"] | ReplayStep["phase"]): string {
  switch (phase) {
    case "request":
      return "Request travel";
    case "response":
      return "Response return";
    case "complete":
      return "Response delivered";
    case "idle":
      return "Ready to replay";
  }
}

function formatStepNode(nodeId: string, labels: Record<string, string>): string {
  return labels[nodeId] ?? nodeId;
}

function formatStepEdge(step: ReplayStep | undefined, labels: Record<string, string>): string {
  if (!step?.fromNodeId || !step.toNodeId) {
    return "Waiting at the first visible node in the scanned main path.";
  }

  return `${formatStepNode(step.fromNodeId, labels)} -> ${formatStepNode(step.toNodeId, labels)}`;
}
