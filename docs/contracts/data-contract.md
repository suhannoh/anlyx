# Data Contract

## Purpose

This document defines the shared Anlyx data structures. Adapters, capture, UI, fixtures, and acceptance checks MUST use this contract.

Changing this contract requires updating:

1. `docs/contracts/data-contract.md`
2. Fixture expected JSON
3. `docs/acceptance/v0.1-checklist.md`
4. The implementation plan that explains the reason

## Shared Types

```ts
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ConfidenceLevel = "high" | "medium" | "low" | "unknown";

type CaptureStatus = "success" | "failed" | "pending";

type SupportLevel = "basic" | "enhanced" | "deep";

type AnalysisEvidence = {
  label: string;
  detail?: string;
  source?: string;
  confidence?: ConfidenceLevel;
};
```

JSON example:

```json
{
  "confidence": "high",
  "captureStatus": "success",
  "supportLevel": "deep"
}
```

## Endpoint

```ts
type Endpoint = {
  id: string;
  method: HttpMethod;
  path: string;
  framework?: "spring" | "openapi";
  supportLevel: SupportLevel;
  controller?: string;
  handler?: string;
  filePath?: string;
  lineNumber?: number;
  requestSchema?: string;
  responseSchema?: string;
  authRequired?: boolean;
  tags?: string[];
  usedByPageIds?: string[];
  confidence?: ConfidenceLevel;
};
```

JSON example:

```json
{
  "id": "endpoint:get:/api/public/benefits/{id}",
  "method": "GET",
  "path": "/api/public/benefits/{id}",
  "framework": "spring",
  "supportLevel": "deep",
  "controller": "PublicBenefitController",
  "handler": "getDetail",
  "filePath": "backend/src/main/java/com/zup/benefit/PublicBenefitController.java",
  "lineNumber": 24,
  "responseSchema": "BenefitDetailResponse",
  "authRequired": false,
  "tags": ["benefits", "public"],
  "usedByPageIds": ["page:benefit-detail"],
  "confidence": "high"
}
```

## FlowNode

```ts
type FlowNode = {
  id: string;
  type:
    | "page"
    | "endpoint"
    | "controller"
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
    | "unknown";
  label: string;
  filePath?: string;
  lineNumber?: number;
  confidence?: ConfidenceLevel;
  evidence?: AnalysisEvidence[];
  metadata?: Record<string, unknown>;
};
```

JSON example:

```json
{
  "id": "service:PublicBenefitService#getBenefitDetail",
  "type": "service",
  "label": "PublicBenefitService#getBenefitDetail",
  "filePath": "backend/src/main/java/com/zup/benefit/PublicBenefitService.java",
  "lineNumber": 82,
  "confidence": "high",
  "metadata": {
    "className": "PublicBenefitService",
    "methodName": "getBenefitDetail"
  }
}
```

## FlowEdge

```ts
type FlowEdge = {
  id: string;
  from: string;
  to: string;
  kind: "main" | "sub" | "request" | "response" | "db" | "external" | "cache";
  label?: string;
  animated?: boolean;
  confidence?: ConfidenceLevel;
  evidence?: AnalysisEvidence[];
};
```

`kind = "response"` is reserved for future or explicit response edges. v0.1 fixtures are not required to store response edges because Replay Lite derives response movement from `EndpointFlow.mainPath` in reverse order.

JSON example:

```json
{
  "id": "edge:controller-to-service",
  "from": "controller:PublicBenefitController#getDetail",
  "to": "service:PublicBenefitService#getBenefitDetail",
  "kind": "main",
  "label": "calls",
  "animated": false,
  "confidence": "high"
}
```

## AnalysisEvidence

`AnalysisEvidence` explains why Anlyx inferred a node or edge. It is product-facing data, not a debug-only field. The viewer SHOULD show this evidence in the inspector so low-confidence, unknown, and best-effort analysis remains understandable.

JSON example:

```json
{
  "label": "Detected field call",
  "detail": "publicBenefitService.getBenefitDetail(...)",
  "source": "spring-flow-scanner",
  "confidence": "high"
}
```

## SubFlow

```ts
type SubFlow = {
  id: string;
  parentNodeId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  collapsedByDefault: boolean;
};
```

JSON example:

```json
{
  "id": "subflow:benefit-detail-support",
  "parentNodeId": "service:PublicBenefitService#getBenefitDetail",
  "collapsedByDefault": true,
  "nodes": [
    {
      "id": "mapper:BenefitDisplayMapper",
      "type": "mapper",
      "label": "BenefitDisplayMapper",
      "confidence": "high"
    }
  ],
  "edges": [
    {
      "id": "edge:service-to-mapper",
      "from": "service:PublicBenefitService#getBenefitDetail",
      "to": "mapper:BenefitDisplayMapper",
      "kind": "sub",
      "confidence": "high"
    }
  ]
}
```

