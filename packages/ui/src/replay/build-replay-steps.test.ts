import { describe, expect, it } from "vitest";

import { buildReplaySteps } from "./build-replay-steps.js";

describe("buildReplaySteps", () => {
  it("creates request steps from mainPath", () => {
    const steps = buildReplaySteps(["endpoint", "controller", "service"]);

    expect(steps.slice(0, 3)).toEqual([
      { phase: "request", nodeId: "endpoint", index: 0 },
      {
        phase: "request",
        nodeId: "controller",
        fromNodeId: "endpoint",
        toNodeId: "controller",
        index: 1
      },
      {
        phase: "request",
        nodeId: "service",
        fromNodeId: "controller",
        toNodeId: "service",
        index: 2
      }
    ]);
  });

  it("creates response steps from reversed mainPath", () => {
    const steps = buildReplaySteps(["endpoint", "controller", "service"]);

    expect(steps.slice(3)).toEqual([
      { phase: "response", nodeId: "service", index: 3 },
      {
        phase: "response",
        nodeId: "controller",
        fromNodeId: "service",
        toNodeId: "controller",
        index: 4
      },
      {
        phase: "response",
        nodeId: "endpoint",
        fromNodeId: "controller",
        toNodeId: "endpoint",
        index: 5
      }
    ]);
  });

  it("does not create explicit response edge data", () => {
    const steps = buildReplaySteps(["endpoint", "controller"]);

    expect(steps).toHaveLength(4);
    expect(steps.every((step) => !("kind" in step))).toBe(true);
  });

  it("returns empty steps for an empty mainPath", () => {
    expect(buildReplaySteps([])).toEqual([]);
  });

  it("handles a single-node mainPath safely", () => {
    expect(buildReplaySteps(["endpoint"])).toEqual([
      { phase: "request", nodeId: "endpoint", index: 0 },
      { phase: "response", nodeId: "endpoint", index: 1 }
    ]);
  });
});
