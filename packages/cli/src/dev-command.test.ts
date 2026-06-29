import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

import type { NormalizedAnlyxConfig, ProjectData, ScanResult } from "@anlyx/core";
import { describe, expect, it } from "vitest";

import { getHelpText, runCli } from "./index.js";
import {
  buildProxyTargetUrl,
  closeActiveLocalUiServers,
  createLocalUiServer,
  getOverlayClientScript,
  getOverlayScriptTag,
  injectOverlayScript,
  readProjectData,
  readReportData,
  runDevCommand,
  type DevCommandDependencies,
  type LocalUiServer,
  type LocalUiServerOptions
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

function createOverlayHarness(options: { report?: ScanResult; path?: string } = {}) {
  const timers: TimerCallback[] = [];
  const order: string[] = [];
  const fetchCalls: Array<{ input: string; init: Record<string, unknown> | undefined }> = [];
  let drawerProps: Record<string, unknown> | null = null;
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
          ".anlyx-fab__mark",
          ".anlyx-fab__label",
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
    location: {
      href: `http://localhost:3000${options.path ?? "/"}`,
      origin: "http://localhost:3000",
      pathname: (options.path ?? "/").split("?")[0] || "/",
      search: (options.path ?? "").includes("?")
        ? `?${(options.path ?? "").split("?").slice(1).join("?")}`
        : ""
    },
    history: {
      pushState() {
        return undefined;
      },
      replaceState() {
        return undefined;
      }
    },
    innerHeight: 900,
    innerWidth: 1440,
    MutationObserver: FakeMutationObserver,
    XMLHttpRequest: FakeXmlHttpRequest,
    __ANLYX_RENDER_FLOW_DRAWER__(_container: unknown, props: Record<string, unknown>) {
      drawerProps = props;
      order.push("drawer-render");
    },
    fetch: async (input: string, init?: Record<string, unknown>) => {
      fetchCalls.push({ input, init });
      order.push(`original-fetch:${input}`);
      if (
        input.includes("/_anlyx/events/browser-request") ||
        input.includes("/_anlyx/events/page-context")
      ) {
        return {
          ok: true,
          status: 202,
          async json() {
            return { accepted: true };
          }
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return options.report ?? scanResult;
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
    },
    clearTimeout() {
      return undefined;
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

  return {
    dispatchDocumentEvent,
    fetchCalls,
    flushNextTimer,
    flushTimers,
    getDrawerProps: () => drawerProps,
    order,
    timers,
    waitForMicrotasks,
    window
  };
}

async function findFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate test port")));
        return;
      }
      const port = address.port;
      server.close(() => resolvePort(port));
    });
    server.on("error", reject);
  });
}

async function readSseUntil(
  response: Response,
  predicate: (chunk: string) => boolean
): Promise<string> {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("SSE response body was not readable");
  }

  const decoder = new TextDecoder();
  let content = "";

  for (let index = 0; index < 20; index += 1) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    content += decoder.decode(value, { stream: true });

    if (predicate(content)) {
      await reader.cancel();
      return content;
    }
  }

  await reader.cancel();
  return content;
}

