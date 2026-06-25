import type {
  ConfidenceLevel,
  Endpoint,
  EndpointFlow,
  FlowNode,
  HttpMethod,
  PageStoryboard,
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

export type FrontendServerRequestEvent = {
  id: string;
  type: "frontend_server_request";
  runtime: "next";
  method: HttpMethod | string;
  url: string;
  path?: string;
  status?: number;
  durationMs?: number;
  observedAt: string;
  pagePath?: string;
};

export type BrowserPageViewEvent = {
  id: string;
  type: "page_view";
  url: string;
  path?: string;
  title?: string;
  observedAt: string;
};

export type LiveEvidenceLevel =
  | "browser_observed"
  | "frontend_server_observed"
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
  const match = matchCapturedRequest(event, scanResult);
  const status = event.status;
  const duration = event.durationMs;
  const layers = buildLayers({
    eventId: event.id,
    method,
    path,
    status,
    duration,
    match,
    requestEvidenceLevel: "browser_observed",
    apiEvidence: "browser_observed: fetch/XMLHttpRequest observed in the browser",
    resultEvidence: (capturedStatus) =>
      `browser_observed: browser received ${capturedStatus}${
        capturedStatus >= 400 && !BLOCKED_DECISION_STATUSES.has(capturedStatus) ? " error" : ""
      } response`,
    missingResultEvidence:
      "inferred: response status and duration were not reported by the browser runtime",
    ...(event.action ? { action: event.action } : {})
  });
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

export function buildFlowRecordFromFrontendServerEvent(
  event: FrontendServerRequestEvent,
  scanResult: ScanResult
): FlowRecord {
  const method = event.method.toUpperCase();
  const path = normalizeBrowserEventPath(event.path ?? event.url);
  const match = matchCapturedRequest(event, scanResult);
  const status = event.status;
  const duration = event.durationMs;
  const layers = buildLayers({
    eventId: event.id,
    method,
    path,
    status,
    duration,
    match,
    requestEvidenceLevel: "frontend_server_observed",
    apiEvidence: "frontend_server_observed: Next.js server runtime observed this fetch request",
    resultEvidence: (capturedStatus) =>
      `frontend_server_observed: Next.js server runtime received ${capturedStatus} response`,
    missingResultEvidence:
      "inferred: Next.js server runtime reported the request without a response status"
  });
  const label = `${method} ${path}${status === undefined ? "" : ` -> ${status}`}`;

  const record: FlowRecord = {
    id: `flow:${event.id}`,
    requestId: event.id,
    method,
    path,
    trigger: "background",
    matchState: match.state,
    confidence: confidenceForMatch(match),
    layers,
    evidence: collectFrontendServerEvidence(match),
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

export function buildFlowRecordsFromPageViewEvent(
  event: BrowserPageViewEvent,
  scanResult: ScanResult
): FlowRecord[] {
  const pagePath = endpointMatchPath(normalizeBrowserEventPath(event.path ?? event.url));
  const page = findPageForPath(pagePath, scanResult.pages);

  if (!page || page.apiCalls.length === 0) {
    return [];
  }

  return page.apiCalls.map((apiCall, index) => {
    const method = apiCall.method.toUpperCase();
    const path = normalizeBrowserEventPath(apiCall.path);
    const match = matchMethodAndPath(method, path, scanResult);
    const layers = buildPageSourceLayers({
      event,
      index,
      page,
      method,
      path,
      match
    });
    const record: FlowRecord = {
      id: `flow:${event.id}:source:${index + 1}`,
      requestId: `${event.id}:source:${index + 1}`,
      method,
      path,
      trigger: "background",
      matchState: match.state,
      confidence: confidenceForMatch(match),
      layers,
      evidence: collectPageSourceEvidence(match),
      createdAt: event.observedAt,
      label: `${method} ${path} (source-derived from ${page.route})`
    };

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
  });
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

function matchCapturedRequest(
  event: BrowserRequestEvent | FrontendServerRequestEvent,
  scanResult: ScanResult
): EndpointMatch {
  const method = event.method.toUpperCase();
  const path = endpointMatchPath(normalizeBrowserEventPath(event.path ?? event.url));
  return matchMethodAndPath(method, path, scanResult);
}

function matchMethodAndPath(method: string, path: string, scanResult: ScanResult): EndpointMatch {
  const matchPath = endpointMatchPath(path);
  const endpoints = scanResult.endpoints.filter(
    (endpoint) =>
      endpoint.method === method && endpointPathMatchesRequestPath(endpoint.path, matchPath)
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

function buildPageSourceLayers(options: {
  event: BrowserPageViewEvent;
  index: number;
  page: PageStoryboard;
  method: string;
  path: string;
  match: EndpointMatch;
}): FlowLayer[] {
  const pageLayer: FlowLayer = {
    id: `${options.event.id}:page:${options.index + 1}`,
    type: "page",
    label: options.page.route,
    execution: "scanned",
    evidenceLevel: "source_derived",
    evidence: ["source_derived: current browser page matched a scanned frontend route"],
    ...(options.page.filePath ? { filePath: options.page.filePath } : {})
  };
  const apiLayer: FlowLayer = {
    id: `${options.event.id}:source:${options.index + 1}:api`,
    type: "api",
    label: `${options.method} ${options.path}`,
    execution: "scanned",
    evidenceLevel: "source_derived",
    evidence: [
      "source_derived: API call was found in scanned frontend source, not observed in the browser"
    ]
  };
  const layers = [pageLayer, apiLayer];

  if (options.match.state === "matched" && options.match.flow) {
    layers.push(
      ...buildScannedFlowLayers({
        eventId: `${options.event.id}:source:${options.index + 1}`,
        flow: options.match.flow,
        status: undefined
      })
    );
  }

  layers.push(buildSourceDerivedResultLayer(`${options.event.id}:source:${options.index + 1}`));
  return layers;
}

function buildLayers(options: {
  eventId: string;
  action?: BrowserActionEvent;
  method: string;
  path: string;
  status: number | undefined;
  duration: number | undefined;
  match: EndpointMatch;
  requestEvidenceLevel: Extract<LiveEvidenceLevel, "browser_observed" | "frontend_server_observed">;
  apiEvidence: string;
  resultEvidence: (status: number) => string;
  missingResultEvidence: string;
}): FlowLayer[] {
  const layers: FlowLayer[] = [];

  if (options.action) {
    layers.push({
      id: `${options.eventId}:action`,
      type: "action",
      label: options.action.label,
      execution: "executed",
      evidenceLevel: "browser_observed",
      evidence: ["browser_observed: user action captured by the browser runtime"],
      ...(options.duration !== undefined ? { durationMs: options.duration } : {})
    });
  }

  layers.push({
    id: `${options.eventId}:api`,
    type: "api",
    label: `${options.method} ${options.path}`,
    execution: "executed",
    evidenceLevel: options.requestEvidenceLevel,
    evidence: [options.apiEvidence],
    ...(options.duration !== undefined ? { durationMs: options.duration } : {}),
    ...(options.status !== undefined ? { status: options.status } : {})
  });

  if (options.match.state === "matched" && options.match.flow) {
    layers.push(
      ...buildScannedFlowLayers({
        eventId: options.eventId,
        flow: options.match.flow,
        status: options.status
      })
    );
  } else if (options.status !== undefined && BLOCKED_DECISION_STATUSES.has(options.status)) {
    layers.push(buildBlockedDecisionLayer(options.eventId, options.status));
  }

  layers.push(
    buildResultLayer({
      eventId: options.eventId,
      status: options.status,
      evidenceLevel: options.requestEvidenceLevel,
      resultEvidence: options.resultEvidence,
      missingResultEvidence: options.missingResultEvidence
    })
  );

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
  const mainNodeIds = new Set(pathNodes.map((node) => node.id));

  for (const subFlow of options.flow.subFlows) {
    const parentIndex = layers.findIndex((layer) => layer.nodeId === subFlow.parentNodeId);
    const subFlowLayers = subFlow.nodes
      .filter((node) => !mainNodeIds.has(node.id))
      .map((node): FlowLayer => {
        const type = layerTypeForNode(node);
        return {
          id: `${options.eventId}:${subFlow.id}:${node.id}`,
          type,
          label: node.label,
          execution: "scanned",
          evidenceLevel:
            node.confidence === "low" || node.confidence === "unknown"
              ? "inferred"
              : "source_derived",
          evidence: [
            "source_derived: supporting backend call was found in scanned source, not server runtime tracing"
          ],
          nodeId: node.id,
          ...(node.filePath ? { filePath: node.filePath } : {}),
          ...(node.lineNumber !== undefined ? { lineNumber: node.lineNumber } : {}),
          ...(node.confidence ? { confidence: node.confidence } : {})
        };
      });

    if (subFlowLayers.length === 0) {
      continue;
    }

    if (parentIndex === -1) {
      layers.push(...subFlowLayers);
    } else {
      layers.splice(parentIndex + 1, 0, ...subFlowLayers);
    }
  }

  if (blockedDecisionLayer) {
    const insertAfter = lastLayerIndexForNodeIndex({ layers, pathNodes, nodeIndex: decisionIndex });
    layers.splice(insertAfter + 1, 0, blockedDecisionLayer);
  }

  return layers;
}

function buildResultLayer(options: {
  eventId: string;
  status: number | undefined;
  evidenceLevel: Extract<LiveEvidenceLevel, "browser_observed" | "frontend_server_observed">;
  resultEvidence: (status: number) => string;
  missingResultEvidence: string;
}): FlowLayer {
  const status = options.status;
  const blocked = status !== undefined && BLOCKED_DECISION_STATUSES.has(status);

  return {
    id: `${options.eventId}:result`,
    type: "result",
    label: status === undefined ? "Response not observed" : `${status} response`,
    execution: status === undefined ? "unknown" : blocked ? "blocked" : "executed",
    evidenceLevel: status === undefined ? "inferred" : options.evidenceLevel,
    evidence: [
      status === undefined ? options.missingResultEvidence : options.resultEvidence(status)
    ],
    ...(status !== undefined ? { status } : {})
  };
}

function buildSourceDerivedResultLayer(eventId: string): FlowLayer {
  return {
    id: `${eventId}:result`,
    type: "result",
    label: "Response not observed",
    execution: "scanned",
    evidenceLevel: "source_derived",
    evidence: [
      "source_derived: page source shows this API call, but the browser did not observe the response"
    ]
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
    isLayerAfterLikelyDecision(options.node, options.decisionIndex)
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
    isLayerAfterLikelyDecision(options.node, options.decisionIndex)
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
    isLayerAfterLikelyDecision(options.node, options.decisionIndex)
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
  if (status === 401 || status === 403) {
    return firstEndpointIndex(nodes);
  }

  if (status === 409) {
    const serviceIndex = nodes.findIndex((node) => node.type === "service");
    return serviceIndex === -1 ? firstControllerIndex(nodes) : serviceIndex;
  }

  return firstControllerIndex(nodes);
}

function firstEndpointIndex(nodes: FlowNode[]): number {
  const endpointIndex = nodes.findIndex((node) => node.type === "endpoint");
  return endpointIndex === -1 ? 0 : endpointIndex;
}

function firstControllerIndex(nodes: FlowNode[]): number {
  const controllerIndex = nodes.findIndex((node) => node.type === "controller");
  return controllerIndex === -1 ? 0 : controllerIndex;
}

function isLayerAfterLikelyDecision(node: FlowNode, decisionIndex: number): boolean {
  if (decisionIndex === 0) {
    return node.type !== "endpoint";
  }

  return isDownstreamServerLayer(node.type);
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

function collectFrontendServerEvidence(match: EndpointMatch): string[] {
  if (match.state === "matched") {
    return [
      "frontend_server_observed: request was captured from the Next.js server runtime",
      "source_derived: endpoint match and backend flow came from ScanResult"
    ];
  }

  if (match.state === "ambiguous") {
    return [
      "frontend_server_observed: request was captured from the Next.js server runtime",
      "not_proven: multiple scanned endpoints matched the request shape"
    ];
  }

  return [
    "frontend_server_observed: request was captured from the Next.js server runtime",
    "not_proven: no scanned endpoint matched the request"
  ];
}

function collectPageSourceEvidence(match: EndpointMatch): string[] {
  if (match.state === "matched") {
    return [
      "source_derived: current page matched scanned frontend source",
      "source_derived: frontend API call matched scanned backend endpoint and flow"
    ];
  }

  if (match.state === "ambiguous") {
    return [
      "source_derived: current page matched scanned frontend source",
      "not_proven: multiple scanned endpoints matched the source API call"
    ];
  }

  return [
    "source_derived: current page matched scanned frontend source",
    "not_proven: no scanned endpoint matched the source API call"
  ];
}

function findPageForPath(path: string, pages: PageStoryboard[]): PageStoryboard | undefined {
  return pages.find((page) => routeMatchesPath(page.route, path));
}

function routeMatchesPath(route: string, path: string): boolean {
  const routeSegments = splitRoutePath(route);
  const pathSegments = splitRoutePath(path);

  if (routeSegments.length !== pathSegments.length) {
    return false;
  }

  return routeSegments.every((routeSegment, index) => {
    const pathSegment = pathSegments[index];

    if (pathSegment === undefined || pathSegment.length === 0) {
      return false;
    }

    if (/^\[[^/[\]]+\]$/.test(routeSegment) || isDynamicPathSegment(routeSegment)) {
      return true;
    }

    return routeSegment === pathSegment;
  });
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

function splitRoutePath(path: string): string[] {
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
