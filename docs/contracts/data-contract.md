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

## Report Data

`.anlyx/report-data.json` MUST be a `ScanResult`.

Fixture expected output MUST mirror the same top-level structures:

- `endpoints.json` contains `Endpoint[]`
- `flows.json` contains `EndpointFlow[]`
- `pages.json` contains `PageStoryboard[]`
- `report-data.json` contains `ScanResult`

`report-data.json` is the final aggregate UI output, not a summary. Its `endpoints`, `flows`, and `pages` arrays MUST embed the exact objects from the split expected files without dropping metadata, confidence, file paths, line numbers, or optional fields.
