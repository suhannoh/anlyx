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
  const currentScript = document.currentScript;
  const runtimeBaseUrl = currentScript && currentScript.src ? new URL(currentScript.src).origin : window.location.origin;
  const ANLYX_PENDING_ACTION_KEY = "__anlyx_pending_action__";

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
    if (document.getElementById("anlyx-overlay-root")) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = ${"`"}
    #anlyx-overlay-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #101828; }
    .anlyx-fab { pointer-events: auto; position: absolute; right: 18px; bottom: 18px; height: 44px; min-width: 92px; border: 0; border-radius: 999px; background: #2563eb; color: white; font-weight: 800; font-size: 14px; box-shadow: 0 18px 40px rgba(37, 99, 235, 0.32); cursor: pointer; }
    .anlyx-drawer { pointer-events: auto; position: absolute; top: 12px; right: 12px; bottom: 12px; width: min(520px, calc(100vw - 24px)); border: 1px solid #dbe4f0; border-radius: 16px; background: rgba(255,255,255,0.98); box-shadow: 0 24px 80px rgba(15, 23, 42, 0.18); overflow: hidden; display: none; }
    .anlyx-drawer[data-open="true"] { display: grid; grid-template-rows: auto minmax(0, 1fr); }
    .anlyx-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 16px 12px; border-bottom: 1px solid #e6edf6; }
    .anlyx-title { margin: 0; font-size: 15px; line-height: 1.25; font-weight: 850; letter-spacing: 0; }
    .anlyx-subtitle { margin: 4px 0 0; font-size: 12px; color: #667085; }
    .anlyx-close { border: 1px solid #d7e0ee; background: #fff; border-radius: 10px; width: 34px; height: 34px; cursor: pointer; font-size: 18px; line-height: 1; }
    .anlyx-body { overflow: auto; padding: 12px 14px 16px; }
    .anlyx-section { border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; margin-bottom: 10px; overflow: hidden; }
    .anlyx-section-title { margin: 0; padding: 9px 10px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: .04em; border-bottom: 1px solid #edf2f7; font-weight: 850; }
    .anlyx-request-hero { border: 1px solid #c7d7fe; border-radius: 16px; background: linear-gradient(180deg, #f8fbff, #fff); margin-bottom: 10px; overflow: hidden; }
    .anlyx-request-top { padding: 12px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; border-bottom: 1px solid #e6edf6; }
    .anlyx-request-top h3 { margin: 0 0 7px; font-size: 12px; color: #475467; letter-spacing: 0; font-weight: 850; }
    .anlyx-request-line { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .anlyx-request-path { min-width: 0; overflow-wrap: anywhere; font-size: 13px; font-weight: 850; line-height: 1.35; color: #101828; }
    .anlyx-action-line { display: block; margin: 5px 0 0; color: #667085; font-size: 11px; line-height: 1.35; font-weight: 750; overflow-wrap: anywhere; }
    .anlyx-request-meta { display: flex; flex-wrap: wrap; gap: 5px; padding: 8px 12px 10px; }
    .anlyx-flow-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; padding: 10px 12px 12px; border-top: 1px solid #eef2f7; background: #fbfdff; }
    .anlyx-summary-step { display: grid; grid-template-columns: 1fr; gap: 5px; align-items: start; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; padding: 8px; min-width: 0; }
    .anlyx-step-icon { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; background: #eef4ff; color: #2563eb; font-size: 12px; font-weight: 900; }
    .anlyx-summary-step[data-tone="good"] .anlyx-step-icon { background: #dcfae6; color: #087443; }
    .anlyx-summary-step[data-tone="warn"] .anlyx-step-icon { background: #fff7ed; color: #c2410c; }
    .anlyx-summary-step[data-tone="danger"] .anlyx-step-icon { background: #fff1f2; color: #b42318; }
    .anlyx-step-kicker { margin: 0 0 2px; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #667085; font-weight: 900; }
    .anlyx-step-title { margin: 0; font-size: 11px; line-height: 1.3; color: #101828; font-weight: 850; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .anlyx-step-subtitle { margin: 3px 0 0; font-size: 10px; line-height: 1.3; color: #667085; font-weight: 700; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
    .anlyx-metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; padding: 10px; }
    .anlyx-metric { border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; padding: 7px; min-width: 0; }
    .anlyx-metric-label { margin: 0 0 3px; color: #667085; font-size: 9px; line-height: 1.2; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; }
    .anlyx-metric-value { margin: 0; color: #101828; font-size: 11px; line-height: 1.3; font-weight: 850; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .anlyx-mini-pill { border: 1px solid #d7e0ee; background: #fff; color: #475467; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 800; white-space: nowrap; }
    .anlyx-mini-pill.good { border-color: #bbf7d0; color: #087443; background: #ecfdf3; }
    .anlyx-mini-pill.warn { border-color: #fed7aa; color: #c2410c; background: #fff7ed; }
    .anlyx-mini-pill.danger { border-color: #fecaca; color: #b42318; background: #fff1f2; }
    .anlyx-event { display: grid; gap: 7px; padding: 10px 12px; border-bottom: 1px solid #edf2f7; cursor: pointer; }
    .anlyx-event:last-child { border-bottom: 0; }
    .anlyx-event[data-selected="true"] { background: #eef4ff; }
    .anlyx-event-trace { display: grid; grid-template-columns: minmax(0, 1fr) 14px minmax(0, 1.2fr) 14px auto; gap: 6px; align-items: center; }
    .anlyx-event-action, .anlyx-event-request, .anlyx-event-result { min-width: 0; display: grid; gap: 2px; }
    .anlyx-event-label { margin: 0; color: #667085; font-size: 9px; line-height: 1.15; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
    .anlyx-event-value { margin: 0; color: #182230; font-size: 11px; line-height: 1.25; font-weight: 850; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .anlyx-event-arrow { color: #94a3b8; font-size: 12px; line-height: 1; font-weight: 900; text-align: center; }
    .anlyx-event-meta { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; padding-left: 2px; }
    .anlyx-event-status { border: 1px solid #bbf7d0; color: #087443; background: #ecfdf3; border-radius: 999px; padding: 3px 7px; font-size: 10px; font-weight: 850; white-space: nowrap; }
    .anlyx-event-status.unmatched { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
    .anlyx-method { border-radius: 8px; background: #dbeafe; color: #1d4ed8; font-weight: 850; font-size: 11px; padding: 4px 6px; }
    .anlyx-path { min-width: 0; overflow-wrap: anywhere; font-size: 12px; font-weight: 750; color: #182230; }
    .anlyx-pill { border: 1px solid #bbf7d0; color: #087443; background: #ecfdf3; border-radius: 999px; padding: 3px 7px; font-size: 11px; font-weight: 800; white-space: nowrap; }
    .anlyx-pill.unmatched { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
    .anlyx-count { border: 1px solid #d7e0ee; background: #f8fafc; color: #475467; border-radius: 999px; padding: 3px 7px; font-size: 11px; font-weight: 850; white-space: nowrap; }
    .anlyx-summary { padding: 12px; display: grid; gap: 8px; }
    .anlyx-diagnostic-card { margin: 10px 12px 0; border: 1px solid #fed7aa; border-radius: 12px; background: #fff7ed; color: #7a2e0e; overflow: hidden; }
    .anlyx-diagnostic-card.danger { border-color: #fecaca; background: #fff1f2; color: #7a271a; }
    .anlyx-diagnostic-head { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 8px; padding: 10px; align-items: start; }
    .anlyx-diagnostic-icon { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; background: #ffedd5; color: #c2410c; font-size: 12px; font-weight: 950; }
    .anlyx-diagnostic-card.danger .anlyx-diagnostic-icon { background: #fee2e2; color: #b42318; }
    .anlyx-diagnostic-title { margin: 0; color: inherit; font-size: 12px; line-height: 1.3; font-weight: 900; }
    .anlyx-diagnostic-body { margin: 3px 0 0; color: #667085; font-size: 11px; line-height: 1.35; font-weight: 700; }
    .anlyx-diagnostic-next { display: grid; gap: 5px; margin: 0; padding: 9px 10px 10px 44px; border-top: 1px solid rgba(251, 146, 60, .35); background: rgba(255, 255, 255, .48); }
    .anlyx-diagnostic-card.danger .anlyx-diagnostic-next { border-top-color: rgba(248, 113, 113, .35); }
    .anlyx-diagnostic-next li { margin: 0; color: #344054; font-size: 11px; line-height: 1.35; font-weight: 760; }
    .anlyx-kv { display: grid; grid-template-columns: 86px minmax(0, 1fr); gap: 8px; font-size: 12px; line-height: 1.45; }
    .anlyx-kv span:first-child { color: #667085; font-weight: 750; }
    .anlyx-kv span:last-child { min-width: 0; overflow-wrap: anywhere; font-weight: 750; color: #182230; }
    .anlyx-path-list { display: grid; gap: 10px; padding: 12px; }
    .anlyx-node-chain { position: relative; display: grid; gap: 0; padding: 12px; }
    .anlyx-flow-rail { position: absolute; top: 18px; bottom: 18px; left: 25px; width: 2px; border-radius: 999px; background: linear-gradient(180deg, #93c5fd, #bfdbfe 65%, #dbeafe); }
    .anlyx-node { position: relative; display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; border: 1px solid #d8e4f5; border-radius: 12px; padding: 10px; background: linear-gradient(180deg, #fff, #f8fbff); box-shadow: 0 8px 24px rgba(15, 23, 42, .04); }
    .anlyx-node-chain .anlyx-node { margin-bottom: 8px; }
    .anlyx-node.support { border-color: #fdba74; background: #fffaf5; }
    .anlyx-node[data-node-type="controller"] { border-left: 3px solid #2563eb; }
    .anlyx-node[data-node-type="service"] { border-left: 3px solid #7c3aed; }
    .anlyx-node[data-node-type="repository"] { border-left: 3px solid #f97316; }
    .anlyx-node[data-node-type="database"] { border-left: 3px solid #0f766e; background: linear-gradient(180deg, #f0fdfa, #fff); }
    .anlyx-node-index { position: relative; z-index: 1; display: grid; place-items: center; align-content: center; gap: 1px; width: 30px; min-height: 30px; border-radius: 11px; background: #2563eb; color: #fff; box-shadow: 0 0 0 4px #fff; }
    .anlyx-node-icon { font-size: 10px; line-height: 1; font-weight: 950; letter-spacing: 0; }
    .anlyx-node-number { font-size: 10px; line-height: 1; font-weight: 900; }
    .anlyx-node.support .anlyx-node-index { background: #f97316; }
    .anlyx-node[data-node-type="service"] .anlyx-node-index { background: #7c3aed; }
    .anlyx-node[data-node-type="repository"] .anlyx-node-index { background: #f97316; }
    .anlyx-node[data-node-type="database"] .anlyx-node-index { background: #0f766e; }
    .anlyx-node-top { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-bottom: 5px; }
    .anlyx-node-type-pill, .anlyx-node-confidence { border-radius: 999px; padding: 3px 6px; font-size: 9px; line-height: 1.15; letter-spacing: .04em; text-transform: uppercase; font-weight: 900; white-space: nowrap; }
    .anlyx-node-type-pill { border: 1px solid #dbeafe; background: #eff6ff; color: #1d4ed8; }
    .anlyx-node-confidence { border: 1px solid #bbf7d0; background: #ecfdf3; color: #087443; }
    .anlyx-node[data-node-type="service"] .anlyx-node-type-pill { border-color: #ddd6fe; background: #f5f3ff; color: #6d28d9; }
    .anlyx-node[data-node-type="repository"] .anlyx-node-type-pill, .anlyx-node.support .anlyx-node-type-pill { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
    .anlyx-node[data-node-type="database"] .anlyx-node-type-pill { border-color: #99f6e4; background: #f0fdfa; color: #0f766e; }
    .anlyx-node-type { margin: 0 0 3px; font-size: 10px; letter-spacing: .04em; text-transform: uppercase; color: #64748b; font-weight: 850; }
    .anlyx-node-label { margin: 0; font-size: 12px; line-height: 1.35; font-weight: 850; overflow-wrap: anywhere; }
    .anlyx-evidence-details { margin: 7px 0 0; border: 1px dashed #cbd5e1; border-radius: 10px; background: rgba(248, 250, 252, .8); overflow: hidden; }
    .anlyx-evidence-details summary { cursor: pointer; list-style: none; padding: 7px 8px; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 900; letter-spacing: .04em; }
    .anlyx-evidence-details summary::-webkit-details-marker { display: none; }
    .anlyx-evidence { margin: 0; padding: 7px 8px 8px; border-top: 1px dashed #cbd5e1; background: transparent; }
    .anlyx-evidence-title { margin: 0 0 5px; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 900; letter-spacing: .04em; }
    .anlyx-evidence-item { display: grid; gap: 2px; font-size: 11px; line-height: 1.35; color: #475467; }
    .anlyx-evidence-item strong { color: #182230; overflow-wrap: anywhere; }
    .anlyx-evidence-item span { overflow-wrap: anywhere; }
    .anlyx-disclosure { margin-bottom: 12px; border: 1px solid #fed7aa; border-radius: 14px; background: #fffaf5; overflow: hidden; }
    .anlyx-disclosure summary { cursor: pointer; list-style: none; padding: 11px 12px; display: flex; justify-content: space-between; gap: 10px; align-items: center; font-size: 11px; text-transform: uppercase; color: #9a3412; font-weight: 900; letter-spacing: .04em; }
    .anlyx-disclosure summary::-webkit-details-marker { display: none; }
    .anlyx-disclosure-count { border-radius: 999px; border: 1px solid #fdba74; background: #fff; padding: 3px 7px; color: #c2410c; font-size: 11px; font-weight: 900; text-transform: none; letter-spacing: 0; }
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

    restorePendingAction();
    installUserActionTracker(root);
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
        recordApiEvent({ method, url, status: response.status, durationMs: performance.now() - startedAt, startedAt });
        return response;
      } catch (error) {
        recordApiEvent({ method, url, status: "failed", durationMs: performance.now() - startedAt, startedAt });
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
          recordApiEvent({
            method: request.method,
            url: request.url,
            status: this.status || "unknown",
            durationMs: performance.now() - request.startedAt,
            startedAt: request.startedAt
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
      count: 1,
      lastSeenAt: Date.now(),
      triggeredBy: findActionForRequest(event.startedAt),
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
        matchedEndpoint: item.matchedEndpoint,
        matchedFlow: item.matchedFlow,
        matchedPages: item.matchedPages
      });
      state.events = [updated].concat(state.events.filter((_, index) => index !== existingIndex)).slice(0, 12);
      state.selectedEventId = updated.id;
      state.open = true;
      render();
      return;
    }

    state.events = [item].concat(state.events).slice(0, 12);
    state.selectedEventId = item.id;
    state.open = true;
    render();
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

    const details = selected ? renderSelectedEvent(selected) : '<section class="anlyx-section"><h3 class="anlyx-section-title">Waiting</h3><div class="anlyx-empty">Use the app normally. When a browser API request fires, Anlyx will match it to the scanned flow.</div></section>';
    const timeline = renderTimeline(selected);
    return details + timeline;
  }

  function renderTimeline(selected) {
    if (state.events.length === 0) {
      return '<section class="anlyx-section"><h3 class="anlyx-section-title">Recent API events</h3><div class="anlyx-empty">No API events observed yet.</div></section>';
    }

    return '<section class="anlyx-section"><h3 class="anlyx-section-title">Recent API events</h3>' +
      state.events.map((event) => renderTimelineEvent(event, selected)).join("") +
    '</section>';
  }

  function renderTimelineEvent(event, selected) {
    const matched = Boolean(event.matchedEndpoint);
    return '<div class="anlyx-event" data-event-id="' + escapeHtml(event.id) + '" data-selected="' + String(selected && selected.id === event.id) + '">' +
      '<div class="anlyx-event-trace">' +
        '<div class="anlyx-event-action"><p class="anlyx-event-label">Action</p><p class="anlyx-event-value">' + escapeHtml(event.triggeredBy ? formatAction(event.triggeredBy) : "page/load") + '</p></div>' +
        '<span class="anlyx-event-arrow">-></span>' +
        '<div class="anlyx-event-request"><p class="anlyx-event-label">Request</p><p class="anlyx-event-value">' + escapeHtml(event.method + " " + event.path) + '</p></div>' +
        '<span class="anlyx-event-arrow">-></span>' +
        '<div class="anlyx-event-result"><p class="anlyx-event-label">Result</p><p class="anlyx-event-value">' + escapeHtml(matched ? "matched" : "unmatched") + '</p></div>' +
      '</div>' +
      '<div class="anlyx-event-meta">' +
        '<span class="anlyx-method">' + escapeHtml(event.method) + '</span>' +
        renderTimelineStatus(event, matched) +
        '<span class="anlyx-count">' + escapeHtml(event.count && event.count > 1 ? "seen x" + event.count : "seen 1") + '</span>' +
        '<span class="anlyx-count">' + escapeHtml(event.durationMs) + 'ms</span>' +
      '</div>' +
    '</div>';
  }

  function renderTimelineStatus(event, matched) {
    return '<span class="anlyx-event-status ' + (matched ? '' : 'unmatched') + '">' + escapeHtml((matched ? "matched" : "unmatched") + " · " + getStatusLabel(event.status)) + '</span>';
  }

  function renderSelectedEvent(event) {
    const endpoint = event.matchedEndpoint;
    const flow = event.matchedFlow;

    if (!endpoint) {
      return '<section class="anlyx-request-hero"><div class="anlyx-request-top"><div><h3>What just happened</h3><div class="anlyx-request-line">' +
        '<span class="anlyx-method">' + escapeHtml(event.method) + '</span><span class="anlyx-request-path">' + escapeHtml(event.path) + '</span></div></div>' +
        '<span class="anlyx-mini-pill warn">unmatched</span></div><div class="anlyx-request-meta">' +
        renderStatusPill(event.status) +
        '<span class="anlyx-mini-pill">' + escapeHtml(event.durationMs) + 'ms</span>' +
        renderRepeatPill(event) +
        '</div>' + renderFlowSummary(event, null) + '</section><section class="anlyx-section"><h3 class="anlyx-section-title">Request facts</h3>' +
        renderRequestMetrics(event, null) +
        '<div class="anlyx-summary">' +
        renderStatusBanner(event.status, false) +
      '</div></section>';
    }

    return '<section class="anlyx-request-hero"><div class="anlyx-request-top"><div><h3>What just happened</h3><div class="anlyx-request-line">' +
      '<span class="anlyx-method">' + escapeHtml(event.method) + '</span><span class="anlyx-request-path">' + escapeHtml(event.path) + '</span></div></div>' +
      '<span class="anlyx-mini-pill good">matched</span></div><div class="anlyx-request-meta">' +
      '<span class="anlyx-mini-pill">endpoint ' + escapeHtml(endpoint.method + " " + endpoint.path) + '</span>' +
      renderStatusPill(event.status) +
      '<span class="anlyx-mini-pill">' + escapeHtml(event.durationMs) + 'ms</span>' +
      renderRepeatPill(event) +
      '<span class="anlyx-mini-pill good">confidence ' + escapeHtml(endpoint.confidence || "unknown") + '</span>' +
    '</div>' + renderFlowSummary(event, endpoint) + '</section>' +
    '<section class="anlyx-section"><h3 class="anlyx-section-title">Request facts</h3>' + renderRequestMetrics(event, endpoint) + '</section>' +
    renderStatusBanner(event.status, true) +
    renderMainPath(flow) +
    renderSupportCalls(flow) +
    renderLinkedPages(event.matchedPages);
  }

  function renderFlowSummary(event, endpoint) {
    const statusTone = getStatusClass(event.status) || (endpoint ? "good" : "warn");
    return '<div class="anlyx-flow-summary">' +
      renderSummaryStep("Action", "↗", event.triggeredBy ? formatAction(event.triggeredBy) : "No user action captured", event.triggeredBy ? event.triggeredBy.selector : "Request may have fired on page load", event.triggeredBy ? "" : "warn") +
      renderSummaryStep("Request", "→", event.method + " " + event.path, endpoint ? "Matched scanned endpoint" : "No scanned endpoint matched", endpoint ? "good" : "warn") +
      renderSummaryStep("Result", "✓", getStatusLabel(event.status), event.durationMs + "ms" + (event.count && event.count > 1 ? " · seen ×" + event.count : ""), statusTone) +
    '</div>';
  }

  function renderSummaryStep(kicker, icon, title, subtitle, tone) {
    return '<div class="anlyx-summary-step" data-tone="' + escapeHtml(tone || "") + '">' +
      '<span class="anlyx-step-icon">' + escapeHtml(icon) + '</span>' +
      '<div><p class="anlyx-step-kicker">' + escapeHtml(kicker) + '</p><p class="anlyx-step-title">' + escapeHtml(title) + '</p>' +
      (subtitle ? '<p class="anlyx-step-subtitle">' + escapeHtml(subtitle) + '</p>' : '') +
      '</div></div>';
  }

  function renderRequestMetrics(event, endpoint) {
    return '<div class="anlyx-metric-grid">' +
      renderMetric("Method", event.method) +
      renderMetric("Status", getStatusLabel(event.status)) +
      renderMetric("Latency", event.durationMs + "ms") +
      renderMetric("Endpoint", endpoint ? endpoint.path : "unmatched") +
      renderMetric("Action", event.triggeredBy ? formatAction(event.triggeredBy) : "none captured") +
      renderMetric("Element", event.triggeredBy ? event.triggeredBy.selector || "unknown" : "unknown") +
    '</div>';
  }

  function renderMetric(label, value) {
    return '<div class="anlyx-metric"><p class="anlyx-metric-label">' + escapeHtml(label) + '</p><p class="anlyx-metric-value">' + escapeHtml(value) + '</p></div>';
  }

  function renderTimelineAction(event) {
    if (!event.triggeredBy) {
      return "";
    }
    return '<span class="anlyx-action-line">' + escapeHtml(formatAction(event.triggeredBy)) + '</span>';
  }

  function renderActionSummary(event) {
    if (!event.triggeredBy) {
      return '<p class="anlyx-action-line">No recent user action captured for this request.</p>';
    }
    return '<p class="anlyx-action-line">' + escapeHtml(formatAction(event.triggeredBy)) + '</p>';
  }

  function renderActionDetails(event) {
    if (!event.triggeredBy) {
      return "";
    }
    return renderKv("User action", formatAction(event.triggeredBy)) +
      renderKv("Element", event.triggeredBy.selector || "unknown");
  }

  function formatAction(action) {
    return action.type + " " + action.label;
  }

  function renderRepeatPill(event) {
    if (!event.count || event.count <= 1) {
      return "";
    }
    return '<span class="anlyx-mini-pill">seen ×' + escapeHtml(event.count) + '</span>';
  }

  function renderStatusPill(status) {
    const statusClass = getStatusClass(status);
    return '<span class="anlyx-mini-pill ' + statusClass + '">' + escapeHtml(getStatusLabel(status)) + '</span>';
  }

  function renderStatusBanner(status, matched) {
    return renderDiagnosticCard(status, matched);
  }

  function renderDiagnosticCard(status, matched) {
    const numeric = Number(status);
    if (numeric === 401 || numeric === 403) {
      return renderDiagnostic("danger", "!", matched ? "Known flow blocked by auth" : "Request blocked before matching", (matched ? "Anlyx found the scanned backend path, but" : "The browser request was observed, but") + " the app returned " + status + ". This usually means a login or permission gate.", getDiagnosticActions("auth", matched));
    }
    if (numeric >= 500) {
      return renderDiagnostic("danger", "!", matched ? "Known flow reached a server error" : "Unmatched request returned a server error", (matched ? "The request reached a scanned endpoint, but" : "The request failed before Anlyx could match it, and") + " the server returned " + status + ".", getDiagnosticActions("server", matched));
    }
    if (!matched) {
      return renderDiagnostic("warn", "?", "No scanned endpoint matched", "Anlyx saw this browser request, but no scanned endpoint path matched it.", getDiagnosticActions("unmatched", matched));
    }
    return "";
  }

  function renderDiagnostic(tone, icon, title, body, actions) {
    return '<div class="anlyx-diagnostic-card ' + escapeHtml(tone || "") + '">' +
      '<div class="anlyx-diagnostic-head"><span class="anlyx-diagnostic-icon">' + escapeHtml(icon) + '</span><div>' +
      '<p class="anlyx-diagnostic-title">' + escapeHtml(title) + '</p>' +
      '<p class="anlyx-diagnostic-body">' + escapeHtml(body) + '</p>' +
      '</div></div>' +
      '<ul class="anlyx-diagnostic-next">' + actions.map((action) => '<li>' + escapeHtml(action) + '</li>').join("") + '</ul>' +
    '</div>';
  }

  function getDiagnosticActions(kind, matched) {
    if (kind === "auth") {
      return [
        "Check login/session state in the real app",
        "Retry the same click after authenticating",
        matched ? "Use the main flow below to see which handler was still reached" : "Run anlyx scan again if this endpoint should be known"
      ];
    }
    if (kind === "server") {
      return [
        "Check the backend terminal logs for this request",
        matched ? "Trace the highlighted main flow below" : "Run anlyx scan again if this endpoint should be known",
        "Confirm local API base URL and backend port"
      ];
    }
    return [
      "Run anlyx scan again",
      "Check backend sourceDir and API base URL",
      "Confirm the browser path matches the scanned endpoint path"
    ];
  }

  function getStatusLabel(status) {
    const numeric = Number(status);
    if (numeric === 401) {
      return "login required · 401";
    }
    if (numeric === 403) {
      return "permission denied · 403";
    }
    if (numeric >= 500) {
      return "server error · " + status;
    }
    if (numeric >= 400) {
      return "client error · " + status;
    }
    if (numeric >= 300) {
      return "redirect · " + status;
    }
    if (numeric >= 200) {
      return "success · " + status;
    }
    return "status " + status;
  }

  function getStatusClass(status) {
    const numeric = Number(status);
    if (numeric === 401 || numeric === 403 || numeric >= 500) {
      return "danger";
    }
    if (numeric >= 400) {
      return "warn";
    }
    if (numeric >= 200 && numeric < 300) {
      return "good";
    }
    return "";
  }

  function renderMainPath(flow) {
    if (!flow || !Array.isArray(flow.mainPath) || flow.mainPath.length === 0) {
      return '<section class="anlyx-section"><h3 class="anlyx-section-title">Main flow</h3><div class="anlyx-empty">No main path was inferred for this endpoint.</div></section>';
    }
    const nodeById = new Map((flow.nodes || []).map((node) => [node.id, node]));
    return '<section class="anlyx-section"><h3 class="anlyx-section-title">Main flow</h3><div class="anlyx-node-chain"><span class="anlyx-flow-rail" aria-hidden="true"></span>' +
      flow.mainPath.map((nodeId, index) => renderNode(nodeById.get(nodeId), false, index + 1)).join("") +
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
    return '<details class="anlyx-disclosure" open><summary><span>Support calls</span><span class="anlyx-disclosure-count">' + support.length + '</span></summary><div class="anlyx-node-chain"><span class="anlyx-flow-rail" aria-hidden="true"></span>' +
      support.slice(0, 8).map((node, index) => renderNode(node, true, index + 1)).join("") +
    '</div></details>';
  }

  function renderLinkedPages(pages) {
    if (!pages || pages.length === 0) {
      return "";
    }
    return '<section class="anlyx-section"><h3 class="anlyx-section-title">Linked pages</h3><div class="anlyx-path-list">' +
      pages.slice(0, 6).map((page, index) => '<div class="anlyx-node"><span class="anlyx-node-index">' + escapeHtml(index + 1) + '</span><div><p class="anlyx-node-type">Page</p><p class="anlyx-node-label">' + escapeHtml(page.route || page.id) + '</p></div></div>').join("") +
    '</div></section>';
  }

  function renderNode(node, support, index) {
    if (!node) {
      return '<div class="anlyx-node" data-node-type="unknown"><span class="anlyx-node-index"><span class="anlyx-node-icon">?</span><span class="anlyx-node-number">' + escapeHtml(index || "?") + '</span></span><div><div class="anlyx-node-top"><span class="anlyx-node-type-pill">Unknown</span><span class="anlyx-node-confidence">confidence unknown</span></div><p class="anlyx-node-label">Missing node data</p></div></div>';
    }
    const nodeType = String(node.type || "node").toLowerCase();
    return '<div class="anlyx-node ' + (support ? 'support' : '') + '" data-node-type="' + escapeHtml(nodeType) + '">' +
      '<span class="anlyx-node-index"><span class="anlyx-node-icon">' + escapeHtml(getNodeTypeIcon(nodeType)) + '</span><span class="anlyx-node-number">' + escapeHtml(index || "?") + '</span></span><div>' +
      '<div class="anlyx-node-top"><span class="anlyx-node-type-pill">' + escapeHtml(getNodeTypeLabel(nodeType)) + '</span><span class="anlyx-node-confidence">confidence ' + escapeHtml(node.confidence || "unknown") + '</span></div>' +
      '<p class="anlyx-node-label">' + escapeHtml(node.label || node.id) + '</p>' +
      renderEvidence(node) +
      '</div>' +
    '</div>';
  }

  function getNodeTypeIcon(type) {
    if (type === "endpoint") {
      return "API";
    }
    if (type === "controller") {
      return "C";
    }
    if (type === "service") {
      return "S";
    }
    if (type === "repository") {
      return "R";
    }
    if (type === "database") {
      return "DB";
    }
    if (type === "mapper") {
      return "M";
    }
    if (type === "utility") {
      return "U";
    }
    if (type === "policy" || type === "validator") {
      return "P";
    }
    return "N";
  }

  function getNodeTypeLabel(type) {
    if (type === "endpoint") {
      return "Endpoint";
    }
    if (type === "controller") {
      return "Controller";
    }
    if (type === "service") {
      return "Service";
    }
    if (type === "repository") {
      return "Repository";
    }
    if (type === "database") {
      return "Database";
    }
    if (type === "mapper") {
      return "Mapper";
    }
    if (type === "utility") {
      return "Utility";
    }
    if (type === "policy") {
      return "Policy";
    }
    if (type === "validator") {
      return "Validator";
    }
    return type || "Node";
  }

  function renderEvidence(node) {
    const evidence = Array.isArray(node.evidence) && node.evidence.length > 0 ? node.evidence : getFallbackEvidence(node);
    if (evidence.length === 0) {
      return "";
    }

    return '<details class="anlyx-evidence-details"><summary>Evidence details</summary><div class="anlyx-evidence"><p class="anlyx-evidence-title">Evidence</p>' +
      evidence.slice(0, 2).map((item) => '<div class="anlyx-evidence-item">' +
        '<strong>' + escapeHtml(item.label || "Evidence") + '</strong>' +
        (item.detail ? '<span>' + escapeHtml(item.detail) + '</span>' : '') +
      '</div>').join("") +
    '</div></details>';
  }

  function getFallbackEvidence(node) {
    if (node.type === "endpoint") {
      return [{ label: "Endpoint matched", detail: "Derived from scanned backend routes." }];
    }
    if (node.type === "database") {
      return [{ label: "Database table inferred", detail: "Derived from repository/entity metadata." }];
    }
    if (node.type === "unknown") {
      return [{ label: "Analysis stopped", detail: "Anlyx could not resolve this code element." }];
    }
    return [{ label: "Code node resolved", detail: "Derived from the scanned static flow graph." }];
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
