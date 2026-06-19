import { Pause, Play, RefreshCw, Repeat2 } from "lucide-react";

import type { ReplayLiteState } from "../replay/use-replay-lite.js";
import type { ReplayStep } from "../replay/build-replay-steps.js";

export type ReplayControlsProps = {
  state: ReplayLiteState;
  steps: ReplayStep[];
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

  return (
    <section className="anlyx-replay" aria-label="Process Flow controls">
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
      {disabled && unavailableReason ? (
        <p className="anlyx-replay__empty">{unavailableReason}</p>
      ) : null}
    </section>
  );
}
