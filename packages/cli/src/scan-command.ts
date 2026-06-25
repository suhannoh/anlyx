import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  aggregateReportData,
  type Endpoint,
  type EndpointFlow,
  type NormalizedAnlyxConfig,
  type PageStoryboard,
  type ReportAggregationIssue
} from "@anlyx/core";
import {
  createManualFrontendAdapter,
  type FrontendAdapter as ManualFrontendAdapter
} from "@anlyx/adapter-manual";
import {
  createNextFrontendAdapter,
  type FrontendAdapter as NextFrontendAdapter
} from "@anlyx/adapter-next";
import {
  createOpenApiBackendAdapter,
  type BackendAdapter as OpenApiBackendAdapter,
  type OpenApiDocument
} from "@anlyx/adapter-openapi";
import {
  createSpringBackendAdapter,
  type BackendAdapter as SpringBackendAdapter
} from "@anlyx/adapter-spring";
import { createCaptureAdapter, type CaptureAdapter } from "@anlyx/capture";

import { loadConfig } from "./config-loader.js";

export type ScanCommandOptions = {
  cwd?: string;
  configPath?: string;
  outputDir?: string;
  skipCapture?: boolean;
  dependencies?: ScanCommandDependencies;
};

export type ScanCommandResult = {
  outputDir: string;
  reportDataPath: string;
  endpointsPath: string;
  flowsPath: string;
  pagesPath: string;
  endpointCount: number;
  flowCount: number;
  pageCount: number;
  issues: ReportAggregationIssue[];
};

export type BackendAdapter = {
  name: string;
  scanEndpoints(): Promise<Endpoint[]>;
  scanFlows(endpoints: Endpoint[]): Promise<EndpointFlow[]>;
};

export type FrontendAdapter = {
  name: string;
  scanPages(): Promise<PageStoryboard[]>;
};

export type ScanCommandDependencies = {
  loadConfig?: typeof loadConfig;
  fetchOpenApiDocument?: (url: string) => Promise<OpenApiDocument>;
  createSpringBackendAdapter?: typeof createSpringBackendAdapter;
  createOpenApiBackendAdapter?: typeof createOpenApiBackendAdapter;
  createNextFrontendAdapter?: typeof createNextFrontendAdapter;
  createManualFrontendAdapter?: typeof createManualFrontendAdapter;
  createCaptureAdapter?: typeof createCaptureAdapter;
};

type OutputPaths = {
  outputDir: string;
  reportDataPath: string;
  endpointsPath: string;
  flowsPath: string;
  pagesPath: string;
};

export async function runScanCommand(options: ScanCommandOptions = {}): Promise<ScanCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const dependencies = withDefaultDependencies(options.dependencies);
  const config = await dependencies.loadConfig({
    cwd,
    ...(options.configPath ? { configPath: options.configPath } : {})
  });
  const outputPaths = buildOutputPaths(cwd, options.outputDir);
  const backendAdapter = await createBackendAdapter(config, cwd, dependencies);
  const frontendAdapter = createFrontendAdapter(config, cwd, dependencies);

  const endpoints = await backendAdapter.scanEndpoints();
  const flows = await backendAdapter.scanFlows(endpoints);
  const scannedPages = await frontendAdapter.scanPages();
  const pages = options.skipCapture
    ? scannedPages
    : await createCapture(config, outputPaths.outputDir, dependencies).capturePages(scannedPages);
  const generatedAt = new Date().toISOString();
  const aggregation = aggregateReportData({
    projectName: config.projectName,
    generatedAt,
    endpoints,
    flows,
    pages,
    ...(options.skipCapture
      ? {}
      : {
          capture: {
            pages,
            capturedAt: generatedAt,
            viewport: config.frontend.viewport,
            ...(config.frontend.capture.storageState
              ? { storageStateUsed: config.frontend.capture.storageState }
              : {})
          }
        })
  });

  await writeScanOutput(outputPaths, {
    endpoints: aggregation.scanResult.endpoints,
    flows: aggregation.scanResult.flows,
    pages: aggregation.scanResult.pages,
    reportData: aggregation.scanResult
  });

  return {
    ...outputPaths,
    endpointCount: aggregation.scanResult.endpoints.length,
    flowCount: aggregation.scanResult.flows.length,
    pageCount: aggregation.scanResult.pages.length,
    issues: aggregation.issues
  };
}

