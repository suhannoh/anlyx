# Spring Boot Adapter Rules

## Purpose

This document defines the v0.1 Spring Boot analysis rules. The adapter MUST be best-effort and confidence-aware.

## Collection Targets

The Spring adapter MUST collect:

- `@RestController`
- `@Controller`
- `@RequestMapping`
- `@GetMapping`
- `@PostMapping`
- `@PutMapping`
- `@PatchMapping`
- `@DeleteMapping`
- `@Service`
- `@Repository`
- `@Entity`
- `@Table`

## Endpoint Extraction

- Class-level `@RequestMapping` paths MUST be combined with method-level mapping paths.
- HTTP method specific annotations MUST define the endpoint method.
- Method-level `@RequestMapping(method = ...)` MAY define the endpoint method.
- Handler method name MUST use the Java method name.
- Controller name MUST use the class name.
- File path and line number SHOULD be captured when available.

## DTO Inference

- Request DTO SHOULD be inferred from `@RequestBody`, request parameter objects, or OpenAPI metadata when available.
- Response DTO SHOULD be inferred from method return type, `ResponseEntity<T>`, or OpenAPI metadata when available.
- If DTO inference is ambiguous, omit the field or use a low-confidence DTO node. Do not invent names.

## Flow Inference

Main Flow SHOULD follow:

```txt
Endpoint
→ Controller handler
→ Service method(s)
→ Repository method
→ Entity / Database Table
```

Rules:

- Controller to Service calls SHOULD be inferred from direct method calls on injected fields or constructor parameters.
- Controller handler methods MAY follow same-class helper/private method calls when searching for the primary persistence path.
- Controller helper methods MAY produce a direct Controller → Repository → Database path when no Service layer owns the persistence call.
- Service to Service calls SHOULD be followed while looking for the primary persistence path, within the configured main-flow depth limit.
- Service helper calls that do not lead to Repository/Database SHOULD remain outside Main Flow and MAY appear as supporting calls.
- Service to Repository calls SHOULD be inferred from direct repository method calls.
- Repository to Entity SHOULD be inferred from repository generic type or naming.
- Entity to DB Table MUST prefer `@Table(name = "...")`.
- If `@Table` is missing, table name MAY be inferred from Entity class name.
- Repeated or cyclic class-method calls MUST be stopped.
- The adapter MUST remain honest about evidence. These backend nodes are scanned or inferred from source code, not proof of runtime execution.

## Sub Flow Classification

Sub Flow nodes SHOULD include:

- Mapper
- Validator
- Utility
- Cache
- External API
- Secondary Service

Sub Flow MUST be collapsed by default in UI data. Utility calls SHOULD be excluded unless configured.

## Depth Limits

Default limits:

- Main Flow depth: `5`
- Sub Flow depth: `1`
- Utility depth: `0` unless `includeUtilities = true`

The adapter MUST stop on cycles and repeated class-method pairs.

## Confidence Rules

- `high`: Direct concrete class call or a single clear implementation.
- `medium`: Interface type with exactly one discovered implementation.
- `low`: Multiple implementations or likely dynamic injection.
- `unknown`: Runtime information is required or analysis failed.

Edges with inferred or ambiguous calls SHOULD use dashed styling in the UI through `confidence`.

## Limits

v0.1 MUST NOT fully trace:

- Spring DI edge cases
- AOP proxy behavior
- Runtime-generated beans
- `@Transactional` execution semantics
- `@Cacheable` execution semantics
- `@Async` execution semantics
- Runtime tracing

When the adapter cannot analyze a section, it MUST return an `unknown` node or warning instead of hiding the gap.

## Development Runtime Bridge

The Spring adapter remains a source scanner. A local development bridge MAY be installed separately while running `anlyx dev`, but bridge-reported spans are runtime input to the Live Workspace, not adapter scan output.

- Browser capture and the Next server runtime bridge MAY add `X-Anlyx-Request-Id` to same-app or same-backend API requests so a local Spring bridge can correlate backend spans to the observed request.
- A development bridge MAY POST `BackendSpanEvent` payloads to `/_anlyx/backend-spans`.
- Bridge-reported spans MAY be shown as backend-observed timing in the Workspace.
- Source-scanned nodes MUST remain `scanned`, `inferred`, or `not proven` unless a bridge explicitly reports the matching span.
- The development bridge MUST be local/dev-only and MUST NOT be described as Java Agent runtime tracing or production tracing.

### Spring Security Ordering

Spring Security filters can reject a request before Spring MVC selects a controller. For protected routes such as `/api/account/**`, a `401` or `403` may therefore be a pre-controller security decision.

Anlyx MUST NOT imply that a controller, service, repository, or database layer executed when the only evidence is a pre-controller security response. In that case:

- the response/result MAY be shown as browser-observed or frontend-server-observed;
- security/auth may be shown as inferred or source-derived when rules are available;
- downstream controller/service/repository/database nodes MUST stay source-matched or not-proven unless the bridge reports matching backend spans.

If a local Spring bridge is installed, configure local CORS to allow `X-Anlyx-Request-Id` from the local frontend origin so Anlyx can correlate browser or Next server events with backend spans. Do not allow this header broadly in production.
