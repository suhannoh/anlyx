import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import {
  normalizeProjectInput,
  normalizeFlowFileToScanResult,
  parseAnlyxFlowFile,
  type ProjectData,
  type ProjectInput,
  validateAnlyxFlowFile,
  type FlowValidationIssue
} from "@anlyx/core";

export type ValidateCommandResult = {
  kind: "project" | "flow";
  valid: boolean;
  errors: FlowValidationIssue[];
  warnings: FlowValidationIssue[];
};

export type ImportCommandResult =
  | {
      kind: "project";
      projectDataPath: string;
      warnings: FlowValidationIssue[];
    }
  | {
      kind: "flow";
      snapshotPath: string;
      reportDataPath: string;
      warnings: FlowValidationIssue[];
    };

export class FlowImportValidationError extends Error {
  readonly errors: FlowValidationIssue[];
  readonly warnings: FlowValidationIssue[];

  constructor(errors: FlowValidationIssue[], warnings: FlowValidationIssue[]) {
    super("Flow JSON validation failed.");
    this.name = "FlowImportValidationError";
    this.errors = errors;
    this.warnings = warnings;
  }
}

export class ProjectImportValidationError extends Error {
  readonly errors: FlowValidationIssue[];
  readonly warnings: FlowValidationIssue[];

  constructor(errors: FlowValidationIssue[], warnings: FlowValidationIssue[]) {
    super("Project JSON validation failed.");
    this.name = "ProjectImportValidationError";
    this.errors = errors;
    this.warnings = warnings;
  }
}

export async function runValidateCommand(options: {
  cwd?: string;
  filePath: string;
}): Promise<ValidateCommandResult> {
  const cwd = options.cwd ?? process.cwd();
  const input = await readAnlyxJson(cwd, options.filePath);

  if (input.kind === "project") {
    return validateProjectJson(input.value);
  }

  return {
    kind: "flow",
    ...(await validateAnlyxFlowFile(input.value, { cwd }))
  };
}

export async function runImportCommand(options: {
  cwd?: string;
  filePath: string;
  outputDir?: string;
}): Promise<ImportCommandResult> {
  const cwd = options.cwd ?? process.cwd();
  const input = await readAnlyxJson(cwd, options.filePath);

  if (input.kind === "project") {
    const validation = validateProjectJson(input.value);

    if (!validation.valid) {
      throw new ProjectImportValidationError(validation.errors, validation.warnings);
    }

    const projectDataPath = resolveWithinRoot(
      cwd,
      "anlyx.project.json",
      "Project JSON output path"
    );
    await writeFile(projectDataPath, `${JSON.stringify(input.value, null, 2)}\n`, "utf8");

    return {
      kind: "project",
      projectDataPath,
      warnings: validation.warnings
    };
  }

  const file = input.value;
  const validation = await validateAnlyxFlowFile(file, { cwd });

  if (!validation.valid) {
    throw new FlowImportValidationError(validation.errors, validation.warnings);
  }

  const outputRoot = resolveOutputRoot(cwd, options.outputDir);
  const snapshotsDir = join(outputRoot, "snapshots");
  const snapshotPath = join(
    snapshotsDir,
    `${toSnapshotFileStem(file.snapshot?.createdAt ?? new Date().toISOString())}.flow.json`
  );
  const reportDataPath = join(outputRoot, "report-data.json");

  await mkdir(snapshotsDir, { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  await writeFile(
    reportDataPath,
    `${JSON.stringify(normalizeFlowFileToScanResult(file), null, 2)}\n`,
    "utf8"
  );

  return {
    kind: "flow",
    snapshotPath,
    reportDataPath,
    warnings: validation.warnings
  };
}

export async function findLatestFlowSnapshot(options: {
  cwd: string;
  outputDir?: string;
}): Promise<string | null> {
  const snapshotsDir = join(resolveOutputRoot(options.cwd, options.outputDir), "snapshots");

  let entries: string[];

  try {
    entries = await readdir(snapshotsDir);
  } catch (error) {
    if (isMissingPathError(error)) {
      return null;
    }

    throw error;
  }

  const snapshots = entries
    .filter((entry) => entry.endsWith(".flow.json"))
    .sort((left, right) => left.localeCompare(right));

  const latest = snapshots.at(-1);

  return latest ? join(snapshotsDir, latest) : null;
}

async function readAnlyxJson(
  cwd: string,
  filePath: string
): Promise<
  | { kind: "project"; value: ProjectData }
  | { kind: "flow"; value: ReturnType<typeof parseAnlyxFlowFile> }
> {
  const absoluteFilePath = resolveWithinRoot(cwd, filePath, "Anlyx JSON file path");
  const content = await readFile(absoluteFilePath, "utf8");

  let parsed: unknown;

  try {
    parsed = JSON.parse(content) as unknown;
  } catch (error) {
    throw new Error(
      `Failed to parse Anlyx JSON at ${absoluteFilePath}: ${
        error instanceof Error ? error.message : "invalid JSON"
      }`
    );
  }

  if (isProjectJsonInput(parsed)) {
    try {
      return {
        kind: "project",
        value: normalizeProjectInput(parsed as ProjectInput)
      };
    } catch (error) {
      throw new Error(
        `Invalid Project JSON at ${absoluteFilePath}: ${formatValidationError(error)}`
      );
    }
  }

  try {
    return {
      kind: "flow",
      value: parseAnlyxFlowFile(parsed)
    };
  } catch (error) {
    throw new Error(`Invalid Flow JSON at ${absoluteFilePath}: ${formatValidationError(error)}`);
  }
}

function resolveOutputRoot(cwd: string, outputDir: string | undefined): string {
  return resolveWithinRoot(cwd, outputDir ?? ".anlyx", "Output directory");
}

function toSnapshotFileStem(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-");
}

function isMissingPathError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

function resolveWithinRoot(cwd: string, targetPath: string, label: string): string {
  const root = resolve(cwd);
  const absolutePath = resolve(root, targetPath);
  const relativePath = relative(root, absolutePath);

  if (relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath))) {
    return absolutePath;
  }

  throw new Error(`${label} must stay inside the working directory: ${targetPath}`);
}

function validateProjectJson(_projectData: ProjectData): ValidateCommandResult {
  void _projectData;
  return {
    kind: "project",
    valid: true,
    errors: [],
    warnings: []
  };
}

function isProjectJsonInput(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if ("schemaVersion" in value && value.schemaVersion === "0.2.0") {
    return true;
  }

  if (!("index" in value)) {
    return false;
  }

  const index = value.index;

  return (
    typeof index === "object" &&
    index !== null &&
    "schemaVersion" in index &&
    index.schemaVersion === "0.2.0"
  );
}

function formatValidationError(error: unknown): string {
  if (hasZodIssues(error)) {
    return error.issues
      .map((issue) => {
        const issuePath = issue.path.length > 0 ? issue.path.join(".") : "project";
        return `${issuePath}: ${issue.message}`;
      })
      .join("; ");
  }

  return error instanceof Error ? error.message : "invalid JSON";
}

function hasZodIssues(error: unknown): error is {
  issues: Array<{ path: Array<string | number>; message: string }>;
} {
  return (
    typeof error === "object" && error !== null && "issues" in error && Array.isArray(error.issues)
  );
}
