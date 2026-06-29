// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useReplayLite } from "./use-replay-lite.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function ReplayHarness({ mainPath }: { mainPath: string[] }): JSX.Element {
  const replay = useReplayLite({ mainPath, intervalMs: 100 });

  return (
    <div>
      <p>phase {replay.state.phase}</p>
      <p>playing {String(replay.state.isPlaying)}</p>
      <p>node {replay.state.activeNodeId ?? "none"}</p>
      <p>
        edge{" "}
        {replay.state.activeEdge
          ? `${replay.state.activeEdge.from}->${replay.state.activeEdge.to}`
          : "none"}
      </p>
      <p>loop {String(replay.loop)}</p>
      <button type="button" onClick={replay.play}>
        Play
      </button>
      <button type="button" onClick={replay.pause}>
        Pause
      </button>
      <button type="button" onClick={replay.restart}>
        Restart
      </button>
      <button type="button" onClick={replay.toggleLoop}>
        Loop
      </button>
    </div>
  );
}

describe("useReplayLite", () => {
  it("clicking Play starts replay", () => {
    render(<ReplayHarness mainPath={["endpoint", "controller"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    expect(screen.getByText("phase request")).toBeTruthy();
    expect(screen.getByText("playing true")).toBeTruthy();
    expect(screen.getByText("node endpoint")).toBeTruthy();
  });

  it("clicking Pause pauses replay", () => {
    render(<ReplayHarness mainPath={["endpoint", "controller"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));

    expect(screen.getByText("playing false")).toBeTruthy();
  });

  it("clicking Restart resets to the first step", () => {
    vi.useFakeTimers();
    render(<ReplayHarness mainPath={["endpoint", "controller"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.click(screen.getByRole("button", { name: "Restart" }));

    expect(screen.getByText("phase request")).toBeTruthy();
    expect(screen.getByText("playing false")).toBeTruthy();
    expect(screen.getByText("node endpoint")).toBeTruthy();
  });

  it("Loop toggle changes loop state", () => {
    render(<ReplayHarness mainPath={["endpoint", "controller"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Loop" }));

    expect(screen.getByText("loop true")).toBeTruthy();
  });

  it("response phase uses reverse traversal", () => {
    vi.useFakeTimers();
    render(<ReplayHarness mainPath={["endpoint", "controller"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("phase response")).toBeTruthy();
    expect(screen.getByText("node endpoint")).toBeTruthy();
    expect(screen.getByText("edge controller->endpoint")).toBeTruthy();
  });
});
