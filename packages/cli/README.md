# Anlyx

Action-first backend flow maps for Spring Boot and Next.js local apps.

Anlyx connects frontend actions to backend code paths:

```txt
Page action -> API -> Controller -> Service -> Repository -> Database -> Response
```

It runs beside your real local app, keeps background auth, health, and polling requests quiet, and turns the latest user-triggered API request into a readable backend flow.

## Quick Start

```bash
npm install -D anlyx
npx anlyx init
npx anlyx dev
```

## What It Shows

- The real frontend action that triggered the request
- The matched API endpoint
- Spring Boot controller, service, repository, and database path
- Next.js page context and capture state
- Confidence and analysis evidence for each inferred step
- Background requests separated from the main user-action flow

## Supported In v0.1

Deep Support:

- Spring Boot backend scanning
- Next.js App Router page discovery and capture

Basic Support:

- OpenAPI endpoint import
- Manual frontend URLs
- Raw overlay script injection for non-Next React apps

## Commands

```bash
npx anlyx init
npx anlyx scan
npx anlyx dev
npx anlyx --help
```

See the full documentation on GitHub:

https://github.com/suhannoh/anlyx
