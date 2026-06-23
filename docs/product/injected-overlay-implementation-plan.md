# Injected Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public developer experience converge on `npm i -D anlyx`, `npx anlyx init`, and `npx anlyx dev`. The `dev` command keeps the real local app on its own development origin and opens a right-side flow drawer when real app interactions trigger API requests.

**Architecture:** Keep `.anlyx/report-data.json` as the source of truth. Add Inject Mode to the local Anlyx server: it serves `/_anlyx/overlay.js`, CORS-safe report data, and the standalone debug viewer, while the actual frontend remains at `frontend.baseUrl`. The overlay script is injected into the real app during local development, collects browser-observed API events, matches them to scanned endpoints, and renders a compact drawer. The long-term target is for `npx anlyx dev` to own this wiring so users do not manually edit layouts or memorize runtime paths. Reverse-proxy Overlay Mode remains only as fallback/debug behavior because it can change Next.js hydration/auth/theme behavior across origins.

**Tech Stack:** Node 22, Vite middleware for local Anlyx assets, TypeScript, browser `fetch`/`XMLHttpRequest` interception, existing Anlyx `ScanResult`.

**Product Alignment:** This plan is governed by [Product Spine](./product-spine.md). The overlay is not a network log. The drawer must make the user's recent app interaction understandable by separating live browser requests from scanned backend paths and inferred framework server-side fetches.

---

## Files

- Modify `docs/product/prd.md`: describe injected-overlay product direction.
- Modify `docs/product/v0.1-scope-lock.md`: lock Inject Mode as v0.1 primary surface.
- Modify `docs/contracts/config-contract.md`: add `server.mode`.
- Modify `docs/design/screens.md`: define Interactive Overlay, Flow Drawer, API Event Timeline, and Standalone Viewer boundaries.
- Modify `packages/core/src/config.ts`: parse and normalize `server.mode`.
- Modify `packages/core/src/config.test.ts`: verify default and explicit server modes.
- Modify `packages/cli/src/dev-command.ts`: pass frontend base URL and mode into the local server, add Inject Mode runtime endpoints, keep overlay proxy as fallback, preserve standalone viewer.
- Modify `packages/cli/src/dev-command.test.ts`: verify mode/base URL wiring and overlay helpers.
- Modify CLI/dev orchestration so `npx anlyx dev` can become the single command for scan, runtime, frontend launch, and injection wiring.
- Optionally modify `README.md` and `README.ko.md`: explain the new default `anlyx dev` experience after implementation is verified.

## Task 1: Contract and Product Docs

- [x] Update v0.1 scope lock to make Inject Mode primary.
- [x] Update config contract with `server.mode?: "inject" | "overlay" | "viewer"`.
- [x] Rewrite screen contract around Interactive Overlay, Flow Drawer, API Event Timeline, and Standalone Viewer.
- [x] Update PRD overview and goals to remove list-first positioning.

## Task 2: Config Schema

- [x] Add `mode: z.enum(["inject", "overlay", "viewer"]).optional()` to `serverConfigSchema`.
- [x] Add `mode: "inject" | "overlay" | "viewer"` to `NormalizedServerConfig`.
- [x] Default normalized `server.mode` to `"inject"`.
- [x] Add config tests for default inject mode and explicit viewer mode.
- [x] Run targeted config tests with `corepack pnpm test packages/core/src/config.test.ts packages/cli/src/dev-command.test.ts`.

## Task 3: Dev Server Overlay Wiring

- [x] Extend `LocalUiServerOptions` with `frontendBaseUrl` and `mode`.
- [x] Pass `config.frontend.baseUrl` and `config.server.mode` from `runDevCommand`.
- [x] Keep `mode = "viewer"` serving `/viewer.html` at `/`.
- [x] In `mode = "inject"`, serve Anlyx runtime assets and report data without proxying the frontend.
- [x] In `mode = "overlay"`, reserve `/_anlyx/*` for Anlyx runtime assets and data.
- [x] Keep `/api/report-data` as a compatibility alias.
- [x] Add tests proving `runDevCommand` passes `frontendBaseUrl` and `mode`.

