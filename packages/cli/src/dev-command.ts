import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFlowRecordFromBrowserEvent,
  buildFlowRecordFromFrontendServerEvent,
  buildFlowRecordsFromPageViewEvent,
  mergeBackendSpansIntoFlowRecord,
  scanResultSchema,
  type BackendObservedSpan,
  type BackendSpanEvent,
  type BrowserActionEvent,
  type BrowserPageViewEvent,
  type BrowserRequestEvent,
  type FlowRecord,
  type FrontendServerRequestEvent,
  type NormalizedAnlyxConfig,
  type ScanResult
} from "@anlyx/core";
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
  reportDataPath?: string;
  readReportData?: (path: string) => Promise<ScanResult>;
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
  env?: NodeJS.ProcessEnv;
};

export type FrontendDevServerProcess = {
  stop?: () => Promise<void> | void;
};

type RequiredDevCommandDependencies = Required<DevCommandDependencies>;

export type LocalFlowStore = {
  records: FlowRecord[];
  clients: Set<ServerResponse>;
  pendingBackendSpans: Map<string, BackendObservedSpan[]>;
  beginPageScope(options?: { preserveRecords?: FlowRecord[] }): void;
  pushFlow(record: FlowRecord): void;
  pushBackendSpans(requestId: string, spans: BackendObservedSpan[]): FlowRecord | undefined;
};

export type AnlyxRuntimeMiddlewareOptions = LocalUiServerOptions & {
  flowStore: LocalFlowStore;
};

