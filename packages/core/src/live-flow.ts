import type {
  ConfidenceLevel,
  Endpoint,
  EndpointFlow,
  FlowNode,
  HttpMethod,
  ScanResult
} from "./schema.js";

export type BrowserActionEvent = {
  label: string;
  selector?: string;
  text?: string;
  observedAt?: string;
};

export type BrowserRequestEvent = {
  id: string;
  type: "request";
  method: HttpMethod | string;
  url: string;
  path?: string;
  status?: number;
  durationMs?: number;
  observedAt: string;
  action?: BrowserActionEvent;
};

export type LiveEvidenceLevel =
  | "browser_observed"
  | "backend_observed"
  | "source_derived"
  | "inferred"
  | "not_proven";

export type FlowLayerType =
  | "action"
  | "api"
  | "controller"
  | "auth"
  | "decision"
  | "page"
  | "service"
  | "repository"
  | "database"
  | "dto"
  | "schema"
  | "externalApi"
  | "cache"
  | "utility"
  | "validator"
  | "mapper"
  | "unknown"
  | "result";

export type FlowLayerExecution =
  | "executed"
  | "observed"
  | "inferred"
  | "blocked"
  | "scanned"
  | "not_proven"
  | "unknown";

export type FlowLayer = {
  id: string;
  type: FlowLayerType;
  label: string;
  execution: FlowLayerExecution;
  evidenceLevel: LiveEvidenceLevel;
  evidence: string[];
  nodeId?: string;
  filePath?: string;
  lineNumber?: number;
  confidence?: ConfidenceLevel;
  startOffsetMs?: number;
  durationMs?: number;
  status?: number;
};

export type BackendObservedSpan = {
  id: string;
  parentId?: string;
  type: Exclude<FlowLayerType, "action" | "api" | "result">;
  label: string;
  nodeId?: string;
  filePath?: string;
  lineNumber?: number;
  startOffsetMs: number;
  durationMs: number;
  status?: number;
  evidence?: string[];
};

export type BackendSpanEvent = {
  type: "backend_spans";
  requestId: string;
  spans: BackendObservedSpan[];
  observedAt?: string;
};

export type FlowRecordMatchState = "matched" | "unmatched" | "ambiguous";
export type FlowRecordTrigger = "user_action" | "background";

export type FlowRecord = {
  id: string;
  requestId: string;
  method: string;
  path: string;
  trigger: FlowRecordTrigger;
  status?: number;
  duration?: number;
  durationMs?: number;
  matchState: FlowRecordMatchState;
  confidence: ConfidenceLevel;
  action?: BrowserActionEvent;
  endpoint?: Endpoint;
  endpointId?: string;
  endpointPath?: string;
  flow?: EndpointFlow;
  flowId?: string;
  layers: FlowLayer[];
  backendSpans?: BackendObservedSpan[];
  evidence: string[];
  createdAt: string;
  label: string;
};

type EndpointMatch =
  | { state: "matched"; endpoint: Endpoint; flow?: EndpointFlow | undefined }
  | { state: "ambiguous" }
  | { state: "unmatched" };

const BLOCKED_DECISION_STATUSES = new Set([401, 403, 409]);

export function normalizeBrowserEventPath(urlOrPath: string): string {
  try {
    const parsed = new URL(urlOrPath, "http://anlyx.local");
    return `${decodeURIComponent(parsed.pathname)}${parsed.search}`;
  } catch {
    const withoutHash = urlOrPath.split("#")[0] ?? urlOrPath;
    return withoutHash.startsWith("/") ? withoutHash : `/${withoutHash}`;
  }
}

