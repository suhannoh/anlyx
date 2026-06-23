import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

import type { NormalizedAnlyxConfig, ScanResult } from "@anlyx/core";
import { describe, expect, it } from "vitest";

import { getHelpText, runCli } from "./index.js";
import {
  buildProxyTargetUrl,
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
    openBrowser: true,
    mode: "inject"
  },
  dev: {}
};

type TimerCallback = () => void;

type HarnessElement = {
  id: string;
  tagName: string;
  className: string;
  dataset: Record<string, string>;
  style: Record<string, string>;
  textContent: string;
  value: string;
  name: string;
  innerHTML: string;
  appendChild(child: HarnessElement): HarnessElement;
  addEventListener(type?: string, listener?: (event: Record<string, unknown>) => void): void;
  contains(target: unknown): boolean;
  closest(): null;
  getAttribute(name: string): string | null;
  getBoundingClientRect(): { left: number; top: number; width: number; height: number };
  querySelector(selector: string): HarnessElement | null;
  querySelectorAll(): HarnessElement[];
  remove(): void;
  setAttribute(name: string, value: string): void;
};

function createOverlayHarness() {
  const timers: TimerCallback[] = [];
  const order: string[] = [];
  const elementsById = new Map<string, HarnessElement>();
  const documentListeners = new Map<string, Array<(event: Record<string, unknown>) => void>>();
  const windowListeners = new Map<string, Array<(event: Record<string, unknown>) => void>>();

  const createElement = (tagName: string): HarnessElement => {
    const attributes = new Map<string, string>();
    const children: HarnessElement[] = [];
    const element: HarnessElement = {
      id: "",
      tagName: tagName.toUpperCase(),
      className: "",
      dataset: {},
      style: {},
      textContent: "",
      value: "",
      name: "",
      innerHTML: "",
      appendChild(child) {
        children.push(child);
        if (child.id) {
          elementsById.set(child.id, child);
        }
        return child;
      },
      addEventListener() {
        return undefined;
      },
      contains(target) {
        return target === element || children.includes(target as HarnessElement);
      },
      closest() {
        return null;
      },
      getAttribute(name) {
        return attributes.get(name) ?? null;
      },
      getBoundingClientRect() {
        return {
          left: Number.parseInt(String(element.style.left ?? "0"), 10) || 0,
          top: Number.parseInt(String(element.style.top ?? "0"), 10) || 0,
          width: Number.parseInt(String(element.style.width ?? "600"), 10) || 600,
          height: Number.parseInt(String(element.style.height ?? "760"), 10) || 760
        };
      },
      querySelector(selector) {
        const knownSelectors = new Set([
          ".anlyx-fab",
          ".anlyx-drawer",
          ".anlyx-body",
          ".anlyx-close",
          ".anlyx-opacity-control",
          ".anlyx-language-control",
          ".anlyx-drag-handle",
          ".anlyx-resize-handle",
          ".anlyx-title",
          ".anlyx-subtitle",
          ".anlyx-opacity-label",
          ".anlyx-language-label"
        ]);
        if (knownSelectors.has(selector)) {
          const child = createElement("div");
          child.className = selector.slice(1);
          return child;
        }
        return null;
      },
      querySelectorAll() {
        return [];
      },
      remove() {
        if (element.id) {
          elementsById.delete(element.id);
        }
      },
      setAttribute(name, value) {
        attributes.set(name, value);
        if (name === "id") {
          element.id = value;
          elementsById.set(value, element);
        }
        if (name === "class") {
          element.className = value;
        }
      }
    };
    return element;
  };

  const document = {
    body: createElement("body"),
    currentScript: { src: "http://localhost:4777/_anlyx/overlay.js" },
    head: createElement("head"),
    readyState: "complete",
    addEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
      documentListeners.set(type, [...(documentListeners.get(type) ?? []), listener]);
    },
    createElement,
    getElementById(id: string) {
      return elementsById.get(id) ?? null;
    },
    querySelector(selector: string) {
      if (selector.startsWith("#anlyx-overlay-root ")) {
        const root = elementsById.get("anlyx-overlay-root");
        return root?.querySelector(selector.replace("#anlyx-overlay-root ", "")) ?? null;
      }
      return null;
    }
  };

  class FakeMutationObserver {
    observe() {
      return undefined;
    }
  }

  function FakeXmlHttpRequest() {
    return undefined;
  }

  FakeXmlHttpRequest.prototype = {
    addEventListener() {
      return undefined;
    },
    open() {
      return undefined;
    },
    send() {
      return undefined;
    }
  };

  const window = {
    document,
    location: { href: "http://localhost:3000/", origin: "http://localhost:3000" },
    innerHeight: 900,
    innerWidth: 1440,
    MutationObserver: FakeMutationObserver,
    XMLHttpRequest: FakeXmlHttpRequest,
    __ANLYX_RENDER_FLOW_DRAWER__() {
      order.push("drawer-render");
    },
    fetch: async (input: string, init?: { method?: string }) => {
      void init;
      order.push(`original-fetch:${input}`);
      return {
        ok: true,
        status: 200,
        async json() {
          return scanResult;
        }
      };
    },
    performance: {
      now() {
        return order.length * 10;
      }
    },
    sessionStorage: {
      getItem() {
        return null;
      },
      removeItem() {
        return undefined;
      },
      setItem() {
        return undefined;
      }
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {
        return undefined;
      }
    },
    addEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
      windowListeners.set(type, [...(windowListeners.get(type) ?? []), listener]);
    },
    removeEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
      windowListeners.set(
        type,
        (windowListeners.get(type) ?? []).filter((candidate) => candidate !== listener)
      );
    },
    setTimeout(callback: TimerCallback) {
      timers.push(callback);
      return timers.length;
    }
  };

  const context = {
    Date,
    Error,
    Math,
    MutationObserver: FakeMutationObserver,
    Promise,
    URL,
    XMLHttpRequest: FakeXmlHttpRequest,
    console,
    document,
    fetch(...args: [string, { method?: string }?]) {
      return window.fetch(...args);
    },
    performance: window.performance,
    window
  };

  const waitForMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  const flushNextTimer = async () => {
    const callback = timers.shift();
    if (callback) {
      callback();
      await waitForMicrotasks();
    }
  };

  const flushTimers = async () => {
    while (timers.length > 0) {
      await flushNextTimer();
    }
  };

  const dispatchDocumentEvent = (type: string, event: Record<string, unknown>) => {
    for (const listener of documentListeners.get(type) ?? []) {
      listener(event);
    }
  };

  runInNewContext(getOverlayClientScript(), context);

  return { dispatchDocumentEvent, flushNextTimer, flushTimers, order, timers, waitForMicrotasks, window };
}

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

  it("opens the real frontend in inject mode", async () => {
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

      expect(opened).toEqual(["http://localhost:3000"]);
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
      const commands: Array<{ command: string; cwd: string }> = [];

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
          startFrontendDevServer({ command, cwd }) {
            commands.push({ command, cwd });
            return { stop: () => undefined };
          }
        })
      });

      expect(commands).toEqual([{ command: "npm run dev", cwd: dir }]);
      expect(result.frontendStarted).toBe(true);
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

  it("injects overlay script before the closing body tag", () => {
    expect(injectOverlayScript("<html><body><main>App</main></body></html>")).toBe(
      '<html><body><main>App</main><script src="/_anlyx/overlay.js" defer></script></body></html>'
    );
  });

  it("does not inject overlay script twice", () => {
    const html = '<html><body><script src="/_anlyx/overlay.js" defer></script></body></html>';

    expect(injectOverlayScript(html)).toBe(html);
  });

  it("builds proxy target URL using configured frontend origin", () => {
    expect(buildProxyTargetUrl("http://localhost:3000/app", "/benefits?id=1")).toBe(
      "http://localhost:3000/benefits?id=1"
    );
  });

  it("builds an absolute overlay script tag for inject mode", () => {
    expect(getOverlayScriptTag("http://localhost:4777")).toBe(
      '<script src="http://localhost:4777/_anlyx/overlay.js" defer></script>'
    );
  });

  it("serves a flow-first overlay drawer for real app interactions", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("/_anlyx/overlay-ui.js");
    expect(script).toContain("/_anlyx/overlay-ui.css");
    expect(script).toContain("__ANLYX_RENDER_FLOW_DRAWER__");
    expect(script).toContain("renderReactDrawer");
  });

  it("filters development noise and groups repeated overlay API events", () => {
    const script = getOverlayClientScript();

    expect(script).toContain('url.pathname.startsWith("/_next/")');
    expect(script).toContain('url.pathname.startsWith("/getconfig/")');
    expect(script).toContain('url.pathname.includes("hot-update")');
    expect(script).toContain("findExistingEventIndex");
    expect(script).toContain("count: (existing.count || 1) + 1");
    expect(script).toContain("DOMContentLoaded");
  });

  it("captures recent user actions and attaches them to overlay API events", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("installUserActionTracker");
    expect(script).toContain("captureUserAction");
    expect(script).toContain("findActionForRequest");
    expect(script).toContain("triggeredBy");
    expect(script).toContain("Clicked");
    expect(script).toContain("Action");
  });

  it("keeps background API events quiet until the user selects them", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("shouldAutoFocusEvent");
    expect(script).toContain("classifyApiEventSource");
    expect(script).toContain("isPassiveRequest");
    expect(script).toContain("isSessionProbePath");
    expect(script).toContain("isHealthOrPollingPath");
    expect(script).toContain("installEventSelectionHandler");
    expect(script).toContain('target.closest("[data-event-id]")');
    expect(script).toContain("const passive = isPassiveRequest(event.method, normalized.pathname)");
    expect(script).toContain("const triggeredBy = passive ? null : findActionForRequest(event.startedAt)");
    expect(script).toContain("if (shouldAutoFocusEvent(item))");
    expect(script).toContain("selectedEventId: null");
  });

  it("keeps a short-lived user action across client navigation", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("ANLYX_PENDING_ACTION_KEY");
    expect(script).toContain("restorePendingAction");
    expect(script).toContain("persistPendingAction");
    expect(script).toContain('document.addEventListener("pointerdown"');
    expect(script).toContain("Date.now() - action.capturedAt");
  });

  it("delegates drawer rendering to the React overlay bundle", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("loadOverlayUiAssets");
    expect(script).toContain("Loading Anlyx Flow Drawer");
    expect(script).toContain("window.__ANLYX_RENDER_FLOW_DRAWER__(body");
    expect(script).toContain("selectedEvent: selected");
    expect(script).toContain("events: state.events");
  });

  it("exposes persistent drawer customization controls", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("ANLYX_DRAWER_SETTINGS_KEY");
    expect(script).toContain("anlyx-drag-handle");
    expect(script).toContain("anlyx-opacity-control");
    expect(script).toContain("anlyx-language-control");
    expect(script).toContain("anlyx-resize-handle");
    expect(script).toContain("installDrawerDrag");
    expect(script).toContain("installDrawerResize");
    expect(script).toContain("applyDrawerSettings");
    expect(script).toContain("persistDrawerSettings");
  });

  it("keeps the injected overlay lightweight and resilient across app shell changes", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("installOverlayRootGuard");
    expect(script).toContain("new MutationObserver");
    expect(script).toContain("observer.observe(document.body, { childList: true })");
    expect(script).toContain("overlayRootRestoreScheduled");
    expect(script).toContain("overlayInfrastructureInstalled");
    expect(script).toContain('style[data-anlyx-overlay-base]');
  });

  it("defers expensive overlay work away from the application request path", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("scheduleApiEventRecord");
    expect(script).toContain("window.setTimeout(() => recordApiEvent(event), 0)");
    expect(script).toContain("const endpointRegexCache = new Map()");
    expect(script).toContain("endpointRegexCache.get(key)");
    expect(script).toContain("endpointRegexCache.set(key, regex)");
  });

  it("does not enqueue matching work for Anlyx runtime requests", async () => {
    const harness = createOverlayHarness();

    await harness.flushNextTimer();

    expect(harness.order).toEqual(["original-fetch:http://localhost:4777/_anlyx/report-data"]);
    expect(harness.timers).toHaveLength(0);
  });

  it("records background fetch responses without opening the drawer", async () => {
    const harness = createOverlayHarness();
    await harness.flushNextTimer();

    const response = await harness.window.fetch("/api/public/benefits/123");
    harness.order.push("app-response-returned");

    expect(response.status).toBe(200);
    expect(harness.order).not.toContain("drawer-render");
    expect(harness.timers).toHaveLength(1);

    await harness.flushTimers();

    expect(harness.order).not.toContain("drawer-render");
  });

  it("returns clicked application fetch responses before overlay matching and rendering", async () => {
    const harness = createOverlayHarness();
    await harness.flushNextTimer();
    const target = {
      id: "claim-benefit",
      tagName: "BUTTON",
      className: "cta",
      name: "",
      textContent: "Claim benefit",
      value: "",
      closest() {
        return target;
      },
      getAttribute(name: string) {
        return name === "data-testid" ? "claim-benefit" : null;
      }
    };

    harness.dispatchDocumentEvent("pointerdown", { type: "pointerdown", target });

    const response = await harness.window.fetch("/api/public/benefits/123");
    harness.order.push("app-response-returned");

    expect(response.status).toBe(200);
    expect(harness.order).not.toContain("drawer-render");
    expect(harness.timers).toHaveLength(1);

    await harness.flushTimers();

    expect(harness.order.indexOf("app-response-returned")).toBeLessThan(harness.order.indexOf("drawer-render"));
  });

  it("does not promote passive session probes to the action drawer", async () => {
    const harness = createOverlayHarness();
    await harness.flushNextTimer();
    const target = {
      id: "benefit-link",
      tagName: "A",
      className: "benefit",
      name: "",
      textContent: "Open benefit",
      value: "",
      closest() {
        return target;
      },
      getAttribute(name: string) {
        return name === "data-testid" ? "benefit-link" : null;
      }
    };

    harness.dispatchDocumentEvent("pointerdown", { type: "pointerdown", target });

    await harness.window.fetch("/api/account/me");
    await harness.window.fetch("/api/account/saved-benefits");
    await harness.window.fetch("/api/public/page-views", { method: "POST" });
    await harness.flushTimers();

    expect(harness.order).not.toContain("drawer-render");
  });

  it("loads the React drawer bundle only after the drawer opens", () => {
    const script = getOverlayClientScript();
    const mountBlock = script.slice(script.indexOf("function mountOverlayUi()"), script.indexOf("function installOverlayRootGuard()"));
    const renderBlock = script.slice(script.indexOf("function render()"), script.indexOf("function renderReactDrawer"));

    expect(mountBlock).not.toContain("loadOverlayUiAssets()");
    expect(renderBlock).toContain("if (!state.open)");
    expect(renderBlock).toContain("return;");
    expect(script).toContain("function renderReactDrawer(selected)");
    expect(script).toContain("loadOverlayUiAssets()");
  });

  it("keeps capture and matching logic in the injected proxy script", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("matchEndpoint");
    expect(script).toContain("flows.find");
    expect(script).toContain("matchedEndpoint");
    expect(script).toContain("matchedFlow");
    expect(script).not.toContain("renderRequestMetrics");
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
      expect(writes.join("\n")).toContain("Started Anlyx runtime at http://localhost:4777");
      expect(writes.join("\n")).toContain("Open your app at http://localhost:3000");
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
