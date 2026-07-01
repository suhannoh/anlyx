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
export {
  findLatestFlowSnapshot,
  FlowImportValidationError,
  ProjectImportValidationError,
  runImportCommand,
  runValidateCommand
} from "./flow-commands.js";
export type { ImportCommandResult, ValidateCommandResult } from "./flow-commands.js";

import {
  FlowImportValidationError,
  ProjectImportValidationError,
  runImportCommand,
  runValidateCommand
} from "./flow-commands.js";
import { runInitCommand } from "./init-command.js";
import {
  closeActiveLocalUiServers,
  runDevCommand,
  type DevCommandDependencies
} from "./dev-command.js";
import type { FlowValidationIssue } from "@anlyx/core";

export type CliOptions = {
  cwd?: string;
  write?: (message: string) => void;
  dependencies?: DevCommandDependencies;
  keepAlive?: boolean;
};

export function getHelpText(): string {
  return `Anlyx

Usage:
  anlyx init [--force]
  anlyx prompt <init|refresh>
  anlyx validate <file>
  anlyx import <file> [--out <dir>]
  anlyx dev [--out <dir>] [--port <port>] [--no-open]
  anlyx --help

Available commands: init, prompt, validate, import, dev
`;
}

export function getPromptHelpText(): string {
  return `Anlyx prompt

Usage:
  anlyx prompt init
  anlyx prompt refresh

Print a copy-ready prompt for your coding agent.
`;
}

