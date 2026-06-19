import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Endpoint, EndpointFlow, NormalizedAnlyxConfig, PageStoryboard } from "@anlyx/core";
import { describe, expect, it } from "vitest";

import { runCli } from "./index.js";
import { runScanCommand, type ScanCommandDependencies } from "./scan-command.js";

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "anlyx-scan-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const endpoint: Endpoint = {
  id: "GET:/api/public/benefits/{id}",
  method: "GET",
  path: "/api/public/benefits/{id}",
  framework: "spring",
  supportLevel: "deep",
  confidence: "high"
};

const flow: EndpointFlow = {
  endpointId: endpoint.id,
  nodes: [
    {
      id: `endpoint:${endpoint.id}`,
      type: "endpoint",
      label: "GET /api/public/benefits/{id}",
      confidence: "high"
    }
  ],
  edges: [],
  mainPath: [`endpoint:${endpoint.id}`],
  subFlows: []
};

const page: PageStoryboard = {
  id: "page:benefit-detail",
  route: "/benefit/[brandSlug]/[benefitSlugWithId]",
  screenshots: [],
  apiCalls: [],
  captureStatus: "pending"
};

const springNextConfig: NormalizedAnlyxConfig = {
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

describe("scan command", () => {
  it("runScanCommand writes report-data.json", async () => {
    await withTempDir(async (dir) => {
      const result = await runScanCommand({
        cwd: dir,
        skipCapture: true,
        dependencies: fakeDependencies({ config: springNextConfig })
      });

      const reportData = JSON.parse(await readFile(result.reportDataPath, "utf8")) as unknown;

      expect(result.reportDataPath).toBe(join(dir, ".anlyx", "report-data.json"));
      expect(reportData).toMatchObject({
        projectName: "Zup",
        schemaVersion: "0.1",
        endpoints: [endpoint],
        flows: [flow],
        pages: [page]
      });
    });
  });

  it("writes endpoints.json / flows.json / pages.json", async () => {
    await withTempDir(async (dir) => {
      const result = await runScanCommand({
        cwd: dir,
        skipCapture: true,
        dependencies: fakeDependencies({ config: springNextConfig })
      });

      expect(JSON.parse(await readFile(result.endpointsPath, "utf8"))).toEqual([endpoint]);
      expect(JSON.parse(await readFile(result.flowsPath, "utf8"))).toEqual([flow]);
      expect(JSON.parse(await readFile(result.pagesPath, "utf8"))).toEqual([page]);
    });
  });

  it("split JSON equals report-data sections", async () => {
    await withTempDir(async (dir) => {
      const result = await runScanCommand({
        cwd: dir,
        skipCapture: true,
        dependencies: fakeDependencies({ config: springNextConfig })
      });

      const reportData = JSON.parse(await readFile(result.reportDataPath, "utf8")) as {
        endpoints: unknown;
        flows: unknown;
        pages: unknown;
      };

      expect(JSON.parse(await readFile(result.endpointsPath, "utf8"))).toEqual(
        reportData.endpoints
      );
      expect(JSON.parse(await readFile(result.flowsPath, "utf8"))).toEqual(reportData.flows);
      expect(JSON.parse(await readFile(result.pagesPath, "utf8"))).toEqual(reportData.pages);
    });
  });

  it("Spring backend path calls Spring adapter surface", async () => {
    await withTempDir(async (dir) => {
      const calls: string[] = [];
      await runScanCommand({
        cwd: dir,
        skipCapture: true,
        dependencies: fakeDependencies({ config: springNextConfig, calls })
      });

      expect(calls).toContain("spring:create");
      expect(calls).toContain("spring:scanEndpoints");
      expect(calls).toContain("spring:scanFlows");
    });
  });

  it("OpenAPI backend path calls OpenAPI adapter surface", async () => {
    await withTempDir(async (dir) => {
      const calls: string[] = [];
      await runScanCommand({
        cwd: dir,
        skipCapture: true,
        dependencies: fakeDependencies({
          config: {
            ...springNextConfig,
            backend: {
              type: "openapi",
              openApiUrl: "http://localhost:8080/openapi.json"
            }
          },
          calls
        })
      });

      expect(calls).toContain("openapi:fetch");
      expect(calls).toContain("openapi:create");
      expect(calls).toContain("openapi:scanEndpoints");
      expect(calls).toContain("openapi:scanFlows");
    });
  });

  it("Next frontend path calls Next adapter surface", async () => {
    await withTempDir(async (dir) => {
      const calls: string[] = [];
      await runScanCommand({
        cwd: dir,
        skipCapture: true,
        dependencies: fakeDependencies({ config: springNextConfig, calls })
      });

      expect(calls).toContain("next:create");
      expect(calls).toContain("next:scanPages");
    });
  });

  it("Manual frontend path calls Manual adapter surface", async () => {
    await withTempDir(async (dir) => {
      const calls: string[] = [];
      await runScanCommand({
        cwd: dir,
        skipCapture: true,
        dependencies: fakeDependencies({
          config: {
            ...springNextConfig,
            frontend: {
              type: "manual",
              baseUrl: "http://localhost:3000",
              urls: ["/"],
              viewport: { width: 1440, height: 900 },
              capture: { mode: "segments", segmentHeight: 900 }
            }
          },
          calls
        })
      });

      expect(calls).toContain("manual:create");
      expect(calls).toContain("manual:scanPages");
    });
  });

  it("--skip-capture skips capture", async () => {
    await withTempDir(async (dir) => {
      const calls: string[] = [];
      await runScanCommand({
        cwd: dir,
        skipCapture: true,
        dependencies: fakeDependencies({ config: springNextConfig, calls })
      });

      expect(calls).not.toContain("capture:create");
      expect(calls).not.toContain("capture:capturePages");
    });
  });

  it("capture result pages are aggregated", async () => {
    await withTempDir(async (dir) => {
      const capturedPage: PageStoryboard = {
        ...page,
        apiCalls: [{ method: "GET", path: "/api/public/benefits/123", status: 200 }],
        captureStatus: "success"
      };
      const result = await runScanCommand({
        cwd: dir,
        dependencies: fakeDependencies({ config: springNextConfig, capturedPages: [capturedPage] })
      });

      const reportData = JSON.parse(await readFile(result.reportDataPath, "utf8")) as {
        pages: PageStoryboard[];
      };

      expect(reportData.pages[0]?.captureStatus).toBe("success");
      expect(reportData.pages[0]?.apiCalls[0]?.endpointId).toBe(endpoint.id);
    });
  });

  it("aggregation issues are returned", async () => {
    await withTempDir(async (dir) => {
      const result = await runScanCommand({
        cwd: dir,
        skipCapture: true,
        dependencies: fakeDependencies({
          config: springNextConfig,
          pages: [
            {
              ...page,
              apiCalls: [{ method: "GET", path: "/api/unknown", status: 404 }]
            }
          ]
        })
      });

      expect(result.issues.map((issue) => issue.code)).toContain("api_call_unmatched");
    });
  });

  it("missing config throws clear error", async () => {
    await withTempDir(async (dir) => {
      await expect(runScanCommand({ cwd: dir })).rejects.toThrow(/Anlyx config file not found/);
    });
  });

  it("invalid backend type fails through config validation", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        join(dir, "anlyx.config.ts"),
        `
export default {
  projectName: "Broken",
  backend: {
    type: "fastapi",
    sourceDir: "./backend"
  },
  frontend: {
    type: "manual",
    baseUrl: "http://localhost:3000",
    urls: ["/"]
  }
};
`
      );

      await expect(runScanCommand({ cwd: dir, skipCapture: true })).rejects.toThrow(
        /Invalid Anlyx config/
      );
    });
  });

  it("CLI scan --help prints usage", async () => {
    const writes: string[] = [];
    const exitCode = await runCli(["scan", "--help"], {
      cwd: "/tmp",
      write: (message) => writes.push(message)
    });

    expect(exitCode).toBe(0);
    expect(writes.join("\n")).toContain("anlyx scan");
    expect(writes.join("\n")).toContain("--skip-capture");
  });

  it('runCli(["scan", "--skip-capture"]) does not run dev server', async () => {
    await withTempDir(async (dir) => {
      const writes: string[] = [];
      const exitCode = await runCli(["scan", "--skip-capture"], {
        cwd: dir,
        write: (message) => writes.push(message),
        dependencies: fakeDependencies({ config: springNextConfig })
      });

      expect(exitCode).toBe(0);
      expect(writes.join("\n")).not.toContain("dev server");
      expect(writes.join("\n")).toContain("Wrote");
    });
  });
});

