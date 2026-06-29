import {
  endpointFlowSchema,
  endpointSchema,
  pageStoryboardSchema,
  scanResultSchema,
  type ApiCall,
  type CaptureResult,
  type Endpoint,
  type EndpointFlow,
  type PageStoryboard,
  type ScanResult
} from "./schema.js";

export type ReportAggregationIssue = {
  code: string;
  message: string;
  path?: string;
};

export type ReportAggregationWarning = ScanResult["warnings"][number];

export type AggregateReportDataInput = {
  projectName?: string;
  generatedAt?: string;
  endpoints: Endpoint[];
  flows: EndpointFlow[];
  pages: PageStoryboard[];
  capture?: CaptureResult;
  warnings?: ReportAggregationWarning[];
};

export type ReportAggregationResult = {
  scanResult: ScanResult;
  issues: ReportAggregationIssue[];
};

export function aggregateReportData(input: AggregateReportDataInput): ReportAggregationResult {
  const endpoints = endpointSchema.array().parse(input.endpoints);
  const flows = endpointFlowSchema.array().parse(input.flows);
  const pages = pageStoryboardSchema.array().parse(input.pages);
  const issues: ReportAggregationIssue[] = [];

  validateFlowReferences({ endpoints, flows }, issues);

  const linkedPages = pages.map((page, pageIndex) => ({
    ...page,
    apiCalls: page.apiCalls.map((apiCall, apiCallIndex) =>
      linkApiCall({
        apiCall,
        endpoints,
        issues,
        path: `pages.${pageIndex}.apiCalls.${apiCallIndex}`
      })
    )
  }));

  const scanResult = scanResultSchema.parse({
    projectName: input.projectName ?? "Anlyx",
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    schemaVersion: "0.1",
    endpoints,
    flows,
    pages: linkedPages,
    ...(input.capture ? { capture: input.capture } : {}),
    warnings: [...(input.warnings ?? []), ...issues.map(toWarning)]
  });

  return {
    scanResult,
    issues
  };
}

export function matchApiCallToEndpoint(apiCall: ApiCall, endpoints: Endpoint[]): Endpoint | null {
  const matches = endpoints.filter(
    (endpoint) =>
      endpoint.method === apiCall.method &&
      endpointPathMatchesApiCallPath(endpoint.path, apiCall.path)
  );

  if (matches.length !== 1) {
    return null;
  }

  return matches[0] ?? null;
}

function linkApiCall(options: {
  apiCall: ApiCall;
  endpoints: Endpoint[];
  issues: ReportAggregationIssue[];
  path: string;
}): ApiCall {
  const endpointIds = new Set(options.endpoints.map((endpoint) => endpoint.id));

  if (options.apiCall.endpointId && endpointIds.has(options.apiCall.endpointId)) {
    return options.apiCall;
  }

  if (options.apiCall.endpointId) {
    options.issues.push({
      code: "api_call_invalid_endpoint_id",
      message: `API call references missing endpointId: ${options.apiCall.endpointId}.`,
      path: `${options.path}.endpointId`
    });
  }

  const matches = options.endpoints.filter(
    (endpoint) =>
      endpoint.method === options.apiCall.method &&
      endpointPathMatchesApiCallPath(endpoint.path, options.apiCall.path)
  );

  if (matches.length === 1) {
    const { endpointId: _endpointId, ...apiCallWithoutEndpointId } = options.apiCall;
    void _endpointId;

    return {
      ...apiCallWithoutEndpointId,
      endpointId: matches[0]!.id
    };
  }

  const { endpointId: _endpointId, ...apiCallWithoutEndpointId } = options.apiCall;
  void _endpointId;

  if (matches.length > 1) {
    options.issues.push({
      code: "api_call_ambiguous",
      message: `API call matches multiple endpoints: ${options.apiCall.method} ${options.apiCall.path}.`,
      path: options.path
    });

    return apiCallWithoutEndpointId;
  }

  options.issues.push({
    code: "api_call_unmatched",
    message: `API call does not match any endpoint: ${options.apiCall.method} ${options.apiCall.path}.`,
    path: options.path
  });

  return apiCallWithoutEndpointId;
}

function endpointPathMatchesApiCallPath(endpointPath: string, apiCallPath: string): boolean {
  const endpointSegments = splitPathname(endpointPath);
  const apiCallSegments = splitPathname(apiCallPath);

  if (endpointSegments.length !== apiCallSegments.length) {
    return false;
  }

  return endpointSegments.every((endpointSegment, index) => {
    const apiCallSegment = apiCallSegments[index];

    if (apiCallSegment === undefined) {
      return false;
    }

    if (/^\{[^/{}]+\}$/.test(endpointSegment)) {
      return apiCallSegment.length > 0 && !apiCallSegment.includes("/");
    }

    return endpointSegment === apiCallSegment;
  });
}

function splitPathname(path: string): string[] {
  const pathname = toPathname(path);

  if (pathname === "/") {
    return [];
  }

  return pathname.replace(/^\/+|\/+$/g, "").split("/");
}

function toPathname(path: string): string {
  try {
    return decodeURIComponent(new URL(path, "http://anlyx.local").pathname);
  } catch {
    return path.split("?")[0] ?? path;
  }
}

function validateFlowReferences(
  data: { endpoints: Endpoint[]; flows: EndpointFlow[] },
  issues: ReportAggregationIssue[]
): void {
  const endpointIds = new Set(data.endpoints.map((endpoint) => endpoint.id));

  data.flows.forEach((flow, flowIndex) => {
    if (!endpointIds.has(flow.endpointId)) {
      issues.push({
        code: "flow_missing_endpoint",
        message: `Flow references missing endpointId: ${flow.endpointId}.`,
        path: `flows.${flowIndex}.endpointId`
      });
    }

    const nodeIds = new Set(flow.nodes.map((node) => node.id));

    flow.mainPath.forEach((nodeId, nodeIndex) => {
      if (!nodeIds.has(nodeId)) {
        issues.push({
          code: "flow_main_path_missing_node",
          message: `Flow mainPath references missing node: ${nodeId}.`,
          path: `flows.${flowIndex}.mainPath.${nodeIndex}`
        });
      }
    });

    flow.edges.forEach((edge, edgeIndex) => {
      if (!nodeIds.has(edge.from)) {
        issues.push({
          code: "flow_edge_missing_node",
          message: `Flow edge references missing from node: ${edge.from}.`,
          path: `flows.${flowIndex}.edges.${edgeIndex}.from`
        });
      }

      if (!nodeIds.has(edge.to)) {
        issues.push({
          code: "flow_edge_missing_node",
          message: `Flow edge references missing to node: ${edge.to}.`,
          path: `flows.${flowIndex}.edges.${edgeIndex}.to`
        });
      }
    });

    flow.subFlows.forEach((subFlow, subFlowIndex) => {
      if (!nodeIds.has(subFlow.parentNodeId)) {
        issues.push({
          code: "flow_subflow_missing_parent",
          message: `SubFlow references missing parentNodeId: ${subFlow.parentNodeId}.`,
          path: `flows.${flowIndex}.subFlows.${subFlowIndex}.parentNodeId`
        });
      }
    });
  });
}

function toWarning(issue: ReportAggregationIssue): ReportAggregationWarning {
  const warning: ReportAggregationWarning = {
    code: issue.code,
    message: issue.message
  };

  if (issue.path) {
    warning.targetId = issue.path;
  }

  return warning;
}