export function getDevHelpText(): string {
  return `Anlyx dev

Usage:
  anlyx dev [--config <path>] [--out <dir>] [--port <port>] [--no-open]

Options:
  --config <path>   Load a specific anlyx config file.
  --out <dir>       Read Anlyx project or legacy report data from a custom output directory.
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

  if (command === "prompt") {
    const parsed = parsePromptArgs(args.slice(1));

    if (parsed.help) {
      write(getPromptHelpText());
      return 0;
    }

    if (parsed.error) {
      write(parsed.error);
      write(getPromptHelpText());
      return 1;
    }

    write(getAgentPrompt(parsed.kind));
    return 0;
  }

  if (command === "validate") {
    const parsed = parseValidateArgs(args.slice(1));

    if (parsed.help) {
      write(getHelpText());
      return 0;
    }

    if (parsed.error) {
      write(parsed.error);
      write(getHelpText());
      return 1;
    }

    try {
      const result = await runValidateCommand({
        ...(options.cwd ? { cwd: options.cwd } : {}),
        filePath: parsed.filePath
      });

      if (result.valid) {
        write(`Valid ${formatDataKind(result.kind)} JSON: ${parsed.filePath}`);
        writeIssues(result.warnings, write);
        return 0;
      }

      write(`Invalid ${formatDataKind(result.kind)} JSON: ${parsed.filePath}`);
      writeIssues([...result.errors, ...result.warnings], write);
      return 1;
    } catch (error) {
      write(`Validate failed: ${formatCliError(error)}`);
      return 1;
    }
  }

  if (command === "import") {
    const parsed = parseImportArgs(args.slice(1));

    if (parsed.help) {
      write(getHelpText());
      return 0;
    }

    if (parsed.error) {
      write(parsed.error);
      write(getHelpText());
      return 1;
    }

    try {
      const result = await runImportCommand({
        ...(options.cwd ? { cwd: options.cwd } : {}),
        filePath: parsed.filePath,
        ...(parsed.outputDir ? { outputDir: parsed.outputDir } : {})
      });

      if (result.kind === "project") {
        write(`Imported Project JSON: ${result.projectDataPath}`);
      } else {
        write(`Imported Flow JSON snapshot: ${result.snapshotPath}`);
        write(`Wrote legacy viewer report data: ${result.reportDataPath}`);
      }
      writeIssues(result.warnings, write);
      return 0;
    } catch (error) {
      if (error instanceof ProjectImportValidationError) {
        write(`Import failed: Invalid Project JSON: ${parsed.filePath}`);
        writeIssues([...error.errors, ...error.warnings], write);
        return 1;
      }

      if (error instanceof FlowImportValidationError) {
        write(`Import failed: Invalid Flow JSON: ${parsed.filePath}`);
        writeIssues([...error.errors, ...error.warnings], write);
        return 1;
      }

      write(`Import failed: ${formatCliError(error)}`);
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
        write(`Started Anlyx runtime at ${result.url}`);
        if (result.frontendStarted) {
          write("Started configured frontend dev command.");
        }
        write(`Open your app at ${result.frontendUrl}`);
        write(`Standalone debug viewer: ${result.url}/_anlyx/viewer`);
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

function parsePromptArgs(args: string[]): {
  kind: "init" | "refresh";
  help: boolean;
  error?: string;
} {
  const parsed: {
    kind: "init" | "refresh";
    help: boolean;
    error?: string;
  } = {
    kind: "init",
    help: false
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg.startsWith("-")) {
      parsed.error = `Unknown option for prompt: ${arg}`;
      return parsed;
    }

    if (arg !== "init" && arg !== "refresh") {
      parsed.error = `Unknown prompt type: ${arg}`;
      return parsed;
    }

    parsed.kind = arg;
  }

  return parsed;
}

function getAgentPrompt(kind: "init" | "refresh"): string {
  if (kind === "refresh") {
    return `anlyx refresh

Update the existing anlyx.project.json from the current repository changes.

Rules:
- Read the existing anlyx.project.json first.
- Use git diff, recent commits, and changed files before scanning unrelated code.
- Preserve stable ids for pages, requests, flows, architecture nodes, evidence, overview, and capabilities.
- Update only affected sections.
- Do not recreate the whole file unless it is missing or invalid.
- Keep observed, measured, source-matched, agent-inferred, manual, not-proven, and unknown evidence distinct.
- Use source-matched only when the file exists, the symbol or endpoint is present, and lineStart points to the real source line. Do not use lineStart: 1 as a placeholder.
- Update coverage when detected pages, API usages, endpoints, or modeled scope changed. Mark partial analysis honestly.
- Do not invent measured timing.
- Do not include secrets, production records, or raw personal data.

After updating, run:
  npx anlyx validate anlyx.project.json
  npx anlyx import anlyx.project.json
  npx anlyx dev

Before finishing, report what changed, what stayed uncertain, and whether validation/import/dev succeeded.`;
  }

  return `Create a safe Anlyx Project JSON file and verify it locally.

Anlyx install and reference:
- npm package: anlyx
- install or upgrade command: npm install -D anlyx@latest
- public repository and docs: https://github.com/suhannoh/anlyx
- agent guide: https://github.com/suhannoh/anlyx/blob/main/docs/agent/anlyx-project-json-agent-guide.md
- local viewer URL after running dev: http://localhost:4777

Goal:
- Produce anlyx.project.json as the primary Anlyx input.
- Explain what pages exist, what they do, which requests they trigger, how architecture nodes connect, and what evidence supports each claim.
- Clearly separate observed, measured, source-matched, agent-inferred, manual, not-proven, and unknown evidence.
- Use source-matched only when the file exists, the symbol or endpoint is present, and lineStart points to the real source line.
- Do not use lineStart: 1 as a placeholder. If the exact source location is not verified, downgrade the claim to agent-inferred, not-proven, or unknown.
- Count detected pages/routes, frontend API usages, and backend endpoints before choosing the modeled scope.
- Add coverage with detected, modeled, and unmodeled counts. If the JSON covers only representative flows, mark coverage.status as partial.
- Write authored explanations in the user's language and product UI language. Keep API paths, file paths, symbols, DTOs, and enum values unchanged.
- Do not invent measured timing.
- Do not include secrets, production records, or raw personal data.

Steps:
1. Install or upgrade Anlyx in this project: npm install -D anlyx@latest
2. Check the installed package: npm ls anlyx @anlyx/core @anlyx/ui
3. Read the public Anlyx docs if you need the contract.
4. Inspect the repository and identify detected counts, pages, requests, flows, architecture nodes, evidence, overview, and capabilities.
5. Write anlyx.project.json with schemaVersion "0.3.0".
6. Mark uncertain relationships as agent-inferred, not-proven, or unknown instead of overclaiming.
7. Validate the file: npx anlyx validate anlyx.project.json
8. If validate reports "Invalid Flow JSON" or expects schemaVersion "0.1.5", the installed Anlyx package is stale. Upgrade Anlyx and rerun validate.
9. Import it: npx anlyx import anlyx.project.json
10. Start the viewer: npx anlyx dev
11. If port 4777 is already in use, start Anlyx on another local port and report the actual URL.
12. Open http://localhost:4777, or the actual local URL you started, and check Pages, Map, Overview, Capabilities, and JSON.

Remember this shortcut for future updates:
- When I later type "anlyx refresh", update the existing anlyx.project.json from current repository changes instead of recreating everything.

Before finishing, report the authored pages, primary requests, architecture layers, evidence levels, coverage status, validation report issues, and remaining uncertainty.`;
}

function parseValidateArgs(args: string[]): {
  filePath: string;
  help: boolean;
  error?: string;
} {
  const parsed: {
    filePath: string;
    help: boolean;
    error?: string;
  } = {
    filePath: "",
    help: false
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }

    if (arg.startsWith("-")) {
      parsed.error = `Unknown option for validate: ${arg}`;
      return parsed;
    }

    if (parsed.filePath) {
      parsed.error = `Unexpected argument for validate: ${arg}`;
      return parsed;
    }

    parsed.filePath = arg;
  }

  if (!parsed.help && !parsed.filePath) {
    parsed.error = "Missing Anlyx JSON file path.";
  }

  return parsed;
}

function parseImportArgs(args: string[]): {
  filePath: string;
  outputDir?: string;
  help: boolean;
  error?: string;
} {
  const parsed: {
    filePath: string;
    outputDir?: string;
    help: boolean;
    error?: string;
  } = {
    filePath: "",
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
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

    if (arg?.startsWith("-")) {
      parsed.error = `Unknown option for import: ${arg}`;
      return parsed;
    }

    if (parsed.filePath) {
      parsed.error = `Unexpected argument for import: ${arg ?? ""}`;
      return parsed;
    }

    parsed.filePath = arg ?? "";
  }

  if (!parsed.help && !parsed.filePath) {
    parsed.error = "Missing Anlyx JSON file path.";
  }

  return parsed;
}

function writeIssues(issues: FlowValidationIssue[], write: (message: string) => void): void {
  for (const issue of issues) {
    write(`${issue.severity.toUpperCase()} ${issue.path} ${issue.code}: ${issue.message}`);
  }
}

function formatCliError(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

function formatDataKind(kind: "project" | "flow"): string {
  return kind === "project" ? "Project" : "Flow";
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
