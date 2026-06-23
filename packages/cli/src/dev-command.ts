import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scanResultSchema, type NormalizedAnlyxConfig, type ScanResult } from "@anlyx/core";
import { createServer, type ViteDevServer } from "vite";

import { loadConfig } from "./config-loader.js";
import { runScanCommand } from "./scan-command.js";

const require = createRequire(import.meta.url);

export type DevCommandOptions = {
  cwd?: string;
  configPath?: string;
  outputDir?: string;
  port?: number;
  open?: boolean;
  dependencies?: DevCommandDependencies;
};

export type DevCommandResult = {
  url: string;
  port: number;
  reportDataPath: string;
  mode: "inject" | "overlay" | "viewer";
  frontendUrl?: string;
  scriptTag?: string;
  frontendStarted: boolean;
  scanRan: boolean;
};

export type DevCommandDependencies = {
  loadConfig?: typeof loadConfig;
  readReportData?: (path: string) => Promise<ScanResult>;
  runScanCommand?: typeof runScanCommand;
  createLocalUiServer?: (options: LocalUiServerOptions) => Promise<LocalUiServer>;
  isFrontendReachable?: (url: string) => Promise<boolean>;
  startFrontendDevServer?: (options: StartFrontendDevServerOptions) => FrontendDevServerProcess;
  openBrowser?: (url: string) => Promise<void> | void;
};

export type LocalUiServerOptions = {
  port: number;
  reportData: ScanResult;
  viewerRoot: string;
  frontendBaseUrl: string;
  mode: "inject" | "overlay" | "viewer";
};

export type LocalUiServer = {
  url: string;
  close?: () => Promise<void> | void;
};

export type StartFrontendDevServerOptions = {
  command: string;
  cwd: string;
};

export type FrontendDevServerProcess = {
  stop?: () => Promise<void> | void;
};

type RequiredDevCommandDependencies = Required<DevCommandDependencies>;

const activeLocalUiServers = new Set<LocalUiServer>();

export async function runDevCommand(options: DevCommandOptions = {}): Promise<DevCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const dependencies = withDefaultDependencies(options.dependencies);
  const config = await dependencies.loadConfig({
    cwd,
    ...(options.configPath ? { configPath: options.configPath } : {})
  });
  const outputDir = resolve(cwd, options.outputDir ?? ".anlyx");
  const reportDataPath = join(outputDir, "report-data.json");
  const { reportData, scanRan } = await ensureReportData({
    cwd,
    reportDataPath,
    dependencies,
    ...(options.configPath ? { configPath: options.configPath } : {}),
    ...(options.outputDir ? { outputDir: options.outputDir } : {})
  });
  const frontendStarted = await ensureFrontendDevServer({
    cwd,
    config,
    dependencies
  });
  const port = options.port ?? getConfiguredPort(config);
  const server = await dependencies.createLocalUiServer({
    port,
    reportData,
    viewerRoot: getViewerRoot(),
    frontendBaseUrl: config.frontend.baseUrl,
    mode: config.server.mode
  });
  activeLocalUiServers.add(server);
  const shouldOpenBrowser = options.open ?? config.server.openBrowser;

  const browserUrl = config.server.mode === "inject" ? config.frontend.baseUrl : server.url;

  if (shouldOpenBrowser) {
    await dependencies.openBrowser(browserUrl);
  }

  return {
    url: server.url,
    port,
    reportDataPath,
    mode: config.server.mode,
    frontendStarted,
    scanRan,
    ...(config.server.mode === "inject" ? { frontendUrl: config.frontend.baseUrl } : {}),
    ...(config.server.mode === "inject" ? { scriptTag: getOverlayScriptTag(server.url) } : {})
  };
}

export async function closeActiveLocalUiServers(): Promise<void> {
  const servers = Array.from(activeLocalUiServers);
  activeLocalUiServers.clear();
  await Promise.all(
    servers.map(async (server) => {
      await server.close?.();
    })
  );
}

async function ensureReportData(options: {
  cwd: string;
  configPath?: string;
  outputDir?: string;
  reportDataPath: string;
  dependencies: RequiredDevCommandDependencies;
}): Promise<{ reportData: ScanResult; scanRan: boolean }> {
  try {
    return {
      reportData: await options.dependencies.readReportData(options.reportDataPath),
      scanRan: false
    };
  } catch (error) {
    if (!isMissingReportDataError(error)) {
      throw error;
    }
  }

  try {
    await options.dependencies.runScanCommand({
      cwd: options.cwd,
      ...(options.configPath ? { configPath: options.configPath } : {}),
      ...(options.outputDir ? { outputDir: options.outputDir } : {}),
      skipCapture: true
    });
  } catch (error) {
    throw new Error(
      `Automatic scan failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  return {
    reportData: await options.dependencies.readReportData(options.reportDataPath),
    scanRan: true
  };
}

async function ensureFrontendDevServer(options: {
  cwd: string;
  config: NormalizedAnlyxConfig;
  dependencies: RequiredDevCommandDependencies;
}): Promise<boolean> {
  const command = options.config.dev?.command;

  if (!command) {
    return false;
  }

  if (await options.dependencies.isFrontendReachable(options.config.frontend.baseUrl)) {
    return false;
  }

  options.dependencies.startFrontendDevServer({
    command,
    cwd: options.cwd
  });

  return true;
}

function isMissingReportDataError(error: unknown): boolean {
  return error instanceof Error && /Run "anlyx scan" first/.test(error.message);
}

export async function readReportData(path: string): Promise<ScanResult> {
  let content: string;

  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error(`Anlyx report data not found: ${path}. Run "anlyx scan" first.`);
    }

    throw error;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse Anlyx report data JSON at ${path}: ${
        error instanceof Error ? error.message : "invalid JSON"
      }`
    );
  }

  const result = scanResultSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const issuePath = issue.path.length > 0 ? issue.path.join(".") : "report-data";
        return `${issuePath}: ${issue.message}`;
      })
      .join("; ");

    throw new Error(`Invalid Anlyx report data at ${path}: ${issues}`);
  }

  return result.data;
}

