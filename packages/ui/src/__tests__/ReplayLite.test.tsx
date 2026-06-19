// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ScanResult } from "@anlyx/core";

import { AnlyxAppShell } from "../components/AnlyxAppShell.js";
import { mockScanResult } from "../mock-data.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Replay Lite", () => {
  it("ReplayControls renders play/pause/restart/loop", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    const controls = screen.getByRole("region", { name: "Replay Lite controls" });
    expect(within(controls).getByRole("button", { name: "Play" })).toBeTruthy();
    expect(within(controls).getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(within(controls).getByRole("button", { name: "Restart" })).toBeTruthy();
    expect(within(controls).getByRole("button", { name: "Loop off" })).toBeTruthy();
    expect(within(controls).getByText("Main Flow only")).toBeTruthy();
  });

  it("Replay tab shows a replay-capable canvas, not a placeholder", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Replay" }));

    expect(screen.getByRole("region", { name: "Endpoint Map" })).toBeTruthy();
    expect(screen.queryByText("Endpoint Map will render here")).toBeNull();
    expect(screen.getByRole("region", { name: "Replay Lite controls" })).toBeTruthy();
  });

  it("active node is highlighted after play", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    expect(
      screen.getByTestId("replay-node-endpoint:get:/api/public/benefits/{id}").dataset[
        "replayActive"
      ]
    ).toBe("true");
  });

  it("active edge is highlighted on request traversal", () => {
    vi.useFakeTimers();
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(
      screen.getByTestId(
        "replay-edge-endpoint:get:/api/public/benefits/{id}-controller:PublicBenefitController#getDetail"
      ).dataset["replayActive"]
    ).toBe("true");
  });

  it("response traversal highlights an existing edge in reverse", () => {
    vi.useFakeTimers();
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      vi.advanceTimersByTime(4_800);
    });

    expect(screen.getByText("Phase: response")).toBeTruthy();
    expect(
      screen.getByTestId("replay-edge-repository:BenefitRepository#findById-database:benefits")
        .dataset["replayActive"]
    ).toBe("true");
  });

  it("no-flow endpoint disables replay state", () => {
    render(<AnlyxAppShell data={withSecondEndpoint(mockScanResult)} />);

    fireEvent.click(
      screen.getByRole("button", { name: "GET /api/public/brands BrandController#list" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));

    expect(
      screen.getByText("Replay is unavailable because this endpoint has no main flow.")
    ).toBeTruthy();
    expect((screen.getByRole("button", { name: "Play" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

function withSecondEndpoint(data: ScanResult): ScanResult {
  return {
    ...data,
    endpoints: [
      ...data.endpoints,
      {
        id: "endpoint:get:/api/public/brands",
        method: "GET",
        path: "/api/public/brands",
        framework: "spring",
        supportLevel: "deep",
        controller: "BrandController",
        handler: "list",
        confidence: "high"
      }
    ]
  };
}
