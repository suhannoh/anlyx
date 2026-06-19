import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { describe, expect, it } from "vitest";

import {
  aggregateReportData,
  matchApiCallToEndpoint
} from "./report-aggregation.js";
import { scanResultSchema, type Endpoint, type EndpointFlow, type PageStoryboard } from "./schema.js";

const fixtureRoot = resolve(cwd(), "fixtures/spring-next-sample/expected");

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(fixtureRoot, fileName), "utf8")) as T;
}

const endpoint: Endpoint = {
  id: "endpoint:get:/api/public/benefits/{id}",
  method: "GET",
  path: "/api/public/benefits/{id}",
  framework: "spring",
  supportLevel: "deep",
  confidence: "high"
};

const listEndpoint: Endpoint = {
  id: "endpoint:get:/api/public/benefits",
  method: "GET",
  path: "/api/public/benefits",
  framework: "spring",
  supportLevel: "deep",
  confidence: "high"
};

const flow: EndpointFlow = {
  endpointId: endpoint.id,
  nodes: [
    {
      id: endpoint.id,
      type: "endpoint",
      label: "GET /api/public/benefits/{id}",
      confidence: "high"
    },
    {
      id: "controller:PublicBenefitController#getDetail",
      type: "controller",
      label: "PublicBenefitController#getDetail",
      confidence: "high"
    }
  ],
  edges: [
    {
      id: "edge:endpoint-to-controller",
      from: endpoint.id,
      to: "controller:PublicBenefitController#getDetail",
      kind: "main",
      confidence: "high"
    }
  ],
  mainPath: [endpoint.id, "controller:PublicBenefitController#getDetail"],
  subFlows: []
};

const page: PageStoryboard = {
  id: "page:benefit-detail",
  route: "/benefit/[brandSlug]/[benefitSlugWithId]",
  filePath: "frontend/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx",
  screenshots: [
    {
      segmentIndex: 0,
      title: "Hero / Summary",
      path: ".anlyx/screenshots/benefit-detail-0.png",
      viewport: { width: 1440, height: 900 },
      scrollY: 0
    }
  ],
  apiCalls: [
    {
      method: "GET",
      path: "/api/public/benefits/123",
      status: 200
    }
  ],
  captureStatus: "success"
};

