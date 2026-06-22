// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReplayControls } from "./ReplayControls.js";
import type { ReplayStep } from "../replay/build-replay-steps.js";
import type { ReplayLiteState } from "../replay/use-replay-lite.js";

afterEach(() => {
  cleanup();
});

describe("ReplayControls", () => {
  it("explains the current replay focus with readable node labels and a step rail", () => {
    const steps: ReplayStep[] = [
      { phase: "request", nodeId: "page:benefit-detail", index: 0 },
      {
        phase: "request",
        nodeId: "endpoint:get:/api/public/benefits/{id}",
        fromNodeId: "page:benefit-detail",
        toNodeId: "endpoint:get:/api/public/benefits/{id}",
        index: 1
      },
      {
        phase: "response",
        nodeId: "page:benefit-detail",
        fromNodeId: "endpoint:get:/api/public/benefits/{id}",
        toNodeId: "page:benefit-detail",
        index: 2
      }
    ];
    const state: ReplayLiteState = {
      phase: "request",
      isPlaying: true,
      activeNodeId: "endpoint:get:/api/public/benefits/{id}",
      activeEdge: {
        from: "page:benefit-detail",
        to: "endpoint:get:/api/public/benefits/{id}"
      },
      currentStepIndex: 1
    };

    render(
      <ReplayControls
        loop={false}
        speed={800}
        state={state}
        stepLabels={{
          "endpoint:get:/api/public/benefits/{id}": "GET /api/public/benefits/{id}",
          "page:benefit-detail": "/benefit/[brandSlug]/[benefitSlugWithId]"
        }}
        steps={steps}
        onPause={vi.fn()}
        onPlay={vi.fn()}
        onRestart={vi.fn()}
        onSpeedChange={vi.fn()}
        onToggleLoop={vi.fn()}
      />
    );

    const focus = screen.getByRole("group", { name: "Replay focus" });
    expect(within(focus).getByText("Request travel")).toBeTruthy();
    expect(within(focus).getByText("GET /api/public/benefits/{id}")).toBeTruthy();
    expect(
      within(focus).getByText(
        "/benefit/[brandSlug]/[benefitSlugWithId] -> GET /api/public/benefits/{id}"
      )
    ).toBeTruthy();

    const rail = screen.getByRole("list", { name: "Replay step rail" });
    expect(within(rail).getAllByRole("listitem")).toHaveLength(3);
    expect(within(rail).getByText("02")).toBeTruthy();
  });
});
