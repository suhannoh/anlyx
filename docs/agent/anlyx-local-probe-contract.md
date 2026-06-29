# Anlyx Local Probe Contract

This contract defines how AI coding agents may add local-only runtime probes for
measured timing and runtime evidence.

It does not define setup steps, Project JSON authoring rules, or file/class naming.
Use the companion docs for those topics:

- Setup workflow: [`anlyx-agent-setup-guide.md`](./anlyx-agent-setup-guide.md)
- Project JSON authoring: [`anlyx-project-json-agent-guide.md`](./anlyx-project-json-agent-guide.md)
- File and naming contract: [`anlyx-agent-implementation-contract.md`](./anlyx-agent-implementation-contract.md)

## Probe Purpose

A local probe exists only to collect development-time runtime evidence.

It may measure:

- Request entry and response timing.
- Controller, route, handler, or middleware timing.
- Service method timing.
- Repository or data access timing.
- Database query timing.
- External call timing.

It MUST NOT become production tracing.

Anlyx does not ship a universal probe that can measure every framework's
controller, service, repository, and database layers automatically. The
installing agent MUST analyze the user's stack and create the smallest
framework-appropriate local probe when measured timing is requested.

If the agent does not know how to measure a framework safely, it MUST leave
timing as `unknown` or `estimate` and document the missing probe. It MUST NOT
pretend source-derived layer order is measured timing.

## Activation Rule

The probe MUST be disabled by default and enabled only through an explicit local
development guard.

Allowed guards:

```txt
ANLYX_LOCAL_PROBE=1
```

```txt
@Profile("anlyx-local")
```

```txt
anlyx.local-probe.enabled=true
```

Equivalent local-only flags are allowed when a framework requires them.

For server-render or backend-for-frontend request capture, this flag is also
allowed:

```txt
ANLYX_SERVER_CAPTURE=true
```

Use `ANLYX_SERVER_CAPTURE` for server-side request observation and
`ANLYX_LOCAL_PROBE` for backend layer timing when splitting those concerns makes
the target project clearer.

## Framework Hooks

Use framework-native hooks.

Server-render frontend runtimes:

```txt
Next.js instrumentation.ts
Next.js Route Handlers
Remix loaders/actions
Nuxt/Nitro server plugins
SvelteKit handle/fetch hooks
Astro middleware
server-side fetch or HTTP client wrappers
```

Spring Boot:

```txt
HandlerInterceptor
servlet filter
Spring AOP around services
repository proxy
datasource proxy
Micrometer or OpenTelemetry local spans
```

Node.js servers:

```txt
Express/Fastify/Koa/Hono middleware
route wrappers
fetch or HTTP client wrappers
NestJS interceptors
```

Python servers:

```txt
FastAPI middleware
Flask before_request/after_request
Django middleware
OpenTelemetry local spans
```

Other frameworks:

```txt
middleware
interceptor
plugin
hook
local telemetry API
```

The exact hook is project-specific. The agent must inspect the project before
choosing the hook:

- In a Spring-like backend, AOP/interceptors/proxies may be appropriate.
- In an Express/Fastify/Nest-like backend, middleware/interceptors/wrapped
  handlers may be appropriate.
- In server-render frontend frameworks, instrumentation files, server fetch
  wrappers, route handlers, loaders, or server plugins may be appropriate.
- In ORMs or database clients, query hooks or client wrappers may be
  appropriate.

Do not add a broad global monkey patch when a narrower framework hook exists.
Do not add production dependencies or global telemetry exporters unless the user
explicitly asks for them.

## Request Identity Propagation

Live capture and backend timing can only merge when the same request id travels
through the observed path.

Agents MUST propagate:

```txt
X-Anlyx-Request-Id
```

Rules:

- Browser overlay SHOULD add this header to local project API requests.
- Server-side capture SHOULD add this header to outgoing local backend requests.
- Backend probes SHOULD read this header and use it as `requestId` in
  `backend_spans` events.
- If a request enters the backend without this header, the probe MAY generate a
  local request id, but the agent MUST report that the span cannot be attached
  to the originating browser/server-render request unless a matching request
  event is also sent.
- Never forward this header to third-party services unless the Project JSON
  explicitly models that external system and the user expects it.

## Server-Side Request Event Rule

When a page or route handler performs an important server-side request, the
server-side capture glue MUST send a request event to the Anlyx runtime using
the same ingestion shape as browser requests:

```txt
POST http://127.0.0.1:4777/_anlyx/events/browser-request
```

The event represents an observed local application request even if it was not
made by the browser. Use the real method, path, status, duration, and request id.

Required behavior:

- Capture local project origins and local backend URLs.
- Ignore `/_anlyx/*` runtime URLs.
- Ignore framework assets, hot-reload endpoints, static files, and source maps.
- Ignore third-party origins by default.
- Include query strings when they are part of route identity.
- Redact payloads and headers.

This is required for SSR, server components, route-handler proxies, loaders, and
backend-for-frontend code paths because browser fetch/XHR hooks cannot see those
requests.

## Output Rule

Probe output MUST become one of:

1. Project JSON `measurements` plus linked evidence.
2. A local Anlyx runtime event, when the Anlyx runtime supports that event type.

The local Anlyx runtime supports backend span ingestion at:

```txt
POST http://127.0.0.1:4777/_anlyx/events/backend-spans
```

Use this payload shape:

```json
{
  "type": "backend_spans",
  "requestId": "same-id-as-X-Anlyx-Request-Id",
  "spans": [
    {
      "id": "span:controller",
      "type": "controller",
      "label": "AccountController.deleteSavedBenefit",
      "startOffsetMs": 3,
      "durationMs": 12,
      "evidence": ["runtime.server.span"]
    }
  ]
}
```