export async function createLocalUiServer(options: LocalUiServerOptions): Promise<LocalUiServer> {
  const viteServer = await createServer({
    root: options.viewerRoot,
    appType: "spa",
    server: {
      host: "127.0.0.1",
      port: options.port,
      strictPort: true
    },
    plugins: [createAnlyxDevPlugin(options)]
  });

  await viteServer.listen();

  return {
    url: `http://localhost:${options.port}`,
    close: () => viteServer.close()
  };
}

export async function openBrowser(url: string): Promise<void> {
  const { command, args } = getOpenBrowserCommand(url);
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore"
  });

  child.unref();
}

export async function isFrontendReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function startFrontendDevServer(
  options: StartFrontendDevServerOptions
): FrontendDevServerProcess {
  const child = spawn(options.command, {
    cwd: options.cwd,
    shell: true,
    stdio: "inherit"
  });

  return {
    stop: () => {
      if (!child.killed) {
        child.kill();
      }
    }
  };
}

function createAnlyxDevPlugin(options: LocalUiServerOptions) {
  return {
    name: "anlyx-dev-runtime",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((request, response, next) => {
        if (request.method === "GET" && options.mode === "viewer" && request.url === "/") {
          request.url = "/viewer.html";
        }

        next();
      });

      server.middlewares.use(async (request, response, next) => {
        const requestUrl = request.url ?? "/";

        if (request.method === "OPTIONS" && isAnlyxPath(requestUrl)) {
          response.statusCode = 204;
          setCorsHeaders(response);
          response.end();
          return;
        }

        if (request.method === "GET" && isReportDataPath(requestUrl)) {
          sendJson(response, options.reportData);
          return;
        }

        if (request.method === "GET" && requestUrl === "/_anlyx/overlay.js") {
          response.statusCode = 200;
          setCorsHeaders(response);
          response.setHeader("content-type", "application/javascript; charset=utf-8");
          response.end(getOverlayClientScript());
          return;
        }

        if (request.method === "GET" && requestUrl === "/_anlyx/overlay-ui.js") {
          await sendRuntimeAsset(response, join(options.viewerRoot, "../overlay/overlay-ui.js"), "application/javascript; charset=utf-8");
          return;
        }

        if (request.method === "GET" && requestUrl === "/_anlyx/overlay-ui.css") {
          await sendRuntimeAsset(response, join(options.viewerRoot, "../overlay/overlay-ui.css"), "text/css; charset=utf-8");
          return;
        }

        if (request.method === "GET" && options.mode === "inject" && requestUrl === "/") {
          response.statusCode = 200;
          response.setHeader("content-type", "text/html; charset=utf-8");
          response.end(
            getInjectModeHtml(
              options.frontendBaseUrl,
              getOverlayScriptTag(getServerUrl(options.port))
            )
          );
          return;
        }

        if (request.method === "GET" && isStandaloneViewerPath(requestUrl)) {
          request.url = "/viewer.html";
          next();
          return;
        }

        if (options.mode === "viewer" || options.mode === "inject") {
          next();
          return;
        }

        if (isAnlyxPath(requestUrl)) {
          response.statusCode = 404;
          response.setHeader("content-type", "text/plain; charset=utf-8");
          response.end("Anlyx runtime asset not found.");
          return;
        }

        await proxyToFrontend(request, response, options.frontendBaseUrl);
      });
    }
  };
}

function isReportDataPath(path: string): boolean {
  return path === "/_anlyx/report-data" || path === "/api/report-data";
}

function isStandaloneViewerPath(path: string): boolean {
  return path === "/_anlyx/viewer" || path === "/_anlyx/viewer.html";
}

function isAnlyxPath(path: string): boolean {
  return path.startsWith("/_anlyx/");
}

