# Adapter Contract

## Purpose

Adapters isolate framework-specific scanning and capture from Anlyx Core and UI. Adapters MUST return Data Contract structures only.

Adapters MUST NOT depend on UI components, React Flow, browser state outside capture, or implementation-specific rendering details.

## Required v0.1 Adapters

- `SpringBackendAdapter`
- `OpenApiBackendAdapter`
- `NextFrontendAdapter`
- `ManualFrontendAdapter`
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
- Manual frontend URLs MUST be represented as explicit page routes.
- `scanPages` MUST NOT capture screenshots. Capture is handled by `CaptureAdapter`.
- `scanPages` MAY include source-derived API calls when a Deep Support frontend adapter can find them statically.
- Dynamic routes without `sampleParams` MUST be returned with `captureStatus = "pending"`.
- The Core scan pipeline MUST consume `FrontendAdapter.scanPages()` results regardless of frontend type.

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
- Capture MUST preserve existing source-derived `apiCalls` and merge browser-observed calls by method and path when both are available.
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

- `PageStoryboard[]` with route, file path, pending status, empty screenshot arrays, and source-derived API calls when detected

Limits:

- MUST collect actual page files only.
- MUST NOT collect components, hooks, utility files, stories, tests, or API routes as pages.
- MAY statically inspect the page file and used local named imports to find `fetch`, common `axios` calls, `navigator.sendBeacon`, and simple API helper wrappers.
- MUST NOT claim source-derived API calls are browser-observed requests.
- MUST leave `apiCalls` empty when no source API call can be determined.
- MUST prefer an unknown or missing API call over inventing a path from arbitrary computed values.

## ManualFrontendAdapter

Input:

- `frontend.type = "manual"`
- `baseUrl`
- `urls`
- Optional `sourceDir`
- Optional `routeFiles`
- Optional viewport and capture settings

Output:

- `PageStoryboard[]` created from `frontend.urls`, optionally enriched with source-derived API calls from `routeFiles`

Rules:

- Each manual URL MUST become one `PageStoryboard`.
- `route` MUST use the configured URL path.
- `filePath` MUST remain omitted.
- `screenshots` MUST start as an empty array before capture.
- `apiCalls` MUST start as an empty array unless `sourceDir` and `routeFiles` explicitly map the route to React source files.
- `captureStatus` SHOULD start as `pending` before capture.
- Manual URL pages MAY be passed to `CaptureAdapter`.
- OpenAPI-only backend plus manual frontend is the official v0.1 Basic Support path.
- Spring Boot plus a React SPA frontend, such as Vite, CRA, or a custom React Router app, MAY use ManualFrontendAdapter in v0.1. The adapter provides explicit page URLs, optional source-derived API calls for configured route files, and browser-observed capture requests as the live interaction signal.

Limits:

- MUST NOT infer frontend source files without explicit `routeFiles`.
- MUST NOT provide React Router or general SPA route discovery.

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
3. Frontend adapter scans pages. For `frontend.type = "manual"`, this means `ManualFrontendAdapter.scanPages()` converts `frontend.urls` into `PageStoryboard[]`.
4. Capture adapter captures pages and API calls.
5. Core links page API calls to endpoint IDs.
6. Core emits `ScanResult`.