## EndpointFlow

```ts
type EndpointFlow = {
  endpointId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  mainPath: string[];
  subFlows: SubFlow[];
};
```

`mainPath` MUST represent the one-way request path in display order. Replay Lite MUST use `mainPath` forward for request animation and `mainPath` reversed for response animation. v0.1 implementations SHOULD find existing adjacent edges for rendering; if an explicit reverse edge is absent, the UI MAY render the same edge geometry in reverse.

JSON example:

```json
{
  "endpointId": "endpoint:get:/api/public/benefits/{id}",
  "nodes": [
    {
      "id": "endpoint:get:/api/public/benefits/{id}",
      "type": "endpoint",
      "label": "GET /api/public/benefits/{id}",
      "confidence": "high"
    }
  ],
  "edges": [],
  "mainPath": ["endpoint:get:/api/public/benefits/{id}"],
  "subFlows": []
}
```

## PageStoryboard

```ts
type ScreenshotSegment = {
  segmentIndex: number;
  title?: string;
  path?: string;
  viewport: {
    width: number;
    height: number;
  };
  scrollY: number;
};

type ApiCall = {
  method: HttpMethod;
  path: string;
  endpointId?: string;
  status?: number;
};

type PageStoryboard = {
  id: string;
  route: string;
  filePath?: string;
  screenshots: ScreenshotSegment[];
  apiCalls: ApiCall[];
  captureStatus: CaptureStatus;
  errorMessage?: string;
};
```

`ApiCall` MAY come from a source-derived frontend scan before browser capture, or from browser-observed capture. Source-derived API calls MUST NOT include `status` unless a browser observation later confirms one. Capture MUST merge browser-observed calls with source-derived calls by method and path instead of dropping source-derived server-rendered calls.

JSON example:

```json
{
  "id": "page:benefit-detail",
  "route": "/benefit/[brandSlug]/[benefitSlugWithId]",
  "filePath": "frontend/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx",
  "screenshots": [
    {
      "segmentIndex": 0,
      "title": "Hero / Summary",
      "path": ".anlyx/screenshots/benefit-detail-0.png",
      "viewport": {
        "width": 1440,
        "height": 900
      },
      "scrollY": 0
    }
  ],
  "apiCalls": [
    {
      "method": "GET",
      "path": "/api/public/benefits/{id}",
      "endpointId": "endpoint:get:/api/public/benefits/{id}",
      "status": 200
    }
  ],
  "captureStatus": "success"
}
```

## CaptureResult

```ts
type CaptureResult = {
  pages: PageStoryboard[];
  capturedAt: string;
  viewport: {
    width: number;
    height: number;
  };
  storageStateUsed?: string;
};
```

JSON example:

```json
{
  "capturedAt": "2026-06-19T00:00:00.000Z",
  "viewport": {
    "width": 1440,
    "height": 900
  },
  "storageStateUsed": "./.anlyx/auth-state.json",
  "pages": []
}
```

## ScanResult

```ts
type ScanResult = {
  projectName: string;
  generatedAt: string;
  schemaVersion: "0.1";
  endpoints: Endpoint[];
  flows: EndpointFlow[];
  pages: PageStoryboard[];
  capture?: CaptureResult;
  warnings: {
    code: string;
    message: string;
    targetId?: string;
  }[];
};
```

JSON example:

```json
{
  "projectName": "Zup",
  "generatedAt": "2026-06-19T00:00:00.000Z",
  "schemaVersion": "0.1",
  "endpoints": [],
  "flows": [],
  "pages": [],
  "warnings": [
    {
      "code": "CAPTURE_LOGIN_REQUIRED",
      "message": "Login required",
      "targetId": "page:admin-benefits"
    }
  ]
}
```

## Live Workspace Records

Live Workspace records are derived product data for the local Anlyx runtime. They connect browser runtime events to the current `ScanResult` without changing `ScanResult` itself. A record can come from a browser-observed request, or from a browser page visit mapped to source-derived `PageStoryboard.apiCalls`.

v0.1 Live Workspace records MUST NOT claim production server tracing. Browser request and response facts are live browser evidence. Next.js Server Component fetch facts are development-only frontend server evidence. Controller, Service, Repository, Database, and similar backend layers are source-derived or inferred from scanned data unless a development-only backend bridge explicitly reports spans for the same correlated request.

### BrowserActionEvent

```ts
type BrowserActionEvent = {
  label: string;
  selector?: string;
  text?: string;
  observedAt?: string;
};
```

Action context is optional. When present, the FlowRecord MUST include an `action` layer before the API layer.

### BrowserRequestEvent

```ts
type BrowserRequestEvent = {
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
```

