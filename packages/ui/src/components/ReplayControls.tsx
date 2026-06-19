export function ReplayControls(): JSX.Element {
  return (
    <section className="anlyx-replay" aria-label="Replay controls placeholder">
      <div className="anlyx-replay__buttons" aria-label="Replay actions">
        <button type="button" disabled>
          Play
        </button>
        <button type="button" disabled>
          Pause
        </button>
        <button type="button" disabled>
          Restart
        </button>
      </div>
      <div className="anlyx-replay__state">
        <span>Loop</span>
        <span>Main Flow only</span>
      </div>
    </section>
  );
}
