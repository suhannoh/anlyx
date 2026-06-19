# Spring + Next Sample Fixture Spec

## Purpose

This document defines the v0.1 fixture project shape and expected output. It is a specification only. The actual backend and frontend fixture source code MUST NOT be implemented during the planning-docs phase.

## Fixture Structure

Future implementation MAY create:

```txt
fixtures/
  spring-next-sample/
    backend/
    frontend/
    expected/
      endpoints.json
      flows.json
      pages.json
      report-data.json
```

During the current planning phase, only the `expected/` JSON files are created.

## Project Story

The fixture represents a Zup-like benefit detail flow.

Primary endpoint:

```txt
GET /api/public/benefits/{id}
```

Frontend page:

```txt
app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx
```

Backend Main Flow:

```txt
PublicBenefitController#getDetail
→ PublicBenefitService#getBenefitDetail
→ BenefitRepository#findById
→ benefits table
```

Sub Flow:

```txt
PublicBenefitService#getBenefitDetail
→ BenefitDisplayMapper
→ DateRangeUtil
→ PublicVisibilityPolicy
```

## Required Frontend Pages

- `app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx`
- `app/benefits/page.tsx`
- `app/admin/benefits/page.tsx`

## Required Failure Case

`/admin/benefits` MUST appear with:

```txt
captureStatus: failed
reason: Login required
```

The failed page MUST remain in `pages.json` and `report-data.json`.

## Expected Output Rules

- `expected/endpoints.json` MUST contain `Endpoint[]`.
- `expected/flows.json` MUST contain `EndpointFlow[]`.
- `expected/pages.json` MUST contain `PageStoryboard[]`.
- `expected/report-data.json` MUST contain `ScanResult`.
- JSON MUST match `docs/contracts/data-contract.md`.
- Expected output MUST NOT require actual fixture source files during the planning phase.

## Completion Criteria

An implementation Agent can later create the fixture source code and compare scanner output to these expected files without changing the v0.1 scope.
