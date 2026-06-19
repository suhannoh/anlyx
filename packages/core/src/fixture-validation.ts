import {
  endpointFlowSchema,
  endpointSchema,
  pageStoryboardSchema,
  scanResultSchema,
  type Endpoint,
  type EndpointFlow,
  type PageStoryboard,
  type ScanResult
} from "./schema.js";

export type FixtureValidationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type FixtureValidationResult = {
  ok: boolean;
  issues: FixtureValidationIssue[];
};

export type FixtureExpectedData = {
  endpoints: unknown;
  flows: unknown;
  pages: unknown;
  reportData: unknown;
};

export function validateFixtureExpectedData(
  data: FixtureExpectedData
): FixtureValidationResult {
  const issues: FixtureValidationIssue[] = [];
  const endpoints = parsePart("endpoints", data.endpoints, endpointSchema.array(), issues);
  const flows = parsePart("flows", data.flows, endpointFlowSchema.array(), issues);
  const pages = parsePart("pages", data.pages, pageStoryboardSchema.array(), issues);
  const reportData = parsePart("reportData", data.reportData, scanResultSchema, issues);

  if (!endpoints || !flows || !pages || !reportData) {
    return toResult(issues);
  }

  validateAggregateEquality({ endpoints, flows, pages, reportData }, issues);
  validateFlowReferences({ endpoints, flows }, issues);
  validatePageReferences({ endpoints, pages }, issues);

  return toResult(issues);
}

type ParsedFixtureData = {
  endpoints: Endpoint[];
  flows: EndpointFlow[];
  pages: PageStoryboard[];
  reportData: ScanResult;
};

function parsePart<T>(
  partName: "endpoints" | "flows" | "pages" | "reportData",
  value: unknown,
  schema: { safeParse(input: unknown): { success: true; data: T } | { success: false; error: Error } },
  issues: FixtureValidationIssue[]
): T | null {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  issues.push({
    code: `${partName === "reportData" ? "report_data" : partName}_schema_invalid`,
    message: `${partName} does not match the Anlyx data contract.`,
    path: partName
  });

  return null;
}

function validateAggregateEquality(data: ParsedFixtureData, issues: FixtureValidationIssue[]): void {
  if (!deepEqual(data.reportData.endpoints, data.endpoints)) {
    issues.push({
      code: "report_endpoints_mismatch",
      message: "report-data.json endpoints must match endpoints.json.",
      path: "reportData.endpoints"
    });
  }

  if (!deepEqual(data.reportData.flows, data.flows)) {
    issues.push({
      code: "report_flows_mismatch",
      message: "report-data.json flows must match flows.json.",
      path: "reportData.flows"
    });
  }

  if (!deepEqual(data.reportData.pages, data.pages)) {
    issues.push({
      code: "report_pages_mismatch",
      message: "report-data.json pages must match pages.json.",
      path: "reportData.pages"
    });
  }
}

function validateFlowReferences(
  data: Pick<ParsedFixtureData, "endpoints" | "flows">,
  issues: FixtureValidationIssue[]
): void {
  const endpointIds = new Set(data.endpoints.map((endpoint) => endpoint.id));

  data.flows.forEach((flow, flowIndex) => {
    if (!endpointIds.has(flow.endpointId)) {
      issues.push({
        code: "flow_endpoint_missing",
        message: `Flow references missing endpointId: ${flow.endpointId}.`,
        path: `flows.${flowIndex}.endpointId`
      });
    }

    const nodeIds = new Set(flow.nodes.map((node) => node.id));

    flow.mainPath.forEach((nodeId, nodeIndex) => {
      if (!nodeIds.has(nodeId)) {
        issues.push({
          code: "flow_main_path_node_missing",
          message: `Flow mainPath references missing node: ${nodeId}.`,
          path: `flows.${flowIndex}.mainPath.${nodeIndex}`
        });
      }
    });

    flow.edges.forEach((edge, edgeIndex) => {
      if (!nodeIds.has(edge.from)) {
        issues.push({
          code: "flow_edge_node_missing",
          message: `Flow edge references missing from node: ${edge.from}.`,
          path: `flows.${flowIndex}.edges.${edgeIndex}.from`
        });
      }

      if (!nodeIds.has(edge.to)) {
        issues.push({
          code: "flow_edge_node_missing",
          message: `Flow edge references missing to node: ${edge.to}.`,
          path: `flows.${flowIndex}.edges.${edgeIndex}.to`
        });
      }
    });

    flow.subFlows.forEach((subFlow, subFlowIndex) => {
      if (!nodeIds.has(subFlow.parentNodeId)) {
        issues.push({
          code: "subflow_parent_node_missing",
          message: `SubFlow references missing parentNodeId: ${subFlow.parentNodeId}.`,
          path: `flows.${flowIndex}.subFlows.${subFlowIndex}.parentNodeId`
        });
      }
    });
  });
}

function validatePageReferences(
  data: Pick<ParsedFixtureData, "endpoints" | "pages">,
  issues: FixtureValidationIssue[]
): void {
  const endpointIds = new Set(data.endpoints.map((endpoint) => endpoint.id));

  data.pages.forEach((page, pageIndex) => {
    page.apiCalls.forEach((apiCall, apiCallIndex) => {
      if (apiCall.endpointId && !endpointIds.has(apiCall.endpointId)) {
        issues.push({
          code: "page_api_call_endpoint_missing",
          message: `Page apiCall references missing endpointId: ${apiCall.endpointId}.`,
          path: `pages.${pageIndex}.apiCalls.${apiCallIndex}.endpointId`
        });
      }
    });
  });
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function toResult(issues: FixtureValidationIssue[]): FixtureValidationResult {
  return {
    ok: issues.length === 0,
    issues
  };
}