The browser runtime records `fetch` and `XMLHttpRequest` activity from the local app. `url` MAY be absolute. `path` MAY be supplied by the capture runtime when already known. Matching MUST use uppercase HTTP method plus normalized pathname without query string.

`normalizeBrowserEventPath(urlOrPath)` MUST normalize absolute URLs into `pathname + search` for display. Endpoint matching MUST ignore the query string and compare only the pathname. Scanned endpoint paths MAY contain dynamic parameters as `{id}` or `:id`; these parameters match exactly one non-empty request path segment and MUST NOT over-match extra or missing segments.

For same-app API requests, the browser capture runtime SHOULD add `X-Anlyx-Request-Id` with the same value as `BrowserRequestEvent.id`. Development-only backend bridges use this header to report `BackendSpanEvent.requestId` for the same request. The capture runtime SHOULD avoid adding this header to non-API document, RSC, static asset, or Anlyx internal requests.

For same-backend Next.js server fetches, the Next server runtime bridge SHOULD add `X-Anlyx-Request-Id` with the same value as `FrontendServerRequestEvent.id`. This lets a development-only backend bridge attach actual backend spans to a Server Component fetch that is not visible to the browser runtime.

### BrowserPageViewEvent

```ts
type BrowserPageViewEvent = {
  id: string;
  type: "page_view";
  url: string;
  path?: string;
  title?: string;
  observedAt: string;
};
```

The browser runtime records top-level page visits on install and client-side navigation. The local runtime MAY map a page view to the matching `PageStoryboard.route` and create one source-derived `FlowRecord` for each `PageStoryboard.apiCalls` entry.

Page-view-derived records are useful for server-rendered frontend work, such as Next.js Server Components, where the browser sees the page navigation but does not directly observe the server-side API fetch. These records MUST use `source_derived` or `not_proven` evidence for page/API/backend layers, MUST NOT include browser-observed status or duration unless a later browser request observation confirms one, and MUST NOT claim the API request happened in the browser.

### FrontendServerRequestEvent

```ts
type FrontendServerRequestEvent = {
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
```

The Next.js server runtime bridge records `fetch` activity that runs in the local Next.js Node server, including Server Component fetches that the browser runtime cannot observe. These events are development-only local observations. They prove the frontend server made an API request and observed its response status/duration, but they do not prove backend Controller/Service/Repository/Database method execution unless a backend bridge also reports `BackendSpanEvent` data.

The local runtime MAY replace or suppress a page-view-derived source-only record when a matching `FrontendServerRequestEvent` or `BrowserRequestEvent` exists for the same endpoint. This prevents a scanned placeholder from hiding a real local runtime observation.

### Evidence Levels

```ts
type LiveEvidenceLevel =
  | "browser_observed"
  | "frontend_server_observed"
  | "backend_observed"
  | "source_derived"
  | "inferred"
  | "not_proven";
```

- `browser_observed`: Captured directly from the local browser, such as action label, request method/path, status, and duration.
- `frontend_server_observed`: Captured directly from the local Next.js server runtime, such as Server Component `fetch` method/path, status, and duration.
- `backend_observed`: Captured by an explicit development-only backend runtime bridge for the same request correlation id. This level is allowed to represent server-side method timing, but only for spans actually reported by that bridge.
- `source_derived`: Read from scanned project source or generated `ScanResult` data.
- `inferred`: Best-effort analysis from scanned code, naming, confidence, status, or framework behavior.
- `not_proven`: Known only as a possible scanned path after a likely stop point, or unavailable because no endpoint/flow matched.

Evidence text shown in the UI MUST keep these words visible and MUST NOT describe source-derived or inferred backend layers as runtime-executed server traces.

### FlowLayer

```ts
type FlowLayerExecution =
  | "executed"
  | "observed"
  | "inferred"
  | "blocked"
  | "scanned"
  | "not_proven"
  | "unknown";

type FlowLayer = {
  id: string;
  type:
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
```

Layer execution values mean:

- `executed`: Browser-observed or frontend-server-observed action/API/result evidence exists. In v0.1 this MUST NOT be used for backend Controller/Service/Repository/Database layers unless a backend bridge reports spans.
- `observed`: A development-only backend runtime bridge explicitly reported this server-side span for the correlated request. This MUST NOT be inferred from source scanning alone.
- `scanned`: A backend/frontend layer appears in the matched `EndpointFlow.mainPath`, but execution is not runtime-proven.
- `inferred`: A likely decision or framework behavior is inferred from status, confidence, or scanned context.
- `blocked`: The browser-observed response status indicates the request stopped, such as 401, 403, or 409.
- `not_proven`: A scanned downstream layer may exist but is after a likely decision point and cannot be claimed for this request.
- `unknown`: The layer state cannot be determined.

Layer rules:

