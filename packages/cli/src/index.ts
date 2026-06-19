#!/usr/bin/env node
import { fileURLToPath } from "node:url";

export { defineConfig } from "@anlyx/core";
export type { AnlyxConfig, NormalizedAnlyxConfig } from "@anlyx/core";

export { findConfigFile, loadConfig } from "./config-loader.js";
export type { LoadConfigOptions } from "./config-loader.js";
export { createDefaultConfigTemplate, runInitCommand } from "./init-command.js";
export type { InitCommandOptions, InitCommandResult } from "./init-command.js";

import { runInitCommand } from "./init-command.js";

export type CliOptions = {
  cwd?: string;
  write?: (message: string) => void;
};

export function getHelpText(): string {
  return `Anlyx

Usage:
  anlyx init [--force]
  anlyx --help

Available commands: init

Notes:
  scan/dev are planned for v0.1 integration and are not available in this build.
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
