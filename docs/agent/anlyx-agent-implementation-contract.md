# Anlyx Agent Implementation Contract

This contract defines file locations, folder names, class names, and function
names for Anlyx project glue created by AI coding agents.

It does not define setup steps, Project JSON content rules, or probe timing
semantics. Use the companion docs for those topics:

- Setup workflow: [`anlyx-agent-setup-guide.md`](./anlyx-agent-setup-guide.md)
- Project JSON authoring: [`anlyx-project-json-agent-guide.md`](./anlyx-project-json-agent-guide.md)
- Local measured timing: [`anlyx-local-probe-contract.md`](./anlyx-local-probe-contract.md)

## Root Files

Create or update these files in the user's project root:

```txt
anlyx.config.ts
anlyx.project.json
```

Do not rename these files for framework-specific projects.

## Agent-Owned Folder

Use this folder for Anlyx-only notes, generated helper scripts, and local
producer/probe documentation:

```txt
.anlyx/agent/
```

Recommended layout:

```txt
.anlyx/agent/
  README.md
  setup-notes.md
  producers/
    anlyx-project-producer.<ext>
  probes/
    README.md
```

Rules:

- `.anlyx/agent/setup-notes.md` records what the agent changed.
- `.anlyx/agent/producers/` holds scripts or notes that produce
  `anlyx.project.json`.
- `.anlyx/agent/probes/` holds docs or wrappers for local-only measurement.
- `.anlyx/agent/` may describe project-specific route/request analysis, but
  the generated Project JSON remains the source consumed by Anlyx.
- Do not put production application code under `.anlyx/agent/`.

## Naming Prefix

Any application code added for Anlyx MUST use one of these prefixes:

```txt
Anlyx
AnlyxLocal
AnlyxLocalProbe
```

Do not use generic names such as:

```txt
Tracer
Monitor
MetricsConfig
AppProbe
PerformanceAspect
```

unless they are prefixed with `Anlyx`.

## Spring Boot Names

If the agent adds Spring Boot Anlyx code, place it in a package ending with:

```txt
.anlyx
```

Recommended class names:

```txt
AnlyxLocalProbeConfig
AnlyxRequestTimingInterceptor
AnlyxServiceTimingAspect
AnlyxRepositoryTimingAspect
AnlyxDataSourceTimingProxy
AnlyxSpanReporter
```

Recommended property names:

```txt
anlyx.local-probe.enabled
anlyx.local-probe.endpoint
anlyx.local-probe.project
```

Recommended Spring profile:

```txt
anlyx-local
```

## Node.js / TypeScript Server Names

Recommended file paths:

```txt
src/anlyx/anlyxLocalProbe.ts
src/anlyx/anlyxSpanReporter.ts
src/anlyx/anlyxServerCapture.ts
```

Recommended exported names:

```ts
installAnlyxLocalProbe;
installAnlyxServerCapture;
createAnlyxLocalProbeMiddleware;
createAnlyxSpanReporter;
```

For NestJS:

```txt
AnlyxLocalProbeModule
AnlyxTimingInterceptor
AnlyxSpanReporter
```

Recommended environment variable:

```txt
ANLYX_LOCAL_PROBE
ANLYX_SERVER_CAPTURE
```

For server-render frameworks, keep the glue local and explicit. Examples:

```txt
src/instrumentation.ts
src/anlyx/anlyxServerCapture.ts
server/anlyx/anlyxServerCapture.ts
```

Use the framework's official instrumentation entrypoint when it exists, but keep
Anlyx-specific logic in an Anlyx-prefixed helper when the file would otherwise
become mixed with unrelated application instrumentation.

Next.js examples:

```txt
src/instrumentation.ts
src/anlyx/anlyxNextServerCapture.ts
```

Recommended exported names:

```ts
installAnlyxNextServerCapture;
createAnlyxFetchWrapper;
```

Do not import guessed Anlyx subpaths such as `anlyx/next-server` unless the
installed package explicitly exports them.

## Python Server Names

Recommended file paths:

```txt
anlyx_local_probe.py
anlyx/local_probe.py
```

Recommended names:

```txt
AnlyxLocalProbeMiddleware
AnlyxSpanReporter
install_anlyx_local_probe
```

Recommended environment variable:

```txt
ANLYX_LOCAL_PROBE
```

## Other Framework Names

Use the nearest equivalent local hook, interceptor, middleware, plugin, or
telemetry integration, but keep these names:

```txt
AnlyxLocalProbe*
AnlyxTiming*
AnlyxSpanReporter*
AnlyxServerCapture*
AnlyxFetchWrapper*
```

Agents MUST choose the hook after inspecting the target project. Do not assume
Spring Boot, Next.js, port `3000`, a particular folder layout, or a specific
router. The names above are the stable Anlyx-facing convention; the actual
framework hook is project-specific.

If the project needs page context but no first-party helper exists, create the
smallest local development-only integration with Anlyx-prefixed names. It must
send page context on load and navigation, and it must remain disabled or absent
from production builds.

If the project needs measured timing but no first-party helper exists, create
the smallest local development-only probe with Anlyx-prefixed names. It must be
guarded by a local flag and documented in `.anlyx/agent/setup-notes.md`.

## Producer File Name

If the agent creates a producer script, use:

```txt
.anlyx/agent/producers/anlyx-project-producer.<ext>
```

Examples:

```txt
.anlyx/agent/producers/anlyx-project-producer.ts
.anlyx/agent/producers/anlyx-project-producer.js
.anlyx/agent/producers/anlyx-project-producer.py
```

## Notes File

Whenever the agent changes Anlyx setup or adds project glue, write:

```txt
.anlyx/agent/setup-notes.md
```

Minimum content:

```md
# Anlyx Setup Notes

## Files Changed

## Commands Run

## Local URLs

## Remaining Unknowns
```

The notes MUST also record:

- Which local app URL was used.
- Which page/request surfaces were discovered.
- Which requests were classified as primary.
- Which requests were classified as background.
- Whether server-render, route-handler, loader, middleware, or backend-for-
  frontend traffic required extra capture.
- Whether measured timing was actually proven, and by which local probe.