Until live ingestion is available in the installed Anlyx package, write the
measured evidence back into `anlyx.project.json` and rerun:

```bash
anlyx validate anlyx.project.json
anlyx import anlyx.project.json
```

Do not assume an older installed Anlyx package accepts probe events. The agent
MUST verify the installed runtime exposes `/_anlyx/events/backend-spans` before
wiring a reporter. If the runtime only exposes a placeholder or empty event
stream, then probe data cannot update the 4777 workspace live yet.

In that case, the correct fallback is:

1. Capture local spans in a redacted file under `.anlyx/agent/` or another
   explicitly local path.
2. Convert those spans into Project JSON `measurements` plus evidence records.
3. Link measurements to pages, requests, flows, or architecture nodes.
4. Run `anlyx validate anlyx.project.json`.
5. Run `anlyx import anlyx.project.json`.

Report this as measured-after-import, not live measured timing.

## Layer Timing Semantics

Runtime spans are inclusive by default.

Example:

```txt
Controller 291 ms
Repository 17 ms
Database 11 ms
```

This means the controller invocation took 291 ms total and may contain nested
repository/database work. It does not mean the request took
`291 + 17 + 11` ms.

Agents MUST:

- Preserve `startOffsetMs` and `durationMs` from the runtime observation when
  available.
- Keep parent/child relationships when the framework exposes them.
- Prefer a complete request tree: request/API -> controller -> service ->
  repository -> database/external call. Missing `parentId` values make layer
  contribution less reliable.
- Label measured spans as runtime-inclusive unless the probe explicitly
  computes exclusive/self time.
- Avoid manufacturing evenly spaced waterfall rows from source order.
- Report missing layer spans honestly. A request span alone does not prove
  controller/service/repository/database timing.

The default 4777 workspace is user-facing, so it should answer one question:
how much of the total request duration was spent by each layer. It may convert
inclusive runtime spans into a layer contribution view for API, Controller,
Service, Repository, Database, and Result. Agents MUST still send the most
accurate raw runtime spans they can, because incomplete parent/child links can
make that contribution view approximate instead of exact.

Controller residual time MUST NOT be treated as confirmed controller business
logic time by default. When a controller span contains child spans and the
remaining elapsed time cannot be proven as controller-only work, viewers SHOULD
display that remainder as `Untracked app` or an equivalent un-attributed
application bucket. This bucket means "measured inside the request, not yet
split into service/repository/database/etc." The installing agent SHOULD improve
the probe or Project JSON when it can identify the missing layer, instead of
manually assigning the remainder to Controller.

## Evidence Kinds

Use these evidence kinds for probe output:

```txt
runtime.server.span
runtime.database.query
telemetry.span
```

Browser-only observations use Project JSON evidence records for browser and
request observations, not this probe contract.

## Measured Timing Rule

Measured timing MUST reference runtime or telemetry evidence:

```json
{
  "kind": "measured",
  "durationMs": 42,
  "evidenceIds": ["ev.runtime.server.account-controller"]
}
```

The referenced evidence MUST represent a real runtime observation.

Measured spans are inclusive by default. A controller/request span SHOULD cover
the elapsed time of the controller invocation, including nested service,
repository, and database work. Agents MUST NOT present child spans as additional
exclusive time unless the probe can explicitly measure exclusive/self time.
If exclusive/self time is not available, do not claim the controller's residual
duration is the controller layer's true cost. Keep it un-attributed until a
framework hook, AOP rule, interceptor, or manual Project JSON evidence proves the
lower layer.

When the target framework can expose nesting, measured spans SHOULD use stable
`parentId` values so Anlyx can compute a clear layer contribution breakdown:

```txt
browser request
└─ controller
   └─ service
      └─ repository
         └─ database
```

If that tree cannot be proven, do not invent it. Emit the measured spans that
are available, mark the setup notes with the limitation, and treat the visible
layer breakdown as lower confidence.

Source-only or agent-only durations MUST use:

```json
{
  "kind": "estimate",
  "reason": "Estimated from source path only; not runtime measured."
}
```

or:

```json
{
  "kind": "unknown"
}
```

## Span Shape

A measured span SHOULD include:

```json
{
  "id": "ev.runtime.server.saved-benefit-service",
  "kind": "runtime.server.span",
  "label": "SavedBenefitService.deleteSavedBenefit",
  "observedAt": "2026-06-26T05:00:00.000Z",
  "detail": "durationMs=42"
}
```

When converting spans into Project JSON, every measurement that represents this
span MUST reference the runtime evidence ID through `evidenceIds`.

## Live Timing Completion Check

Measured timing is live only when all of these are true:

- The real app action triggers a request.
- The request event exists for the actual runtime surface that made the call
  such as browser, server-render, route-handler, or middleware.
- The local probe records backend spans for the same request.
- The spans reach the local Anlyx runtime without manual JSON import.
- The 4777 workspace displays the measured durations for that captured request.

If any condition is missing, report the exact missing condition.

## Redaction Rule

The probe MUST NOT store:

```txt
authorization headers
cookies
session tokens
access tokens
refresh tokens
passwords
real user payloads
full SQL bind values
production records
```

Use shapes, labels, durations, status codes, and redacted summaries instead.

## Safety Rule

Agents MUST:

- Prefer wrapper/interceptor/proxy hooks over invasive business-code edits.
- Avoid changing business logic behavior.
- Keep probe activation explicit.
- Document touched files in `.anlyx/agent/setup-notes.md`.

Agents MUST NOT:

- Add always-on production tracing.
- Add SaaS upload behavior.
- Add hidden network calls outside the local Anlyx runtime.
- Treat source evidence as proof of runtime execution.