function sendJson(response: ServerResponse, value: unknown) {
  response.statusCode = 200;
  setCorsHeaders(response);
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

async function sendRuntimeAsset(
  response: ServerResponse,
  path: string,
  contentType: string
): Promise<void> {
  try {
    const content = await readFile(path);
    response.statusCode = 200;
    setCorsHeaders(response);
    response.setHeader("content-type", contentType);
    response.end(content);
  } catch {
    response.statusCode = 404;
    setCorsHeaders(response);
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("Anlyx runtime asset not found.");
  }
}

function setCorsHeaders(response: ServerResponse) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function getServerUrl(port: number): string {
  return `http://localhost:${port}`;
}

async function proxyToFrontend(
  request: IncomingMessage,
  response: ServerResponse,
  frontendBaseUrl: string
): Promise<void> {
  const targetUrl = buildProxyTargetUrl(frontendBaseUrl, request.url ?? "/");
  const method = request.method ?? "GET";

  try {
    const requestInit: RequestInit = {
      method,
      headers: getProxyRequestHeaders(request),
      redirect: "manual"
    };

    if (method !== "GET" && method !== "HEAD") {
      const body = await readRequestBody(request);

      if (body !== undefined) {
        requestInit.body = body.buffer.slice(
          body.byteOffset,
          body.byteOffset + body.byteLength
        ) as ArrayBuffer;
      }
    }

    const upstream = await fetch(targetUrl, requestInit);

    response.statusCode = upstream.status;
    response.statusMessage = upstream.statusText;

    upstream.headers.forEach((value, key) => {
      if (!shouldOmitProxyResponseHeader(key)) {
        response.setHeader(key, value);
      }
    });

    const contentType = upstream.headers.get("content-type") ?? "";

    if (method === "GET" && contentType.includes("text/html")) {
      const html = await upstream.text();
      response.setHeader("content-type", contentType);
      response.end(injectOverlayScript(html));
      return;
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    response.end(body);
  } catch (error) {
    response.statusCode = 502;
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(getProxyErrorHtml(frontendBaseUrl, error));
  }
}

export function buildProxyTargetUrl(frontendBaseUrl: string, requestUrl: string): string {
  const base = new URL(frontendBaseUrl);
  const target = new URL(requestUrl, base);
  target.protocol = base.protocol;
  target.host = base.host;
  return target.toString();
}

export function injectOverlayScript(html: string): string {
  if (html.includes("/_anlyx/overlay.js")) {
    return html;
  }

  const script = '<script src="/_anlyx/overlay.js" defer></script>';

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}</body>`);
  }

  return `${html}${script}`;
}

export function getOverlayScriptTag(serverUrl: string): string {
  return `<script src="${serverUrl}/_anlyx/overlay.js" defer></script>`;
}

function getInjectModeHtml(frontendBaseUrl: string, scriptTag: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Anlyx Inject Mode</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
      main { width: min(760px, calc(100vw - 32px)); border: 1px solid #dbe4f0; border-radius: 16px; background: white; box-shadow: 0 18px 60px rgba(15, 23, 42, 0.12); padding: 28px; }
      h1 { margin: 0 0 10px; font-size: 22px; line-height: 1.25; }
      p { margin: 8px 0; color: #475569; line-height: 1.55; }
      pre { overflow: auto; border-radius: 12px; background: #0f172a; color: #e2e8f0; padding: 14px; font-size: 13px; line-height: 1.5; }
      a { color: #2563eb; font-weight: 800; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>Anlyx runtime is ready</h1>
      <p>Open your real frontend at <a href="${escapeHtml(frontendBaseUrl)}">${escapeHtml(frontendBaseUrl)}</a> and inject this local-only script into the app during development.</p>
      <pre>${escapeHtml(scriptTag)}</pre>
      <p>The standalone debug viewer is still available at <a href="/_anlyx/viewer">/_anlyx/viewer</a>.</p>
    </main>
  </body>
</html>`;
}

function getProxyRequestHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined || shouldOmitProxyRequestHeader(key)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
      continue;
    }

    headers.set(key, value);
  }

  return headers;
}

function shouldOmitProxyRequestHeader(key: string): boolean {
  return ["host", "connection", "content-length"].includes(key.toLowerCase());
}

function shouldOmitProxyResponseHeader(key: string): boolean {
  return ["connection", "content-encoding", "content-length", "transfer-encoding"].includes(
    key.toLowerCase()
  );
}

function readRequestBody(request: IncomingMessage): Promise<Buffer | undefined> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("end", () => {
      resolveBody(chunks.length > 0 ? Buffer.concat(chunks) : undefined);
    });
    request.on("error", reject);
  });
}

