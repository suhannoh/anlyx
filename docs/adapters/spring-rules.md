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
