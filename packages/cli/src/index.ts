#!/usr/bin/env node
import { fileURLToPath } from "node:url";

export { defineConfig } from "@anlyx/core";
export type { AnlyxConfig, NormalizedAnlyxConfig } from "@anlyx/core";

export { findConfigFile, loadConfig } from "./config-loader.js";
export type { LoadConfigOptions } from "./config-loader.js";
export { createDefaultConfigTemplate, runInitCommand } from "./init-command.js";
export type { InitCommandOptions, InitCommandResult } from "./init-command.js";
export { runScanCommand } from "./scan-command.js";
export type {
  ScanCommandDependencies,
  ScanCommandOptions,
  ScanCommandResult
} from "./scan-command.js";

import { runInitCommand } from "./init-command.js";
import { runScanCommand, type ScanCommandDependencies } from "./scan-command.js";

export type CliOptions = {
  cwd?: string;
  write?: (message: string) => void;
  dependencies?: ScanCommandDependencies;
};

export function getHelpText(): string {
  return `Anlyx

Usage:
  anlyx init [--force]
  anlyx scan [--config <path>] [--out <dir>] [--skip-capture]
  anlyx --help

Available commands: init, scan

Notes:
  dev is planned for v0.1 integration and is not available in this build.
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

  write(`Unknown command: ${command}`);
  write(getHelpText());
  return 1;
}

if (isCliEntrypoint()) {
  const exitCode = await runCli();
  process.exitCode = exitCode;
}

function isCliEntrypoint(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  return fileURLToPath(import.meta.url) === process.argv[1];
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
