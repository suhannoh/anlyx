import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventEmitter } from "node:events";

import type {
  BrowserPageViewEvent,
  BrowserRequestEvent,
  FrontendServerRequestEvent,
  NormalizedAnlyxConfig,
  ScanResult
} from "@anlyx/core";
import { describe, expect, it } from "vitest";

import { getHelpText, runCli } from "./index.js";
import {
  buildProxyTargetUrl,
  createAnlyxRuntimeMiddleware,
  createLocalFlowStore,
  getOverlayClientScript,
  getOverlayScriptTag,
  injectOverlayScript,
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
    },
    {
      id: "endpoint:get:/api/public/home",
      method: "GET",
      path: "/api/public/home",
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
    },
    {
      endpointId: "endpoint:get:/api/public/home",
      nodes: [
        {
          id: "endpoint:get:/api/public/home",
          type: "endpoint",
          label: "GET /api/public/home",
          confidence: "high"
        },
        {
          id: "controller:PublicViewController#home",
          type: "controller",
          label: "PublicViewController#home",
          confidence: "high"
        },
        {
          id: "repository:BenefitRepository#findPublicCandidates",
          type: "repository",
          label: "BenefitRepository#findPublicCandidates",
          confidence: "medium"
        },
        {
          id: "database:benefit",
          type: "database",
          label: "benefit",
          confidence: "medium"
        }
      ],
      edges: [
        {
          id: "home-edge-1",
          from: "endpoint:get:/api/public/home",
          to: "controller:PublicViewController#home",
          kind: "main"
        },
        {
          id: "home-edge-2",
          from: "controller:PublicViewController#home",
          to: "repository:BenefitRepository#findPublicCandidates",
          kind: "main"
        },
        {
          id: "home-edge-3",
          from: "repository:BenefitRepository#findPublicCandidates",
          to: "database:benefit",
          kind: "db"
        }
      ],
      mainPath: [
        "endpoint:get:/api/public/home",
        "controller:PublicViewController#home",
        "repository:BenefitRepository#findPublicCandidates",
        "database:benefit"
      ],
      subFlows: []
    }
  ],
  warnings: [],
  pages: [
    {
      id: "page:manual:root",
      route: "/",
      screenshots: [],
      apiCalls: [{ method: "GET", path: "/api/public/home" }],
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
    openBrowser: true,
    mode: "inject"
  },
  dev: {}
};

type FakeRequest = IncomingMessage & EventEmitter & { method?: string; url?: string };

type FakeResponse = ServerResponse & {
  body: string;
  chunks: string[];
  headers: Record<string, string | number | readonly string[]>;
  statusCode: number;
  ended: boolean;
  end(chunk?: string | Buffer): FakeResponse;
  getHeader(name: string): string | number | readonly string[] | undefined;
  setHeader(name: string, value: string | number | readonly string[]): FakeResponse;
  write(chunk: string | Buffer): boolean;
  writeHead(statusCode: number, headers?: Record<string, string>): FakeResponse;
};

