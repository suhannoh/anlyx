# Anlyx

[한국어 문서](./README.ko.md)

Visual flow maps for modern web apps.

Anlyx overlays your real local frontend app and shows which backend endpoint, service, repository, database table, capture state, API call, and static analysis evidence belongs to the interaction you just triggered.

> Status: v0.1.2 patch release preparation. Actual npm publish requires separate approval.

Anlyx `0.1.0` is planned to be deprecated because it was published with unresolved `workspace:*` dependencies. Anlyx `0.1.1` is planned to be deprecated because the published CLI entrypoint can exit before running commands. `0.1.2` is the patch release intended for normal `npm install anlyx` usage after the approved pnpm-based publish.

## What Is Anlyx?

Anlyx answers questions that usually require jumping between routes, Swagger/OpenAPI, backend code, database models, and screenshots:

- Which page calls this API?
- Which controller, service, repository, and database table are involved?
- Which logic is the main request path, and which logic is supporting detail?
- What page state was captured when the API call happened?
- Why did Anlyx infer this node, edge, or confidence level?

## Current Support

Deep Support:

- Spring Boot backend endpoint and flow scanning
- Next.js App Router page discovery and Playwright capture

Basic Support:

- OpenAPI backend endpoint import
- Manual frontend URLs for OpenAPI-only projects

v0.1 is intentionally limited to Spring Boot + Next.js App Router for Deep Support. FastAPI, Express, NestJS, and React Router are not Deep Support targets in v0.1.

## Quick Start

### Install

After the approved 0.1.2 publish:

```bash
npm install -D anlyx@0.1.2
npx anlyx init
npx anlyx dev
```

The target Anlyx developer experience is this three-command path: install, initialize, then run `npx anlyx dev`. The dev command should become the single entrypoint that prepares analysis data, starts the Anlyx runtime, opens the real local frontend, and wires the overlay in development.

Before publish, use the local workspace:

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm --filter anlyx exec anlyx --help
```

### Initialize Config

```bash
npx anlyx init
```

This creates an import-free `anlyx.config.ts`, so projects do not need to import `defineConfig` from `anlyx` just to scan.

### Minimal Config

```ts
export default {
  projectName: "my-app",
  backend: {
    type: "spring",
    sourceDir: "./backend"
  },
  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000"
  },
  server: {
    port: 4777,
    openBrowser: true,
    mode: "inject"
  },
  dev: {
    command: "npm run dev"
  }
};
```

Optional type support is still available if the project can resolve `anlyx` from its dev dependencies:

```ts
import { defineConfig } from "anlyx";

export default defineConfig({
  projectName: "my-app"
});
```

### Monorepo Example

For a Spring Boot backend plus Next.js frontend:

```txt
my-app/
  backend/
    src/main/java/...
  frontend/
    src/app/...
