#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export { defineConfig } from "@anlyx/core";
export type { AnlyxConfig, NormalizedAnlyxConfig } from "@anlyx/core";

export { findConfigFile, loadConfig } from "./config-loader.js";
export type { LoadConfigOptions } from "./config-loader.js";
export { createLocalUiServer, openBrowser, readReportData, runDevCommand } from "./dev-command.js";
export type {
  DevCommandDependencies,
  DevCommandOptions,
  DevCommandResult,
  LocalUiServer,
  LocalUiServerOptions
} from "./dev-command.js";
export { createDefaultConfigTemplate, runInitCommand } from "./init-command.js";
export type { InitCommandOptions, InitCommandResult } from "./init-command.js";
export { runScanCommand } from "./scan-command.js";
export type {
  ScanCommandDependencies,
  ScanCommandOptions,
  ScanCommandResult
} from "./scan-command.js";

import { runInitCommand } from "./init-command.js";
import {
  closeActiveLocalUiServers,
  runDevCommand,
  type DevCommandDependencies
} from "./dev-command.js";
import { runScanCommand, type ScanCommandDependencies } from "./scan-command.js";

export type CliOptions = {
  cwd?: string;
  write?: (message: string) => void;
  dependencies?: ScanCommandDependencies & DevCommandDependencies;
  keepAlive?: boolean;
};

export function getHelpText(): string {
  return `Anlyx

Usage:
  anlyx init [--force]
  anlyx scan [--config <path>] [--out <dir>] [--skip-capture]
  anlyx dev [--config <path>] [--out <dir>] [--port <port>] [--no-open]
  anlyx --help

Available commands: init, scan, dev
`;
}

export function getScanHelpText(): string {
  return `Anlyx scan

Usage:
  anlyx scan [--config <path>] [--out <dir>] [--skip-capture]

Options:
  --config <path>   Load a specific anlyx config file.
  --out <dir>       Write output JSON files to a custom directory.
  --skip-capture    Skip Playwright capture and use adapter page data as-is.
`;
}

export function getDevHelpText(): string {
  return `Anlyx dev

Usage:
  anlyx dev [--config <path>] [--out <dir>] [--port <port>] [--no-open]

Options:
  --config <path>   Load a specific anlyx config file.
  --out <dir>       Read report-data.json from a custom output directory.
  --port <port>     Serve the local UI on a custom port.
  --no-open         Start the UI server without opening a browser.
`;
}

export async function runCli(args: string[] = process.argv.slice(2), options: CliOptions = {}) {
  const write = options.write ?? ((message: string) => process.stdout.write(`${message}\n`));
  const command = args[0];

  if (!command || command === "--help" || command === "-h") {
    write(getHelpText());
    return 0;
  }

  if (command === "init") {
    if (args.includes("--help") || args.includes("-h")) {
      write(getHelpText());
      return 0;
    }

    const invalidOption = args.slice(1).find((arg) => arg !== "--force" && arg !== "-f");

    if (invalidOption) {
      write(`Unknown option for init: ${invalidOption}`);
      write(getHelpText());
      return 1;
    }

    const result = await runInitCommand({
      ...(options.cwd ? { cwd: options.cwd } : {}),
      force: args.includes("--force") || args.includes("-f")
    });

    if (result.skipped) {
      write(`Skipped: ${result.path} already exists. Use --force to overwrite it.`);
      return 0;
    }

    write(`Created ${result.path}`);
    return 0;
  }

  if (command === "scan") {
    const parsed = parseScanArgs(args.slice(1));

    if (parsed.help) {
      write(getScanHelpText());
      return 0;
    }

    if (parsed.error) {
      write(parsed.error);
      write(getScanHelpText());
      return 1;
    }

    try {
      const result = await runScanCommand({
        ...(options.cwd ? { cwd: options.cwd } : {}),
        ...(parsed.configPath ? { configPath: parsed.configPath } : {}),
        ...(parsed.outputDir ? { outputDir: parsed.outputDir } : {}),
        skipCapture: parsed.skipCapture,
        ...(options.dependencies ? { dependencies: options.dependencies } : {})
      });

      write(`Wrote ${result.reportDataPath}`);

      if (result.issues.length > 0) {
        write(`Scan completed with ${result.issues.length} aggregation issue(s).`);
      }

      return 0;
    } catch (error) {
      write(`Scan failed: ${error instanceof Error ? error.message : "unknown error"}`);
      return 1;
    }
  }

  if (command === "dev") {
    const parsed = parseDevArgs(args.slice(1));

    if (parsed.help) {
      write(getDevHelpText());
      return 0;
    }

    if (parsed.error) {
      write(parsed.error);
      write(getDevHelpText());
      return 1;
    }

    try {
      const result = await runDevCommand({
        ...(options.cwd ? { cwd: options.cwd } : {}),
        ...(parsed.configPath ? { configPath: parsed.configPath } : {}),
        ...(parsed.outputDir ? { outputDir: parsed.outputDir } : {}),
        ...(parsed.port !== undefined ? { port: parsed.port } : {}),
        ...(parsed.noOpen ? { open: false } : {}),
        ...(options.dependencies ? { dependencies: options.dependencies } : {})
      });

      if (result.mode === "inject") {
        write(`Started Anlyx Live Workspace at ${result.url}`);
        if (result.scanRan) {
          write("Prepared analysis data with automatic scan.");
        }
        if (result.frontendStarted) {
          write("Started configured frontend dev command.");
        }
        write(`Use your app at ${result.frontendUrl}`);
        write(`Capture script: ${result.url}/_anlyx/overlay.js`);
        if (options.keepAlive) {
          await waitUntilInterrupted();
        }
        return 0;
      }

      write(`Started Anlyx UI at ${result.url}`);
      if (options.keepAlive) {
        await waitUntilInterrupted();
      }
      return 0;
    } catch (error) {
      write(`Dev server failed: ${error instanceof Error ? error.message : "unknown error"}`);
      return 1;
    }
  }

  write(`Unknown command: ${command}`);
  write(getHelpText());
  return 1;
}

