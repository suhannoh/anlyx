# Config Contract

## Purpose

This document fixes the shape of `anlyx.config.ts` for v0.1. Implementation MUST follow this contract before adding optional fields.

## defineConfig

`defineConfig` SHOULD preserve the provided object and provide TypeScript inference.

```ts
import { defineConfig } from "anlyx";

export default defineConfig({
  projectName: "Zup"
});
```

## Config Type

```ts
type AnlyxConfig = {
  projectName: string;
  backend: SpringBackendConfig | OpenApiBackendConfig;
  frontend: NextFrontendConfig | ManualFrontendConfig;
  server?: ServerConfig;
  dev?: DevConfig;
};
```

## Backend Config

```ts
type SpringBackendConfig = {
  type: "spring";
  sourceDir: string;
  baseUrl?: string;
  openApiUrl?: string;
  actuatorMappingsUrl?: string;
  maxMainDepth?: number;
  maxSubDepth?: number;
  includeUtilities?: boolean;
};

type OpenApiBackendConfig = {
  type: "openapi";
  openApiUrl: string;
  baseUrl?: string;
};
```

Rules:

- `backend.type = "spring"` enables Spring Boot Deep Support.
- `backend.type = "openapi"` enables Basic Support only.
- `maxMainDepth` SHOULD default to `4`.
- `maxSubDepth` SHOULD default to `1`.
- `includeUtilities` SHOULD default to `false`.

## Frontend Config

```ts
type NextFrontendConfig = {
  type: "next";
  sourceDir: string;
  baseUrl: string;
  router: "app";
  viewport?: ViewportConfig;
  capture?: CaptureConfig;
  sampleParams?: Record<string, Record<string, string>>;
};

type ManualFrontendConfig = {
  type: "manual";
  baseUrl: string;
  urls: string[];
  viewport?: ViewportConfig;
  capture?: CaptureConfig;
};
```

Rules:

- `frontend.type = "next"` with `router = "app"` is the v0.1 Deep Support frontend path.
- `frontend.type = "manual"` is handled by `ManualFrontendAdapter`.
- `ManualFrontendAdapter` MUST read `frontend.urls` and create one `PageStoryboard` per URL.
- Manual page storyboards MAY be captured by `CaptureAdapter`.
- OpenAPI-only backend plus manual frontend is the official v0.1 Basic Support path.
- React SPA projects, including Vite, CRA, and custom React Router apps, MUST use `frontend.type = "manual"` in v0.1. This keeps React compatibility through explicit URLs and browser-observed API events without adding React Router Deep Support.
- React Router Deep Support MUST NOT be added in v0.1.

## Capture Config

```ts
type ViewportConfig = {
  width: number;
  height: number;
};

type CaptureConfig = {
  mode?: "segments";
  segmentHeight?: number;
  storageState?: string;
  timeoutMs?: number;
};
```

Rules:

- Default viewport SHOULD be `{ width: 1440, height: 900 }`.
- v0.1 capture mode SHOULD be `segments`.
- `segmentHeight` SHOULD default to the viewport height.
- `storageState` MAY point to a Playwright storage state file.
- Missing authentication MUST become `captureStatus = "failed"` with a clear reason.

## sampleParams

Dynamic routes MUST stay template-level pages. They MUST NOT expand to every data row.

Example:

```ts
sampleParams: {
  "/benefit/[brandSlug]/[benefitSlugWithId]": {
    brandSlug: "starbucks",
    benefitSlugWithId: "birthday-coupon-123"
  }
}
```

Rules:

- If sample params exist, a representative URL MAY be captured.
- If sample params are missing, the page MUST be marked `captureStatus = "pending"`.
- Generated URLs MUST be used only for capture. The canonical route remains the template route.

## Server Config

```ts
type ServerConfig = {
  port?: number;
  openBrowser?: boolean;
  mode?: "inject" | "overlay" | "viewer";
};

type DevConfig = {
  command?: string;
};
```

Rules:

- Default port SHOULD be `4777`.
- `openBrowser` SHOULD default to `true` for `dev`.
- `mode` SHOULD default to `"inject"`.
- `mode = "inject"` MUST keep `frontend.baseUrl` as the real app URL and serve only Anlyx runtime assets and data from the Anlyx server.
- `mode = "inject"` MUST treat the Anlyx server root as a runtime/status surface, not as the primary application URL.
- `mode = "inject"` MUST make `/_anlyx/capture.js` usable from the real app origin.
- `mode = "inject"` MAY keep `/_anlyx/overlay.js` as a compatibility alias, but that alias MUST only install the capture runtime and a small workspace badge. It MUST NOT render a large drawer, modal, or overlay as the primary analysis surface.
- `mode = "overlay"` MAY proxy `frontend.baseUrl` through the Anlyx server and inject the local capture script into HTML responses as a fallback/debug mode.
- `mode = "viewer"` MUST serve the Live Workspace directly at the server root.
- Inject Mode and Overlay Mode MAY keep `/_anlyx/viewer` reachable as a compatibility alias, but that route MUST render the Live Workspace shell instead of the legacy static viewer.
- Anlyx-owned runtime endpoints MUST use the `/_anlyx/*` namespace. `/api/report-data` MAY remain available as a compatibility alias for Workspace report loading.

## Dev Config

Rules:

- `dev.command` MAY define the frontend development command, for example `"npm run dev"`.
- If `dev.command` is present, `anlyx dev` SHOULD check `frontend.baseUrl` first and only start the command when the frontend is not already reachable.
- If `.anlyx/report-data.json` is missing, `anlyx dev` SHOULD run a lightweight scan before starting the runtime.
- Analysis or scan failures MUST be reported clearly and MUST NOT be hidden behind a blank workspace.
- Next.js users SHOULD use `AnlyxDevOverlay` from `anlyx/next` to render the local capture helper during development.
- `AnlyxDevOverlay` MUST render nothing when `NODE_ENV = "production"`.
- Non-Next React users MAY inject `/_anlyx/capture.js` directly or use the compatibility `/_anlyx/overlay.js` helper with a development-only raw script tag or their app's local HTML/template mechanism. This is a supported local-development path for React SPA compatibility and MUST NOT require Next.js.
- Browser-observed API events caused by recent user actions SHOULD become the selected main flow automatically.
- Background events such as page-load effects, health checks, and polling SHOULD be recorded but MUST NOT replace the selected main flow.

## Spring Boot + Next.js Example

```ts
import { defineConfig } from "anlyx";

export default defineConfig({
  projectName: "Zup",

  backend: {
    type: "spring",
    sourceDir: "./backend/src/main/java",
    baseUrl: "http://localhost:8080",
    openApiUrl: "http://localhost:8080/v3/api-docs",
    actuatorMappingsUrl: "http://localhost:8080/actuator/mappings",
    maxMainDepth: 4,
    maxSubDepth: 1,
    includeUtilities: false
  },

  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000",
    router: "app",
    viewport: {
      width: 1440,
      height: 900
    },
    capture: {
      mode: "segments",
      segmentHeight: 900,
      storageState: "./.anlyx/auth-state.json"
    },
    sampleParams: {
      "/benefit/[brandSlug]/[benefitSlugWithId]": {
        brandSlug: "starbucks",
        benefitSlugWithId: "birthday-coupon-123"
      }
    }
  },

  server: {
    port: 4777,
    openBrowser: true,
    mode: "inject"
  },

  dev: {
    command: "npm run dev"
  }
});
```

## OpenAPI-only Example

```ts
import { defineConfig } from "anlyx";

export default defineConfig({
  projectName: "OpenAPI App",

  backend: {
    type: "openapi",
    openApiUrl: "http://localhost:8000/openapi.json",
    baseUrl: "http://localhost:8000"
  },

  frontend: {
    type: "manual",
    baseUrl: "http://localhost:3000",
    urls: ["/", "/dashboard", "/items"]
  },

  server: {
    port: 4777,
    mode: "inject"
  },

  dev: {
    command: "npm run dev"
  }
});
```

In this example, `ManualFrontendAdapter.scanPages()` MUST convert `/`, `/dashboard`, and `/items` into `PageStoryboard[]` entries. Because manual URLs do not identify source files, their `filePath` fields MUST be omitted unless a future explicit mapping feature is added.

## Spring Boot + React SPA Example

```ts
import { defineConfig } from "anlyx";

export default defineConfig({
  projectName: "React SPA",

  backend: {
    type: "spring",
    sourceDir: "./backend/src/main/java",
    baseUrl: "http://localhost:8080"
  },

  frontend: {
    type: "manual",
    baseUrl: "http://localhost:5173",
    urls: ["/", "/dashboard", "/items/123"]
  },

  server: {
    port: 4777,
    mode: "inject"
  },

  dev: {
    command: "npm run dev"
  }
});
```

In this example, Anlyx does not infer React Router source routes. The explicit `urls` provide page/storyboard coverage, while the browser capture runtime observes `fetch` and `XMLHttpRequest` calls caused by real user actions in the running React app.
