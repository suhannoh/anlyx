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

Before capture, a discovered page SHOULD look like:

```json
{
  "id": "page:benefit-detail",
  "route": "/benefit/[brandSlug]/[benefitSlugWithId]",
  "filePath": "frontend/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx",
  "screenshots": [],
  "apiCalls": [],
  "captureStatus": "pending"
}
```

## Limits

v0.1 MUST NOT implement React Router Deep Support or general SPA route inference.