const MAX_RUNTIME_EVENT_BODY_BYTES = 64 * 1024;

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
  const port = options.port ?? getConfiguredPort(config);
  const frontendStarted = await ensureFrontendDevServer({
    cwd,
    config,
    port,
    dependencies
  });
  const server = await dependencies.createLocalUiServer({
    port,
    reportData,
    reportDataPath,
    readReportData: dependencies.readReportData,
    viewerRoot: getViewerRoot(),
    frontendBaseUrl: config.frontend.baseUrl,
    mode: config.server.mode
  });
  activeLocalUiServers.add(server);
  const shouldOpenBrowser = options.open ?? config.server.openBrowser;

  const browserUrl = server.url;

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
  port: number;
  dependencies: RequiredDevCommandDependencies;
}): Promise<boolean> {
  const command = options.config.dev?.command;

  if (!command) {
    return false;
  }

  if (await options.dependencies.isFrontendReachable(options.config.frontend.baseUrl)) {
    return false;
  }

  const env = getFrontendDevServerEnv(options.config, options.port);
  options.dependencies.startFrontendDevServer({
    command,
    cwd: options.cwd,
    ...(env ? { env } : {})
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
    env: options.env ?? process.env,
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

function getFrontendDevServerEnv(
  config: NormalizedAnlyxConfig,
  port: number
): NodeJS.ProcessEnv | undefined {
  if (config.frontend.type !== "next") {
    return undefined;
  }

  const runtimeUrl = `http://127.0.0.1:${port}`;
  const preload = "--import anlyx/next-server/register";
  const nodeOptions = [preload, process.env.NODE_OPTIONS ?? ""].filter(Boolean).join(" ");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ANLYX_RUNTIME_URL: runtimeUrl,
    NODE_OPTIONS: nodeOptions
  };

  if (config.backend.type === "spring" && config.backend.baseUrl) {
    env.ANLYX_BACKEND_BASE_URL = config.backend.baseUrl;
  }

  return env;
}

export function createLocalFlowStore(): LocalFlowStore {
  const store: LocalFlowStore = {
    records: [],
    clients: new Set<ServerResponse>(),
    pendingBackendSpans: new Map<string, BackendObservedSpan[]>(),
    beginPageScope(options = {}) {
      store.records = options.preserveRecords ?? [];
      store.pendingBackendSpans.clear();
      for (const client of store.clients) {
        writeSseReset(client);
      }
      for (const record of store.records) {
        for (const client of store.clients) {
          writeSseFlow(client, record);
        }
      }
    },
    pushFlow(record) {
      const pendingSpans = store.pendingBackendSpans.get(record.requestId) ?? [];
      const nextRecord = pendingSpans.length > 0 ? mergeBackendSpans(record, pendingSpans) : record;

      store.pendingBackendSpans.delete(record.requestId);
      const shouldSkipSourceOnly = isSourceOnlyFlowRecord(nextRecord)
        ? store.records.some((item) => isObservedFlowRecord(item) && recordsDescribeSameEndpoint(item, nextRecord))
        : false;

      if (shouldSkipSourceOnly) {
        return;
      }

      store.records = [
        nextRecord,
        ...store.records.filter(
          (item) =>
            item.id !== nextRecord.id &&
            !(isObservedFlowRecord(nextRecord) && isSourceOnlyFlowRecord(item) && recordsDescribeSameEndpoint(nextRecord, item))
        )
      ].slice(0, 100);
      for (const client of store.clients) {
        writeSseFlow(client, nextRecord);
      }
    },
    pushBackendSpans(requestId, spans) {
      const existing = store.records.find((record) => record.requestId === requestId);

      if (!existing) {
        store.pendingBackendSpans.set(
          requestId,
          mergeUniqueBackendSpans(store.pendingBackendSpans.get(requestId) ?? [], spans)
        );
        return undefined;
      }

      const nextRecord = mergeBackendSpans(existing, spans);
      store.records = [nextRecord, ...store.records.filter((item) => item.id !== nextRecord.id)];
      for (const client of store.clients) {
        writeSseFlow(client, nextRecord);
      }

      return nextRecord;
    }
  };

  return store;
}

function mergeBackendSpans(record: FlowRecord, spans: BackendObservedSpan[]): FlowRecord {
  return mergeBackendSpansIntoFlowRecord(
    record,
    mergeUniqueBackendSpans(record.backendSpans ?? [], spans)
  );
}

function mergeUniqueBackendSpans(
  current: BackendObservedSpan[],
  incoming: BackendObservedSpan[]
): BackendObservedSpan[] {
  const byId = new Map<string, BackendObservedSpan>();

  for (const span of current) {
    byId.set(span.id, span);
  }

  for (const span of incoming) {
    byId.set(span.id, span);
  }

  return [...byId.values()].sort((a, b) => a.startOffsetMs - b.startOffsetMs);
}

function isObservedFlowRecord(record: FlowRecord): boolean {
  return record.layers.some(
    (layer) =>
      layer.evidenceLevel === "browser_observed" ||
      layer.evidenceLevel === "frontend_server_observed" ||
      layer.evidenceLevel === "backend_observed"
  );
}

function isSourceOnlyFlowRecord(record: FlowRecord): boolean {
  return (
    record.layers.some((layer) => layer.evidenceLevel === "source_derived") &&
    !isObservedFlowRecord(record)
  );
}

function recordsDescribeSameEndpoint(left: FlowRecord, right: FlowRecord): boolean {
  if (left.endpointId && right.endpointId) {
    return left.endpointId === right.endpointId;
  }

  return left.method === right.method && left.path === right.path;
}

function createAnlyxDevPlugin(options: LocalUiServerOptions) {
  const flowStore = createLocalFlowStore();

  return {
    name: "anlyx-dev-runtime",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((request, response, next) => {
        if (
          request.method === "GET" &&
          (options.mode === "viewer" || options.mode === "inject") &&
          request.url === "/"
        ) {
          request.url = "/viewer.html";
        }

        next();
      });

      server.middlewares.use(createAnlyxRuntimeMiddleware({ ...options, flowStore }));
    }
  };
}

export function createAnlyxRuntimeMiddleware(options: AnlyxRuntimeMiddlewareOptions) {
  return async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const requestUrl = request.url ?? "/";

    if (request.method === "OPTIONS" && isAnlyxPath(requestUrl)) {
      if (!isAllowedRuntimeOrigin(request, options)) {
        response.statusCode = 403;
        response.end();
        return;
      }

      response.statusCode = 204;
      setCorsHeaders(request, response, options);
      response.end();
      return;
    }

    if (request.method === "POST" && requestUrl === "/_anlyx/events") {
      await handleBrowserEventPost(request, response, options);
      return;
    }

    if (request.method === "POST" && requestUrl === "/_anlyx/backend-spans") {
      await handleBackendSpanPost(request, response, options);
      return;
    }

    if (request.method === "GET" && requestUrl === "/_anlyx/events/stream") {
      handleFlowEventStream(request, response, options);
      return;
    }

    if (request.method === "GET" && isReportDataPath(requestUrl)) {
      sendJson(request, response, options, await resolveRuntimeReportData(options));
      return;
    }

    if (request.method === "GET" && requestUrl === "/_anlyx/overlay.js") {
      response.statusCode = 200;
      setCorsHeaders(request, response, options);
      response.setHeader("content-type", "application/javascript; charset=utf-8");
      response.end(getOverlayClientScript());
      return;
    }

    if (request.method === "GET" && requestUrl === "/_anlyx/capture.js") {
      await sendRuntimeAsset(
        request,
        response,
        options,
        join(options.viewerRoot, "../overlay/capture.js"),
        "application/javascript; charset=utf-8"
      );
      return;
    }

    if (request.method === "GET" && requestUrl === "/_anlyx/spring-bridge.java") {
      response.statusCode = 200;
      setCorsHeaders(request, response, options);
      response.setHeader("content-type", "text/plain; charset=utf-8");
      response.end(getSpringBridgeSource(`http://127.0.0.1:${options.port}`));
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

async function handleBrowserEventPost(
  request: IncomingMessage,
  response: ServerResponse,
  options: AnlyxRuntimeMiddlewareOptions
): Promise<void> {
  if (!isAllowedRuntimeOrigin(request, options)) {
    sendAcceptedJson(request, response, options, 403, { accepted: false, error: "Forbidden origin." });
    return;
  }

  const body = await readRuntimeEventBody(request, response, options);

  if (body === false) {
    return;
  }

  if (!body) {
    sendAcceptedJson(request, response, options, 400, { accepted: false, error: "Missing JSON body." });
    return;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    sendAcceptedJson(request, response, options, 400, { accepted: false, error: "Invalid JSON body." });
    return;
  }

  if (isBrowserPageViewEvent(parsed)) {
    const reportData = await resolveRuntimeReportData(options);
    const records = buildFlowRecordsFromPageViewEvent(parsed, reportData);
    const preserveRecords = options.flowStore.records.filter((record) =>
      records.some((sourceRecord) => isObservedFlowRecord(record) && recordsDescribeSameEndpoint(record, sourceRecord))
    );

    options.flowStore.beginPageScope({ preserveRecords });

    records.forEach((record) => options.flowStore.pushFlow(record));
    sendAcceptedJson(request, response, options, 202, {
      accepted: true,
      ...(records.length > 0
        ? { id: records[0]!.id, ids: records.map((record) => record.id) }
        : { pending: true })
    });
    return;
  }

  if (isFrontendServerRequestEvent(parsed)) {
    const reportData = await resolveRuntimeReportData(options);
    const record = buildFlowRecordFromFrontendServerEvent(parsed, reportData);
    options.flowStore.pushFlow(record);
    sendAcceptedJson(request, response, options, 202, { accepted: true, id: record.id });
    return;
  }

  if (!isBrowserRequestEvent(parsed)) {
    sendAcceptedJson(request, response, options, 400, {
      accepted: false,
      error: "Invalid browser request event."
    });
    return;
  }

  const reportData = await resolveRuntimeReportData(options);
  const record = buildFlowRecordFromBrowserEvent(parsed, reportData);
  options.flowStore.pushFlow(record);
  sendAcceptedJson(request, response, options, 202, { accepted: true, id: record.id });
}

async function resolveRuntimeReportData(
  options: Pick<AnlyxRuntimeMiddlewareOptions, "reportData" | "reportDataPath" | "readReportData">
): Promise<ScanResult> {
  if (!options.reportDataPath || !options.readReportData) {
    return options.reportData;
  }

  try {
    return await options.readReportData(options.reportDataPath);
  } catch {
    return options.reportData;
  }
}

async function handleBackendSpanPost(
  request: IncomingMessage,
  response: ServerResponse,
  options: AnlyxRuntimeMiddlewareOptions
): Promise<void> {
  if (!isAllowedRuntimeOrigin(request, options)) {
    sendAcceptedJson(request, response, options, 403, { accepted: false, error: "Forbidden origin." });
    return;
  }

  const body = await readRuntimeEventBody(request, response, options);

  if (body === false) {
    return;
  }

  if (!body) {
    sendAcceptedJson(request, response, options, 400, { accepted: false, error: "Missing JSON body." });
    return;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    sendAcceptedJson(request, response, options, 400, { accepted: false, error: "Invalid JSON body." });
    return;
  }

  if (!isBackendSpanEvent(parsed)) {
    sendAcceptedJson(request, response, options, 400, { accepted: false, error: "Invalid backend span event." });
    return;
  }

  const updatedRecord = options.flowStore.pushBackendSpans(parsed.requestId, parsed.spans);
  sendAcceptedJson(request, response, options, 202, {
    accepted: true,
    ...(updatedRecord ? { id: updatedRecord.id } : { pending: true })
  });
}

function handleFlowEventStream(
  request: IncomingMessage,
  response: ServerResponse,
  options: AnlyxRuntimeMiddlewareOptions
) {
  const flowStore = options.flowStore;
  setCorsHeaders(request, response, options);
  response.writeHead(200, {
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "content-type": "text/event-stream; charset=utf-8",
    "x-accel-buffering": "no"
  });

  flowStore.clients.add(response);
  response.write(": connected\n\n");

  for (const record of flowStore.records.slice().reverse()) {
    writeSseFlow(response, record);
  }

  const keepAlive = setInterval(() => {
    response.write(": keepalive\n\n");
  }, 15_000);

  const cleanup = () => {
    clearInterval(keepAlive);
    flowStore.clients.delete(response);
  };

  request.once("close", cleanup);
  response.once("close", cleanup);
}

function writeSseFlow(response: ServerResponse, record: FlowRecord) {
  response.write(`event: flow\ndata: ${JSON.stringify(record)}\n\n`);
}

function writeSseReset(response: ServerResponse) {
  response.write("event: reset\ndata: {}\n\n");
}

function sendAcceptedJson(
  request: IncomingMessage,
  response: ServerResponse,
  options: AnlyxRuntimeMiddlewareOptions,
  statusCode: number,
  value: { accepted: boolean; id?: string; ids?: string[]; pending?: boolean; error?: string }
) {
  response.statusCode = statusCode;
  setCorsHeaders(request, response, options);
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

function sendJson(
  request: IncomingMessage,
  response: ServerResponse,
  options: AnlyxRuntimeMiddlewareOptions,
  value: unknown
) {
  response.statusCode = 200;
  setCorsHeaders(request, response, options);
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

async function sendRuntimeAsset(
  request: IncomingMessage,
  response: ServerResponse,
  options: AnlyxRuntimeMiddlewareOptions,
  path: string,
  contentType: string
): Promise<void> {
  try {
    const content = await readFile(path);
    response.statusCode = 200;
    setCorsHeaders(request, response, options);
    response.setHeader("content-type", contentType);
    response.end(content);
  } catch {
    response.statusCode = 404;
    setCorsHeaders(request, response, options);
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("Anlyx runtime asset not found.");
  }
}

function setCorsHeaders(
  request: IncomingMessage,
  response: ServerResponse,
  options: Pick<AnlyxRuntimeMiddlewareOptions, "frontendBaseUrl" | "port">
) {
  const origin = request.headers.origin;

  if (origin && isAllowedRuntimeOrigin(request, options)) {
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "origin");
  } else if (!origin) {
    response.setHeader("access-control-allow-origin", "*");
  }

  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type, x-anlyx-request-id");
}

function isAllowedRuntimeOrigin(
  request: IncomingMessage,
  options: Pick<AnlyxRuntimeMiddlewareOptions, "frontendBaseUrl" | "port">
): boolean {
  const origin = request.headers.origin;

  if (!origin) {
    return true;
  }

  return allowedRuntimeOrigins(options).has(origin);
}

function allowedRuntimeOrigins(options: Pick<AnlyxRuntimeMiddlewareOptions, "frontendBaseUrl" | "port">) {
  const origins = new Set([`http://localhost:${options.port}`, `http://127.0.0.1:${options.port}`]);

  try {
    origins.add(new URL(options.frontendBaseUrl).origin);
  } catch {
    // Config loading validates frontendBaseUrl; this keeps the runtime defensive for tests.
  }

  return origins;
}

async function readRuntimeEventBody(
  request: IncomingMessage,
  response: ServerResponse,
  options: AnlyxRuntimeMiddlewareOptions
): Promise<Buffer | undefined | false> {
  try {
    return await readRequestBody(request, MAX_RUNTIME_EVENT_BODY_BYTES);
  } catch (error) {
    const message = error instanceof RequestBodyTooLargeError ? "Event body too large." : "Could not read request body.";
    sendAcceptedJson(request, response, options, 413, { accepted: false, error: message });
    return false;
  }
}

function isBrowserPageViewEvent(value: unknown): value is BrowserPageViewEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<BrowserPageViewEvent>;
  return (
    typeof event.id === "string" &&
    event.type === "page_view" &&
    typeof event.url === "string" &&
    typeof event.observedAt === "string" &&
    isOptionalString(event.path) &&
    isOptionalString(event.title)
  );
}

function isBrowserRequestEvent(value: unknown): value is BrowserRequestEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<BrowserRequestEvent>;
  return (
    typeof event.id === "string" &&
    event.type === "request" &&
    typeof event.method === "string" &&
    typeof event.url === "string" &&
    typeof event.observedAt === "string" &&
    isOptionalString(event.path) &&
    isOptionalNumber(event.status) &&
    isOptionalNumber(event.durationMs) &&
    isOptionalBrowserActionEvent(event.action)
  );
}

function isFrontendServerRequestEvent(value: unknown): value is FrontendServerRequestEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<FrontendServerRequestEvent>;
  return (
    typeof event.id === "string" &&
    event.type === "frontend_server_request" &&
    event.runtime === "next" &&
    typeof event.method === "string" &&
    typeof event.url === "string" &&
    typeof event.observedAt === "string" &&
    isOptionalString(event.path) &&
    isOptionalString(event.pagePath) &&
    isOptionalNumber(event.status) &&
    isOptionalNumber(event.durationMs)
  );
}

function isBackendSpanEvent(value: unknown): value is BackendSpanEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<BackendSpanEvent>;
  return (
    event.type === "backend_spans" &&
    typeof event.requestId === "string" &&
    Array.isArray(event.spans) &&
    event.spans.every(isBackendObservedSpan) &&
    isOptionalString(event.observedAt)
  );
}