function parseDevArgs(args: string[]): {
  configPath?: string;
  outputDir?: string;
  port?: number;
  noOpen: boolean;
  help: boolean;
  error?: string;
} {
  const parsed: {
    configPath?: string;
    outputDir?: string;
    port?: number;
    noOpen: boolean;
    help: boolean;
    error?: string;
  } = {
    noOpen: false,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg === "--no-open") {
      parsed.noOpen = true;
      continue;
    }

    if (arg === "--config") {
      const value = args[index + 1];

      if (!value || value.startsWith("-")) {
        parsed.error = "Missing value for --config.";
        return parsed;
      }

      parsed.configPath = value;
      index += 1;
      continue;
    }

    if (arg === "--out") {
      const value = args[index + 1];

      if (!value || value.startsWith("-")) {
        parsed.error = "Missing value for --out.";
        return parsed;
      }

      parsed.outputDir = value;
      index += 1;
      continue;
    }

    if (arg === "--port") {
      const value = args[index + 1];

      if (!value || value.startsWith("-")) {
        parsed.error = "Missing value for --port.";
        return parsed;
      }

      const port = Number.parseInt(value, 10);

      if (!Number.isInteger(port) || port <= 0) {
        parsed.error = "Invalid value for --port.";
        return parsed;
      }

      parsed.port = port;
      index += 1;
      continue;
    }

    parsed.error = `Unknown option for dev: ${arg ?? ""}`;
    return parsed;
  }

  return parsed;
}

if (isCliEntrypoint()) {
  void runCli(process.argv.slice(2), { keepAlive: true })
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

function waitUntilInterrupted(): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const cleanup = async () => {
      if (resolved) {
        return;
      }
      resolved = true;
      process.off("SIGINT", cleanup);
      process.off("SIGTERM", cleanup);
      await closeActiveLocalUiServers();
      resolve();
    };
    process.once("SIGINT", cleanup);
    process.once("SIGTERM", cleanup);
  });
}

function isCliEntrypoint(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
}

function parseScanArgs(args: string[]): {
  configPath?: string;
  outputDir?: string;
  skipCapture: boolean;
  help: boolean;
  error?: string;
} {
  const parsed: {
    configPath?: string;
    outputDir?: string;
    skipCapture: boolean;
    help: boolean;
    error?: string;
  } = {
    skipCapture: false,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg === "--skip-capture") {
      parsed.skipCapture = true;
      continue;
    }

    if (arg === "--config") {
      const value = args[index + 1];

      if (!value || value.startsWith("-")) {
        parsed.error = "Missing value for --config.";
        return parsed;
      }

      parsed.configPath = value;
      index += 1;
      continue;
    }

    if (arg === "--out") {
      const value = args[index + 1];

      if (!value || value.startsWith("-")) {
        parsed.error = "Missing value for --out.";
        return parsed;
      }

      parsed.outputDir = value;
      index += 1;
      continue;
    }

    parsed.error = `Unknown option for scan: ${arg ?? ""}`;
    return parsed;
  }

  return parsed;
}
