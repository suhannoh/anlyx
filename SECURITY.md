# Security Policy

## Supported Versions

Security fixes target the latest validated Anlyx version. npm publishing is currently paused during v0.1 validation, so security fixes are applied on `main` until the first public npm release.

## Reporting a Vulnerability

Please do not open a public issue for sensitive security reports.

Use GitHub private vulnerability reporting when available, or contact the maintainer through the repository profile.

Include:

- Anlyx version
- Affected command or package
- Reproduction steps
- Impact
- Any suggested mitigation

## Local Development Boundary

Anlyx is designed for local development. It scans configured local source directories, can visit `frontend.baseUrl` during capture, and serves a local runtime for the Live Workspace and optional capture badge.

Do not run Anlyx against untrusted projects or configs without reviewing the config first.

By default, Anlyx reports events to the local runtime configured in `anlyx.config.ts`. The project source, request paths, matched code labels, and development-only timing spans are not intended to be uploaded to an external Anlyx service.

Development bridges can expose sensitive local context in the workspace, including route paths, Java class and method names, table names, compact SQL labels, and request status/timing. Do not expose the Anlyx runtime port to public networks, and do not use the development bridges in production.

Anlyx may add an `X-Anlyx-Request-Id` header to same-app or same-backend local API requests so development bridges can correlate spans. Review this behavior before using Anlyx with any service outside your local development boundary.

## Data Exposure Checklist

| Surface | Local data involved | Boundary |
| --- | --- | --- |
| Source scanner | File paths, route names, Java class/method names, table names | Read from configured local directories only |
| Browser capture | Local request method/path/status/duration and click labels | Posted to the local Anlyx runtime |
| Next server bridge | Local Next.js server `fetch` path/status/duration | Posted to the local Anlyx runtime |
| Spring dev bridge | Controller/service/repository/JDBC span labels and timing | Posted to the local Anlyx runtime |
| Live Workspace | Aggregated local evidence and timing | Served from the local Anlyx runtime |

The local runtime restricts Anlyx event ingest to the configured local frontend origin and the Anlyx localhost origin. Treat the runtime port as developer-only infrastructure, not as a shared network service.