export function buildFlowRecordFromBrowserEvent(
  event: BrowserRequestEvent,
  scanResult: ScanResult
): FlowRecord {
  const method = event.method.toUpperCase();
  const path = normalizeBrowserEventPath(event.path ?? event.url);
  const match = matchBrowserRequest(event, scanResult);
  const status = event.status;
  const duration = event.durationMs;
  const layers = buildLayers({ event, method, path, status, duration, match });
  const label = `${method} ${path}${status === undefined ? "" : ` -> ${status}`}`;

  const record: FlowRecord = {
    id: `flow:${event.id}`,
    requestId: event.id,
    method,
    path,
    trigger: event.action ? "user_action" : "background",
    matchState: match.state,
    confidence: confidenceForMatch(match),
    layers,
    evidence: collectRecordEvidence(match),
    createdAt: event.observedAt,
    label
  };

  if (status !== undefined) {
    record.status = status;
  }

  if (duration !== undefined) {
    record.duration = duration;
    record.durationMs = duration;
  }

  if (event.action) {
    record.action = event.action;
  }

  if (match.state === "matched") {
    record.endpoint = match.endpoint;
    record.endpointId = match.endpoint.id;
    record.endpointPath = match.endpoint.path;

    if (match.flow) {
      record.flow = match.flow;
      record.flowId = match.flow.endpointId;
    }
  }

  return record;
}

export function mergeBackendSpansIntoFlowRecord(
  record: FlowRecord,
  backendSpans: BackendObservedSpan[]
): FlowRecord {
  if (backendSpans.length === 0) {
    return record;
  }

  return {
    ...record,
    backendSpans,
    evidence: [
      ...record.evidence,
      "backend_observed: development runtime reported server-side method spans"
    ]
  };
}

function matchBrowserRequest(event: BrowserRequestEvent, scanResult: ScanResult): EndpointMatch {
  const method = event.method.toUpperCase();
  const path = endpointMatchPath(normalizeBrowserEventPath(event.path ?? event.url));
  const endpoints = scanResult.endpoints.filter(
    (endpoint) => endpoint.method === method && endpointPathMatchesRequestPath(endpoint.path, path)
  );

  if (endpoints.length === 0) {
    return { state: "unmatched" };
  }

  if (endpoints.length > 1) {
    return { state: "ambiguous" };
  }

  const endpoint = endpoints[0]!;
  return {
    state: "matched",
    endpoint,
    flow: scanResult.flows.find((flow) => flow.endpointId === endpoint.id)
  };
}

function buildLayers(options: {
  event: BrowserRequestEvent;
  method: string;
  path: string;
  status: number | undefined;
  duration: number | undefined;
  match: EndpointMatch;
}): FlowLayer[] {
  const layers: FlowLayer[] = [];

  if (options.event.action) {
    layers.push({
      id: `${options.event.id}:action`,
      type: "action",
      label: options.event.action.label,
      execution: "executed",
      evidenceLevel: "browser_observed",
      evidence: ["browser_observed: user action captured by the browser runtime"],
      ...(options.duration !== undefined ? { durationMs: options.duration } : {})
    });
  }

  layers.push({
    id: `${options.event.id}:api`,
    type: "api",
    label: `${options.method} ${options.path}`,
    execution: "executed",
    evidenceLevel: "browser_observed",
    evidence: ["browser_observed: fetch/XMLHttpRequest observed in the browser"],
    ...(options.duration !== undefined ? { durationMs: options.duration } : {}),
    ...(options.status !== undefined ? { status: options.status } : {})
  });

  if (options.match.state === "matched" && options.match.flow) {
    layers.push(
      ...buildScannedFlowLayers({
        eventId: options.event.id,
        flow: options.match.flow,
        status: options.status
      })
    );
  } else if (options.status !== undefined && BLOCKED_DECISION_STATUSES.has(options.status)) {
    layers.push(buildBlockedDecisionLayer(options.event.id, options.status));
  }

  layers.push(buildResultLayer(options.event.id, options.status));

  return layers;
}