function isBackendObservedSpan(value: unknown): value is BackendObservedSpan {
  if (!value || typeof value !== "object") {
    return false;
  }

  const span = value as Partial<BackendObservedSpan>;
  return (
    typeof span.id === "string" &&
    isOptionalString(span.parentId) &&
    isBackendSpanLayerType(span.type) &&
    typeof span.label === "string" &&
    isOptionalString(span.nodeId) &&
    isOptionalString(span.filePath) &&
    isOptionalNumber(span.lineNumber) &&
    typeof span.startOffsetMs === "number" &&
    Number.isFinite(span.startOffsetMs) &&
    span.startOffsetMs >= 0 &&
    typeof span.durationMs === "number" &&
    Number.isFinite(span.durationMs) &&
    span.durationMs >= 0 &&
    isOptionalNumber(span.status) &&
    isOptionalStringArray(span.evidence)
  );
}

function isBackendSpanLayerType(value: unknown): value is BackendObservedSpan["type"] {
  return (
    value === "controller" ||
    value === "auth" ||
    value === "decision" ||
    value === "page" ||
    value === "service" ||
    value === "repository" ||
    value === "database" ||
    value === "dto" ||
    value === "schema" ||
    value === "externalApi" ||
    value === "cache" ||
    value === "utility" ||
    value === "validator" ||
    value === "mapper" ||
    value === "unknown"
  );
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isFinite(value));
}

