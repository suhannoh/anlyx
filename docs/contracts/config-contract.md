# Config Contract

## Purpose

`anlyx.config.ts` is optional local viewer configuration. It does not replace
Project JSON and it must not imply that Anlyx will scan a project by itself.

The primary data source remains:

```txt
anlyx.project.json
```

## Minimal Config

```ts
import { defineConfig } from "anlyx";

export default defineConfig({
  projectName: "My Project",
  server: {
    port: 4777,
    openBrowser: true,
    mode: "viewer"
  }
});
```

## Default Init Template

`npx anlyx init` should generate a scanner-free viewer config:

```ts
export default {
  projectName: "my-project",
  server: {
    port: 4777,
    openBrowser: true,
    mode: "viewer"
  }
};
```

The template must not require Spring, Next.js, OpenAPI, Playwright, or any
framework-specific scanner.

## Server Config

```ts
type ServerConfig = {
  port?: number;
  openBrowser?: boolean;
  mode?: "viewer";
};
```

Rules:

- Default port is `4777`.
- `openBrowser` should default to `true` for `anlyx dev`.
- The default mode is the standalone local viewer.
- The viewer serves Project JSON through `/api/project-data`.
- Legacy report data endpoints may remain for compatibility/debugging, but the
  current viewer must prefer Project JSON.

## Project JSON Resolution

When `anlyx dev` starts, it should look for:

1. `anlyx.project.json`
2. Split files under `.anlyx/project/`

If neither exists, Anlyx should show a clear empty state and instruct the Agent
to author Project JSON. It must not silently fall back to fake demo data.

## Optional Agent Notes

Agents may create project-local notes under:

```txt
.anlyx/agent/
```

These notes help future agents understand how `anlyx.project.json` was authored,
but they are not consumed by the viewer.

## Optional Measurements

Measurements are represented in Project JSON, not in config. Timing remains
disabled when `measurements` is empty.
