import { describe, expect, it } from "vitest";

import { buildReactFlowModel } from "../build-react-flow-model.js";
import { layoutWithFallback } from "./elk-layout.js";
import { mockScanResult } from "../../mock-data.js";

const flow = mockScanResult.flows[0]!;

describe("ELK-backed flow layout", () => {
  it("keeps a deterministic fallback layout when async layout is unavailable", () => {
    const model = buildReactFlowModel(flow, { variant: "process" });
    const fallback = layoutWithFallback(model, flow.mainPath, { variant: "process" });
    const mainNode = fallback.nodes.find((node) => node.id === flow.mainPath[1]);
    const branchNode = fallback.nodes.find((node) => node.data.flowRole === "sub");

    expect(mainNode?.position.y).toBe(0);
    expect(branchNode?.position.y).toBeGreaterThan(0);
    expect(fallback.edges.length).toBe(model.edges.length);
  });
});