function isOptionalStringArray(value: unknown): value is string[] | undefined {
  return (
    value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function isOptionalBrowserActionEvent(value: unknown): value is BrowserActionEvent | undefined {
  if (value === undefined) {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const action = value as Partial<BrowserActionEvent>;
  return (
    typeof action.label === "string" &&
    isOptionalString(action.label) &&
    isOptionalString(action.selector) &&
    isOptionalString(action.observedAt) &&
    isOptionalString(action.text)
  );
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

export function getSpringBridgeSource(runtimeBaseUrl: string): string {
  return String.raw`/*
 * Anlyx Spring development bridge.
 *
 * Development only: copy this file into a local Spring Boot app while running Anlyx.
 * It reads X-Anlyx-Request-Id from browser-observed API requests and posts
 * source-adjacent backend spans to ${runtimeBaseUrl}/_anlyx/backend-spans.
 *
 * This is not a production tracing agent. It is a local bridge for the Anlyx MVP.
 */

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.context.annotation.Profile;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@Profile({"local", "dev"})
@EnableAspectJAutoProxy
public class AnlyxDevBridge implements WebMvcConfigurer {
  private static final String ANLYX_RUNTIME_URL = "${runtimeBaseUrl}";
  private static final String ANLYX_REQUEST_ID_HEADER = "X-Anlyx-Request-Id";
  private static final String CONTROLLER_SPAN_ATTRIBUTE = AnlyxDevBridge.class.getName() + ".controllerSpan";
  private static final HttpClient HTTP_CLIENT = HttpClient.newHttpClient();
  private static final ThreadLocal<TraceContext> CURRENT_TRACE = new ThreadLocal<>();

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(anlyxRequestInterceptor());
  }

  @Bean
  public HandlerInterceptor anlyxRequestInterceptor() {
    return new HandlerInterceptor() {
      @Override
      public boolean preHandle(
        HttpServletRequest request,
        HttpServletResponse response,
        Object handler
      ) {
        String requestId = request.getHeader(ANLYX_REQUEST_ID_HEADER);

        if (requestId != null && !requestId.isBlank()) {
          CURRENT_TRACE.set(new TraceContext(requestId, System.nanoTime()));
          storeControllerSpan(request, handler);
        }

        return true;
      }

      @Override
      public void afterCompletion(
        HttpServletRequest request,
        HttpServletResponse response,
        Object handler,
        Exception ex
      ) {
        TraceContext trace = CURRENT_TRACE.get();
        CURRENT_TRACE.remove();

        appendControllerSpan(request, trace);

        if (trace == null || trace.spans.isEmpty()) {
          return;
        }

        postSpans(trace);
      }
    };
  }

  @Bean
  public static BeanPostProcessor anlyxDataSourceSpanPostProcessor() {
    return new BeanPostProcessor() {
      @Override
      public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (!(bean instanceof DataSource dataSource) || Proxy.isProxyClass(bean.getClass())) {
          return bean;
        }

        return wrapDataSource(dataSource);
      }
    };
  }

  private static DataSource wrapDataSource(DataSource delegate) {
    return (DataSource) Proxy.newProxyInstance(
      delegate.getClass().getClassLoader(),
      new Class<?>[] {DataSource.class},
      (proxy, method, args) -> {
        if (isObjectMethod(method)) {
          return invoke(method, delegate, args);
        }

        Object result = invoke(method, delegate, args);

        if (result instanceof Connection connection && "getConnection".equals(method.getName())) {
          return wrapConnection(connection);
        }

        return result;
      }
    );
  }

  private static Connection wrapConnection(Connection delegate) {
    return (Connection) Proxy.newProxyInstance(
      delegate.getClass().getClassLoader(),
      new Class<?>[] {Connection.class},
      (proxy, method, args) -> {
        Object result = invoke(method, delegate, args);

        if (result instanceof Statement statement) {
          String sqlHint = firstStringArg(args);

          if (isStatementFactory(method.getName())) {
            return wrapStatement(statement, sqlHint);
          }
        }

        return result;
      }
    );
  }

  private static Statement wrapStatement(Statement delegate, String sqlHint) {
    List<Class<?>> interfaces = new ArrayList<>();

    if (delegate instanceof CallableStatement) {
      interfaces.add(CallableStatement.class);
    }

    if (delegate instanceof PreparedStatement) {
      interfaces.add(PreparedStatement.class);
    }

    interfaces.add(Statement.class);

    return (Statement) Proxy.newProxyInstance(
      delegate.getClass().getClassLoader(),
      interfaces.toArray(Class<?>[]::new),
      (proxy, method, args) -> {
        if (!isJdbcExecuteMethod(method.getName())) {
          return invoke(method, delegate, args);
        }

        String sql = firstStringArg(args);
        return captureJdbcSpan(sql == null ? sqlHint : sql, () -> invoke(method, delegate, args));
      }
    );
  }

  private static Object captureJdbcSpan(String sql, ThrowingSupplier<?> supplier) throws Throwable {
    TraceContext trace = CURRENT_TRACE.get();

    if (trace == null) {
      return supplier.get();
    }

    long startNanos = System.nanoTime();
    Span span = new Span();
    span.id = "span:" + UUID.randomUUID();
    span.parentId = trace.stack.peek();
    span.type = "database";
    span.label = compactSqlLabel(sql);
    span.startOffsetMs = millisBetween(trace.startedAtNanos, startNanos);

    trace.stack.push(span.id);

    try {
      return supplier.get();
    } catch (Throwable error) {
      span.evidence.add(error.getClass().getSimpleName());
      throw error;
    } finally {
      trace.stack.pop();
      span.durationMs = Math.max(1, millisBetween(startNanos, System.nanoTime()));
      span.evidence.add("jdbc_execute");
      trace.spans.add(span);
    }
  }

  private static Object invoke(Method method, Object target, Object[] args) throws Throwable {
    try {
      return method.invoke(target, args);
    } catch (InvocationTargetException error) {
      throw error.getCause();
    }
  }

  private static boolean isObjectMethod(Method method) {
    return method.getDeclaringClass().equals(Object.class);
  }

  private static boolean isStatementFactory(String methodName) {
    return "createStatement".equals(methodName)
      || "prepareStatement".equals(methodName)
      || "prepareCall".equals(methodName);
  }

  private static boolean isJdbcExecuteMethod(String methodName) {
    return "execute".equals(methodName)
      || "executeQuery".equals(methodName)
      || "executeUpdate".equals(methodName)
      || "executeLargeUpdate".equals(methodName)
      || "executeBatch".equals(methodName)
      || "executeLargeBatch".equals(methodName);
  }

  private static String firstStringArg(Object[] args) {
    if (args == null || args.length == 0 || !(args[0] instanceof String value)) {
      return null;
    }

    return value;
  }

  private static String compactSqlLabel(String sql) {
    if (sql == null || sql.isBlank()) {
      return "JDBC statement";
    }

    String compact = sql.replaceAll("\\s+", " ").trim();
    return compact.length() > 96 ? compact.substring(0, 93) + "..." : compact;
  }

  private static void storeControllerSpan(HttpServletRequest request, Object handler) {
    if (!(handler instanceof HandlerMethod handlerMethod)) {
      return;
    }

    Span span = new Span();
    span.id = "span:" + UUID.randomUUID();
    span.type = "controller";
    span.label = handlerMethod.getBeanType().getSimpleName() + "." + handlerMethod.getMethod().getName();
    span.startOffsetMs = 0;
    span.evidence.add("handler_method:" + handlerMethod.getBeanType().getName() + "#" + handlerMethod.getMethod().getName());

    request.setAttribute(CONTROLLER_SPAN_ATTRIBUTE, span);
  }

  private static void appendControllerSpan(HttpServletRequest request, TraceContext trace) {
    if (trace == null) {
      return;
    }

    Object rawSpan = request.getAttribute(CONTROLLER_SPAN_ATTRIBUTE);

    if (!(rawSpan instanceof Span controllerSpan)) {
      return;
    }

    boolean alreadyCaptured = trace.spans.stream()
      .anyMatch(span -> "controller".equals(span.type) && controllerSpan.label.equals(span.label));

    if (alreadyCaptured) {
      return;
    }

    controllerSpan.durationMs = Math.max(1, millisBetween(trace.startedAtNanos, System.nanoTime()));
    trace.spans.add(0, controllerSpan);
  }

  @Bean
  public AnlyxSpanAspect anlyxSpanAspect() {
    return new AnlyxSpanAspect();
  }

  @Aspect
  public static class AnlyxSpanAspect {
    @Around(
      "@within(org.springframework.web.bind.annotation.RestController) || " +
      "@within(org.springframework.stereotype.Service) || " +
      "@within(org.springframework.stereotype.Repository) || " +
      "this(org.springframework.data.repository.Repository)"
    )
    public Object captureSpringLayer(ProceedingJoinPoint joinPoint) throws Throwable {
      TraceContext trace = CURRENT_TRACE.get();

      if (trace == null) {
        return joinPoint.proceed();
      }

      long startNanos = System.nanoTime();
      Span span = new Span();
      span.id = "span:" + UUID.randomUUID();
      span.parentId = trace.stack.peek();
      span.type = spanType(joinPoint);
      span.label = joinPoint.getSignature().getDeclaringType().getSimpleName()
        + "."
        + joinPoint.getSignature().getName();
      span.startOffsetMs = millisBetween(trace.startedAtNanos, startNanos);

      trace.stack.push(span.id);

      try {
        return joinPoint.proceed();
      } catch (Throwable error) {
        span.evidence.add(error.getClass().getSimpleName());
        throw error;
      } finally {
        trace.stack.pop();
        span.durationMs = Math.max(1, millisBetween(startNanos, System.nanoTime()));
        trace.spans.add(span);
      }
    }

    private static String spanType(ProceedingJoinPoint joinPoint) {
      Class<?> declaringType = joinPoint.getSignature().getDeclaringType();

      if (declaringType.isAnnotationPresent(org.springframework.web.bind.annotation.RestController.class)) {
        return "controller";
      }

      if (declaringType.isAnnotationPresent(org.springframework.stereotype.Repository.class)) {
        return "repository";
      }

      if (declaringType.isAnnotationPresent(org.springframework.stereotype.Service.class)) {
        return "service";
      }

      return "unknown";
    }
  }

  private static void postSpans(TraceContext trace) {
    String payload = toJson(trace);
    HttpRequest request = HttpRequest.newBuilder()
      .uri(URI.create(ANLYX_RUNTIME_URL + "/_anlyx/backend-spans"))
      .version(HttpClient.Version.HTTP_1_1)
      .timeout(Duration.ofSeconds(2))
      .header("content-type", "application/json")
      .POST(HttpRequest.BodyPublishers.ofString(payload))
      .build();

    try {
      HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.discarding());
    } catch (Exception ignored) {
      // The local Anlyx workspace is optional; never break the app under test.
      if (ignored instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
    }
  }

  private static String toJson(TraceContext trace) {
    StringBuilder json = new StringBuilder();
    json.append("{\"type\":\"backend_spans\",");
    json.append("\"requestId\":\"").append(escapeJson(trace.requestId)).append("\",");
    json.append("\"spans\":[");

    for (int index = 0; index < trace.spans.size(); index += 1) {
      Span span = trace.spans.get(index);

      if (index > 0) {
        json.append(",");
      }

      json.append("{");
      json.append("\"id\":\"").append(escapeJson(span.id)).append("\",");

      if (span.parentId != null) {
        json.append("\"parentId\":\"").append(escapeJson(span.parentId)).append("\",");
      }

      json.append("\"type\":\"").append(escapeJson(span.type)).append("\",");
      json.append("\"label\":\"").append(escapeJson(span.label)).append("\",");
      json.append("\"startOffsetMs\":").append(span.startOffsetMs).append(",");
      json.append("\"durationMs\":").append(span.durationMs);

      if (!span.evidence.isEmpty()) {
        json.append(",\"evidence\":[");

        for (int evidenceIndex = 0; evidenceIndex < span.evidence.size(); evidenceIndex += 1) {
          if (evidenceIndex > 0) {
            json.append(",");
          }

          json.append("\"").append(escapeJson(span.evidence.get(evidenceIndex))).append("\"");
        }

        json.append("]");
      }

      json.append("}");
    }

    json.append("]}");
    return json.toString();
  }

  private static long millisBetween(long startNanos, long endNanos) {
    return Math.max(0, (endNanos - startNanos) / 1_000_000L);
  }

  private static String escapeJson(String value) {
    return value
      .replace("\\", "\\\\")
      .replace("\"", "\\\"")
      .replace("\n", "\\n")
      .replace("\r", "\\r");
  }

  private static final class TraceContext {
    final String requestId;
    final long startedAtNanos;
    final List<Span> spans = new ArrayList<>();
    final Deque<String> stack = new ArrayDeque<>();

    TraceContext(String requestId, long startedAtNanos) {
      this.requestId = requestId;
      this.startedAtNanos = startedAtNanos;
    }
  }

  private static final class Span {
    String id;
    String parentId;
    String type;
    String label;
    long startOffsetMs;
    long durationMs;
    List<String> evidence = new ArrayList<>();
  }

  @FunctionalInterface
  private interface ThrowingSupplier<T> {
    T get() throws Throwable;
  }
}
`;
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

class RequestBodyTooLargeError extends Error {}

function readRequestBody(request: IncomingMessage, maxBytes?: number): Promise<Buffer | undefined> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let rejected = false;

    request.on("data", (chunk: Buffer | string) => {
      if (rejected) {
        return;
      }

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.byteLength;

      if (maxBytes !== undefined && totalBytes > maxBytes) {
        rejected = true;
        reject(new RequestBodyTooLargeError("Request body too large."));
        return;
      }

      chunks.push(buffer);
    });
    request.on("end", () => {
      if (rejected) {
        return;
      }

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
      <p>Start the frontend dev server, then refresh this page. The Live Workspace is still available at <code>/_anlyx/viewer</code>.</p>
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
  if (window.__ANLYX_CAPTURE_BADGE_INSTALLED__) {
    return;
  }

  window.__ANLYX_CAPTURE_BADGE_INSTALLED__ = true;

  const currentScript = document.currentScript;
  const runtimeBaseUrl = currentScript && currentScript.src ? new URL(currentScript.src).origin : window.location.origin;
  window.__ANLYX_RUNTIME_BASE_URL__ = runtimeBaseUrl;

  installCaptureRuntime();
  installCaptureBadge();

  function installCaptureRuntime() {
    if (window.__ANLYX_CAPTURE_INSTALLED__ || document.querySelector("script[data-anlyx-capture-runtime]")) {
      return;
    }

    const script = document.createElement("script");
    script.src = runtimeBaseUrl + "/_anlyx/capture.js";
    script.defer = true;
    script.setAttribute("data-anlyx-capture-runtime", "true");
    document.head.appendChild(script);
  }

  function installCaptureBadge() {
    if (document.getElementById("anlyx-capture-badge")) {
      return;
    }

    const badge = document.createElement("a");
    badge.id = "anlyx-capture-badge";
    badge.href = runtimeBaseUrl + "/";
    badge.target = "_blank";
    badge.rel = "noreferrer";
    badge.textContent = "Anlyx capturing · Open workspace";
    badge.setAttribute("aria-label", "Open Anlyx live workspace");

    Object.assign(badge.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "2147483647",
      padding: "9px 11px",
      border: "1px solid rgba(37, 99, 235, 0.24)",
      borderRadius: "999px",
      background: "rgba(255, 255, 255, 0.94)",
      color: "#0f172a",
      boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
      font: "600 12px/1.2 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      textDecoration: "none",
      pointerEvents: "auto"
    });

    const mount = () => document.body && document.body.appendChild(badge);
    if (document.body) {
      mount();
    } else {
      document.addEventListener("DOMContentLoaded", mount, { once: true });
    }
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
