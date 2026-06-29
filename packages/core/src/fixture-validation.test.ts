import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { describe, expect, it } from "vitest";

import { validateFixtureExpectedData, type FixtureExpectedData } from "./fixture-validation.js";

const fixtureRoot = resolve(cwd(), "fixtures/spring-next-sample/expected");

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(fixtureRoot, fileName), "utf8")) as T;
}

function readExpectedData(): FixtureExpectedData {
  return {
    endpoints: readFixture<unknown>("endpoints.json"),
    flows: readFixture<unknown>("flows.json"),
    pages: readFixture<unknown>("pages.json"),
    reportData: readFixture<unknown>("report-data.json")
  };
}

type MutableEndpoint = Record<string, unknown>;
type MutableFlowEdge = { from: string; to: string } & Record<string, unknown>;
type MutableSubFlow = { parentNodeId: string } & Record<string, unknown>;
type MutableFlow = {
  endpointId: string;
  mainPath: string[];
  edges: MutableFlowEdge[];
  subFlows: MutableSubFlow[];
} & Record<string, unknown>;
type MutableApiCall = { endpointId?: string } & Record<string, unknown>;
type MutablePage = { apiCalls: MutableApiCall[] } & Record<string, unknown>;
type MutableReportData = {
  endpoints: unknown;
  flows: unknown;
  pages: unknown;
} & Record<string, unknown>;
type MutableFixtureExpectedData = FixtureExpectedData & {
  endpoints: MutableEndpoint[];
  flows: MutableFlow[];
  pages: MutablePage[];
  reportData: MutableReportData;
};

function cloneExpectedData(): MutableFixtureExpectedData {
  return structuredClone(readExpectedData()) as MutableFixtureExpectedData;
}

function expectIssue(data: FixtureExpectedData, code: string): void {
  const result = validateFixtureExpectedData(data);

  expect(result.ok).toBe(false);
  expect(result.issues.some((issue) => issue.code === code)).toBe(true);
}

describe("fixture expected data validation", () => {
  it("valid spring-next expected fixture passes", () => {
    expect(validateFixtureExpectedData(readExpectedData())).toEqual({
      ok: true,
      issues: []
    });
  });

  it("report-data endpoints mismatch fails", () => {
    const data = cloneExpectedData();
    data.reportData.endpoints = [];

    expectIssue(data, "report_endpoints_mismatch");
  });

  it("report-data flows mismatch fails", () => {
    const data = cloneExpectedData();
    data.reportData.flows = [];

    expectIssue(data, "report_flows_mismatch");
  });

  it("report-data pages mismatch fails", () => {
    const data = cloneExpectedData();
    data.reportData.pages = [];

    expectIssue(data, "report_pages_mismatch");
  });

  it("flow references missing endpointId fails", () => {
    const data = cloneExpectedData();
    data.flows[0]!.endpointId = "endpoint:get:/missing";
    data.reportData.flows = data.flows;

    expectIssue(data, "flow_endpoint_missing");
  });

  it("mainPath references missing node fails", () => {
    const data = cloneExpectedData();
    data.flows[0]!.mainPath.push("node:missing");
    data.reportData.flows = data.flows;

    expectIssue(data, "flow_main_path_node_missing");
  });

  it("edge references missing node fails", () => {
    const data = cloneExpectedData();
    data.flows[0]!.edges[0]!.to = "node:missing";
    data.reportData.flows = data.flows;

    expectIssue(data, "flow_edge_node_missing");
  });

  it("subFlow parentNodeId references missing node fails", () => {
    const data = cloneExpectedData();
    data.flows[0]!.subFlows[0]!.parentNodeId = "node:missing";
    data.reportData.flows = data.flows;

    expectIssue(data, "subflow_parent_node_missing");
  });

  it("page apiCall endpointId references missing endpoint fails", () => {
    const data = cloneExpectedData();
    data.pages[0]!.apiCalls[0]!.endpointId = "endpoint:get:/missing";
    data.reportData.pages = data.pages;

    expectIssue(data, "page_api_call_endpoint_missing");
  });

  it("invalid split JSON schema fails", () => {
    const data = cloneExpectedData();
    data.endpoints[0]!.confidence = "certain";
    data.reportData.endpoints = data.endpoints;

    expectIssue(data, "endpoints_schema_invalid");
  });
});
