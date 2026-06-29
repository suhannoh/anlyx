import { describe, expect, it } from "vitest";

import { buildReactFlowModel } from "./build-react-flow-model.js";
import { mockScanResult } from "../mock-data.js";

const flow = mockScanResult.flows[0]!;

describe("buildReactFlowModel", () => {
  it("converts flow nodes", () => {
    const model = buildReactFlowModel(flow);

    expect(model.nodes.map((node) => node.id)).toContain("endpoint:get:/api/public/benefits/{id}");
    expect(model.nodes.map((node) => node.id)).toContain(
      "controller:PublicBenefitController#getDetail"
    );
  });

  it("converts flow edges", () => {
    const model = buildReactFlowModel(flow);

    expect(model.edges.map((edge) => edge.id)).toContain("edge:page-to-endpoint:0");
  });

  it("marks mainPath nodes as main", () => {
    const model = buildReactFlowModel(flow);
    const endpointNode = model.nodes.find((node) => node.id === flow.mainPath[1]);

    expect(endpointNode?.data.flowRole).toBe("main");
  });

  it("marks subFlow nodes as sub", () => {
    const model = buildReactFlowModel({
      ...flow,
      subFlows: [
        {
          id: "subflow:benefit-detail-support",
          parentNodeId: "service:PublicBenefitService#getBenefitDetail",
          collapsedByDefault: true,
          nodes: [
            {
              id: "mapper:BenefitDisplayMapper",
              type: "mapper",
              label: "BenefitDisplayMapper",
              confidence: "medium"
            }
          ],
          edges: [
            {
              id: "edge:service-to-mapper",
              from: "service:PublicBenefitService#getBenefitDetail",
              to: "mapper:BenefitDisplayMapper",
              kind: "sub",
              confidence: "medium"
            }
          ]
        }
      ]
    });

    const subNode = model.nodes.find((node) => node.id === "mapper:BenefitDisplayMapper");
    const subEdge = model.edges.find((edge) => edge.id === "edge:service-to-mapper:0:0");

    expect(subNode?.data.flowRole).toBe("sub");
    expect(subNode?.data.subFlowId).toBe("subflow:benefit-detail-support");
    expect(subEdge?.data?.flowRole).toBe("sub");
  });

  it("preserves unknown and confidence data", () => {
    const model = buildReactFlowModel(flow);
    const unknownNode = model.nodes.find(
      (node) => node.id === "controller:PublicBenefitController#getDetail"
    );

    expect(unknownNode?.data.confidence).toBe("unknown");
    expect(unknownNode?.data.node.type).toBe("controller");
    expect(unknownNode?.data.node.filePath).toBe(
      "backend/src/main/java/com/zup/benefit/PublicBenefitController.java"
    );
  });

  it("uses deterministic layout positions", () => {
    const first = buildReactFlowModel(flow);
    const second = buildReactFlowModel(flow);

    expect(first.nodes.map((node) => node.position)).toEqual(
      second.nodes.map((node) => node.position)
    );
    expect(first.nodes[0]?.position).toEqual({ x: 0, y: 0 });
    expect(first.nodes[1]?.position).toEqual({ x: 232, y: 0 });
  });

  it("creates a distinct process layout for branch nodes", () => {
    const model = buildReactFlowModel(flow, { variant: "process" });
    const mainNode = model.nodes.find((node) => node.id === flow.mainPath[1]);
    const branchNode = model.nodes.find((node) => node.data.flowRole === "sub");

    expect(mainNode?.position.y).toBe(0);
    expect(branchNode?.position.y).toBeGreaterThan(0);
  });
});
