# Adapter Development Guide

This guide explains how future framework support should be added to Anlyx without turning the core project into a one-off collection of parsers.

The v0.1 product remains intentionally focused on Spring Boot + Next.js App Router Deep Support. New adapters should start as documented proposals, fixture-backed experiments, or future plugin packages before becoming first-party support.

## Product Boundary

Every adapter must preserve the Anlyx product spine:

```txt
real app user action -> browser-observed request -> matched scanned backend flow
```

Adapters may add scanned evidence, but they must not turn Anlyx into a generic network log or imply runtime tracing when the path is inferred.

## Adapter Types

Backend adapters discover API endpoints and best-effort backend flows:

```ts
type BackendAdapter = {
  name: string;
  scanEndpoints(): Promise<Endpoint[]>;
  scanFlows(endpoints: Endpoint[]): Promise<EndpointFlow[]>;
};
```

Frontend adapters discover pages before capture:

```ts
type FrontendAdapter = {
  name: string;
  scanPages(): Promise<PageStoryboard[]>;
};
```

Capture remains separate:

```ts
type CaptureAdapter = {
  name: string;
  capturePages(pages: PageStoryboard[]): Promise<PageStoryboard[]>;
};
```

The canonical contract is [`docs/contracts/adapter-contract.md`](../contracts/adapter-contract.md).

## Evidence Rules

Adapters must return Data Contract structures only. They must not depend on UI components, React Flow internals, browser state outside capture, or rendering details.

Use explicit confidence:

- `high`: direct route, method, file, or symbol match
- `medium`: likely call relationship from static analysis
- `low`: weak pattern or partial match
- `unknown`: unsupported or ambiguous evidence

When unsure, return visible `unknown`, `pending`, or `failed` data instead of hiding the state.

## Fixture-First Contribution Flow

New adapter work should start with a small fixture project and expected output.

Recommended structure:

```txt
fixtures/<framework-sample>/
  project/
    ...
  expected/
    endpoints.json
    flows.json
    pages.json
    report-data.json
```

A contribution should explain:

1. Which routes/endpoints are expected.
2. Which files or symbols prove those routes.
3. Which backend nodes are high confidence.
4. Which nodes are inferred, unsupported, or unknown.
5. Which user action should become the main flow.

## Backend Expansion Notes

Likely backend adapter paths:

- Express: parse `app.get(...)`, router modules, and middleware patterns.
- NestJS: parse `@Controller`, `@Get`, `@Post`, and dependency-injected providers.
- FastAPI: parse Python decorators such as `@app.get` and router includes.

Each of these needs different route extraction logic, so shared helper APIs should be introduced only after at least two adapters prove the common shape.

## Frontend Expansion Notes

Likely frontend adapter paths:

- React Router: parse `<Route path="...">`, route objects, and `createBrowserRouter`.
- SvelteKit: reuse parts of filesystem-route discovery.
- Nuxt: treat as a future filesystem-route adapter, not a Next.js special case.

Manual frontend URLs remain the recommended Basic Support path until a framework has fixture-backed route discovery.

## Future Plugin API

The current packages are first-party adapters. A future plugin API should allow external packages such as:

```txt
anlyx-adapter-fastapi
anlyx-adapter-nest
@scope/anlyx-adapter-react-router
```

A future `defineAdapter()` API should standardize:

- adapter metadata and supported config
- scan lifecycle
- confidence and evidence reporting
- fixture validation requirements
- package naming and version compatibility

Do not add a public plugin API until the internal adapter contract has enough fixture coverage to stay stable.
