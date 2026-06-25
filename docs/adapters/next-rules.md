# Next.js Adapter Rules

## Purpose

This document defines how Anlyx v0.1 discovers actual Next.js App Router pages.

## v0.1 Priority

Next.js App Router is the only frontend Deep Support target for v0.1.

## Collection Targets

The Next adapter MUST collect:

- `app/**/page.tsx`
- `app/**/page.jsx`
- `app/**/page.ts`
- `app/**/page.js`

Each collected file MUST become one `PageStoryboard`.

## Exclusions

The adapter MUST NOT collect these as pages:

- `app/**/layout.tsx`
- `app/**/loading.tsx`
- `app/**/error.tsx`
- `app/**/not-found.tsx`
- `pages/api/**`
- `components/**`
- `hooks/**`
- `utils/**`
- `tests/**`
- `stories/**`
- Any non-page UI component

## Route Derivation

Rules:

- `app/page.tsx` maps to `/`.
- `app/benefits/page.tsx` maps to `/benefits`.
- `app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx` maps to `/benefit/[brandSlug]/[benefitSlugWithId]`.
- Route groups such as `(marketing)` SHOULD NOT appear in the public route.
- The canonical route MUST remain the template route.

## Dynamic Route Rules

- `[param]` segments MUST be treated as dynamic route parameters.
- Dynamic routes MUST NOT expand by actual data count.
- If `sampleParams` includes values for the route, capture MAY use a representative concrete URL.
- If `sampleParams` is missing, the page MUST be returned with `captureStatus = "pending"`.

## Initial PageStoryboard Output

Before capture, a discovered page SHOULD start with empty screenshots and MAY include source-derived API calls found from the page file or used local helpers:

```json
{
  "id": "page:benefit-detail",
  "route": "/benefit/[brandSlug]/[benefitSlugWithId]",
  "filePath": "frontend/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx",
  "screenshots": [],
  "apiCalls": [
    {
      "method": "GET",
      "path": "/api/public/benefits/{id}"
    }
  ],
  "captureStatus": "pending"
}
```

If no source API call can be determined safely, `apiCalls` MUST remain `[]`.

## Source API Call Detection

The Next adapter MAY statically inspect collected page files and used local named imports to detect source-derived API calls.

Supported v0.1 patterns:

- `fetch("/api/...")`
- `fetch("/api/...", { method: "POST" })`
- `axios.get/post/put/patch/delete("/api/...")`
- `axios({ method, url })` with static string values
- simple helper wrappers such as `getJson("/api/...")`
- `navigator.sendBeacon("/api/...")`, treated as `POST`

Dynamic template path segments SHOULD be converted to endpoint-matchable placeholders such as `/api/public/items/{id}`. Query suffix helpers that cannot be represented safely SHOULD be dropped instead of invented.

## Next Server Runtime Bridge

When a project opts into the development-only Next server runtime bridge, Anlyx MAY observe `fetch` calls that execute in the local Next.js Node runtime. This is required for Server Component data loading where the browser only observes the rendered page and cannot see the underlying server-side API request.

Rules:

- The bridge MUST NOT run in production.
- The bridge MUST wrap the local Next server `fetch` and report only API-like backend calls, not Anlyx internal requests.
- Captured Next server fetches MUST become `FrontendServerRequestEvent` records with `frontend_server_observed` evidence.
- For same-backend API fetches, the bridge SHOULD add `X-Anlyx-Request-Id` with the same value as the `FrontendServerRequestEvent.id` so a development-only backend bridge can correlate backend spans.
- A Next server fetch proves frontend-server request status/duration, but it MUST NOT claim backend Controller, Service, Repository, or Database runtime execution.
- Backend layer timings still require an explicit backend bridge, such as the Spring development span bridge.
- If a source-derived page-view record and a Next server-observed record describe the same endpoint, the runtime SHOULD prefer the observed record in Recent requests.

## Limits

v0.1 MUST NOT implement React Router Deep Support or general SPA route inference.
v0.1 MUST NOT claim source-detected API calls are browser-observed requests.
v0.1 SHOULD leave arbitrary computed URLs, default-import clients, re-export chains, and non-local helpers unknown unless support is explicitly added.
