# OpenAPI Adapter Rules

## Purpose

This document defines OpenAPI Basic Support for v0.1. OpenAPI support exists to import endpoint lists and schemas, not to infer framework internals.

## Input

The OpenAPI adapter MUST accept:

- `backend.type = "openapi"`
- `openApiUrl`
- Optional `baseUrl`

The adapter MAY also be reused by Spring projects when an OpenAPI URL is provided, but it MUST NOT replace Spring source analysis for Deep Support.

## Endpoint Creation

For each OpenAPI `paths` entry, the adapter MUST create endpoints using:

- HTTP method
- Path
- Tags
- Request schema name or reference
- Response schema name or reference

Endpoint IDs MUST be stable and based on method and path.

## OpenAPI-only Flow Rules

OpenAPI-only projects MAY show:

```txt
Endpoint
Request Schema
Response Schema
```

OpenAPI-only projects MUST NOT create:

- Controller nodes
- Service nodes
- Repository nodes
- Database nodes
- Internal Main Flow beyond schema-level nodes

## Confidence

OpenAPI-imported endpoint and schema data SHOULD use `confidence = "high"` when the document is valid.

If schema references cannot be resolved, the adapter SHOULD emit warnings and use `confidence = "unknown"` for affected schema nodes.

## Framework Boundary

FastAPI, Express, NestJS, Flask, Django, and other backends are Basic Support only in v0.1 unless a future scope document changes the rule.