function fakeDependencies(options: {
  config: NormalizedAnlyxConfig;
  calls?: string[];
  pages?: PageStoryboard[];
  capturedPages?: PageStoryboard[];
}): ScanCommandDependencies {
  const calls = options.calls ?? [];
  const pages = options.pages ?? [page];
  const capturedPages = options.capturedPages ?? pages;

  return {
    async loadConfig() {
      calls.push("config:load");
      return options.config;
    },
    async fetchOpenApiDocument() {
      calls.push("openapi:fetch");
      return { openapi: "3.0.0", paths: {} };
    },
    createSpringBackendAdapter() {
      calls.push("spring:create");
      return backendAdapter("spring", calls);
    },
    createOpenApiBackendAdapter() {
      calls.push("openapi:create");
      return backendAdapter("openapi", calls);
    },
    createNextFrontendAdapter() {
      calls.push("next:create");
      return frontendAdapter("next", calls, pages);
    },
    createManualFrontendAdapter() {
      calls.push("manual:create");
      return frontendAdapter("manual", calls, pages);
    },
    createCaptureAdapter() {
      calls.push("capture:create");
      return {
        name: "capture",
        async capturePages() {
          calls.push("capture:capturePages");
          return capturedPages;
        }
      };
    }
  };
}

function backendAdapter(name: "spring" | "openapi", calls: string[]) {
  return {
    name,
    async scanEndpoints() {
      calls.push(`${name}:scanEndpoints`);
      return [endpoint];
    },
    async scanFlows() {
      calls.push(`${name}:scanFlows`);
      return [flow];
    }
  };
}

function frontendAdapter(name: "next" | "manual", calls: string[], pages: PageStoryboard[]) {
  return {
    name,
    async scanPages() {
      calls.push(`${name}:scanPages`);
      return pages;
    }
  };
}
