# Anlyx

Action-first backend flow maps for Spring Boot and Next.js local apps.

Anlyx connects frontend actions to backend code paths:

```txt
Page action -> API -> Controller -> Service -> Repository -> Database -> Response
```

It runs beside your real local app, keeps background auth, health, polling, framework, and static asset requests quiet, and turns the latest relevant API request into a readable backend flow.

Open the real app on its normal localhost port and keep Anlyx Workspace open separately at `http://localhost:4777/_anlyx/viewer`.

## Quick Start

Pre-publish note: npm publish is paused during v0.1 validation. The commands below are the intended npm flow after release. In this repository, validate with `corepack pnpm build`, `corepack pnpm pack:local`, and `corepack pnpm pack:smoke`.

```bash
npm install -D anlyx
npx anlyx init
npx anlyx dev
```

Before `npx anlyx dev`, edit `anlyx.config.ts`:

- `backend.sourceDir`: Spring Boot source root.
- `frontend.sourceDir`: Next.js app root or source root.
- `frontend.baseUrl`: the local frontend URL.
- `frontend.router`: must be `"app"` for v0.1 Next.js Deep Support.
- `dev.command`: the command Anlyx may run to start your frontend.

## What It Shows

- The real frontend action that triggered the request
- The matched API endpoint
- Browser-observed `fetch`/XHR timing when the request runs in the page
- Next.js server-observed `fetch` timing when the request runs in the local Next server
- Spring Boot controller, service, repository, and JDBC spans when the dev bridge reports them
- Source-matched Spring Boot controller, service, repository, and database context when runtime spans are missing
- Confidence and evidence labels for each observed, source-matched, inferred, or not-proven step
- Background requests separated from the main user-action flow

## Supported In v0.1

Deep Support:

- Spring Boot backend scanning
- Next.js App Router page discovery and capture

Basic Support:

- OpenAPI endpoint import
- Manual frontend URLs
- Raw development capture script injection for non-Next React apps

Anlyx v0.1 is local-development tooling. It does not provide production tracing, production APM, or deep support for FastAPI, Express, NestJS, Django, Flask, or React Router.

## Commands

```bash
npx anlyx init
npx anlyx scan
npx anlyx dev
npx anlyx --help
```

Recommended first run:

```bash
npx anlyx init
# edit anlyx.config.ts
npx anlyx scan --skip-capture
npx anlyx dev
```

`anlyx scan --skip-capture` validates source scanning without opening Playwright. `anlyx dev` opens the Live Workspace at `http://localhost:4777/_anlyx/viewer` and accepts local capture events only from the configured frontend origin.

## Local Development Boundary

Anlyx is local-development tooling. It scans configured local source directories, may add `X-Anlyx-Request-Id` to local API requests for dev-span correlation, and serves a local workspace. Do not expose the Anlyx runtime port publicly, and do not use the capture runtime or Spring development bridge in production.

See the full documentation on GitHub:

https://github.com/suhannoh/anlyx
