# Adapter Contract

## Purpose

Adapters isolate framework-specific scanning and capture from Anlyx Core and UI. Adapters MUST return Data Contract structures only.

Adapters MUST NOT depend on UI components, React Flow, browser state outside capture, or implementation-specific rendering details.

## Required v0.1 Adapters

- `SpringBackendAdapter`
- `OpenApiBackendAdapter`
- `NextFrontendAdapter`
- `CaptureAdapter`

No other framework adapter is required for v0.1.

## Shared Adapter Context

```ts
type AdapterContext = {
  projectRoot: string;
  config: AnlyxConfig;
  logger?: {
    warn(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
  };
};
```

## BackendAdapter

```ts
type BackendAdapter = {
  name: string;
  scanEndpoints(): Promise<Endpoint[]>;
  scanFlows(endpoints: Endpoint[]): Promise<EndpointFlow[]>;
};
```

Rules:

- `scanEndpoints` MUST return stable endpoint IDs.
- `scanFlows` MUST reference endpoint IDs returned by `scanEndpoints`.
- Spring may return internal flow nodes.
- OpenAPI MUST NOT invent Controller, Service, Repository, or Database nodes.

## FrontendAdapter

```ts
type FrontendAdapter = {
  name: string;
  scanPages(): Promise<PageStoryboard[]>;
};
```

Rules:

- Next.js App Router pages MUST be represented as route templates.
- `scanPages` MUST NOT capture screenshots. Capture is handled by `CaptureAdapter`.
- Dynamic routes without `sampleParams` MUST be returned with `captureStatus = "pending"`.

## CaptureAdapter

```ts
type CaptureAdapter = {
  name: string;
  capturePages(pages: PageStoryboard[]): Promise<PageStoryboard[]>;
};
```

Rules:

- Capture MUST preserve page IDs.
- Capture MUST add screenshot segments and observed API calls.
- Capture failures MUST return `captureStatus = "failed"` and `errorMessage`.
- Capture MUST NOT silently drop failed pages.

## SpringBackendAdapter

Input:

- `backend.type = "spring"`
- Spring source directory
- Optional OpenAPI URL
- Optional actuator mappings URL
- Depth settings

Output:

- `Endpoint[]` with Spring metadata
- `EndpointFlow[]` with best-effort Controller, Service, Repository, Database, DTO, and Sub Flow nodes

Limits:

- Static analysis confidence MUST be explicit.
- Unknown or ambiguous calls MUST use `confidence = "low"` or `confidence = "unknown"`.

## OpenApiBackendAdapter

Input:

- `backend.type = "openapi"`
- `openApiUrl`

Output:

- `Endpoint[]`
- Minimal `EndpointFlow[]` containing Endpoint and schema nodes only when useful

Limits:

- MUST remain Basic Support.
- MUST NOT inspect framework source.

## NextFrontendAdapter

Input:

- `frontend.type = "next"`
- `router = "app"`
- `sourceDir`
- `sampleParams`

Output:

- `PageStoryboard[]` with route, file path, pending status, and empty screenshot/API arrays before capture

Limits:

- MUST collect actual page files only.
- MUST NOT collect components, hooks, utility files, stories, tests, or API routes as pages.

## CaptureAdapter

Input:

- Page storyboards
- Frontend base URL
- Viewport
- Segment capture config
- Optional Playwright `storageState`

Output:

- Updated `PageStoryboard[]`

Limits:

- MUST expose failures as data.
- MUST collect network calls during capture.
- MUST NOT require successful authentication for all pages.

## Adapter Composition

The v0.1 scan pipeline SHOULD be:

1. Backend adapter scans endpoints.
2. Backend adapter scans flows.
3. Frontend adapter scans pages.
4. Capture adapter captures pages and API calls.
5. Core links page API calls to endpoint IDs.
6. Core emits `ScanResult`.