function buildScannedFlowLayers(options: {
  eventId: string;
  flow: EndpointFlow;
  status: number | undefined;
}): FlowLayer[] {
  const nodeById = new Map(options.flow.nodes.map((node) => [node.id, node]));
  const pathNodes = options.flow.mainPath
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is FlowNode => Boolean(node));
  const blocked = options.status !== undefined && BLOCKED_DECISION_STATUSES.has(options.status);
  const decisionIndex = blocked ? likelyDecisionIndex(pathNodes, options.status!) : -1;
  const blockedDecisionLayer =
    blocked && options.status !== undefined
      ? buildBlockedDecisionLayer(options.eventId, options.status)
      : undefined;

  const layers: FlowLayer[] = pathNodes.flatMap((node, index): FlowLayer[] => {
    const type = layerTypeForNode(node);

    if (type === "api") {
      return [];
    }

    return [
      {
        id: `${options.eventId}:${node.id}`,
        type,
        label: node.label,
        execution: executionForScannedNode({ node, index, blocked, decisionIndex }),
        evidenceLevel: evidenceForScannedNode({ node, index, blocked, decisionIndex }),
        evidence: evidenceTextForScannedNode({ node, index, blocked, decisionIndex }),
        nodeId: node.id,
        ...(node.filePath ? { filePath: node.filePath } : {}),
        ...(node.lineNumber !== undefined ? { lineNumber: node.lineNumber } : {}),
        ...(node.confidence ? { confidence: node.confidence } : {})
      }
    ];
  });

  if (blockedDecisionLayer) {
    const insertAfter = lastLayerIndexForNodeIndex({ layers, pathNodes, nodeIndex: decisionIndex });
    layers.splice(insertAfter + 1, 0, blockedDecisionLayer);
  }

  return layers;
}

function buildResultLayer(eventId: string, status?: number): FlowLayer {
  const blocked = status !== undefined && BLOCKED_DECISION_STATUSES.has(status);
  const failed = status !== undefined && status >= 400 && !blocked;

  return {
    id: `${eventId}:result`,
    type: "result",
    label: status === undefined ? "Response pending" : `${status} response`,
    execution: blocked ? "blocked" : "executed",
    evidenceLevel: status === undefined ? "inferred" : "browser_observed",
    evidence: [
      status === undefined
        ? "inferred: response status was not reported by the browser runtime"
        : `browser_observed: browser received ${status}${failed ? " error" : ""} response`
    ],
    ...(status !== undefined ? { status } : {})
  };
}

function buildBlockedDecisionLayer(eventId: string, status: number): FlowLayer {
  if (status === 409) {
    return {
      id: `${eventId}:decision:${status}`,
      type: "decision",
      label: "Business decision blocked response",
      execution: "blocked",
      evidenceLevel: "inferred",
      evidence: [
        "inferred: 409 response suggests a business decision stop along the scanned path",
        "browser_observed: response status was captured by the browser",
        "No server runtime trace is available in v0.1"
      ],
      status
    };
  }

  return {
    id: `${eventId}:auth:${status}`,
    type: "auth",
    label: status === 401 ? "Authentication blocked response" : "Authorization blocked response",
    execution: "blocked",
    evidenceLevel: "inferred",
    evidence: [
      `inferred: ${status} response suggests an auth or policy stop along the scanned path`,
      "browser_observed: response status was captured by the browser",
      "No server runtime trace is available in v0.1"
    ],
    status
  };
}

function lastLayerIndexForNodeIndex(options: {
  layers: FlowLayer[];
  pathNodes: FlowNode[];
  nodeIndex: number;
}): number {
  const node = options.pathNodes[options.nodeIndex];

  if (!node || node.type === "endpoint") {
    return -1;
  }

  return options.layers.findIndex((layer) => layer.nodeId === node.id);
}

function executionForScannedNode(options: {
  node: FlowNode;
  index: number;
  blocked: boolean;
  decisionIndex: number;
}): FlowLayerExecution {
  if (
    options.blocked &&
    options.index > options.decisionIndex &&
    isDownstreamServerLayer(options.node.type)
  ) {
    return "not_proven";
  }

  return "scanned";
}

