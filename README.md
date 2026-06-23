<p align="center">
  <img src="./docs/assets/brand/anlyx-logo-card.png" alt="Anlyx" width="460" />
</p>

<h3 align="center">Click the real app. See the backend path.</h3>

<p align="center">
  Action-first flow maps from browser-observed requests to scanned Spring Boot and Next.js code.
</p>

<p align="center">
  <a href="https://suhannoh.github.io/anlyx/"><strong>Live Demo</strong></a>
  ·
  <a href="#quick-start">Quick Start</a>
  ·
  <a href="#how-it-works">How It Works</a>
  ·
  <a href="./README.ko.md">한국어</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/anlyx"><img alt="npm" src="https://img.shields.io/npm/v/anlyx?color=2563eb"></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/github/license/suhannoh/anlyx?color=0f172a"></a>
  <a href="https://github.com/suhannoh/anlyx/actions/workflows/ci.yml"><img alt="ci" src="https://img.shields.io/github/actions/workflow/status/suhannoh/anlyx/ci.yml?branch=main&label=ci"></a>
  <a href="https://suhannoh.github.io/anlyx/"><img alt="demo" src="https://img.shields.io/badge/demo-GitHub%20Pages-16a34a"></a>
</p>

<p align="center">
  <img src="./docs/assets/readme/anlyx-demo.gif" alt="Anlyx demo showing a real app action mapped to a backend flow diagram" />
</p>

## What It Does

Anlyx runs beside your local app and answers the question developers usually chase through browser DevTools, Swagger, backend code, and database models:

```txt
I clicked this button. What API fired, and where does it go?
```

It keeps the host app running on its normal localhost port, observes the API caused by the latest user action, and maps that request to scanned backend evidence:

```txt
User action -> Browser API -> Controller -> Service -> Repository -> Database -> Result
```

The diagram is evidence-aware. Browser requests are live-observed. Controller, Service, Repository, and Database nodes are scanned or inferred from source code unless a future runtime bridge reports them.

## Why Developers Use It

| Instead of...                                                    | Anlyx gives you...                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Digging through DevTools network rows                            | The request caused by your latest click, submit, or key action |
| Jumping between route files, Swagger, services, and repositories | One visual path from frontend action to backend flow           |
| Treating health checks and polling as noise                      | Quiet background traffic that stays out of the main flow       |
| Guessing why a node appeared                                     | Confidence and evidence next to the matched flow               |
| Explaining a project by hand                                     | A local overlay and viewer that make onboarding visual         |

## Quick Start

```bash
npm install -D anlyx
npx anlyx init
npx anlyx dev
```

Then use your app normally. Click a real button or submit a real form. Anlyx opens the real frontend URL, keeps its runtime on port `4777` in the background, and shows the matched backend flow in the injected drawer.

## Support Matrix

| Area                       | v0.1 support                                             |
| -------------------------- | -------------------------------------------------------- |
| Backend deep support       | Spring Boot endpoint and flow scanning                   |
| Frontend deep support      | Next.js App Router page discovery and Playwright capture |
| Basic backend support      | OpenAPI endpoint import                                  |
| Basic frontend support     | Manual URLs for OpenAPI-only projects                    |
| Not deep-supported in v0.1 | FastAPI, Express, NestJS, React Router                   |

## Install In A Real App

Create a config:

```bash
npx anlyx init
```

Minimal `anlyx.config.ts`:

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

For Next.js App Router, add the development-only helper to your root layout:

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

`AnlyxDevOverlay` renders nothing in production. For special local setups, the raw fallback script is:

```html
<script src="http://localhost:4777/_anlyx/overlay.js" defer></script>
```

## How It Works

1. Scans Spring Boot endpoints and best-effort Controller -> Service -> Repository paths.
2. Discovers Next.js App Router pages and dynamic route samples.
3. Captures local page states and browser-visible API calls.
4. Separates user-action requests from background auth, health, and polling traffic.
5. Matches browser requests to scanned endpoint and backend flow data.
6. Renders a React Flow drawer with the main path, support calls, confidence, and evidence.

## UI Surfaces

| Surface             | Purpose                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| Injected overlay    | Primary experience. Use the real app and open Anlyx only when needed.               |
| Flow Drawer         | Shows the latest action request, matched backend flow, recent events, and evidence. |
| Standalone viewer   | Fallback/debug UI at `http://localhost:4777/_anlyx/viewer`.                         |
| README / Pages demo | Generated from the actual `@anlyx/ui` preview component, not a hand-drawn mock.     |

## Demo Assets

The README image and Live Demo are generated from the same React preview surface:

```bash
corepack pnpm docs:readme-demo
corepack pnpm demo:dev
corepack pnpm demo:build
```

`docs:readme-demo` writes `docs/assets/readme/anlyx-demo.gif` and `docs/assets/readme/anlyx-demo.png`. The GitHub Pages demo lives in `apps/demo` and imports the same Flow Drawer preview.

## Capture And Dynamic Routes

Run a static scan first when you want to debug config without opening Playwright:

```bash
npx anlyx scan --skip-capture
```

Run capture after the frontend is available:

```bash
npx anlyx scan
```

For dynamic Next.js routes, provide `sampleParams` so capture can visit concrete URLs:

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

### Package status

Use `anlyx@0.1.3` or newer. Older `0.1.0` and `0.1.1` builds are not recommended. Release packages are verified with pnpm pack dry-runs so workspace dependencies are resolved before publishing.

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

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md), [`SECURITY.md`](./SECURITY.md), the [`Roadmap`](./docs/product/roadmap.md), and the [`Adapter Development Guide`](./docs/adapters/adapter-development.md).

## Release Notes

See [`docs/release/v0.1.3-release-notes.md`](./docs/release/v0.1.3-release-notes.md) and the [GitHub release](https://github.com/suhannoh/anlyx/releases/tag/v0.1.3).