async function createBackendAdapter(
  config: NormalizedAnlyxConfig,
  cwd: string,
  dependencies: Required<ScanCommandDependencies>
): Promise<BackendAdapter> {
  if (config.backend.type === "spring") {
    return dependencies.createSpringBackendAdapter({
      sourceDir: resolve(cwd, config.backend.sourceDir),
      maxMainDepth: config.backend.maxMainDepth,
      maxSubDepth: config.backend.maxSubDepth,
      includeUtilities: config.backend.includeUtilities,
      ...(config.backend.baseUrl ? { baseUrl: config.backend.baseUrl } : {}),
      ...(config.backend.openApiUrl ? { openApiUrl: config.backend.openApiUrl } : {}),
      ...(config.backend.actuatorMappingsUrl
        ? { actuatorMappingsUrl: config.backend.actuatorMappingsUrl }
        : {})
    }) as SpringBackendAdapter;
  }

  const document = await dependencies.fetchOpenApiDocument(config.backend.openApiUrl);

  return dependencies.createOpenApiBackendAdapter({
    document,
    openApiUrl: config.backend.openApiUrl,
    ...(config.backend.baseUrl ? { baseUrl: config.backend.baseUrl } : {})
  }) as OpenApiBackendAdapter;
}

function createFrontendAdapter(
  config: NormalizedAnlyxConfig,
  cwd: string,
  dependencies: Required<ScanCommandDependencies>
): FrontendAdapter {
  if (config.frontend.type === "next") {
    return dependencies.createNextFrontendAdapter({
      sourceDir: resolve(cwd, config.frontend.sourceDir),
      baseUrl: config.frontend.baseUrl,
      ...(config.frontend.sampleParams ? { sampleParams: config.frontend.sampleParams } : {})
    }) as NextFrontendAdapter;
  }

  return dependencies.createManualFrontendAdapter({
    baseUrl: config.frontend.baseUrl,
    urls: config.frontend.urls,
    ...(config.frontend.sourceDir ? { sourceDir: resolve(cwd, config.frontend.sourceDir) } : {}),
    ...(config.frontend.routeFiles ? { routeFiles: config.frontend.routeFiles } : {})
  }) as ManualFrontendAdapter;
}

function createCapture(
  config: NormalizedAnlyxConfig,
  outputDir: string,
  dependencies: Required<ScanCommandDependencies>
): CaptureAdapter {
  return dependencies.createCaptureAdapter({
    baseUrl: config.frontend.baseUrl,
    outputDir: join(outputDir, "screenshots"),
    viewport: config.frontend.viewport,
    capture: config.frontend.capture,
    ...(config.frontend.type === "next" && config.frontend.sampleParams
      ? { sampleParams: config.frontend.sampleParams }
      : {})
  });
}

function buildOutputPaths(cwd: string, outputDir: string | undefined): OutputPaths {
  const resolvedOutputDir = resolve(cwd, outputDir ?? ".anlyx");

  return {
    outputDir: resolvedOutputDir,
    reportDataPath: join(resolvedOutputDir, "report-data.json"),
    endpointsPath: join(resolvedOutputDir, "endpoints.json"),
    flowsPath: join(resolvedOutputDir, "flows.json"),
    pagesPath: join(resolvedOutputDir, "pages.json")
  };
}

async function writeScanOutput(
  paths: OutputPaths,
  data: {
    endpoints: Endpoint[];
    flows: EndpointFlow[];
    pages: PageStoryboard[];
    reportData: unknown;
  }
): Promise<void> {
  await mkdir(paths.outputDir, { recursive: true });
  await Promise.all([
    writeJson(paths.reportDataPath, data.reportData),
    writeJson(paths.endpointsPath, data.endpoints),
    writeJson(paths.flowsPath, data.flows),
    writeJson(paths.pagesPath, data.pages)
  ]);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchOpenApiDocument(openApiUrl: string): Promise<OpenApiDocument> {
  let response: Response;

  try {
    response = await fetch(openApiUrl);
  } catch (error) {
    throw new Error(
      `Failed to fetch OpenAPI document from ${openApiUrl}: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch OpenAPI document from ${openApiUrl}: ${response.status} ${response.statusText}`
    );
  }

  try {
    return (await response.json()) as OpenApiDocument;
  } catch (error) {
    throw new Error(
      `Failed to parse OpenAPI document from ${openApiUrl}: ${
        error instanceof Error ? error.message : "invalid JSON"
      }`
    );
  }
}

function withDefaultDependencies(
  dependencies: ScanCommandDependencies = {}
): Required<ScanCommandDependencies> {
  return {
    loadConfig: dependencies.loadConfig ?? loadConfig,
    fetchOpenApiDocument: dependencies.fetchOpenApiDocument ?? fetchOpenApiDocument,
    createSpringBackendAdapter:
      dependencies.createSpringBackendAdapter ?? createSpringBackendAdapter,
    createOpenApiBackendAdapter:
      dependencies.createOpenApiBackendAdapter ?? createOpenApiBackendAdapter,
    createNextFrontendAdapter: dependencies.createNextFrontendAdapter ?? createNextFrontendAdapter,
    createManualFrontendAdapter:
      dependencies.createManualFrontendAdapter ?? createManualFrontendAdapter,
    createCaptureAdapter: dependencies.createCaptureAdapter ?? createCaptureAdapter
  };
}