```

Use:

```ts
export default {
  projectName: "my-app",
  backend: {
    type: "spring",
    sourceDir: "./backend"
  },
  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000"
  }
};
```

The Spring adapter resolves `./backend/src/main/java` from `./backend`. The Next adapter resolves `./frontend/app` first, then `./frontend/src/app`.

### First Scan Without Capture

```bash
npx anlyx scan --skip-capture
```

This writes `.anlyx/report-data.json` using static adapter output only. Pages remain `pending` until capture runs.

### Open The Local Overlay

```bash
npx anlyx dev
```

The intended path is that `anlyx dev` is the only command users need during local development. It should detect or start the real frontend, keep the app at `frontend.baseUrl`, start the Anlyx runtime at [http://localhost:4777](http://localhost:4777), and open the real app URL.

In a Next.js App Router app, add the development-only helper to your root layout:

```tsx
import { AnlyxDevOverlay } from "anlyx/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <AnlyxDevOverlay />
      </body>
    </html>
  );
}
```

`AnlyxDevOverlay` renders nothing in production. It only emits the local overlay script outside production builds.

For special setups, the raw fallback script is:

```html
<script src="http://localhost:4777/_anlyx/overlay.js" defer></script>
```

The app still runs on its own origin, so auth, theme, cookies, localStorage, and hydration behave like the normal development environment.

- Click the real app normally.
- When a browser `fetch` or `XMLHttpRequest` API call fires, Anlyx matches it to scanned endpoints.
- The Anlyx button opens a right-side Flow Drawer with the matched request, main path, support calls, confidence, linked pages, and evidence.

The standalone debug viewer remains available at [http://localhost:4777/\_anlyx/viewer](http://localhost:4777/_anlyx/viewer):

- Flow Story: one request-centric workspace that combines the matched frontend page preview, API endpoint, backend flow graph, inspector evidence, calls, metadata, and Replay Lite controls.
- Structure: backend API structure from Endpoint to Controller, Service, Repository, and Database.
- Captures: frontend page storyboard, capture status, API calls, and linked backend endpoints. When `--skip-capture` is used, the page remains `pending` and the viewer keeps a product-style empty storyboard instead of hiding the state.
- Process: request/response replay from the scanned static flow graph, including inferred request path, branch calls, database arrival, and return path. This is not runtime tracing.

Use `server.mode: "viewer"` when you want the standalone viewer directly at `/`. `server.mode: "overlay"` remains available as a fallback/debug proxy mode, but Inject Mode is the default product path.

The v0.1 experience is request-centric: it shows how an endpoint is structured, which frontend pages connect to it, why Anlyx inferred each step, and how the scanned request flow moves through the application.

The viewer keeps React Flow as its graph engine and adds a focused visual system around it:

- `elkjs` for stable left-to-right graph layout with deterministic fallback positions.
- `motion` for active node pulse, replay step transitions, and restrained flow movement.
- `react-resizable-panels` for the resizable/collapsible three-panel shell.
- `lucide-react` for consistent endpoint, service, repository, database, replay, and panel icons.

These libraries improve diagram readability without adding runtime tracing, a Java agent, OpenTelemetry, or a new graph engine.

### Capture Mode

Run the frontend app first, then run scan without `--skip-capture`:

```bash
npx anlyx scan
```

Capture uses the configured `frontend.baseUrl` and writes screenshot/API-call data into `.anlyx/report-data.json`.

### Dynamic Routes And sampleParams

For dynamic Next.js routes, provide sample params so capture can visit a concrete URL:

```ts
export default {
  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000",
    sampleParams: {
      "/benefit/[brandSlug]/[benefitSlugWithId]": {
        brandSlug: "starbucks",
        benefitSlugWithId: "birthday-coupon-123"
      }
    }
  }
};
```

## Troubleshooting

### Cannot find module 'anlyx'

Use the default import-free config generated by `npx anlyx init --force`. Only import `defineConfig` when the target project installs and resolves `anlyx`.

### Next.js App Router directory not found

Set `frontend.sourceDir` to the frontend root or source root. Supported v0.1 shapes include:

```txt
frontend/app
frontend/src/app
frontend/src/app when sourceDir is ./frontend/src
```

### .anlyx/report-data.json not generated

Run:

```bash
npx anlyx scan --skip-capture
```

If it fails, check the config path, backend source directory, frontend app directory, and the terminal error. `anlyx dev` will run a lightweight scan when report data is missing, but `anlyx scan --skip-capture` is still useful for isolating scan problems.

### Pages are pending

This is expected when using `--skip-capture`, manual frontend URLs, or routes without capture data. Pending pages are intentionally visible in the viewer.

### Playwright or capture fails

Confirm the frontend server is running at `frontend.baseUrl`, dynamic routes have `sampleParams`, and login-only pages have a valid capture setup. Use `--skip-capture` for a static scan while debugging capture.

### 0.1.0 workspace dependency issue

Do not use `anlyx@0.1.0`. It was published with unresolved `workspace:*` dependencies. Use `0.1.2` or newer after the approved patch publish.

## Not Included In v0.1

- FastAPI, Express, or NestJS Deep Support
- React Router Deep Support
- Static HTML export
- Mermaid export
- PNG/SVG export
- GitHub Actions report generation
- Java Agent runtime tracing
- LLM flow summaries

## Development Setup

Anlyx uses a pnpm workspace with TypeScript, ESLint, Prettier, and Vitest.

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm format
corepack pnpm -r build
```

Release packaging is checked with local build and pack dry-runs. See [`docs/release/npm-publish-preflight.md`](./docs/release/npm-publish-preflight.md) and [`docs/release/v0.1-release-runbook.md`](./docs/release/v0.1-release-runbook.md).