function getProxyErrorHtml(frontendBaseUrl: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown proxy error";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Anlyx proxy error</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
      main { width: min(560px, calc(100vw - 32px)); border: 1px solid #dbe4f0; border-radius: 16px; background: white; box-shadow: 0 18px 60px rgba(15, 23, 42, 0.12); padding: 28px; }
      h1 { margin: 0 0 10px; font-size: 22px; line-height: 1.25; }
      p { margin: 8px 0; color: #475569; line-height: 1.55; }
      code { border-radius: 8px; background: #eef4ff; color: #1d4ed8; padding: 2px 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Anlyx could not reach the frontend app</h1>
      <p>Overlay Mode proxies your configured frontend at <code>${escapeHtml(frontendBaseUrl)}</code>.</p>
      <p>Start the frontend dev server, then refresh this page. The standalone viewer is still available at <code>/_anlyx/viewer</code>.</p>
      <p>${escapeHtml(message)}</p>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getOverlayClientScript(): string {
  return String.raw`
(() => {
  if (window.__ANLYX_OVERLAY_INSTALLED__) {
    return;
  }
  window.__ANLYX_OVERLAY_INSTALLED__ = true;

  const state = {
    report: null,
    events: [],
    actions: [],
    selectedEventId: null,
    open: false,
    loadError: null
  };

  let drawer = null;
  let body = null;
  let overlayUiReady = false;
  let overlayUiLoading = false;
  let overlayRootGuardInstalled = false;
  let overlayRootRestoreScheduled = false;
  let overlayInfrastructureInstalled = false;
  const endpointRegexCache = new Map();
  const currentScript = document.currentScript;
  const runtimeBaseUrl = currentScript && currentScript.src ? new URL(currentScript.src).origin : window.location.origin;
  const ANLYX_PENDING_ACTION_KEY = "__anlyx_pending_action__";
  const ANLYX_DRAWER_SETTINGS_KEY = "__anlyx_drawer_settings__";
  const drawerSettings = Object.assign({
    width: 600,
    height: 760,
    x: null,
    y: 12,
    opacity: 0.98,
    language: "en"
  }, restoreDrawerSettings());

  scheduleOverlayMount();

  function scheduleOverlayMount() {
    const mount = () => window.setTimeout(mountOverlayUi, 0);

    if (document.body) {
      mount();
      return;
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount, { once: true });
      return;
    }

    mount();
  }

  function mountOverlayUi() {
    const existingRoot = document.getElementById("anlyx-overlay-root");
    if (existingRoot) {
      drawer = existingRoot.querySelector(".anlyx-drawer");
      body = existingRoot.querySelector(".anlyx-body");
      if (drawer && body) {
        installOverlayRootGuard();
        render();
        return;
      }
      existingRoot.remove();
    }

    if (!document.body) {
      return;
    }

    if (!document.querySelector("style[data-anlyx-overlay-base]")) {
      const style = document.createElement("style");
      style.setAttribute("data-anlyx-overlay-base", "true");
      style.textContent = ${"`"}
    #anlyx-overlay-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; }
    .anlyx-fab { pointer-events: auto; position: absolute; right: 18px; bottom: 18px; height: 42px; min-width: 92px; border: 1px solid rgba(255,255,255,.24); border-radius: 999px; background: #2563eb; color: white; font-weight: 850; font-size: 13px; box-shadow: 0 18px 50px rgba(37, 99, 235, 0.28); cursor: pointer; }
    .anlyx-drawer { pointer-events: auto; position: absolute; top: 12px; left: auto; right: auto; width: 600px; height: min(760px, calc(100vh - 24px)); min-width: 420px; min-height: 420px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); border: 1px solid rgba(15, 23, 42, .12); border-radius: 18px; background: rgba(248, 250, 252, .98); box-shadow: 0 24px 80px rgba(15, 23, 42, 0.22); overflow: hidden; display: none; }
    .anlyx-drawer[data-open="true"] { display: grid; grid-template-rows: auto minmax(0, 1fr); }
    .anlyx-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 12px 14px; border-bottom: 1px solid rgba(15, 23, 42, .08); background: rgba(255,255,255,.88); }
    .anlyx-drag-handle { min-width: 0; cursor: grab; user-select: none; }
    .anlyx-drag-handle:active { cursor: grabbing; }
    .anlyx-title { margin: 0; font-size: 15px; line-height: 1.2; font-weight: 900; letter-spacing: 0; }
    .anlyx-subtitle { margin: 3px 0 0; font-size: 11px; color: #64748b; font-weight: 650; }
    .anlyx-shell-controls { display: flex; align-items: center; gap: 7px; }
    .anlyx-shell-field { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 8px; border: 1px solid #e2e8f0; border-radius: 10px; background: rgba(255,255,255,.9); color: #475569; font-size: 10px; font-weight: 800; white-space: nowrap; }
    .anlyx-opacity-control { width: 70px; accent-color: #2563eb; }
    .anlyx-language-control { width: 58px; border: 0; outline: 0; background: transparent; color: #0f172a; font-size: 10px; font-weight: 900; }
    .anlyx-close { border: 1px solid #e2e8f0; background: #fff; border-radius: 10px; width: 32px; height: 32px; cursor: pointer; font-size: 17px; line-height: 1; color: #0f172a; box-shadow: 0 1px 2px rgba(15, 23, 42, .06); }
    .anlyx-body { overflow: auto; padding: 12px; background: #f8fafc; }
    .anlyx-resize-handle { position: absolute; left: 0; bottom: 0; width: 22px; height: 22px; cursor: nesw-resize; opacity: .62; }
    .anlyx-resize-handle::before { content: ""; position: absolute; left: 6px; bottom: 6px; width: 10px; height: 10px; border-left: 2px solid #94a3b8; border-bottom: 2px solid #94a3b8; border-radius: 0 0 0 3px; }
    .anlyx-section { border: 1px solid rgba(15, 23, 42, .08); border-radius: 14px; background: #fff; margin-bottom: 10px; overflow: hidden; box-shadow: 0 1px 2px rgba(15, 23, 42, .04); }
    .anlyx-section-title { margin: 0; padding: 10px 12px; font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: .08em; border-bottom: 1px solid #eef2f7; font-weight: 900; }
    .anlyx-empty { padding: 18px 12px; color: #667085; font-size: 13px; line-height: 1.5; }
    @media (max-width: 700px) {
      .anlyx-drawer { min-width: 0; width: calc(100vw - 16px); height: calc(100vh - 16px); border-radius: 14px; }
      .anlyx-head { grid-template-columns: 1fr; }
      .anlyx-shell-controls { justify-content: space-between; }
    }
  ${"`"};
      document.head.appendChild(style);
    }

    const root = document.createElement("div");
    root.id = "anlyx-overlay-root";
    root.innerHTML = ${"`"}
    <button class="anlyx-fab" type="button" aria-label="Open Anlyx">Anlyx</button>
    <aside class="anlyx-drawer" aria-label="Anlyx flow drawer">
      <div class="anlyx-head">
        <div class="anlyx-drag-handle" data-anlyx-label="Move Anlyx drawer">
          <h2 class="anlyx-title">Anlyx Flow Drawer</h2>
          <p class="anlyx-subtitle">Click the real app and inspect the API flow.</p>
        </div>
        <div class="anlyx-shell-controls">
          <label class="anlyx-shell-field">
            <span class="anlyx-opacity-label">Opacity</span>
            <input class="anlyx-opacity-control" type="range" min="70" max="100" step="5" aria-label="Anlyx opacity" />
          </label>
          <label class="anlyx-shell-field">
            <span class="anlyx-language-label">Lang</span>
            <select class="anlyx-language-control" aria-label="Anlyx language">
              <option value="en">EN</option>
              <option value="ko">KO</option>
            </select>
          </label>
          <button class="anlyx-close" type="button" aria-label="Close Anlyx">×</button>
        </div>
      </div>
      <div class="anlyx-body"></div>
      <div class="anlyx-resize-handle" role="separator" aria-label="Resize Anlyx drawer"></div>
    </aside>
  ${"`"};
    document.body.appendChild(root);

    const button = root.querySelector(".anlyx-fab");
    drawer = root.querySelector(".anlyx-drawer");
    body = root.querySelector(".anlyx-body");
    const closeButton = root.querySelector(".anlyx-close");
    const opacityControl = root.querySelector(".anlyx-opacity-control");
    const languageControl = root.querySelector(".anlyx-language-control");
    const dragHandle = root.querySelector(".anlyx-drag-handle");
    const resizeHandle = root.querySelector(".anlyx-resize-handle");

    button.addEventListener("click", () => {
      state.open = !state.open;
      render();
    });
    closeButton.addEventListener("click", () => {
      state.open = false;
      render();
    });
    if (opacityControl) {
      opacityControl.addEventListener("input", () => {
        drawerSettings.opacity = Number(opacityControl.value || 98) / 100;
        applyDrawerSettings();
        persistDrawerSettings();
      });
    }
    if (languageControl) {
      languageControl.addEventListener("change", () => {
        drawerSettings.language = languageControl.value === "ko" ? "ko" : "en";
        applyDrawerSettings();
        persistDrawerSettings();
      });
    }
    installDrawerDrag(dragHandle);
    installDrawerResize(resizeHandle);
    applyDrawerSettings();

    installOverlayRootGuard();

    if (!overlayInfrastructureInstalled) {
      overlayInfrastructureInstalled = true;
      restorePendingAction();
      installUserActionTracker(root);
      installFetchInterceptor();
      installXhrInterceptor();
      loadReport();
    }

    render();
  }

  function applyDrawerSettings() {
    if (!drawer) {
      return;
    }
    const viewportWidth = window.innerWidth || 1280;
    const viewportHeight = window.innerHeight || 800;
    const width = clamp(Number(drawerSettings.width) || 600, Math.min(420, viewportWidth - 16), viewportWidth - 16);
    const height = clamp(Number(drawerSettings.height) || 760, Math.min(420, viewportHeight - 16), viewportHeight - 16);
    const defaultX = viewportWidth - width - 12;
    const x = clamp(drawerSettings.x === null ? defaultX : Number(drawerSettings.x), 8, viewportWidth - width - 8);
    const y = clamp(Number(drawerSettings.y) || 12, 8, viewportHeight - height - 8);
    drawerSettings.width = Math.round(width);
    drawerSettings.height = Math.round(height);
    drawerSettings.x = Math.round(x);
    drawerSettings.y = Math.round(y);
    drawerSettings.opacity = clamp(Number(drawerSettings.opacity) || 0.98, 0.7, 1);
    drawer.style.width = drawerSettings.width + "px";
    drawer.style.height = drawerSettings.height + "px";
    drawer.style.left = drawerSettings.x + "px";
    drawer.style.top = drawerSettings.y + "px";
    drawer.style.opacity = String(drawerSettings.opacity);

    const opacityControl = document.querySelector("#anlyx-overlay-root .anlyx-opacity-control");
    const languageControl = document.querySelector("#anlyx-overlay-root .anlyx-language-control");
    if (opacityControl) {
      opacityControl.value = String(Math.round(drawerSettings.opacity * 100));
    }
    if (languageControl) {
      languageControl.value = drawerSettings.language === "ko" ? "ko" : "en";
    }
    applyDrawerLanguage();
  }

  function applyDrawerLanguage() {
    const isKo = drawerSettings.language === "ko";
    const title = document.querySelector("#anlyx-overlay-root .anlyx-title");
    const subtitle = document.querySelector("#anlyx-overlay-root .anlyx-subtitle");
    const opacityLabel = document.querySelector("#anlyx-overlay-root .anlyx-opacity-label");
    const languageLabel = document.querySelector("#anlyx-overlay-root .anlyx-language-label");
    if (title) {
      title.textContent = isKo ? "Anlyx 플로우 드로어" : "Anlyx Flow Drawer";
    }
    if (subtitle) {
      subtitle.textContent = isKo ? "앱을 그대로 사용하며 API 흐름을 확인하세요." : "Click the real app and inspect the API flow.";
    }
    if (opacityLabel) {
      opacityLabel.textContent = isKo ? "투명도" : "Opacity";
    }
    if (languageLabel) {
      languageLabel.textContent = isKo ? "언어" : "Lang";
    }
  }

  function installDrawerDrag(handle) {
    if (!handle || !drawer) {
      return;
    }
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      const startX = event.clientX;
      const startY = event.clientY;
      const initialX = Number(drawerSettings.x) || drawer.getBoundingClientRect().left;
      const initialY = Number(drawerSettings.y) || drawer.getBoundingClientRect().top;
      const onMove = (moveEvent) => {
        drawerSettings.x = initialX + moveEvent.clientX - startX;
        drawerSettings.y = initialY + moveEvent.clientY - startY;
        applyDrawerSettings();
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        persistDrawerSettings();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    });
  }

  function installDrawerResize(handle) {
    if (!handle || !drawer) {
      return;
    }
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const initialX = Number(drawerSettings.x) || drawer.getBoundingClientRect().left;
      const initialWidth = Number(drawerSettings.width) || drawer.getBoundingClientRect().width;
      const initialHeight = Number(drawerSettings.height) || drawer.getBoundingClientRect().height;
      const onMove = (moveEvent) => {
        const width = initialWidth - (moveEvent.clientX - startX);
        drawerSettings.width = width;
        drawerSettings.height = initialHeight + moveEvent.clientY - startY;
        drawerSettings.x = initialX + initialWidth - width;
        applyDrawerSettings();
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        persistDrawerSettings();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    });
  }

  function restoreDrawerSettings() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(ANLYX_DRAWER_SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function persistDrawerSettings() {
    try {
      if (window.localStorage) {
        window.localStorage.setItem(ANLYX_DRAWER_SETTINGS_KEY, JSON.stringify(drawerSettings));
      }
    } catch {
      // Ignore storage failures in strict browser privacy modes.
    }
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function installOverlayRootGuard() {
    if (overlayRootGuardInstalled || !document.body || !window.MutationObserver) {
      return;
    }
    overlayRootGuardInstalled = true;
    const observer = new MutationObserver(() => {
      if (!document.body || document.getElementById("anlyx-overlay-root") || overlayRootRestoreScheduled) {
        return;
      }
      overlayRootRestoreScheduled = true;
      window.setTimeout(() => {
        overlayRootRestoreScheduled = false;
        mountOverlayUi();
      }, 50);
    });
    observer.observe(document.body, { childList: true });
  }

  function loadOverlayUiAssets() {
    if (!document.querySelector("link[data-anlyx-overlay-ui]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = runtimeBaseUrl + "/_anlyx/overlay-ui.css";
      link.setAttribute("data-anlyx-overlay-ui", "true");
      document.head.appendChild(link);
    }

    if (window.__ANLYX_RENDER_FLOW_DRAWER__) {
      overlayUiReady = true;
      return;
    }

    if (overlayUiLoading) {
      return;
    }

    overlayUiLoading = true;
    const script = document.createElement("script");
    script.src = runtimeBaseUrl + "/_anlyx/overlay-ui.js";
    script.defer = true;
    script.onload = () => {
      overlayUiReady = true;
      render();
    };
    script.onerror = () => {
      overlayUiReady = false;
      render();
    };
    document.head.appendChild(script);
  }

  async function loadReport() {
    try {
      const response = await fetch(runtimeBaseUrl + "/_anlyx/report-data");
      if (!response.ok) {
        throw new Error("Report data request failed with status " + response.status);
      }
      state.report = await response.json();
      render();
    } catch (error) {
      state.loadError = error instanceof Error ? error.message : "Failed to load report data";
      render();
    }
  }

  function installFetchInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = async function anlyxFetch(input, init) {
      const method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
      const url = typeof input === "string" ? input : input && input.url;
      const startedAt = performance.now();
      try {
        const response = await originalFetch.apply(this, arguments);
        if (shouldTrackRequestUrl(url)) {
          scheduleApiEventRecord({ method, url, status: response.status, durationMs: performance.now() - startedAt, startedAt });
        }
        return response;
      } catch (error) {
        if (shouldTrackRequestUrl(url)) {
          scheduleApiEventRecord({ method, url, status: "failed", durationMs: performance.now() - startedAt, startedAt });
        }
        throw error;
      }
    };
  }

  function installUserActionTracker(root) {
    document.addEventListener("pointerdown", (event) => captureUserAction(event, root), true);
    document.addEventListener("click", (event) => captureUserAction(event, root), true);
    document.addEventListener("submit", (event) => captureUserAction(event, root), true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        captureUserAction(event, root);
      }
    }, true);
  }

  function captureUserAction(event, root) {
    const target = getActionTarget(event.target);
    if (!target || root.contains(target)) {
      return;
    }

    const action = {
      id: String(Date.now()) + "-" + Math.random().toString(36).slice(2),
      type: getActionType(event, target),
      label: getActionLabel(target),
      selector: getElementPath(target),
      at: performance.now(),
      capturedAt: Date.now()
    };
    rememberAction(action);
    persistPendingAction(action);
  }

  function rememberAction(action) {
    state.actions = [action].concat(state.actions).slice(0, 20);
  }

  function persistPendingAction(action) {
    try {
      window.sessionStorage.setItem(ANLYX_PENDING_ACTION_KEY, JSON.stringify(action));
    } catch {
      // Ignore storage failures in strict browser privacy modes.
    }
  }

  function restorePendingAction() {
    try {
      const raw = window.sessionStorage.getItem(ANLYX_PENDING_ACTION_KEY);
      if (!raw) {
        return;
      }
      const action = JSON.parse(raw);
      if (isFreshAction(action)) {
        rememberAction(Object.assign({}, action, { at: performance.now() }));
        return;
      }
      window.sessionStorage.removeItem(ANLYX_PENDING_ACTION_KEY);
    } catch {
      try {
        window.sessionStorage.removeItem(ANLYX_PENDING_ACTION_KEY);
      } catch {
        // Ignore storage cleanup failures.
      }
    }
  }

  function isFreshAction(action) {
    return action && action.capturedAt && Date.now() - action.capturedAt <= 8000;
  }

  function getActionTarget(target) {
    if (!target || !target.closest) {
      return null;
    }
    return target.closest("[data-anlyx-label], button, a, input, select, textarea, label, summary, [role='button'], [role='link'], [role='menuitem'], [role='tab']");
  }

  function getActionType(event, target) {
    if (event.type === "submit") {
      return "Submitted";
    }
    if (event.type === "keydown") {
      return "Pressed";
    }
    if (target.tagName === "A" || target.getAttribute("role") === "link") {
      return "Opened";
    }
    return "Clicked";
  }

  function getActionLabel(target) {
    const label =
      target.getAttribute("data-anlyx-label") ||
      target.getAttribute("aria-label") ||
      target.getAttribute("title") ||
      target.getAttribute("placeholder") ||
      target.name ||
      target.textContent ||
      target.value ||
      getElementPath(target);
    return compactLabel(label);
  }

  function compactLabel(value) {
    const label = String(value || "").replace(/\s+/g, " ").trim();
    if (!label) {
      return "unnamed element";
    }
    return label.length > 80 ? label.slice(0, 77) + "..." : label;
  }

  function getElementPath(target) {
    const tag = String(target.tagName || "element").toLowerCase();
    if (target.id) {
      return tag + "#" + target.id;
    }
    const testId = target.getAttribute("data-testid");
    if (testId) {
      return tag + "[data-testid='" + testId + "']";
    }
    const className = String(target.className || "").split(/\s+/).filter(Boolean).slice(0, 2).join(".");
    return className ? tag + "." + className : tag;
  }

  function installXhrInterceptor() {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function anlyxOpen(method, url) {
      this.__anlyxRequest = { method: String(method || "GET").toUpperCase(), url: String(url || ""), startedAt: 0 };
      return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function anlyxSend() {
      const request = this.__anlyxRequest;
      if (request) {
        request.startedAt = performance.now();
        this.addEventListener("loadend", () => {
          if (shouldTrackRequestUrl(request.url)) {
            scheduleApiEventRecord({
              method: request.method,
              url: request.url,
              status: this.status || "unknown",
              durationMs: performance.now() - request.startedAt,
              startedAt: request.startedAt
            });
          }
        });
      }
      return originalSend.apply(this, arguments);
    };
  }

  function scheduleApiEventRecord(event) {
    window.setTimeout(() => recordApiEvent(event), 0);
  }

  function recordApiEvent(event) {
    const normalized = normalizeUrl(event.url);
    if (!normalized || shouldIgnoreRequest(normalized)) {
      return;
    }

    const matched = matchEndpoint(event.method, normalized.pathname);
    const passive = isPassiveRequest(event.method, normalized.pathname);
    const triggeredBy = passive ? null : findActionForRequest(event.startedAt);
    const item = {
      id: String(Date.now()) + "-" + Math.random().toString(36).slice(2),
      method: event.method,
      path: normalized.pathname,
      status: event.status,
      durationMs: Math.round(event.durationMs),
      count: 1,
      lastSeenAt: Date.now(),
      triggeredBy,
      source: triggeredBy ? "action" : classifyApiEventSource(normalized.pathname),
      matchedEndpoint: matched.endpoint,
      matchedFlow: matched.flow,
      matchedPages: matched.pages
    };

    const existingIndex = findExistingEventIndex(item);
    if (existingIndex >= 0) {
      const existing = state.events[existingIndex];
      const updated = Object.assign({}, existing, {
        status: item.status,
        durationMs: item.durationMs,
        count: (existing.count || 1) + 1,
        lastSeenAt: item.lastSeenAt,
        triggeredBy: item.triggeredBy || existing.triggeredBy,
        source: item.triggeredBy ? "action" : item.source,
        matchedEndpoint: item.matchedEndpoint,
        matchedFlow: item.matchedFlow,
        matchedPages: item.matchedPages
      });
      state.events = [updated].concat(state.events.filter((_, index) => index !== existingIndex)).slice(0, 12);
      if (shouldAutoFocusEvent(updated)) {
        state.selectedEventId = updated.id;
        state.open = true;
      }
      render();
      return;
    }

    state.events = [item].concat(state.events).slice(0, 12);
    if (shouldAutoFocusEvent(item)) {
      state.selectedEventId = item.id;
      state.open = true;
    }
    render();
  }

  function shouldAutoFocusEvent(item) {
    return Boolean(item && item.triggeredBy);
  }

  function classifyApiEventSource(pathname) {
    if (isHealthOrPollingPath(pathname)) {
      return "health";
    }
    return "background";
  }

  function isPassiveRequest(method, pathname) {
    const normalizedMethod = String(method || "GET").toUpperCase();
    const segments = getPathSegments(pathname);
    if (isHealthOrPollingPath(pathname)) {
      return true;
    }
    if (segments.some((segment) => {
      return segment === "page-views" ||
        segment === "analytics" ||
        segment === "telemetry" ||
        segment === "events" ||
        segment === "metrics";
    })) {
      return true;
    }
    if (isAutomaticSupportPath(normalizedMethod, segments)) {
      return true;
    }
    return false;
  }

  function isAutomaticSupportPath(method, segments) {
    if (method === "GET" && isSessionProbePath(segments)) {
      return true;
    }
    if (segments.includes("csrf") || segments.includes("xsrf")) {
      return true;
    }
    if (!segments.includes("auth")) {
      return false;
    }
    const last = segments[segments.length - 1] || "";
    return last === "session" ||
      last === "refresh" ||
      last === "token" ||
      last === "csrf" ||
      last === "status";
  }

  function isSessionProbePath(segments) {
    const last = segments[segments.length - 1] || "";
    if (last === "me" || last === "session" || last === "profile" || last === "current-user") {
      return true;
    }
    return segments.includes("saved-benefits") ||
      segments.includes("saved-items") ||
      segments.includes("bookmarks") ||
      segments.includes("favorites");
  }

  function isHealthOrPollingPath(pathname) {
    const segments = getPathSegments(pathname);
    return segments.some((segment) => {
      return segment === "health" ||
        segment === "healthz" ||
        segment === "ready" ||
        segment === "readyz" ||
        segment === "live" ||
        segment === "livez" ||
        segment === "ping" ||
        segment === "metrics" ||
        segment === "poll" ||
        segment === "polling";
    });
  }

  function getPathSegments(pathname) {
    return String(pathname || "").toLowerCase().split("/").filter(Boolean);
  }

  function findExistingEventIndex(item) {
    return state.events.findIndex((event) => {
      return event.method === item.method &&
        event.path === item.path &&
        String(event.status) === String(item.status) &&
        getEndpointId(event.matchedEndpoint) === getEndpointId(item.matchedEndpoint);
    });
  }

  function getEndpointId(endpoint) {
    return endpoint && endpoint.id ? endpoint.id : "";
  }

  function findActionForRequest(startedAt) {
    const requestStartedAt = Number(startedAt || performance.now());
    return state.actions.find((action) => {
      const age = requestStartedAt - action.at;
      if (age >= -50 && age <= 3000) {
        return true;
      }
      return Date.now() - action.capturedAt <= 8000;
    }) || null;
  }

  function normalizeUrl(value) {
    if (!value) {
      return null;
    }
    try {
      return new URL(String(value), window.location.href);
    } catch {
      return null;
    }
  }

  function shouldIgnoreRequest(url) {
    if (
      url.pathname.startsWith("/_anlyx/") ||
      url.pathname.startsWith("/@vite/") ||
      url.pathname.startsWith("/_next/") ||
      url.pathname.startsWith("/getconfig/") ||
      url.pathname.includes("hot-update") ||
      url.pathname === "/favicon.ico"
    ) {
      return true;
    }
    return /\.(css|js|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf)$/i.test(url.pathname);
  }

  function shouldTrackRequestUrl(value) {
    const normalized = normalizeUrl(value);
    return Boolean(normalized && !shouldIgnoreRequest(normalized));
  }

  function matchEndpoint(method, path) {
    const report = state.report || {};
    const endpoints = Array.isArray(report.endpoints) ? report.endpoints : [];
    const endpoint = endpoints.find((candidate) => {
      return String(candidate.method || "").toUpperCase() === method && endpointPathToRegex(candidate.path).test(path);
    });
    const flows = Array.isArray(report.flows) ? report.flows : [];
    const pages = Array.isArray(report.pages) ? report.pages : [];
    return {
      endpoint,
      flow: endpoint ? flows.find((flow) => flow.endpointId === endpoint.id) : null,
      pages: endpoint
        ? pages.filter((page) => Array.isArray(page.apiCalls) && page.apiCalls.some((call) => call.endpointId === endpoint.id))
        : []
    };
  }

  function endpointPathToRegex(path) {
    const key = String(path || "");
    const cached = endpointRegexCache.get(key);
    if (cached) {
      return cached;
    }
    const escaped = String(path || "")
      .replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
      .replace(/\\\{[^/]+\\\}/g, "[^/]+");
    const regex = new RegExp("^" + escaped + "$");
    endpointRegexCache.set(key, regex);
    return regex;
  }

  function render() {
    if (!drawer || !body) {
      return;
    }

    drawer.dataset.open = state.open ? "true" : "false";
    if (!state.open) {
      return;
    }

    const selected = state.events.find((event) => event.id === state.selectedEventId) || null;
    renderReactDrawer(selected, getLatestAction());

    installEventSelectionHandler();
  }

  function installEventSelectionHandler() {
    if (!body || body.dataset.eventSelectionBound === "true") {
      return;
    }
    body.dataset.eventSelectionBound = "true";
    const selectEventFromTarget = (target) => {
      const row = target && target.closest ? target.closest("[data-event-id]") : null;
      if (!row) {
        return false;
      }
      state.selectedEventId = row.getAttribute("data-event-id");
      state.open = true;
      render();
      return true;
    };
    body.addEventListener("click", (event) => {
      selectEventFromTarget(event.target);
    });
    body.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      if (selectEventFromTarget(event.target)) {
        event.preventDefault();
      }
    });
  }

  function getLatestAction() {
    return state.actions.find((action) => isFreshAction(action)) || null;
  }

  function getScannedHints() {
    const report = state.report || {};
    const pages = Array.isArray(report.pages) ? report.pages : [];
    const endpoints = Array.isArray(report.endpoints) ? report.endpoints : [];
    const pathname = window.location && window.location.pathname ? window.location.pathname : "/";
    const matchingPages = pages.filter((page) => {
      return page && page.route && routeToRegex(page.route).test(pathname);
    });

    return matchingPages.flatMap((page) => {
      const apiCalls = Array.isArray(page.apiCalls) ? page.apiCalls : [];
      return apiCalls.map((apiCall) => {
        const endpoint = apiCall.endpointId
          ? endpoints.find((candidate) => candidate && candidate.id === apiCall.endpointId)
          : null;
        const method = String(apiCall.method || (endpoint && endpoint.method) || "GET").toUpperCase();
        const path = String(apiCall.path || (endpoint && endpoint.path) || "");
        return {
          pageRoute: page.route,
          pageFilePath: page.filePath,
          method,
          path,
          endpointId: apiCall.endpointId || (endpoint && endpoint.id),
          endpointLabel: endpoint ? String(endpoint.method || method).toUpperCase() + " " + endpoint.path : method + " " + path,
          evidence: page.captureStatus === "success" ? "capture" : "scanned-page"
        };
      });
    }).filter((hint) => hint.path).slice(0, 4);
  }

  function routeToRegex(route) {
    const escaped = String(route || "/")
      .replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
      .replace(/\\\[\\\.\\\.\\\.[^\]]+\\\]/g, ".+")
      .replace(/\\\[\\\[\\\.\\\.\\\.[^\]]+\\\]\\\]/g, ".*")
      .replace(/\\\[[^\]]+\\\]/g, "[^/]+");
    return new RegExp("^" + escaped + "/?$");
  }

  function renderReactDrawer(selected, latestAction) {
    loadOverlayUiAssets();

    if (!window.__ANLYX_RENDER_FLOW_DRAWER__) {
      body.innerHTML = '<section class="anlyx-section"><h3 class="anlyx-section-title">Loading</h3><div class="anlyx-empty">Loading Anlyx Flow Drawer...</div></section>';
      return;
    }

    window.__ANLYX_RENDER_FLOW_DRAWER__(body, {
      selectedEvent: selected,
      events: state.events,
      latestAction,
      scannedHints: getScannedHints(),
      loadError: state.loadError,
      runtimeBaseUrl
    });
  }
})();
`;
}

function withDefaultDependencies(
  dependencies: DevCommandDependencies | undefined
): RequiredDevCommandDependencies {
  return {
    loadConfig: dependencies?.loadConfig ?? loadConfig,
    readReportData: dependencies?.readReportData ?? readReportData,
    runScanCommand: dependencies?.runScanCommand ?? runScanCommand,
    createLocalUiServer: dependencies?.createLocalUiServer ?? createLocalUiServer,
    isFrontendReachable: dependencies?.isFrontendReachable ?? isFrontendReachable,
    startFrontendDevServer: dependencies?.startFrontendDevServer ?? startFrontendDevServer,
    openBrowser: dependencies?.openBrowser ?? openBrowser
  };
}

function getConfiguredPort(config: NormalizedAnlyxConfig): number {
  return config.server.port ?? 4777;
}

function getViewerRoot(): string {
  try {
    return dirname(require.resolve("@anlyx/ui/viewer"));
  } catch {
    return dirname(fileURLToPath(new URL("../../ui/dist/viewer/viewer.html", import.meta.url)));
  }
}

function getOpenBrowserCommand(url: string): { command: string; args: string[] } {
  if (process.platform === "darwin") {
    return { command: "open", args: [url] };
  }

  if (process.platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", url] };
  }

  return { command: "xdg-open", args: [url] };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
