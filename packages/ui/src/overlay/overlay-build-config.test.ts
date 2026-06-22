import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

describe("overlay Vite build config", () => {
  it("does not emit development JSX runtime calls into the injected drawer bundle", () => {
    const configPath = fileURLToPath(new URL("../../vite.overlay.config.ts", import.meta.url));
    const config = readFileSync(configPath, "utf8");

    expect(config).toContain('"process.env.NODE_ENV": JSON.stringify("production")');
    expect(config).toContain("jsxDev: false");
  });
});