describe("dev command", () => {
  it("serves anlyx.project.json before legacy report data", async () => {
    const projectData = createMinimalProjectData();
    const createdServers: LocalUiServerOptions[] = [];

    const result = await runDevCommand({
      cwd: "/repo",
      open: false,
      dependencies: fakeDependencies({
        readProjectData: async () => projectData,
        readReportData: async () => {
          throw new Error("legacy report should not be read");
        },
        createLocalUiServer: async (options) => {
          createdServers.push(options);
          return { url: `http://localhost:${options.port}` };
        }
      })
    });

    expect(result.projectDataPath).toBe("/repo/anlyx.project.json");
    expect(createdServers[0]?.projectData).toEqual(projectData);
    expect(createdServers[0]?.reportData).toBeUndefined();
  });

  it("does not fall back to legacy report data when project data is missing", async () => {
    const createdServers: LocalUiServerOptions[] = [];

    await withTempDir(async (dir) => {
      await writeReportData(dir, scanResult);

      await expect(
        runDevCommand({
          cwd: dir,
          open: false,
          dependencies: fakeDependencies({
            createLocalUiServer: async (options) => {
              createdServers.push(options);
              return { url: `http://localhost:${options.port}` };
            }
          })
        })
      ).rejects.toThrow(/Create or import "anlyx.project.json" first/);
    });

    expect(createdServers).toHaveLength(0);
  });

  it("does not fall back to legacy report data when project data is invalid", async () => {
    await withTempDir(async (dir) => {
      await writeFile(join(dir, "anlyx.project.json"), "{", "utf8");
      await writeReportData(dir, scanResult);

      await expect(
        runDevCommand({
          cwd: dir,
          open: false,
          dependencies: fakeDependencies()
        })
      ).rejects.toThrow(/Failed to parse Anlyx project data JSON/);
    });
  });

  it("ignores legacy Flow snapshots when project data is missing", async () => {
    await withTempDir(async (dir) => {
      const snapshotsDir = join(dir, ".anlyx", "snapshots");
      await mkdir(snapshotsDir, { recursive: true });
      await writeFile(join(snapshotsDir, "2026-06-26T02-00-00.000Z.flow.json"), "{", "utf8");

      await expect(runDevCommand({ cwd: dir, dependencies: fakeDependencies() })).rejects.toThrow(
        /Create or import "anlyx.project.json" first/
      );
    });
  });

  it("asks for project data when project and legacy report data are missing", async () => {
    await withTempDir(async (dir) => {
      await expect(
        runDevCommand({
          cwd: dir,
          dependencies: fakeDependencies()
        })
      ).rejects.toThrow(/Create or import "anlyx.project.json" first/);
    });
  });

  it("legacy report-data invalid JSON remains explicit when read directly", async () => {
    await withTempDir(async (dir) => {
      await mkdir(join(dir, ".anlyx"), { recursive: true });
      await writeFile(join(dir, ".anlyx", "report-data.json"), "{", "utf8");

      await expect(readReportData(join(dir, ".anlyx", "report-data.json"))).rejects.toThrow(
        /Failed to parse Anlyx report data JSON/
      );
    });
  });

  it("legacy report-data invalid ScanResult schema remains explicit when read directly", async () => {
    await withTempDir(async (dir) => {
      await writeReportData(dir, { ...scanResult, schemaVersion: "2.0" });

      await expect(readReportData(join(dir, ".anlyx", "report-data.json"))).rejects.toThrow(
        /Invalid Anlyx report data/
      );
    });
  });

  it("port priority uses CLI --port over config.server.port", async () => {
    await withTempDir(async (dir) => {
      await writeProjectData(dir, createMinimalProjectData());
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
      await writeProjectData(dir, createMinimalProjectData());
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

  it("falls back to viewer mode when project data exists but no config is present", async () => {
    await withTempDir(async (dir) => {
      await writeProjectData(dir, createMinimalProjectData());
      const seen: Array<{ frontendBaseUrl: string; mode: string; port: number }> = [];
      const opened: string[] = [];

      const result = await runDevCommand({
        cwd: dir,
        dependencies: fakeDependencies({
          async loadConfig() {
            throw new Error(`Anlyx config file not found in ${dir}`);
          },
          createLocalUiServer({ frontendBaseUrl, mode, port }) {
            seen.push({ frontendBaseUrl, mode, port });
            return Promise.resolve({ url: `http://localhost:${port}` });
          },
          openBrowser(url) {
            opened.push(url);
          }
        })
      });

      expect(seen).toEqual([
        { frontendBaseUrl: "http://localhost:4777", mode: "viewer", port: 4777 }
      ]);
      expect(opened).toEqual(["http://localhost:4777"]);
      expect(result).toMatchObject({
        url: "http://localhost:4777",
        mode: "viewer",
        frontendStarted: false
      });
    });
  });

  it("does not hide non-missing config errors", async () => {
    await withTempDir(async (dir) => {
      await writeProjectData(dir, createMinimalProjectData());

      await expect(
        runDevCommand({
          cwd: dir,
          dependencies: fakeDependencies({
            async loadConfig() {
              throw new Error("Anlyx config validation failed");
            }
          })
        })
      ).rejects.toThrow(/Anlyx config validation failed/);
    });
  });

  it("passes frontend base URL and server mode to the local UI server", async () => {
    await withTempDir(async (dir) => {
      await writeProjectData(dir, createMinimalProjectData());
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
      await writeProjectData(dir, createMinimalProjectData());
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
      await writeProjectData(dir, createMinimalProjectData());
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
      await writeProjectData(dir, createMinimalProjectData());
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
    expect(script).toContain(
      "const triggeredBy = passive ? null : findActionForRequest(event.startedAt)"
    );
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
    expect(script).toContain("ANLYX_LAUNCHER_SETTINGS_KEY");
    expect(script).toContain("anlyx-drag-handle");
    expect(script).toContain("anlyx-opacity-control");
    expect(script).toContain("anlyx-language-control");
    expect(script).toContain("anlyx-resize-handle");
    expect(script).toContain("anlyx-fab__mark");
    expect(script).toContain("anlyx-fab__label");
    expect(script).toContain("installDrawerDrag");
    expect(script).toContain("installDrawerResize");
    expect(script).toContain("installLauncherDrag");
    expect(script).toContain("applyLauncherSettings");
    expect(script).toContain("persistLauncherSettings");
    expect(script).toContain("applyDrawerSettings");
    expect(script).toContain("persistDrawerSettings");
  });

  it("keeps the launcher compact until hover, focus, or a captured flow", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("width: 38px");
    expect(script).toContain("max-width: 38px");
    expect(script).toContain(".anlyx-fab:hover");
    expect(script).toContain("launcher.dataset.expanded");
    expect(script).toContain("brieflyExpandLauncher");
    expect(script).toContain("Date.now() + 2600");
  });

  it("keeps the injected overlay lightweight and resilient across app shell changes", () => {
    const script = getOverlayClientScript();

    expect(script).toContain("installOverlayRootGuard");
    expect(script).toContain("new MutationObserver");
    expect(script).toContain("observer.observe(document.body, { childList: true })");
    expect(script).toContain("overlayRootRestoreScheduled");
    expect(script).toContain("overlayInfrastructureInstalled");
    expect(script).toContain("style[data-anlyx-overlay-base]");
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

    expect(harness.order).toEqual([
      "original-fetch:http://localhost:4777/_anlyx/events/page-context",
      "original-fetch:http://localhost:4777/_anlyx/report-data"
    ]);
    expect(harness.timers).toHaveLength(0);
  });

  it("streams browser requests and backend spans as live flow records", async () => {
    const port = await findFreePort();
    const server = await createLocalUiServer({
      port,
      reportData: scanResult,
      viewerRoot: await mkdtemp(join(tmpdir(), "anlyx-viewer-root-")),
      frontendBaseUrl: "http://localhost:3000",
      mode: "viewer"
    });

    try {
      const stream = await fetch(`${server.url}/_anlyx/events/stream`);
      expect(stream.ok).toBe(true);

      const firstEvent = readSseUntil(
        stream,
        (content) =>
          content.includes('"type":"page_context"') &&
          content.includes(
            "backend_observed: development runtime reported server-side method spans"
          )
      );

      const pageContextResponse = await fetch(`${server.url}/_anlyx/events/page-context`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "page_context",
          pageUrl: "http://localhost:3000/ranking?period=weekly",
          contextId: "page:/ranking?period=weekly",
          observedAt: "2026-06-26T00:00:00.000Z"
        })
      });
      expect(pageContextResponse.status).toBe(202);

      const browserResponse = await fetch(`${server.url}/_anlyx/events/browser-request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: "request-1",
          type: "request",
          method: "GET",
          url: "http://localhost:3000/api/public/benefits/123",
          path: "/api/public/benefits/123",
          status: 200,
          durationMs: 82,
          observedAt: "2026-06-26T00:00:00.000Z",
          action: {
            label: "Open benefit",
            selector: "button#open-benefit",
            observedAt: "2026-06-26T00:00:00.000Z"
          }
        })
      });
      expect(browserResponse.status).toBe(202);

      const spansResponse = await fetch(`${server.url}/_anlyx/events/backend-spans`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "backend_spans",
          requestId: "request-1",
          observedAt: "2026-06-26T00:00:00.090Z",
          spans: [
            {
              id: "span:controller",
              type: "controller",
              label: "BenefitController.getBenefit",
              startOffsetMs: 4,
              durationMs: 24,
              evidence: ["runtime.server.span"]
            }
          ]
        })
      });
      expect(spansResponse.status).toBe(202);

      const content = await firstEvent;
      expect(content).toContain('"requestId":"request-1"');
      expect(content).toContain('"pageUrl":"http://localhost:3000/ranking?period=weekly"');
      expect(content).toContain('"contextId":"page:/ranking?period=weekly"');
      expect(content).toContain('"durationMs":24');
      expect(content).toContain('"type":"controller"');
    } finally {
      await server.close?.();
      await closeActiveLocalUiServers();
    }
  });

  it("serves loaded project data from /api/project-data", async () => {
    const port = await findFreePort();
    const viewerRoot = await mkdtemp(join(tmpdir(), "anlyx-viewer-root-"));
    const projectData = createMinimalProjectData();
    const server = await createLocalUiServer({
      port,
      projectData,
      viewerRoot,
      frontendBaseUrl: "http://localhost:3000",
      mode: "viewer"
    });

    try {
      const response = await fetch(`${server.url}/api/project-data`);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual(projectData);
    } finally {
      await server.close?.();
      await rm(viewerRoot, { recursive: true, force: true });
    }
  });

  it("returns 404 for /api/project-data in legacy report mode", async () => {
    const port = await findFreePort();
    const viewerRoot = await mkdtemp(join(tmpdir(), "anlyx-viewer-root-"));
    const server = await createLocalUiServer({
      port,
      reportData: scanResult,
      viewerRoot,
      frontendBaseUrl: "http://localhost:3000",
      mode: "viewer"
    });

    try {
      const response = await fetch(`${server.url}/api/project-data`);

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        error: "Anlyx project data not loaded."
      });
    } finally {
      await server.close?.();
      await rm(viewerRoot, { recursive: true, force: true });
    }
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

    expect(harness.order.indexOf("app-response-returned")).toBeLessThan(
      harness.order.indexOf("drawer-render")
    );
    expect(harness.fetchCalls).toContainEqual(
      expect.objectContaining({
        input: "http://localhost:4777/_anlyx/events/browser-request",
        init: expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"type":"request"')
        })
      })
    );
    const appFetchCall = harness.fetchCalls.find(
      (call) => call.input === "/api/public/benefits/123"
    );
    expect(appFetchCall?.init).toMatchObject({
      headers: expect.objectContaining({
        "X-Anlyx-Request-Id": expect.any(String)
      })
    });
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

  it("keeps automatic account and auth support requests in the background", async () => {
    const harness = createOverlayHarness();
    await harness.flushNextTimer();
    const target = {
      id: "login-button",
      tagName: "BUTTON",
      className: "login",
      name: "",
      textContent: "Login",
      value: "",
      closest() {
        return target;
      },
      getAttribute(name: string) {
        return name === "data-testid" ? "login-button" : null;
      }
    };

    harness.dispatchDocumentEvent("pointerdown", { type: "pointerdown", target });

    await harness.window.fetch("/api/account/me");
    await harness.window.fetch("/api/auth/session");
    await harness.window.fetch("/api/auth/refresh", { method: "POST" });
    await harness.window.fetch("/api/csrf");
    await harness.flushTimers();

    expect(harness.order).not.toContain("drawer-render");
  });

  it("passes scanned page API hints for the current route to the drawer", async () => {
    const reportWithPageApi: ScanResult = {
      ...scanResult,
      pages: [
        {
          id: "page:next:benefit-detail",
          route: "/benefit/[brandSlug]/[benefitSlugWithId]",
          filePath: "src/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx",
          screenshots: [],
          apiCalls: [
            {
              method: "GET",
              path: "/api/public/benefits/{id}",
              endpointId: "endpoint:get:/api/public/benefits/{id}"
            }
          ],
          captureStatus: "pending"
        }
      ]
    };
    const harness = createOverlayHarness({
      report: reportWithPageApi,
      path: "/benefit/starbucks/birthday-coupon-123"
    });
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
    await harness.window.fetch("/api/public/benefits/123");
    await harness.flushTimers();

    const drawerProps = harness.getDrawerProps();
    expect(drawerProps?.scannedHints).toEqual([
      {
        pageRoute: "/benefit/[brandSlug]/[benefitSlugWithId]",
        pageFilePath: "src/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx",
        method: "GET",
        path: "/api/public/benefits/{id}",
        endpointId: "endpoint:get:/api/public/benefits/{id}",
        endpointLabel: "GET /api/public/benefits/{id}",
        evidence: "scanned-page"
      }
    ]);
  });

  it("opens the main drawer for manual React SPA fetch actions without the Next helper", async () => {
    const manualReactReport: ScanResult = {
      ...scanResult,
      endpoints: [
        ...scanResult.endpoints,
        {
          id: "endpoint:get:/api/public/benefits",
          method: "GET",
          path: "/api/public/benefits",
          framework: "spring",
          supportLevel: "deep",
          confidence: "high"
        }
      ],
      flows: [
        ...scanResult.flows,
        {
          endpointId: "endpoint:get:/api/public/benefits",
          nodes: [
            {
              id: "endpoint:get:/api/public/benefits",
              type: "endpoint",
              label: "GET /api/public/benefits",
              confidence: "high"
            }
          ],
          edges: [],
          mainPath: ["endpoint:get:/api/public/benefits"],
          subFlows: []
        }
      ],
      pages: [
        {
          id: "page:manual:benefits",
          route: "/benefits",
          screenshots: [],
          apiCalls: [],
          captureStatus: "pending"
        }
      ]
    };
    const harness = createOverlayHarness({
      report: manualReactReport,
      path: "/benefits"
    });
    await harness.flushNextTimer();
    const target = {
      id: "load-benefits",
      tagName: "BUTTON",
      className: "load-benefits",
      name: "",
      textContent: "Load benefits",
      value: "",
      closest() {
        return target;
      },
      getAttribute(name: string) {
        return name === "data-testid" ? "load-benefits" : null;
      }
    };

    harness.dispatchDocumentEvent("pointerdown", { type: "pointerdown", target });
    const response = await harness.window.fetch("/api/public/benefits");
    harness.order.push("react-spa-response-returned");

    expect(response.status).toBe(200);
    expect(harness.order).not.toContain("drawer-render");

    await harness.flushTimers();

    const drawerProps = harness.getDrawerProps();
    expect(harness.order.indexOf("react-spa-response-returned")).toBeLessThan(
      harness.order.indexOf("drawer-render")
    );
    expect(drawerProps?.selectedEvent).toMatchObject({
      method: "GET",
      path: "/api/public/benefits",
      source: "action",
      matchedEndpoint: {
        id: "endpoint:get:/api/public/benefits",
        path: "/api/public/benefits"
      },
      matchedFlow: {
        endpointId: "endpoint:get:/api/public/benefits"
      },
      triggeredBy: {
        type: "Clicked",
        label: "Load benefits",
        selector: "button#load-benefits"
      }
    });
  });

  it("loads the React drawer bundle only after the drawer opens", () => {
    const script = getOverlayClientScript();
    const mountBlock = script.slice(
      script.indexOf("function mountOverlayUi()"),
      script.indexOf("function installOverlayRootGuard()")
    );
    const renderBlock = script.slice(
      script.indexOf("function render()"),
      script.indexOf("function renderReactDrawer")
    );

    expect(mountBlock).not.toContain("loadOverlayUiAssets()");
    expect(renderBlock).toContain("if (!state.open)");
    expect(renderBlock).toContain("return;");
    expect(script).toContain("function getLatestAction()");
    expect(script).toContain("function getScannedHints()");
    expect(script).toContain("routeToRegex(page.route).test(pathname)");
    expect(script).toContain("renderReactDrawer(selected, getLatestAction())");
    expect(script).toContain("function renderReactDrawer(selected, latestAction)");
    expect(script).toContain("scannedHints: getScannedHints()");
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
      await writeProjectData(dir, createMinimalProjectData());
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
      await writeProjectData(dir, createMinimalProjectData());
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

  it("help text includes Flow JSON commands and dev", () => {
    const help = getHelpText();

    expect(help).toContain("anlyx init");
    expect(help).toContain("anlyx validate <file>");
    expect(help).toContain("anlyx import <file> [--out <dir>]");
    expect(help).not.toContain("anlyx scan");
    expect(help).toContain("anlyx dev");
  });

  it("invalid command reports clear usage without running dev", async () => {
    await withTempDir(async (dir) => {
      const writes: string[] = [];
      const exitCode = await runCli(["unknown"], {
        cwd: dir,
        write: (message) => writes.push(message),
        dependencies: fakeDependencies()
      });

      expect(exitCode).toBe(1);
      expect(writes.join("\n")).toContain("Unknown command: unknown");
      expect(writes.join("\n")).toContain("Available commands: init, validate, import, dev");
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

  it("readProjectData reads single-file anlyx.project.json", async () => {
    await withTempDir(async (dir) => {
      const data = createMinimalProjectData();
      await writeProjectData(dir, data);

      await expect(readProjectData(join(dir, "anlyx.project.json"))).resolves.toEqual(data);
    });
  });

  it("readProjectData reads split project files", async () => {
    await withTempDir(async (dir) => {
      const projectDir = join(dir, ".anlyx", "project");
      await mkdir(projectDir, { recursive: true });
      await writeFile(
        join(projectDir, "index.json"),
        JSON.stringify({
          schemaVersion: "0.2.0",
          project: { id: "app", name: "App" }
        }),
        "utf8"
      );
      await writeFile(
        join(projectDir, "pages.json"),
        JSON.stringify([{ id: "page.home", path: "/", title: "Home", featureIds: [] }]),
        "utf8"
      );
      await writeFile(
        join(projectDir, "dictionary.json"),
        JSON.stringify({
          defaultLanguage: "ko",
          terms: [{ id: "term.home", term: "홈", definition: "서비스 진입 페이지" }]
        }),
        "utf8"
      );

      await expect(readProjectData(join(projectDir, "index.json"))).resolves.toMatchObject({
        project: { name: "App" },
        pages: [{ title: "Home" }],
        dictionary: {
          defaultLanguage: "ko",
          terms: [{ term: "홈" }]
        }
      });
    });
  });
});

async function writeReportData(dir: string, data: unknown): Promise<void> {
  await mkdir(join(dir, ".anlyx"), { recursive: true });
  await writeFile(join(dir, ".anlyx", "report-data.json"), JSON.stringify(data), "utf8");
}

async function writeProjectData(dir: string, data: unknown): Promise<void> {
  await writeFile(join(dir, "anlyx.project.json"), JSON.stringify(data), "utf8");
}

function createMinimalProjectData(): ProjectData {
  return {
    schemaVersion: "0.2.0",
    project: {
      id: "app",
      name: "App",
      frameworkNotes: []
    },
    areas: [],
    pages: [],
    features: [],
    requests: [],
    flows: [],
    architecture: { nodes: [], edges: [] },
    evidence: [],
    measurements: [],
    dictionary: { defaultLanguage: "en", terms: [] }
  };
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