- Include an `action` layer when `BrowserRequestEvent.action` exists.
- Always include an `api` layer.
- Include a `page` layer before the `api` layer when a `FlowRecord` was derived from `BrowserPageViewEvent` and `PageStoryboard.apiCalls`.
- Use matched `EndpointFlow.mainPath` nodes to derive controller, service, repository, database, and other source-derived layers.
- Always include a `result` layer when building a FlowRecord.
- For 401 and 403 responses, add an `auth` layer immediately after the API layer by default. This represents common framework/security middleware stops, such as Spring Security, before controller execution. Downstream controller, service, repository, and database layers MUST be `not_proven` unless a backend runtime span explicitly proves they ran.
- For 409 responses, add a `decision` layer near the scanned service decision point when available, or after the controller/API fallback. This `decision` layer represents an inferred business-rule stop, not a runtime server trace.
- For 401, 403, and 409 responses, mark the result as `blocked` and mark downstream service, repository, or database layers as `not_proven` when they are after the likely decision point.
- For 2xx responses, mark scanned downstream layers as `scanned` unless backend bridge span evidence exists.

### BackendObservedSpan

```ts
type BackendObservedSpan = {
  id: string;
  parentId?: string;
  type: Exclude<FlowLayer["type"], "action" | "api" | "result">;
  label: string;
  nodeId?: string;
  filePath?: string;
  lineNumber?: number;
  startOffsetMs: number;
  durationMs: number;
  status?: number;
  evidence?: string[];
};
```

`BackendObservedSpan` is reserved for an explicit local development backend bridge, such as a Spring Boot dev instrumentation module. It is separate from `FlowLayer[]` so repeated server calls can be represented without flattening them into one Service or Repository layer.

Example:

```json
{
  "id": "span-service-2",
  "parentId": "span-service-1",
  "type": "service",
  "label": "BenefitPolicyService.checkEligibility",
  "nodeId": "service:BenefitPolicyService#checkEligibility",
  "startOffsetMs": 68,
  "durationMs": 28,
  "evidence": ["backend_observed: method enter/exit captured by Spring dev bridge"]
}
```

Rules:

- `startOffsetMs` is relative to the browser-observed API request start for the same correlated request.
- `durationMs` is the method span duration reported by the backend bridge.
- Repeated calls MUST be preserved as repeated spans, for example Service -> Repository -> Service -> Repository.
- Parent-child relationships SHOULD use `parentId` when the backend bridge can report nesting.
- Workspace Timing SHOULD prefer `backendSpans` over source-derived layer estimates when present.
- When `backendSpans` is absent, UI MUST continue to label backend layers as source-derived, inferred, or not proven.

### BackendSpanEvent

Development-only backend bridges MAY report observed server method spans to the local Anlyx runtime:

```ts
type BackendSpanEvent = {
  type: "backend_spans";
  requestId: string;
  spans: BackendObservedSpan[];
  observedAt?: string;
};
```

Rules:

- `requestId` MUST match the browser request event id used for the same local request.
- Local runtime ingestion MUST accept backend span events before or after the matching browser request event.
- When the matching `FlowRecord` already exists, the runtime MUST merge `spans` into `FlowRecord.backendSpans` and broadcast the updated record.
- When the matching `FlowRecord` does not exist yet, the runtime MAY hold spans pending until the browser request event arrives.
- Backend span ingestion MUST NOT create a standalone flow without a browser-observed request.
- Workspace UI MUST still show browser-observed API/result facts separately from backend-observed method spans.

### FlowRecord

```ts
type FlowRecordMatchState = "matched" | "unmatched" | "ambiguous";
type FlowRecordTrigger = "user_action" | "background";

type FlowRecord = {
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
```

FlowRecord fields are intended to support the Live Workspace Recent events list, Summary, Timing, Diagram, and Evidence Inspector. `trigger = "user_action"` means the browser runtime attached a fresh click or activation context to the request. `trigger = "background"` means either the request was browser-observed without a fresh user action, or the record was source-derived from a page view and scanned frontend API call. Workspace SHOULD keep background records visible in Recent events without stealing the selected main flow from a user-action request. `matchState = "ambiguous"` MUST NOT choose an arbitrary endpoint. `matchState = "unmatched"` MUST keep the browser-observed or source-derived API/result facts visible while leaving endpoint and flow fields unset.

## Report Data

`.anlyx/report-data.json` MUST be a `ScanResult`.

Fixture expected output MUST mirror the same top-level structures:

- `endpoints.json` contains `Endpoint[]`
- `flows.json` contains `EndpointFlow[]`
- `pages.json` contains `PageStoryboard[]`
- `report-data.json` contains `ScanResult`

`report-data.json` is the final aggregate UI output, not a summary. Its `endpoints`, `flows`, and `pages` arrays MUST embed the exact objects from the split expected files without dropping metadata, confidence, file paths, line numbers, or optional fields.
