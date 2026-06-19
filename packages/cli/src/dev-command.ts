import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scanResultSchema, type NormalizedAnlyxConfig, type ScanResult } from "@anlyx/core";
import { createServer, type ViteDevServer } from "vite";

import { loadConfig } from "./config-loader.js";

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
};

export type DevCommandDependencies = {
  loadConfig?: typeof loadConfig;
  readReportData?: (path: string) => Promise<ScanResult>;
  createLocalUiServer?: (options: LocalUiServerOptions) => Promise<LocalUiServer>;
  openBrowser?: (url: string) => Promise<void> | void;
};

export type LocalUiServerOptions = {
  port: number;
  reportData: ScanResult;
  viewerRoot: string;
};

export type LocalUiServer = {
  url: string;
  close?: () => Promise<void> | void;
};

type RequiredDevCommandDependencies = Required<DevCommandDependencies>;

export async function runDevCommand(options: DevCommandOptions = {}): Promise<DevCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const dependencies = withDefaultDependencies(options.dependencies);
  const config = await dependencies.loadConfig({
    cwd,
    ...(options.configPath ? { configPath: options.configPath } : {})
  });
  const reportDataPath = join(resolve(cwd, options.outputDir ?? ".anlyx"), "report-data.json");
  const reportData = await dependencies.readReportData(reportDataPath);
  const port = options.port ?? getConfiguredPort(config);
  const server = await dependencies.createLocalUiServer({
    port,
    reportData,
    viewerRoot: getViewerRoot()
  });
  const shouldOpenBrowser = options.open ?? config.server.openBrowser;

  if (shouldOpenBrowser) {
    await dependencies.openBrowser(server.url);
  }

  return {
    url: server.url,
    port,
    reportDataPath
  };
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
    plugins: [createReportDataPlugin(options.reportData)]
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

function createReportDataPlugin(reportData: ScanResult) {
  return {
    name: "anlyx-report-data",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((request, response, next) => {
        if (request.method === "GET" && request.url === "/") {
          request.url = "/viewer.html";
        }

        next();
      });

      server.middlewares.use("/api/report-data", (request, response, next) => {
        if (request.method !== "GET") {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.end(JSON.stringify(reportData));
      });
    }
  };
}

function withDefaultDependencies(
  dependencies: DevCommandDependencies | undefined
): RequiredDevCommandDependencies {
  return {
    loadConfig: dependencies?.loadConfig ?? loadConfig,
    readReportData: dependencies?.readReportData ?? readReportData,
    createLocalUiServer: dependencies?.createLocalUiServer ?? createLocalUiServer,
    openBrowser: dependencies?.openBrowser ?? openBrowser
  };
}

function getConfiguredPort(config: NormalizedAnlyxConfig): number {
  return config.server.port ?? 4777;
}

function getViewerRoot(): string {
  return dirname(fileURLToPath(new URL("../../ui/src/viewer/viewer.html", import.meta.url)));
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
