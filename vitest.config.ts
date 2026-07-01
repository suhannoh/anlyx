import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@anlyx/adapter-manual": fileURLToPath(
        new URL("./packages/adapter-manual/src/index.ts", import.meta.url)
      ),
      "@anlyx/adapter-next": fileURLToPath(
        new URL("./packages/adapter-next/src/index.ts", import.meta.url)
      ),
      "@anlyx/adapter-openapi": fileURLToPath(
        new URL("./packages/adapter-openapi/src/index.ts", import.meta.url)
      ),
      "@anlyx/adapter-spring": fileURLToPath(
        new URL("./packages/adapter-spring/src/index.ts", import.meta.url)
      ),
      "@anlyx/capture": fileURLToPath(new URL("./packages/capture/src/index.ts", import.meta.url)),
      "@anlyx/core/project-validation": fileURLToPath(
        new URL("./packages/core/src/project-validation.ts", import.meta.url)
      ),
      "@anlyx/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@anlyx/ui": fileURLToPath(new URL("./packages/ui/src/index.ts", import.meta.url))
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"],
    passWithNoTests: false,
    setupFiles: ["./packages/ui/src/test/setup.ts"],
    testTimeout: 10000
  }
});
