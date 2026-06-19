import type { ReplayLiteState } from "../replay/use-replay-lite.js";

export type ReplayControlsProps = {
  state: ReplayLiteState;
  loop: boolean;
  disabled?: boolean;
  unavailableReason?: string;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onToggleLoop: () => void;
};

export function ReplayControls({
  state,
  loop,
  disabled = false,
  unavailableReason,
  onPlay,
  onPause,
  onRestart,
  onToggleLoop
}: ReplayControlsProps): JSX.Element {
  return (
    <section className="anlyx-replay" aria-label="Replay Lite controls">
      <div className="anlyx-replay__buttons" aria-label="Replay actions">
        <button type="button" disabled={disabled || state.isPlaying} onClick={onPlay}>
          Play
        </button>
        <button type="button" disabled={disabled || !state.isPlaying} onClick={onPause}>
          Pause
        </button>
        <button type="button" disabled={disabled} onClick={onRestart}>
          Restart
        </button>
        <button type="button" aria-pressed={loop} disabled={disabled} onClick={onToggleLoop}>
          Loop {loop ? "on" : "off"}
        </button>
      </div>
      <div className="anlyx-replay__state">
        <span>Phase: {state.phase}</span>
        <span>Active: {state.activeNodeId ?? "none"}</span>
        <span>Main Flow only</span>
      </div>
      {disabled && unavailableReason ? (
        <p className="anlyx-replay__empty">{unavailableReason}</p>
      ) : null}
    </section>
  );
}
