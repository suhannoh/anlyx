import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { findConfigFile, loadConfig } from "./config-loader.js";

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "anlyx-config-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const validConfigSource = `
export default {
  projectName: "Zup",
  backend: {
    type: "spring",
    sourceDir: "./backend/src/main/java"
  },
  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000",
    router: "app"
  }
};
`;

describe("config loader", () => {
  it("findConfigFile finds anlyx.config.ts", async () => {
    await withTempDir(async (dir) => {
      const configPath = join(dir, "anlyx.config.ts");
      await writeFile(configPath, validConfigSource);

      await expect(findConfigFile(dir)).resolves.toBe(configPath);
    });
  });

  it("findConfigFile returns null when config does not exist", async () => {
    await withTempDir(async (dir) => {
      await expect(findConfigFile(dir)).resolves.toBeNull();
    });
  });

  it("loadConfig loads valid config file", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "anlyx.config.ts"), validConfigSource);

      const config = await loadConfig({ cwd: dir });

      expect(config.projectName).toBe("Zup");
      expect(config.server.port).toBe(4777);
      expect(config.frontend.viewport).toEqual({ width: 1440, height: 900 });
    });
  });

  it("loadConfig throws clear error when config file is missing", async () => {
    await withTempDir(async (dir) => {
      await expect(loadConfig({ cwd: dir })).rejects.toThrow(/Anlyx config file not found/);
    });
  });

  it("loadConfig throws clear error when validation fails", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        join(dir, "anlyx.config.ts"),
        `
export default {
  projectName: "Broken",
  backend: {
    type: "spring"
  },
  frontend: {
    type: "manual",
    baseUrl: "http://localhost:3000"
  }
};
`
      );

      await expect(loadConfig({ cwd: dir })).rejects.toThrow(/backend\.sourceDir/);
    });
  });
});