function evidenceForScannedNode(options: {
  node: FlowNode;
  index: number;
  blocked: boolean;
  decisionIndex: number;
}): LiveEvidenceLevel {
  if (
    options.blocked &&
    options.index > options.decisionIndex &&
    isDownstreamServerLayer(options.node.type)
  ) {
    return "not_proven";
  }

  if (options.node.confidence === "low" || options.node.confidence === "unknown") {
    return "inferred";
  }

  return "source_derived";
}

function evidenceTextForScannedNode(options: {
  node: FlowNode;
  index: number;
  blocked: boolean;
  decisionIndex: number;
}): string[] {
  if (
    options.blocked &&
    options.index > options.decisionIndex &&
    isDownstreamServerLayer(options.node.type)
  ) {
    return [
      "not_proven: this downstream source-derived layer is after the likely decision point",
      "No server runtime trace is available in v0.1"
    ];
  }

  const level =
    options.node.confidence === "low" || options.node.confidence === "unknown"
      ? "inferred"
      : "source_derived";

  return [`${level}: layer came from scanned project source, not server runtime tracing`];
}

function likelyDecisionIndex(nodes: FlowNode[], status: number): number {
  if (status === 409) {
    const serviceIndex = nodes.findIndex((node) => node.type === "service");
    return serviceIndex === -1 ? firstControllerIndex(nodes) : serviceIndex;
  }

  return firstControllerIndex(nodes);
}

function firstControllerIndex(nodes: FlowNode[]): number {
  const controllerIndex = nodes.findIndex((node) => node.type === "controller");
  return controllerIndex === -1 ? 0 : controllerIndex;
}

function layerTypeForNode(node: FlowNode): FlowLayerType {
  if (node.type === "endpoint") {
    return "api";
  }

  return node.type;
}

function isDownstreamServerLayer(type: FlowNode["type"]): boolean {
  return type === "service" || type === "repository" || type === "database";
}

function confidenceForMatch(match: EndpointMatch): ConfidenceLevel {
  if (match.state !== "matched") {
    return "low";
  }

  return match.endpoint.confidence ?? "medium";
}

function collectRecordEvidence(match: EndpointMatch): string[] {
  if (match.state === "matched") {
    return [
      "browser_observed: request was captured from the local browser",
      "source_derived: endpoint match and backend flow came from ScanResult"
    ];
  }

  if (match.state === "ambiguous") {
    return [
      "browser_observed: request was captured from the local browser",
      "not_proven: multiple scanned endpoints matched the request shape"
    ];
  }

  return [
    "browser_observed: request was captured from the local browser",
    "not_proven: no scanned endpoint matched the request"
  ];
}

function endpointPathMatchesRequestPath(endpointPath: string, requestPath: string): boolean {
  const endpointSegments = splitEndpointPath(endpointPath);
  const requestSegments = splitEndpointPath(requestPath);

  if (endpointSegments.length !== requestSegments.length) {
    return false;
  }

  return endpointSegments.every((endpointSegment, index) => {
    const requestSegment = requestSegments[index];

    if (requestSegment === undefined || requestSegment.length === 0) {
      return false;
    }

    if (isDynamicPathSegment(endpointSegment)) {
      return !requestSegment.includes("/");
    }

    return endpointSegment === requestSegment;
  });
}

function splitEndpointPath(path: string): string[] {
  const pathname = endpointMatchPath(normalizeBrowserEventPath(path));

  if (pathname === "/") {
    return [];
  }

  return pathname.replace(/^\/+|\/+$/g, "").split("/");
}

function endpointMatchPath(path: string): string {
  return path.split("?")[0] ?? path;
}

function isDynamicPathSegment(segment: string): boolean {
  return /^\{[^/{}:]+\}$/.test(segment) || /^:[^/{}:]+$/.test(segment);
}
