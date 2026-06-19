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
- `frontend.type = "manual"` MAY be used with OpenAPI-only projects for Basic Support page capture.
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
};
```

Rules:

- Default port SHOULD be `4777`.
- `openBrowser` SHOULD default to `true` for `dev`.

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
    openBrowser: true
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
    port: 4777
  }
});
```