describe("report data aggregation", () => {
  it("aggregates endpoints, flows, pages into valid ScanResult", () => {
    const result = aggregateReportData({
      projectName: "Zup",
      generatedAt: "2026-06-19T00:00:00.000Z",
      endpoints: [endpoint],
      flows: [flow],
      pages: [page]
    });

    expect(result.issues).toEqual([]);
    expect(result.scanResult).toMatchObject({
      projectName: "Zup",
      generatedAt: "2026-06-19T00:00:00.000Z",
      schemaVersion: "0.1",
      endpoints: [endpoint],
      flows: [flow]
    });
    expect(result.scanResult.pages[0]?.apiCalls[0]?.endpointId).toBe(endpoint.id);
    expect(() => scanResultSchema.parse(result.scanResult)).not.toThrow();
  });

  it("exact apiCall path matches endpoint", () => {
    expect(
      matchApiCallToEndpoint({ method: "GET", path: "/api/public/benefits" }, [listEndpoint])
    ).toEqual(listEndpoint);
  });

  it("templated endpoint path {id} matches concrete apiCall path", () => {
    expect(
      matchApiCallToEndpoint({ method: "GET", path: "/api/public/benefits/123" }, [endpoint])
    ).toEqual(endpoint);
  });

  it("query string is ignored for endpoint matching", () => {
    expect(
      matchApiCallToEndpoint(
        { method: "GET", path: "/api/public/benefits?id=1&sort=latest" },
        [listEndpoint]
      )
    ).toEqual(listEndpoint);
  });

  it("method mismatch does not match", () => {
    expect(
      matchApiCallToEndpoint({ method: "POST", path: "/api/public/benefits/123" }, [endpoint])
    ).toBeNull();
  });

  it("unmatched apiCall keeps endpointId undefined and records issue", () => {
    const result = aggregateReportData({
      endpoints: [endpoint],
      flows: [flow],
      pages: [{ ...page, apiCalls: [{ method: "GET", path: "/api/missing", status: 404 }] }]
    });

    expect(result.scanResult.pages[0]?.apiCalls[0]).not.toHaveProperty("endpointId");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "api_call_unmatched" })
    );
  });

  it("ambiguous apiCall match does not pick arbitrary endpoint and records issue", () => {
    const sameShapeEndpoint: Endpoint = {
      ...endpoint,
      id: "endpoint:get:/api/public/benefits/{slug}"
    };
    const result = aggregateReportData({
      endpoints: [endpoint, sameShapeEndpoint],
      flows: [flow],
      pages: [page]
    });

    expect(result.scanResult.pages[0]?.apiCalls[0]).not.toHaveProperty("endpointId");
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "api_call_ambiguous" })
    );
  });

  it("existing valid endpointId is preserved", () => {
    const result = aggregateReportData({
      endpoints: [endpoint],
      flows: [flow],
      pages: [{ ...page, apiCalls: [{ method: "GET", path: "/wrong", endpointId: endpoint.id }] }]
    });

    expect(result.scanResult.pages[0]?.apiCalls[0]?.endpointId).toBe(endpoint.id);
    expect(result.issues).toEqual([]);
  });

  it("invalid existing endpointId records issue", () => {
    const result = aggregateReportData({
      endpoints: [endpoint],
      flows: [flow],
      pages: [
        {
          ...page,
          apiCalls: [{ method: "GET", path: "/api/public/benefits/123", endpointId: "missing" }]
        }
      ]
    });

    expect(result.scanResult.pages[0]?.apiCalls[0]?.endpointId).toBe(endpoint.id);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "api_call_invalid_endpoint_id" })
    );
  });

  it("failed page is preserved", () => {
    const failedPage: PageStoryboard = {
      ...page,
      apiCalls: [],
      screenshots: [],
      captureStatus: "failed",
      errorMessage: "Login required"
    };
    const result = aggregateReportData({ endpoints: [endpoint], flows: [flow], pages: [failedPage] });

    expect(result.scanResult.pages[0]).toEqual(failedPage);
  });

  it("pending page is preserved", () => {
    const pendingPage: PageStoryboard = {
      ...page,
      apiCalls: [],
      screenshots: [],
      captureStatus: "pending",
      errorMessage: "Missing sampleParams"
    };
    const result = aggregateReportData({ endpoints: [endpoint], flows: [flow], pages: [pendingPage] });

    expect(result.scanResult.pages[0]).toEqual(pendingPage);
  });

  it("screenshot metadata is preserved", () => {
    const result = aggregateReportData({ endpoints: [endpoint], flows: [flow], pages: [page] });

    expect(result.scanResult.pages[0]?.screenshots).toEqual(page.screenshots);
  });

  it("flow with missing endpoint records issue", () => {
    const result = aggregateReportData({
      endpoints: [],
      flows: [flow],
      pages: []
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "flow_missing_endpoint" })
    );
  });

  it("flow with missing mainPath node records issue", () => {
    const brokenFlow: EndpointFlow = { ...flow, mainPath: [...flow.mainPath, "missing"] };
    const result = aggregateReportData({ endpoints: [endpoint], flows: [brokenFlow], pages: [] });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "flow_main_path_missing_node" })
    );
  });

  it("flow with missing edge node records issue", () => {
    const brokenFlow: EndpointFlow = {
      ...flow,
      edges: [{ ...flow.edges[0]!, to: "missing" }]
    };
    const result = aggregateReportData({ endpoints: [endpoint], flows: [brokenFlow], pages: [] });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "flow_edge_missing_node" })
    );
  });

  it("flow with missing subFlow parent records issue", () => {
    const brokenFlow: EndpointFlow = {
      ...flow,
      subFlows: [
        {
          id: "subflow:missing",
          parentNodeId: "missing",
          nodes: [],
          edges: [],
          collapsedByDefault: true
        }
      ]
    };
    const result = aggregateReportData({ endpoints: [endpoint], flows: [brokenFlow], pages: [] });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "flow_subflow_missing_parent" })
    );
  });

  it("generated ScanResult passes core scanResultSchema", () => {
    const result = aggregateReportData({ endpoints: [endpoint], flows: [flow], pages: [page] });

    expect(() => scanResultSchema.parse(result.scanResult)).not.toThrow();
  });

  it("fixture expected report-data remains deep-equal with split JSON", () => {
    const endpoints = readFixture<Endpoint[]>("endpoints.json");
    const flows = readFixture<EndpointFlow[]>("flows.json");
    const pages = readFixture<PageStoryboard[]>("pages.json");
    const reportData = readFixture<ReturnType<typeof scanResultSchema.parse>>("report-data.json");
    const result = aggregateReportData({
      projectName: reportData.projectName,
      generatedAt: reportData.generatedAt,
      endpoints,
      flows,
      pages,
      ...(reportData.capture ? { capture: reportData.capture } : {}),
      warnings: reportData.warnings
    });

    expect(result.scanResult).toEqual(reportData);
  });
});
