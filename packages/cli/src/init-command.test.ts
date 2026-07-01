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
  it("createDefaultConfigTemplate returns an import-free config object", () => {
    const template = createDefaultConfigTemplate();

    expect(template).not.toContain("defineConfig");
    expect(template).not.toContain('from "anlyx"');
    expect(template).toContain("export default {");
  });

  it("init creates anlyx.config.ts", async () => {
    await withTempDir(async (dir) => {
      const result = await runInitCommand({ cwd: dir });
      const config = await readFile(join(dir, "anlyx.config.ts"), "utf8");

      expect(result).toEqual({
        created: true,
        path: join(dir, "anlyx.config.ts")
      });
      expect(config).toContain("my-app");
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
      expect(config).toContain("export default {");
      expect(config).not.toBe("existing config");
    });
  });

  it("generated config uses Flow JSON viewer defaults instead of scanner templates", () => {
    const template = createDefaultConfigTemplate();

    expect(template).toContain('projectName: "my-app"');
    expect(template).toContain('type: "openapi"');
    expect(template).toContain('openApiUrl: "about:blank"');
    expect(template).toContain('type: "manual"');
    expect(template).toContain("urls: []");
    expect(template).toContain('mode: "viewer"');
    expect(template).not.toContain('type: "spring"');
    expect(template).not.toContain('type: "next"');
    expect(template).not.toContain("sampleParams");
    expect(template).not.toContain("capture");
  });

  it("generated config includes server default port 4777", () => {
    expect(createDefaultConfigTemplate()).toContain("port: 4777");
  });

  it("generated config does not start a frontend dev command by default", () => {
    expect(createDefaultConfigTemplate()).not.toContain('command: "npm run dev"');
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
      expect(writes.join("\n")).toContain("Available commands: init, prompt, validate, import, dev");
      await expect(readFile(join(dir, "anlyx.config.ts"), "utf8")).rejects.toThrow();
    });
  });

  it("prompt refresh prints the agent shortcut prompt", async () => {
    const writes: string[] = [];
    const exitCode = await runCli(["prompt", "refresh"], {
      cwd: "/tmp",
      write: (message) => writes.push(message)
    });

    expect(exitCode).toBe(0);
    expect(writes.join("\n")).toContain("anlyx refresh");
    expect(writes.join("\n")).toContain("Preserve stable ids");
    expect(writes.join("\n")).toContain("npx anlyx validate anlyx.project.json");
  });
});