## Task 4: Inject Runtime and Keep Proxy as Fallback

- [x] In Inject Mode, do not proxy non-Anlyx requests to `frontend.baseUrl`.
- [x] Serve an absolute local-only script tag for `http://localhost:4777/_anlyx/overlay.js`.
- [x] Keep report data and overlay assets available through CORS-safe Anlyx runtime endpoints.
- [x] Keep reverse-proxy request preservation and HTML injection only in fallback/debug Overlay Mode.
- [x] Return a readable proxy error page when Overlay Mode is used and the frontend server is not reachable.
- [x] Add unit tests for Inject Mode runtime output, script tag generation, and proxy URL building where practical.
- [x] Reclassify reverse proxy behavior as fallback/debug mode after validating that proxy origins can disturb real Next.js app hydration.

## Task 5: Browser Overlay Script

- [x] Serve `/_anlyx/overlay.js`.
- [x] Load report data from the Anlyx runtime origin so the script can run inside the real frontend origin.
- [x] Render a fixed Anlyx button.
- [x] Render a right drawer with recent API events.
- [x] Intercept `fetch`.
- [x] Intercept `XMLHttpRequest`.
- [x] Ignore `/_anlyx/*`, Vite client internals, and static asset-like requests.
- [x] Match API events to scanned endpoints by method and path template.
- [x] Show matched endpoint, main path, support calls, confidence, linked pages, and unmatched states.

## Task 6: Verification and README

- [x] Run targeted tests for core config and CLI dev command.
- [x] Run full `corepack pnpm test`.
- [x] Run `corepack pnpm typecheck`.
- [x] Run `corepack pnpm lint`.
- [x] Run `corepack pnpm build`.
- [x] Start `anlyx dev` locally and smoke test `/_anlyx/report-data`, `/_anlyx/overlay.js`, and `/_anlyx/viewer`.
- [x] Update README files with the new `anlyx dev` default behavior and fallback viewer route.

## Task 7: Three-Command Developer Experience

- [x] Treat `npm i -D anlyx`, `npx anlyx init`, and `npx anlyx dev` as the target public onboarding path.
- [x] Add config for the frontend dev command, for example `dev.command = "npm run dev"` or an equivalent scoped field.
- [x] Make `anlyx dev` detect whether `frontend.baseUrl` is already reachable before starting another frontend process.
- [x] Make `anlyx dev` run scan data when `.anlyx/report-data.json` is missing.
- [ ] Keep analysis failures non-blocking for the real app and surface them inside the Anlyx overlay/runtime page.
- [x] Add a Next.js App Router dev-only injection helper so users do not manually edit layout files with raw script tags.
- [x] Ensure overlay injection is impossible in production builds by default.
- [x] Update CLI output so users see the real app URL first and runtime/debug URLs only as secondary details.
- [x] Add tests for frontend process orchestration and scan fallback.
- [x] Add tests for injection helper output and production exclusion.

## Task 8: Product Spine Alignment

- [x] Add a Product Spine document that defines Anlyx as an interaction-first flow map.
- [x] Link PRD and Scope Lock to the Product Spine.
- [x] Clarify that React SPA compatibility uses manual URLs plus browser-observed requests in v0.1.
- [x] Keep passive session, saved-item preload, page-view, analytics, health, metrics, and polling requests from replacing the selected main flow.
- [x] Add a drawer state for "no primary browser API captured" instead of showing passive account/auth checks as the main result.
- [x] Use scanned/captured page API data to surface current-route page fetch hints as scanned/inferred hints, not live requests.
- [ ] Add acceptance tests that prove React SPA/manual frontend live browser requests still open the main drawer without any Next.js helper.
