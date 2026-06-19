import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { NormalizedAnlyxConfig, ScanResult } from "@anlyx/core";
import { describe, expect, it } from "vitest";

import { getHelpText, runCli } from "./index.js";
import {
  readReportData,
  runDevCommand,
  type DevCommandDependencies,
  type LocalUiServer
} from "./dev-command.js";

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "anlyx-dev-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const scanResult: ScanResult = {
  projectName: "Zup",
  generatedAt: "2026-06-19T00:00:00.000Z",
  schemaVersion: "0.1",
  endpoints: [
    {
      id: "endpoint:get:/api/public/benefits/{id}",
      method: "GET",
      path: "/api/public/benefits/{id}",
      framework: "spring",
      supportLevel: "deep",
      confidence: "high"
    }
  ],
  flows: [
    {
      endpointId: "endpoint:get:/api/public/benefits/{id}",
      nodes: [
        {
          id: "endpoint:get:/api/public/benefits/{id}",
          type: "endpoint",
          label: "GET /api/public/benefits/{id}",
          confidence: "high"
        }
      ],
      edges: [],
      mainPath: ["endpoint:get:/api/public/benefits/{id}"],
      subFlows: []
    }
  ],
  warnings: [],
  pages: [
    {
      id: "page:manual:root",
      route: "/",
      screenshots: [],
      apiCalls: [],
      captureStatus: "pending"
    }
  ]
};

const config: NormalizedAnlyxConfig = {
  projectName: "Zup",
  backend: {
    type: "spring",
    sourceDir: "./backend/src/main/java",
    maxMainDepth: 4,
    maxSubDepth: 1,
    includeUtilities: false
  },
  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000",
    router: "app",
    viewport: { width: 1440, height: 900 },
    capture: { mode: "segments", segmentHeight: 900 }
  },
  server: {
    port: 4777,
    openBrowser: true
  }
};

describe("dev command", () => {
  it("reads valid report-data.json", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);

      const seen: { reportData?: ScanResult } = {};
      const result = await runDevCommand({
        cwd: dir,
        open: false,
        dependencies: fakeDependencies({
          createLocalUiServer({ reportData, port }) {
            seen.reportData = reportData;
            return Promise.resolve({ url: `http://localhost:${port}` });
          }
        })
      });

      expect(result.reportDataPath).toBe(join(dir, ".anlyx", "report-data.json"));
      expect(seen.reportData).toEqual(scanResult);
    });
  });

  it('missing report-data throws clear "Run anlyx scan first" error', async () => {
    await withTempDir(async (dir) => {
      await expect(runDevCommand({ cwd: dir, dependencies: fakeDependencies() })).rejects.toThrow(
        /Run "anlyx scan" first/
      );
    });
  });

  it("invalid JSON throws clear error", async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, ".anlyx"), { recursive: true });
      await writeFile(join(dir, ".anlyx", "report-data.json"), "{", "utf8");

      await expect(runDevCommand({ cwd: dir, dependencies: fakeDependencies() })).rejects.toThrow(
        /Failed to parse Anlyx report data JSON/
      );
    });
  });

  it("invalid ScanResult schema throws clear error", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, { ...scanResult, schemaVersion: "2.0" });

      await expect(runDevCommand({ cwd: dir, dependencies: fakeDependencies() })).rejects.toThrow(
        /Invalid Anlyx report data/
      );
    });
  });

  it("port priority uses CLI --port over config.server.port", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);
      const ports: number[] = [];

      const result = await runDevCommand({
        cwd: dir,
        port: 5999,
        open: false,
        dependencies: fakeDependencies({
          config: { ...config, server: { port: 4888, openBrowser: true } },
          createLocalUiServer({ port }) {
            ports.push(port);
            return Promise.resolve({ url: `http://localhost:${port}` });
          }
        })
      });

      expect(ports).toEqual([5999]);
      expect(result.port).toBe(5999);
    });
  });

  it("default port is 4777", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);
      const ports: number[] = [];

      const result = await runDevCommand({
        cwd: dir,
        open: false,
        dependencies: fakeDependencies({
          createLocalUiServer({ port }) {
            ports.push(port);
            return Promise.resolve({ url: `http://localhost:${port}` });
          }
        })
      });

      expect(ports).toEqual([4777]);
      expect(result.port).toBe(4777);
    });
  });

  it("--no-open disables browser opening", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);
      let opened = false;

      await runDevCommand({
        cwd: dir,
        open: false,
        dependencies: fakeDependencies({
          openBrowser() {
            opened = true;
          }
        })
      });

      expect(opened).toBe(false);
    });
  });

  it('runCli(["dev", "--no-open"]) calls dev command path', async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);
      const writes: string[] = [];
      const ports: number[] = [];

      const exitCode = await runCli(["dev", "--no-open"], {
        cwd: dir,
        write: (message) => writes.push(message),
        dependencies: fakeDependencies({
          createLocalUiServer({ port }) {
            ports.push(port);
            return Promise.resolve({ url: `http://localhost:${port}` });
          }
        })
      });

      expect(exitCode).toBe(0);
      expect(ports).toEqual([4777]);
      expect(writes.join("\n")).toContain("Started Anlyx UI at http://localhost:4777");
    });
  });

  it("help text includes init, scan, and dev", () => {
    const help = getHelpText();

    expect(help).toContain("anlyx init");
    expect(help).toContain("anlyx scan");
    expect(help).toContain("anlyx dev");
  });

  it("invalid command reports clear usage without running scan/dev", async () => {
    await withTempDir(async (dir) => {
      const writes: string[] = [];
      const exitCode = await runCli(["unknown"], {
        cwd: dir,
        write: (message) => writes.push(message),
        dependencies: fakeDependencies()
      });

      expect(exitCode).toBe(1);
      expect(writes.join("\n")).toContain("Unknown command: unknown");
      expect(writes.join("\n")).toContain("Available commands: init, scan, dev");
    });
  });

  it("readReportData preserves failed and pending pages", async () => {
    await withTempDir(async (dir) => {
      const data: ScanResult = {
        ...scanResult,
        pages: [
          { ...scanResult.pages[0]!, captureStatus: "failed", errorMessage: "Login required" },
          {
            ...scanResult.pages[0]!,
            id: "page:pending",
            route: "/pending",
            captureStatus: "pending"
          }
        ]
      };
      await writeReportData(dir, data);

      await expect(readReportData(join(dir, ".anlyx", "report-data.json"))).resolves.toEqual(data);
    });
  });
});

async function writeReportData(dir: string, data: unknown): Promise<void> {
  await mkdir(join(dir, ".anlyx"), { recursive: true });
  await writeFile(join(dir, ".anlyx", "report-data.json"), JSON.stringify(data), "utf8");
}

function fakeDependencies(
  overrides: Partial<DevCommandDependencies> & { config?: NormalizedAnlyxConfig } = {}
): DevCommandDependencies {
  const { config: overrideConfig, ...dependencyOverrides } = overrides;

  return {
    async loadConfig() {
      return overrideConfig ?? config;
    },
    async createLocalUiServer({ port }) {
      return { url: `http://localhost:${port}` } satisfies LocalUiServer;
    },
    async openBrowser() {
      return undefined;
    },
    ...dependencyOverrides
  };
}
