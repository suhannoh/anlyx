import type {
  ConfidenceLevel,
  Endpoint,
  EndpointFlow,
  FlowEdge as ViewerFlowEdge,
  FlowNode as ViewerFlowNode,
  ReportData,
  ScanResult
} from "../schema.js";
import type {
  AnlyxFlowFile,
  Flow,
  FlowEdge,
  FlowNode,
  FlowNodeType,
  FlowStatus
} from "./schema.js";

export type NormalizeFlowFileToScanResult = (file: AnlyxFlowFile) => ScanResult;
export type NormalizeFlowFileToReportData = (file: AnlyxFlowFile) => ReportData;

const API_NODE_TYPES = new Set<FlowNodeType>(["api.request", "api.route"]);

export function normalizeFlowFileToScanResult(file: AnlyxFlowFile): ScanResult {
  return {
    projectName: file.project.name,
    generatedAt: file.snapshot?.createdAt ?? new Date().toISOString(),
    schemaVersion: "0.1",
    endpoints: file.flows.flatMap((flow) => flow.nodes.filter(isApiNode).map(toEndpoint)),
    flows: file.flows.map((flow) => toEndpointFlow(flow, file)),
    pages: [],
    warnings: []
  };
}

export function normalizeFlowFileToReportData(file: AnlyxFlowFile): ReportData {
  return normalizeFlowFileToScanResult(file);
}

function toEndpoint(node: FlowNode): Endpoint {
  const endpoint = parseEndpointLabel(node.label);

  return {
    id: node.id,
    method: endpoint.method,
    path: endpoint.path,
    supportLevel: "basic",
    confidence: confidenceFromStatus(node.status),
    ...(node.request ? { requestSchema: "Flow JSON request" } : {}),
    ...(node.response ? { responseSchema: "Flow JSON response" } : {})
  };
}

function toEndpointFlow(flow: Flow, file: AnlyxFlowFile): EndpointFlow {
  const endpointId = flow.nodes.find(isApiNode)?.id ?? flow.nodes[0]?.id ?? flow.id;

  return {
    endpointId,
    nodes: flow.nodes.map((node) => toViewerNode(node, file)),
    edges: flow.edges.map(toViewerEdge),
    mainPath: buildMainPath(flow),
    subFlows: []
  };
}

function toViewerNode(node: FlowNode, file: AnlyxFlowFile): ViewerFlowNode {
  const metadata: Record<string, unknown> = {
    ...(node.metadata ?? {}),
    flowJsonType: node.type
  };

  if (file.generatedBy) {
    metadata.generatedBy = file.generatedBy;
  }

  if (file.snapshot) {
    metadata.snapshot = file.snapshot;
  }

  return {
    id: node.id,
    type: toViewerNodeType(node.type),
    label: node.label,
    confidence: confidenceFromStatus(node.status),
    status: node.status,
    ...(node.timing ? { timing: node.timing } : {}),
    ...(node.evidenceIds ? { evidenceIds: node.evidenceIds } : {}),
    ...(node.request ? { request: node.request } : {}),
    ...(node.response ? { response: node.response } : {}),
    metadata
  };
}

function toViewerEdge(edge: FlowEdge, index: number): ViewerFlowEdge {
  return {
    id: edge.id ?? `edge:${edge.from}:${edge.to}:${index}`,
    from: edge.from,
    to: edge.to,
    kind: "main",
    ...(edge.label ? { label: edge.label } : {}),
    confidence: confidenceFromStatus(edge.status),
    status: edge.status,
    ...(edge.timing ? { timing: edge.timing } : {}),
    ...(edge.evidenceIds ? { evidenceIds: edge.evidenceIds } : {}),
    ...(edge.metadata ? { metadata: edge.metadata } : {})
  };
}

function buildMainPath(flow: Flow): string[] {
  const firstNode = flow.nodes[0];

  if (!firstNode) {
    return [];
  }

  const nodeIds = new Set(flow.nodes.map((node) => node.id));
  const path = [firstNode.id];
  const visited = new Set(path);
  let current = firstNode.id;

  for (let step = 0; step < flow.edges.length; step += 1) {
    const nextEdge = flow.edges.find((edge) => edge.from === current);

    if (!nextEdge || visited.has(nextEdge.to) || !nodeIds.has(nextEdge.to)) {
      break;
    }

    path.push(nextEdge.to);
    visited.add(nextEdge.to);
    current = nextEdge.to;
  }

  return path;
}

function parseEndpointLabel(label: string): Pick<Endpoint, "method" | "path"> {
  const match = /^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)/.exec(label.trim());

  if (!match) {
    return {
      method: "GET",
      path: label
    };
  }

  return {
    method: match[1] as Endpoint["method"],
    path: match[2]!
  };
}

function confidenceFromStatus(status: FlowStatus): ConfidenceLevel {
  if (status === "observed" || status === "measured" || status === "source-matched") {
    return "high";
  }

  if (status === "manual") {
    return "medium";
  }

  if (status === "agent-inferred" || status === "not-proven") {
    return "low";
  }

  return "unknown";
}

function isApiNode(node: FlowNode): boolean {
  return API_NODE_TYPES.has(node.type);
}

function toViewerNodeType(type: FlowNode["type"]): ViewerFlowNode["type"] {
  switch (type) {
    case "ui.page":
    case "ui.action":
    case "ui.component":
      return "page";
    case "api.request":
    case "api.route":
      return "endpoint";
    case "external":
      return "externalApi";
    case "response":
    case "result":
      return "schema";
    case "middleware":
    case "auth.session":
    case "queue":
    case "job":
      return "utility";
    case "controller":
    case "service":
    case "repository":
    case "database":
    case "unknown":
      return type;
    default:
      return "unknown";
  }
}
