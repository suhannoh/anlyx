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

function getOverlayClientScript(): string {
  return String.raw`
(() => {
  if (window.__ANLYX_OVERLAY_INSTALLED__) {
    return;
  }
  window.__ANLYX_OVERLAY_INSTALLED__ = true;

  const state = {
    report: null,
    events: [],
    selectedEventId: null,
    open: false,
    loadError: null
  };

  let drawer = null;
  let body = null;
  const currentScript = document.currentScript;
  const runtimeBaseUrl = currentScript && currentScript.src ? new URL(currentScript.src).origin : window.location.origin;

  scheduleOverlayMount();

  function scheduleOverlayMount() {
    const mount = () => window.setTimeout(mountOverlayUi, 0);

    if (document.readyState === "complete") {
      mount();
      return;
    }

    window.addEventListener("load", mount, { once: true });
  }

  function mountOverlayUi() {
    if (document.getElementById("anlyx-overlay-root")) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = ${"`"}
    #anlyx-overlay-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #101828; }
    .anlyx-fab { pointer-events: auto; position: absolute; right: 18px; bottom: 18px; height: 44px; min-width: 92px; border: 0; border-radius: 999px; background: #2563eb; color: white; font-weight: 800; font-size: 14px; box-shadow: 0 18px 40px rgba(37, 99, 235, 0.32); cursor: pointer; }
    .anlyx-drawer { pointer-events: auto; position: absolute; top: 12px; right: 12px; bottom: 12px; width: min(460px, calc(100vw - 24px)); border: 1px solid #dbe4f0; border-radius: 16px; background: rgba(255,255,255,0.97); box-shadow: 0 24px 80px rgba(15, 23, 42, 0.18); overflow: hidden; display: none; }
    .anlyx-drawer[data-open="true"] { display: grid; grid-template-rows: auto minmax(0, 1fr); }
    .anlyx-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 16px 12px; border-bottom: 1px solid #e6edf6; }
    .anlyx-title { margin: 0; font-size: 15px; line-height: 1.25; font-weight: 850; letter-spacing: 0; }
    .anlyx-subtitle { margin: 4px 0 0; font-size: 12px; color: #667085; }
    .anlyx-close { border: 1px solid #d7e0ee; background: #fff; border-radius: 10px; width: 34px; height: 34px; cursor: pointer; font-size: 18px; line-height: 1; }
    .anlyx-body { overflow: auto; padding: 14px 16px 18px; }
    .anlyx-section { border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; margin-bottom: 12px; overflow: hidden; }
    .anlyx-section-title { margin: 0; padding: 11px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: .04em; border-bottom: 1px solid #edf2f7; font-weight: 850; }
    .anlyx-event { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 10px 12px; border-bottom: 1px solid #edf2f7; cursor: pointer; }
    .anlyx-event:last-child { border-bottom: 0; }
    .anlyx-event[data-selected="true"] { background: #eef4ff; }
    .anlyx-method { border-radius: 8px; background: #dbeafe; color: #1d4ed8; font-weight: 850; font-size: 11px; padding: 4px 6px; }
    .anlyx-path { min-width: 0; overflow-wrap: anywhere; font-size: 12px; font-weight: 750; color: #182230; }
    .anlyx-pill { border: 1px solid #bbf7d0; color: #087443; background: #ecfdf3; border-radius: 999px; padding: 3px 7px; font-size: 11px; font-weight: 800; white-space: nowrap; }
    .anlyx-pill.unmatched { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
    .anlyx-summary { padding: 12px; display: grid; gap: 8px; }
    .anlyx-kv { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 8px; font-size: 12px; line-height: 1.45; }
    .anlyx-kv span:first-child { color: #667085; font-weight: 750; }
    .anlyx-kv span:last-child { min-width: 0; overflow-wrap: anywhere; font-weight: 750; color: #182230; }
    .anlyx-path-list { display: grid; gap: 8px; padding: 12px; }
    .anlyx-node { border: 1px solid #d8e4f5; border-left: 4px solid #2563eb; border-radius: 12px; padding: 9px 10px; background: linear-gradient(180deg, #fff, #f8fbff); }
    .anlyx-node.support { border-left-color: #f97316; background: #fffaf5; }
    .anlyx-node-type { margin: 0 0 3px; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; color: #64748b; font-weight: 850; }
    .anlyx-node-label { margin: 0; font-size: 12px; line-height: 1.35; font-weight: 850; overflow-wrap: anywhere; }
    .anlyx-empty { padding: 18px 12px; color: #667085; font-size: 13px; line-height: 1.5; }
    .anlyx-link { color: #2563eb; font-weight: 800; text-decoration: none; }
  ${"`"};
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = "anlyx-overlay-root";
    root.innerHTML = ${"`"}
    <button class="anlyx-fab" type="button" aria-label="Open Anlyx">Anlyx</button>
    <aside class="anlyx-drawer" aria-label="Anlyx flow drawer">
      <div class="anlyx-head">
        <div>
          <h2 class="anlyx-title">Anlyx Flow Drawer</h2>
          <p class="anlyx-subtitle">Click the real app and inspect the API flow.</p>
        </div>
        <button class="anlyx-close" type="button" aria-label="Close Anlyx">×</button>
      </div>
      <div class="anlyx-body"></div>
    </aside>
  ${"`"};
    document.body.appendChild(root);

    const button = root.querySelector(".anlyx-fab");
    drawer = root.querySelector(".anlyx-drawer");
    body = root.querySelector(".anlyx-body");
    const closeButton = root.querySelector(".anlyx-close");

    button.addEventListener("click", () => {
      state.open = !state.open;
      render();
    });
    closeButton.addEventListener("click", () => {
      state.open = false;
      render();
    });

    installFetchInterceptor();
    installXhrInterceptor();
    loadReport();
    render();
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
        recordApiEvent({ method, url, status: response.status, durationMs: performance.now() - startedAt });
        return response;
      } catch (error) {
        recordApiEvent({ method, url, status: "failed", durationMs: performance.now() - startedAt });
        throw error;
      }
    };
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
          recordApiEvent({
            method: request.method,
            url: request.url,
            status: this.status || "unknown",
            durationMs: performance.now() - request.startedAt
          });
        });
      }
      return originalSend.apply(this, arguments);
    };
  }

  function recordApiEvent(event) {
    const normalized = normalizeUrl(event.url);
    if (!normalized || shouldIgnoreRequest(normalized)) {
      return;
    }

    const matched = matchEndpoint(event.method, normalized.pathname);
    const item = {
      id: String(Date.now()) + "-" + Math.random().toString(36).slice(2),
      method: event.method,
      path: normalized.pathname,
      status: event.status,
      durationMs: Math.round(event.durationMs),
      matchedEndpoint: matched.endpoint,
      matchedFlow: matched.flow,
      matchedPages: matched.pages
    };

    state.events = [item].concat(state.events).slice(0, 12);
    state.selectedEventId = item.id;
    state.open = true;
    render();
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
    if (url.pathname.startsWith("/_anlyx/") || url.pathname.startsWith("/@vite/")) {
      return true;
    }
    return /\.(css|js|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf)$/i.test(url.pathname);
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
    const escaped = String(path || "")
      .replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
      .replace(/\\\{[^/]+\\\}/g, "[^/]+");
    return new RegExp("^" + escaped + "$");
  }

  function render() {
    if (!drawer || !body) {
      return;
    }

    drawer.dataset.open = state.open ? "true" : "false";
    const selected = state.events.find((event) => event.id === state.selectedEventId) || state.events[0] || null;
    body.innerHTML = renderBody(selected);

    body.querySelectorAll("[data-event-id]").forEach((element) => {
      element.addEventListener("click", () => {
        state.selectedEventId = element.getAttribute("data-event-id");
        render();
      });
    });
  }

  function renderBody(selected) {
    if (state.loadError) {
      return '<section class="anlyx-section"><h3 class="anlyx-section-title">Report data</h3><div class="anlyx-empty">' + escapeHtml(state.loadError) + '</div></section>';
    }

    const timeline = renderTimeline(selected);
    const details = selected ? renderSelectedEvent(selected) : '<section class="anlyx-section"><h3 class="anlyx-section-title">Waiting</h3><div class="anlyx-empty">Use the app normally. When a browser API request fires, Anlyx will match it to the scanned flow.</div></section>';
    return timeline + details;
  }

  function renderTimeline(selected) {
    if (state.events.length === 0) {
      return '<section class="anlyx-section"><h3 class="anlyx-section-title">Recent API events</h3><div class="anlyx-empty">No API events observed yet.</div></section>';
    }

    return '<section class="anlyx-section"><h3 class="anlyx-section-title">Recent API events</h3>' +
      state.events.map((event) => {
        const matched = Boolean(event.matchedEndpoint);
        return '<div class="anlyx-event" data-event-id="' + escapeHtml(event.id) + '" data-selected="' + String(selected && selected.id === event.id) + '">' +
          '<span class="anlyx-method">' + escapeHtml(event.method) + '</span>' +
          '<span class="anlyx-path">' + escapeHtml(event.path) + '</span>' +
          '<span class="anlyx-pill ' + (matched ? '' : 'unmatched') + '">' + (matched ? 'matched' : 'unmatched') + '</span>' +
        '</div>';
      }).join("") +
    '</section>';
  }

  function renderSelectedEvent(event) {
    const endpoint = event.matchedEndpoint;
    const flow = event.matchedFlow;

    if (!endpoint) {
      return '<section class="anlyx-section"><h3 class="anlyx-section-title">Unmatched request</h3><div class="anlyx-summary">' +
        renderKv("Request", event.method + " " + event.path) +
        renderKv("Status", String(event.status)) +
        renderKv("Latency", event.durationMs + "ms") +
        '<div class="anlyx-empty">No scanned endpoint matched this request. If this should be known, run <strong>anlyx scan</strong> again or check the configured backend paths.</div>' +
      '</div></section>';
    }

    return '<section class="anlyx-section"><h3 class="anlyx-section-title">Matched request</h3><div class="anlyx-summary">' +
      renderKv("Request", event.method + " " + event.path) +
      renderKv("Endpoint", endpoint.method + " " + endpoint.path) +
      renderKv("Status", String(event.status)) +
      renderKv("Latency", event.durationMs + "ms") +
      renderKv("Confidence", endpoint.confidence || "unknown") +
    '</div></section>' +
    renderMainPath(flow) +
    renderSupportCalls(flow) +
    renderLinkedPages(event.matchedPages);
  }

  function renderMainPath(flow) {
    if (!flow || !Array.isArray(flow.mainPath) || flow.mainPath.length === 0) {
      return '<section class="anlyx-section"><h3 class="anlyx-section-title">Main path</h3><div class="anlyx-empty">No main path was inferred for this endpoint.</div></section>';
    }
    const nodeById = new Map((flow.nodes || []).map((node) => [node.id, node]));
    return '<section class="anlyx-section"><h3 class="anlyx-section-title">Main path</h3><div class="anlyx-path-list">' +
      flow.mainPath.map((nodeId) => renderNode(nodeById.get(nodeId), false)).join("") +
    '</div></section>';
  }

  function renderSupportCalls(flow) {
    if (!flow || !Array.isArray(flow.nodes)) {
      return "";
    }
    const main = new Set(flow.mainPath || []);
    const support = flow.nodes.filter((node) => !main.has(node.id));
    if (support.length === 0) {
      return "";
    }
    return '<section class="anlyx-section"><h3 class="anlyx-section-title">Support calls</h3><div class="anlyx-path-list">' +
      support.slice(0, 8).map((node) => renderNode(node, true)).join("") +
    '</div></section>';
  }

  function renderLinkedPages(pages) {
    if (!pages || pages.length === 0) {
      return "";
    }
    return '<section class="anlyx-section"><h3 class="anlyx-section-title">Linked pages</h3><div class="anlyx-path-list">' +
      pages.slice(0, 6).map((page) => '<div class="anlyx-node"><p class="anlyx-node-type">Page</p><p class="anlyx-node-label">' + escapeHtml(page.route || page.id) + '</p></div>').join("") +
    '</div></section>';
  }

  function renderNode(node, support) {
    if (!node) {
      return '<div class="anlyx-node"><p class="anlyx-node-type">Unknown</p><p class="anlyx-node-label">Missing node data</p></div>';
    }
    return '<div class="anlyx-node ' + (support ? 'support' : '') + '">' +
      '<p class="anlyx-node-type">' + escapeHtml(node.type || "node") + ' · ' + escapeHtml(node.confidence || "unknown") + '</p>' +
      '<p class="anlyx-node-label">' + escapeHtml(node.label || node.id) + '</p>' +
    '</div>';
  }

  function renderKv(label, value) {
    return '<div class="anlyx-kv"><span>' + escapeHtml(label) + '</span><span>' + escapeHtml(value) + '</span></div>';
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
