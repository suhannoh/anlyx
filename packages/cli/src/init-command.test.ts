import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createDefaultConfigTemplate, runInitCommand } from "./init-command.js";
import { runCli } from "./index.js";

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "anlyx-init-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("init command", () => {
  it("createDefaultConfigTemplate returns config containing defineConfig", () => {
    const template = createDefaultConfigTemplate();

    expect(template).toContain('import { defineConfig } from "anlyx";');
    expect(template).toContain("export default defineConfig({");
  });

  it("init creates anlyx.config.ts", async () => {
    await withTempDir(async (dir) => {
      const result = await runInitCommand({ cwd: dir });
      const config = await readFile(join(dir, "anlyx.config.ts"), "utf8");

      expect(result).toEqual({
        created: true,
        path: join(dir, "anlyx.config.ts")
      });
      expect(config).toContain("My Anlyx Project");
    });
  });

  it("init does not overwrite existing config by default", async () => {
    await withTempDir(async (dir) => {
      const configPath = join(dir, "anlyx.config.ts");
      await writeFile(configPath, "existing config");

      const result = await runInitCommand({ cwd: dir });
      const config = await readFile(configPath, "utf8");

      expect(result).toEqual({
        created: false,
        path: configPath,
        skipped: true
      });
      expect(config).toBe("existing config");
    });
  });

  it("init overwrites existing config with force", async () => {
    await withTempDir(async (dir) => {
      const configPath = join(dir, "anlyx.config.ts");
      await writeFile(configPath, "existing config");

      const result = await runInitCommand({ cwd: dir, force: true });
      const config = await readFile(configPath, "utf8");

      expect(result).toEqual({
        created: true,
        path: configPath
      });
      expect(config).toContain("defineConfig");
      expect(config).not.toBe("existing config");
    });
  });

  it("generated config includes Spring backend template", () => {
    const template = createDefaultConfigTemplate();

    expect(template).toContain('type: "spring"');
    expect(template).toContain('sourceDir: "./backend/src/main/java"');
    expect(template).toContain("maxMainDepth: 4");
  });

  it("generated config includes Next frontend template", () => {
    const template = createDefaultConfigTemplate();

    expect(template).toContain('type: "next"');
    expect(template).toContain('sourceDir: "./frontend"');
    expect(template).toContain('router: "app"');
  });

  it("generated config includes server default port 4777", () => {
    expect(createDefaultConfigTemplate()).toContain("port: 4777");
  });

  it("CLI help text mentions init", async () => {
    const writes: string[] = [];
    const exitCode = await runCli(["--help"], {
      cwd: "/tmp",
      write: (message) => writes.push(message)
    });

    expect(exitCode).toBe(0);
    expect(writes.join("\n")).toContain("anlyx init");
  });

  it("invalid command reports usage without running dev", async () => {
    await withTempDir(async (dir) => {
      const writes: string[] = [];
      const exitCode = await runCli(["unknown"], {
        cwd: dir,
        write: (message) => writes.push(message)
      });

      expect(exitCode).toBe(1);
      expect(writes.join("\n")).toContain("Unknown command: unknown");
      expect(writes.join("\n")).toContain("Available commands: init, scan");
      await expect(readFile(join(dir, "anlyx.config.ts"), "utf8")).rejects.toThrow();
    });
  });
});