describe("dev command", () => {
  it("accepts browser events and returns a FlowRecord id derived from the event", async () => {
    const { request, response } = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createBrowserEvent())
    });

    await handleRuntimeRequest(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.getHeader("content-type")).toContain("application/json");
    expect(JSON.parse(response.body)).toEqual({ accepted: true, id: "flow:evt_saved_1" });
  });

  it("uses the latest report-data file when matching live browser events", async () => {
    await withTempDir(async (dir) => {
      const staleScanResult: ScanResult = {
        ...scanResult,
        flows: [
          {
            endpointId: "endpoint:get:/api/public/home",
            nodes: [
              {
                id: "endpoint:get:/api/public/home",
                type: "endpoint",
                label: "GET /api/public/home"
              },
              {
                id: "controller:PublicViewController#home",
                type: "controller",
                label: "PublicViewController#home"
              }
            ],
            edges: [
              {
                id: "stale-home-edge-1",
                from: "endpoint:get:/api/public/home",
                to: "controller:PublicViewController#home",
                kind: "main"
              }
            ],
            mainPath: ["endpoint:get:/api/public/home", "controller:PublicViewController#home"],
            subFlows: []
          }
        ]
      };

      await writeReportData(dir, scanResult);

      const flowStore = createLocalFlowStore();
      const { request, response } = createRuntimeHarness({
        method: "POST",
        url: "/_anlyx/events",
        body: JSON.stringify(
          createBrowserEvent({
            id: "evt_home_latest",
            method: "GET",
            url: "http://localhost:8080/api/public/home",
            path: "/api/public/home",
            status: undefined,
            durationMs: undefined
          })
        )
      });

      await handleRuntimeRequest(request, response, flowStore, undefined, {
        reportData: staleScanResult,
        reportDataPath: join(dir, ".anlyx", "report-data.json"),
        readReportData
      });

      expect(response.statusCode).toBe(202);
      expect(flowStore.records[0]?.layers.map((layer) => layer.type)).toEqual([
        "api",
        "controller",
        "repository",
        "database",
        "result"
      ]);
    });
  });

  it("accepts page view events and publishes source-derived API flow records", async () => {
    const flowStore = createLocalFlowStore();
    const { request, response } = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createPageViewEvent())
    });

    await handleRuntimeRequest(request, response, flowStore);

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({
      accepted: true,
      id: "flow:page_home_1:source:1",
      ids: ["flow:page_home_1:source:1"]
    });
    expect(flowStore.records).toHaveLength(1);
    expect(flowStore.records[0]).toMatchObject({
      id: "flow:page_home_1:source:1",
      method: "GET",
      path: "/api/public/home",
      matchState: "matched",
      endpointId: "endpoint:get:/api/public/home"
    });
    expect(flowStore.records[0]?.layers.map((layer) => layer.type)).toEqual([
      "page",
      "api",
      "controller",
      "repository",
      "database",
      "result"
    ]);
  });

  it("starts a fresh recent-request scope when a page view event arrives", async () => {
    const flowStore = createLocalFlowStore();
    const firstRequest = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createBrowserEvent({ id: "evt_home_request" }))
    });
    await handleRuntimeRequest(firstRequest.request, firstRequest.response, flowStore);
    expect(flowStore.records.map((record) => record.id)).toContain("flow:evt_home_request");

    const stream = createRuntimeHarness({
      method: "GET",
      url: "/_anlyx/events/stream"
    });

    try {
      await handleRuntimeRequest(stream.request, stream.response, flowStore);
      const pageView = createRuntimeHarness({
        method: "POST",
        url: "/_anlyx/events",
        body: JSON.stringify(createPageViewEvent({ id: "page_ranking_1", path: "/ranking" }))
      });

      await handleRuntimeRequest(pageView.request, pageView.response, flowStore);

      expect(flowStore.records.map((record) => record.id)).not.toContain("flow:evt_home_request");
      expect(stream.response.body).toContain("event: reset");
    } finally {
      stream.request.emit("close");
    }
  });

  it("streams retained flow records to EventSource clients", async () => {
    const flowStore = createLocalFlowStore();
    const post = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createBrowserEvent())
    });
    await handleRuntimeRequest(post.request, post.response, flowStore);

    const stream = createRuntimeHarness({
      method: "GET",
      url: "/_anlyx/events/stream"
    });
    try {
      await handleRuntimeRequest(stream.request, stream.response, flowStore);

      expect(stream.response.statusCode).toBe(200);
      expect(stream.response.getHeader("content-type")).toContain("text/event-stream");
      expect(stream.response.body).toContain("event: flow");
      expect(stream.response.body).toContain('"id":"flow:evt_saved_1"');
      expect(flowStore.clients.size).toBe(1);
    } finally {
      stream.request.emit("close");
    }

    expect(flowStore.clients.size).toBe(0);
  });

  it("merges backend span events into an existing browser flow and broadcasts the update", async () => {
    const flowStore = createLocalFlowStore();
    const post = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createBrowserEvent({ id: "evt_with_spans" }))
    });
    await handleRuntimeRequest(post.request, post.response, flowStore);

    const stream = createRuntimeHarness({
      method: "GET",
      url: "/_anlyx/events/stream"
    });

    try {
      await handleRuntimeRequest(stream.request, stream.response, flowStore);

      const spans = createBackendSpanEvent("evt_with_spans");
      const spanPost = createRuntimeHarness({
        method: "POST",
        url: "/_anlyx/backend-spans",
        body: JSON.stringify(spans)
      });
      await handleRuntimeRequest(spanPost.request, spanPost.response, flowStore);

      expect(spanPost.response.statusCode).toBe(202);
      expect(JSON.parse(spanPost.response.body)).toEqual({
        accepted: true,
        id: "flow:evt_with_spans"
      });
      expect(flowStore.records[0]?.backendSpans?.map((span) => span.id)).toEqual([
        "span-controller",
        "span-service",
        "span-repository"
      ]);
      expect(stream.response.body).toContain('"backendSpans"');
      expect(stream.response.body).toContain('"label":"SavedBenefitService.save"');
    } finally {
      stream.request.emit("close");
    }
  });

  it("queues backend span events until the matching browser flow arrives", async () => {
    const flowStore = createLocalFlowStore();
    const spanPost = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/backend-spans",
      body: JSON.stringify(createBackendSpanEvent("evt_pending_spans"))
    });

    await handleRuntimeRequest(spanPost.request, spanPost.response, flowStore);

    expect(spanPost.response.statusCode).toBe(202);
    expect(JSON.parse(spanPost.response.body)).toEqual({ accepted: true, pending: true });
    expect(flowStore.records).toHaveLength(0);
    expect(flowStore.pendingBackendSpans.get("evt_pending_spans")).toHaveLength(3);

    const eventPost = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createBrowserEvent({ id: "evt_pending_spans" }))
    });

    await handleRuntimeRequest(eventPost.request, eventPost.response, flowStore);

    expect(flowStore.records[0]?.id).toBe("flow:evt_pending_spans");
    expect(flowStore.records[0]?.backendSpans).toHaveLength(3);
    expect(flowStore.pendingBackendSpans.has("evt_pending_spans")).toBe(false);
  });

  it("rejects malformed backend span events", async () => {
    const { request, response } = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/backend-spans",
      body: JSON.stringify({
        type: "backend_spans",
        requestId: "evt_bad",
        spans: [{ id: "bad", type: "api", label: "GET /api", startOffsetMs: -1, durationMs: 5 }]
      })
    });

    await handleRuntimeRequest(request, response);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ accepted: false });
  });

  it("replays retained flow records oldest first so viewers settle on the newest request", async () => {
    const flowStore = createLocalFlowStore();
    const firstPost = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createBrowserEvent({ id: "evt_old" }))
    });

    await handleRuntimeRequest(firstPost.request, firstPost.response, flowStore);

    const secondPost = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createBrowserEvent({ id: "evt_new" }))
    });

    await handleRuntimeRequest(secondPost.request, secondPost.response, flowStore);

    const stream = createRuntimeHarness({
      method: "GET",
      url: "/_anlyx/events/stream"
    });

    try {
      await handleRuntimeRequest(stream.request, stream.response, flowStore);

      expect(stream.response.body.indexOf('"id":"flow:evt_old"')).toBeLessThan(
        stream.response.body.indexOf('"id":"flow:evt_new"')
      );
    } finally {
      stream.request.emit("close");
    }
  });

  it("broadcasts new flow records to active EventSource clients", async () => {
    const flowStore = createLocalFlowStore();
    const stream = createRuntimeHarness({
      method: "GET",
      url: "/_anlyx/events/stream"
    });

    try {
      await handleRuntimeRequest(stream.request, stream.response, flowStore);
      const post = createRuntimeHarness({
        method: "POST",
        url: "/_anlyx/events",
        body: JSON.stringify(createBrowserEvent({ id: "evt_live_1" }))
      });

      await handleRuntimeRequest(post.request, post.response, flowStore);

      expect(post.response.statusCode).toBe(202);
      expect(stream.response.body).toContain('"id":"flow:evt_live_1"');
    } finally {
      stream.request.emit("close");
    }

    expect(flowStore.clients.size).toBe(0);
  });

  it("accepts Next server request events with observed response timing", async () => {
    const flowStore = createLocalFlowStore();
    const post = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createFrontendServerEvent())
    });

    await handleRuntimeRequest(post.request, post.response, flowStore);

    expect(post.response.statusCode).toBe(202);
    expect(flowStore.records[0]).toMatchObject({
      id: "flow:next_home_1",
      status: 200,
      durationMs: 42
    });
    expect(flowStore.records[0]?.layers.find((layer) => layer.type === "api")?.evidenceLevel).toBe(
      "frontend_server_observed"
    );
  });

  it("preserves matching observed server requests when a page scope starts", async () => {
    const flowStore = createLocalFlowStore();
    const serverPost = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createFrontendServerEvent())
    });

    await handleRuntimeRequest(serverPost.request, serverPost.response, flowStore);

    const pagePost = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify(createPageViewEvent())
    });

    await handleRuntimeRequest(pagePost.request, pagePost.response, flowStore);

    expect(flowStore.records).toHaveLength(1);
    expect(flowStore.records[0]?.id).toBe("flow:next_home_1");
    expect(flowStore.records[0]?.durationMs).toBe(42);
  });

  it("rejects invalid browser event JSON", async () => {
    const { request, response } = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: "{"
    });

    await handleRuntimeRequest(request, response);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ accepted: false });
  });

  it("rejects malformed browser event bodies", async () => {
    const { request, response } = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify({ type: "request", method: "GET", url: "/api/test" })
    });

    await handleRuntimeRequest(request, response);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ accepted: false });
  });

  it("rejects browser events with invalid optional fields", async () => {
    const { request, response } = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      body: JSON.stringify({
        ...createBrowserEvent(),
        action: "bad action",
        durationMs: "slow",
        status: "200"
      })
    });

    await handleRuntimeRequest(request, response);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toMatchObject({ accepted: false });
  });

  it("retains only the latest 100 flow records", () => {
    const flowStore = createLocalFlowStore();

    for (let index = 0; index < 105; index += 1) {
      flowStore.pushFlow({
        id: `flow:${index}`,
        requestId: `evt_${index}`,
        method: "GET",
        path: `/api/${index}`,
        trigger: "background",
        matchState: "unmatched",
        confidence: "low",
        durationMs: 0,
        layers: [],
        evidence: [],
        createdAt: "2026-06-24T00:00:01.000Z",
        label: `GET /api/${index}`
      });
    }

    expect(flowStore.records).toHaveLength(100);
    expect(flowStore.records[0]?.id).toBe("flow:104");
    expect(flowStore.records.at(-1)?.id).toBe("flow:5");
  });

  it("serves the capture runtime asset", async () => {
    await withTempDir(async (dir) => {
      const viewerRoot = join(dir, "dist/viewer");
      const overlayRoot = join(dir, "dist/overlay");
      await mkdir(viewerRoot, { recursive: true });
      await mkdir(overlayRoot, { recursive: true });
      await writeFile(
        join(overlayRoot, "capture.js"),
        "window.__ANLYX_CAPTURE_INSTALLED__ = true;",
        "utf8"
      );

      const { request, response } = createRuntimeHarness({
        method: "GET",
        url: "/_anlyx/capture.js"
      });

      await handleRuntimeRequest(request, response, createLocalFlowStore(), viewerRoot);

      expect(response.statusCode).toBe(200);
      expect(response.getHeader("content-type")).toContain("application/javascript");
      expect(response.body).toContain("__ANLYX_CAPTURE_INSTALLED__");
    });
  });

  it("serves a development-only Spring backend bridge template", async () => {
    const { request, response } = createRuntimeHarness({
      method: "GET",
      url: "/_anlyx/spring-bridge.java"
    });

    await handleRuntimeRequest(request, response);

    expect(response.statusCode).toBe(200);
    expect(response.getHeader("content-type")).toContain("text/plain");
    expect(response.body).toContain("Development only");
    expect(response.body).toContain("X-Anlyx-Request-Id");
    expect(response.body).toContain("/_anlyx/backend-spans");
    expect(response.body).toContain("http://127.0.0.1:4777");
    expect(response.body).toContain("HandlerMethod");
    expect(response.body).toContain("HttpClient.Version.HTTP_1_1");
    expect(response.body).toContain("BeanPostProcessor");
    expect(response.body).toContain("jdbc_execute");
  });

  it("allows POST in runtime CORS methods", async () => {
    const { request, response } = createRuntimeHarness({
      method: "OPTIONS",
      url: "/_anlyx/events"
    });

    await handleRuntimeRequest(request, response);

    expect(response.statusCode).toBe(204);
    expect(response.getHeader("access-control-allow-methods")).toBe("GET, POST, OPTIONS");
    expect(response.getHeader("access-control-allow-headers")).toBe("content-type, x-anlyx-request-id");
  });

  it("rejects runtime event posts from non-local configured origins", async () => {
    const { request, response } = createRuntimeHarness({
      method: "POST",
      url: "/_anlyx/events",
      origin: "https://example.com",
      body: JSON.stringify(createBrowserEvent())
    });

    await handleRuntimeRequest(request, response);

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toEqual({ accepted: false, error: "Forbidden origin." });
  });

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

  it("runs scan once when report-data is missing", async () => {
    await withTempDir(async (dir) => {
      let scans = 0;

      await runDevCommand({
        cwd: dir,
        open: false,
        dependencies: fakeDependencies({
          async runScanCommand(options) {
            const scanCwd = options?.cwd ?? dir;
            scans += 1;
            await writeReportData(scanCwd, scanResult);
            return {
              outputDir: join(scanCwd, ".anlyx"),
              reportDataPath: join(scanCwd, ".anlyx", "report-data.json"),
              endpointsPath: join(scanCwd, ".anlyx", "endpoints.json"),
              flowsPath: join(scanCwd, ".anlyx", "flows.json"),
              pagesPath: join(scanCwd, ".anlyx", "pages.json"),
              endpointCount: 1,
              flowCount: 1,
              pageCount: 1,
              issues: []
            };
          }
        })
      });

      expect(scans).toBe(1);
    });
  });

  it("reports scan failure when report-data is missing and auto scan fails", async () => {
    await withTempDir(async (dir) => {
      await expect(
        runDevCommand({
          cwd: dir,
          dependencies: fakeDependencies({
            async runScanCommand() {
              throw new Error("backend source missing");
            }
          })
        })
      ).rejects.toThrow(/Automatic scan failed: backend source missing/);
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
          config: { ...config, server: { port: 4888, openBrowser: true, mode: "inject" } },
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

  it("passes frontend base URL and server mode to the local UI server", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);
      const seen: Array<{ frontendBaseUrl: string; mode: string }> = [];

      await runDevCommand({
        cwd: dir,
        open: false,
        dependencies: fakeDependencies({
          config: { ...config, server: { port: 4777, openBrowser: true, mode: "viewer" } },
          createLocalUiServer({ frontendBaseUrl, mode, port }) {
            seen.push({ frontendBaseUrl, mode });
            return Promise.resolve({ url: `http://localhost:${port}` });
          }
        })
      });

      expect(seen).toEqual([{ frontendBaseUrl: "http://localhost:3000", mode: "viewer" }]);
    });
  });

  it("opens the live workspace in inject mode", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);
      const opened: string[] = [];

      const result = await runDevCommand({
        cwd: dir,
        dependencies: fakeDependencies({
          openBrowser(url) {
            opened.push(url);
          }
        })
      });

      expect(opened).toEqual(["http://localhost:4777"]);
      expect(result).toMatchObject({
        url: "http://localhost:4777",
        frontendUrl: "http://localhost:3000",
        mode: "inject",
        scriptTag: '<script src="http://localhost:4777/_anlyx/overlay.js" defer></script>'
      });
    });
  });

  it("starts configured frontend dev command when frontend is not reachable", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);
      const commands: Array<{ command: string; cwd: string; env?: NodeJS.ProcessEnv }> = [];

      const result = await runDevCommand({
        cwd: dir,
        open: false,
        dependencies: fakeDependencies({
          config: {
            ...config,
            dev: {
              command: "npm run dev"
            }
          },
          async isFrontendReachable() {
            return false;
          },
          startFrontendDevServer({ command, cwd, env }) {
            commands.push({ command, cwd, env });
            return { stop: () => undefined };
          }
        })
      });

      expect(commands).toHaveLength(1);
      expect(commands[0]).toMatchObject({ command: "npm run dev", cwd: dir });
      expect(commands[0]?.env?.ANLYX_RUNTIME_URL).toBe("http://127.0.0.1:4777");
      expect(commands[0]?.env?.NODE_OPTIONS).toContain("--import anlyx/next-server/register");
      expect(result.frontendStarted).toBe(true);
    });
  });

  it("does not preload the Next server bridge for manual frontend projects", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);
      const commands: Array<{ command: string; cwd: string; env?: NodeJS.ProcessEnv }> = [];

      await runDevCommand({
        cwd: dir,
        open: false,
        dependencies: fakeDependencies({
          config: {
            ...config,
            frontend: {
              type: "manual",
              sourceDir: "./frontend",
              baseUrl: "http://localhost:3000",
              urls: ["/"],
              viewport: { width: 1440, height: 900 },
              capture: { mode: "segments", segmentHeight: 900 }
            },
            dev: {
              command: "npm run dev"
            }
          },
          async isFrontendReachable() {
            return false;
          },
          startFrontendDevServer({ command, cwd, env }) {
            commands.push({ command, cwd, env });
            return { stop: () => undefined };
          }
        })
      });

      expect(commands).toEqual([{ command: "npm run dev", cwd: dir, env: undefined }]);
    });
  });

  it("does not start configured frontend dev command when frontend is already reachable", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);
      let started = false;

      const result = await runDevCommand({
        cwd: dir,
        open: false,
        dependencies: fakeDependencies({
          config: {
            ...config,
            dev: {
              command: "npm run dev"
            }
          },
          async isFrontendReachable() {
            return true;
          },
          startFrontendDevServer() {
            started = true;
            return { stop: () => undefined };
          }
        })
      });

      expect(started).toBe(false);
      expect(result.frontendStarted).toBe(false);
    });
  });

  it("injects the compatibility capture helper before the closing body tag", () => {
    expect(injectOverlayScript("<html><body><main>App</main></body></html>")).toBe(
      '<html><body><main>App</main><script src="/_anlyx/overlay.js" defer></script></body></html>'
    );
  });

  it("does not inject the compatibility capture helper twice", () => {
    const html = '<html><body><script src="/_anlyx/overlay.js" defer></script></body></html>';

    expect(injectOverlayScript(html)).toBe(html);
  });

  it("builds proxy target URL using configured frontend origin", () => {
    expect(buildProxyTargetUrl("http://localhost:3000/app", "/benefits?id=1")).toBe(
      "http://localhost:3000/benefits?id=1"
    );
  });

  it("builds an absolute compatibility capture helper tag for inject mode", () => {
    expect(getOverlayScriptTag("http://localhost:4777")).toBe(
      '<script src="http://localhost:4777/_anlyx/overlay.js" defer></script>'
    );
  });

  it("serves a lightweight capture badge instead of the legacy drawer", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("/_anlyx/capture.js");
    expect(script).toContain("Anlyx capturing");
    expect(script).toContain("Open workspace");
    expect(script).toContain("__ANLYX_CAPTURE_BADGE_INSTALLED__");
    expect(script).not.toContain("__ANLYX_RENDER_FLOW_DRAWER__");
    expect(script).not.toContain("overlay-ui.js");
  });

  it("points the injected capture badge at the full workspace", () => {
    const script = getOverlayClientScript();

    expect(script).toContain('badge.href = runtimeBaseUrl + "/"');
    expect(script).toContain('badge.target = "_blank"');
    expect(script).toContain("window.__ANLYX_RUNTIME_BASE_URL__ = runtimeBaseUrl");
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
      expect(writes.join("\n")).toContain("Started Anlyx Live Workspace at http://localhost:4777");
      expect(writes.join("\n")).toContain("Use your app at http://localhost:3000");
      expect(writes.join("\n")).not.toContain("Inject during local development");
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

  it("readReportData preserves generic flow node and edge evidence", async () => {
    await withTempDir(async (dir) => {
      const data: ScanResult = {
        ...scanResult,
        flows: [
          {
            endpointId: "endpoint:get:/api/items/{id}",
            nodes: [
              {
                id: "endpoint:get:/api/items/{id}",
                type: "endpoint",
                label: "GET /api/items/{id}",
                confidence: "high",
                evidence: [
                  {
                    label: "Endpoint matched",
                    detail: "Matched from a framework route definition.",
                    confidence: "high"
                  }
                ]
              },
              {
                id: "service:ItemService#find",
                type: "service",
                label: "ItemService#find",
                confidence: "medium",
                evidence: [
                  {
                    label: "Service call detected",
                    detail: "Resolved from handler method body.",
                    confidence: "medium"
                  }
                ]
              }
            ],
            edges: [
              {
                id: "edge:endpoint-to-service",
                from: "endpoint:get:/api/items/{id}",
                to: "service:ItemService#find",
                kind: "main",
                confidence: "medium",
                evidence: [
                  {
                    label: "Call edge detected",
                    detail: "Static analysis linked the endpoint to a service call.",
                    confidence: "medium"
                  }
                ]
              }
            ],
            mainPath: ["endpoint:get:/api/items/{id}", "service:ItemService#find"],
            subFlows: []
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

function createBrowserEvent(overrides: Partial<BrowserRequestEvent> = {}): BrowserRequestEvent {
  return {
    id: "evt_saved_1",
    type: "request",
    method: "GET",
    url: "http://localhost:8080/api/public/benefits/123",
    path: "/api/public/benefits/123",
    status: 200,
    durationMs: 33,
    observedAt: "2026-06-24T00:00:01.000Z",
    ...overrides
  };
}

function createPageViewEvent(overrides: Partial<BrowserPageViewEvent> = {}): BrowserPageViewEvent {
  return {
    id: "page_home_1",
    type: "page_view",
    url: "http://localhost:3000/",
    path: "/",
    observedAt: "2026-06-24T00:00:01.000Z",
    ...overrides
  };
}

function createFrontendServerEvent(
  overrides: Partial<FrontendServerRequestEvent> = {}
): FrontendServerRequestEvent {
  return {
    id: "next_home_1",
    type: "frontend_server_request",
    runtime: "next",
    method: "GET",
    url: "http://localhost:8080/api/public/home",
    path: "/api/public/home",
    status: 200,
    durationMs: 42,
    observedAt: "2026-06-24T00:00:00.500Z",
    ...overrides
  };
}

function createBackendSpanEvent(requestId: string) {
  return {
    type: "backend_spans",
    requestId,
    spans: [
      {
        id: "span-controller",
        type: "controller",
        label: "SavedBenefitController.create",
        startOffsetMs: 8,
        durationMs: 48
      },
      {
        id: "span-service",
        parentId: "span-controller",
        type: "service",
        label: "SavedBenefitService.save",
        startOffsetMs: 18,
        durationMs: 26
      },
      {
        id: "span-repository",
        parentId: "span-service",
        type: "repository",
        label: "SavedBenefitRepository.insert",
        startOffsetMs: 32,
        durationMs: 7
      }
    ]
  };
}

function createRuntimeHarness(options: { method: string; url: string; body?: string; origin?: string }): {
  request: FakeRequest;
  response: FakeResponse;
} {
  const request = new EventEmitter() as FakeRequest;
  request.method = options.method;
  request.url = options.url;
  request.headers = options.origin ? { origin: options.origin } : {};

  const headers: Record<string, string | number | readonly string[]> = {};
  const response = Object.assign(new EventEmitter(), {
    body: "",
    chunks: [] as string[],
    ended: false,
    headers,
    statusCode: 200,
    end(chunk?: string | Buffer) {
      if (chunk !== undefined) {
        this.write(chunk);
      }
      this.ended = true;
      return this;
    },
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      headers[name.toLowerCase()] = value;
      return this;
    },
    write(chunk: string | Buffer) {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
      this.chunks.push(text);
      this.body += text;
      return true;
    },
    writeHead(statusCode: number, head?: Record<string, string>) {
      this.statusCode = statusCode;
      for (const [key, value] of Object.entries(head ?? {})) {
        this.setHeader(key, value);
      }
      return this;
    }
  }) as unknown as FakeResponse;

  if (options.body !== undefined) {
    queueMicrotask(() => {
      request.emit("data", Buffer.from(options.body ?? "", "utf8"));
      request.emit("end");
    });
  }

  return { request, response };
}

function handleRuntimeRequest(
  request: FakeRequest,
  response: FakeResponse,
  flowStore = createLocalFlowStore(),
  viewerRoot = join(process.cwd(), "packages/ui/dist/viewer"),
  options: Partial<Parameters<typeof createAnlyxRuntimeMiddleware>[0]> = {}
): Promise<void> {
  const middleware = createAnlyxRuntimeMiddleware({
    port: 4777,
    reportData: scanResult,
    viewerRoot,
    frontendBaseUrl: "http://localhost:3000",
    mode: "inject",
    flowStore,
    ...options
  });

  return middleware(request, response, () => undefined);
}
