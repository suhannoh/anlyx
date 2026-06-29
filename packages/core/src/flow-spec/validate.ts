import type { AnlyxFlowFile, FlowEvidence, FlowTiming } from "./schema.js";

export type FlowValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  path: string;
};

export type FlowValidationResult = {
  valid: boolean;
  errors: FlowValidationIssue[];
  warnings: FlowValidationIssue[];
};

export type FlowValidationOptions = {
  cwd: string;
};

export async function validateAnlyxFlowFile(
  file: AnlyxFlowFile,
  options: FlowValidationOptions
): Promise<FlowValidationResult> {
  const errors: FlowValidationIssue[] = [];
  const warnings: FlowValidationIssue[] = [];
  const sourceChecks = new Map<string, Promise<SourceFileCheck>>();
  const emittedSourceWarnings = new Set<string>();

  for (const [flowIndex, flow] of file.flows.entries()) {
    const evidenceById = new Map(flow.evidence.map((evidence) => [evidence.id, evidence]));
    const nodeIds = new Set<string>();

    flow.nodes.forEach((node, nodeIndex) => {
      const path = `flows.${flowIndex}.nodes.${nodeIndex}.id`;

      if (nodeIds.has(node.id)) {
        errors.push({
          severity: "error",
          code: "duplicate_node_id",
          message: `Flow contains duplicate node id: ${node.id}.`,
          path
        });
      }

      nodeIds.add(node.id);
    });

    flow.nodes.forEach((node, nodeIndex) => {
      validateEvidenceIds({
        evidenceIds: node.evidenceIds,
        evidenceById,
        errors,
        pathPrefix: `flows.${flowIndex}.nodes.${nodeIndex}.evidenceIds`
      });
      validateMeasuredTiming({
        timing: node.timing,
        evidenceById,
        errors,
        pathPrefix: `flows.${flowIndex}.nodes.${nodeIndex}.timing`
      });
    });

    flow.edges.forEach((edge, edgeIndex) => {
      if (!nodeIds.has(edge.from)) {
        errors.push({
          severity: "error",
          code: "edge_missing_from_node",
          message: `Flow edge references missing from node: ${edge.from}.`,
          path: `flows.${flowIndex}.edges.${edgeIndex}.from`
        });
      }

      if (!nodeIds.has(edge.to)) {
        errors.push({
          severity: "error",
          code: "edge_missing_to_node",
          message: `Flow edge references missing to node: ${edge.to}.`,
          path: `flows.${flowIndex}.edges.${edgeIndex}.to`
        });
      }

      validateEvidenceIds({
        evidenceIds: edge.evidenceIds,
        evidenceById,
        errors,
        pathPrefix: `flows.${flowIndex}.edges.${edgeIndex}.evidenceIds`
      });
      validateMeasuredTiming({
        timing: edge.timing,
        evidenceById,
        errors,
        pathPrefix: `flows.${flowIndex}.edges.${edgeIndex}.timing`
      });
    });

    await validateSourceEvidence({
      evidence: flow.evidence,
      flowIndex,
      cwd: options.cwd,
      sourceChecks,
      emittedSourceWarnings,
      warnings
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validateEvidenceIds(input: {
  evidenceIds: string[] | undefined;
  evidenceById: Map<string, FlowEvidence>;
  errors: FlowValidationIssue[];
  pathPrefix: string;
}): void {
  input.evidenceIds?.forEach((evidenceId, evidenceIndex) => {
    if (!input.evidenceById.has(evidenceId)) {
      input.errors.push({
        severity: "error",
        code: "missing_evidence",
        message: `Reference points to missing evidence id: ${evidenceId}.`,
        path: `${input.pathPrefix}.${evidenceIndex}`
      });
    }
  });
}

function validateMeasuredTiming(input: {
  timing: FlowTiming | undefined;
  evidenceById: Map<string, FlowEvidence>;
  errors: FlowValidationIssue[];
  pathPrefix: string;
}): void {
  if (input.timing?.kind !== "measured") {
    return;
  }

  const evidence = input.evidenceById.get(input.timing.evidenceId);

  if (!evidence) {
    input.errors.push({
      severity: "error",
      code: "missing_timing_evidence",
      message: `Measured timing references missing evidence id: ${input.timing.evidenceId}.`,
      path: `${input.pathPrefix}.evidenceId`
    });
    return;
  }

  if (!isRuntimeOrTelemetryEvidence(evidence)) {
    input.errors.push({
      severity: "error",
      code: "measured_timing_requires_runtime_evidence",
      message: `Measured timing evidence must be runtime or telemetry evidence: ${input.timing.evidenceId}.`,
      path: `${input.pathPrefix}.evidenceId`
    });
  }
}

function isRuntimeOrTelemetryEvidence(evidence: FlowEvidence): boolean {
  return evidence.kind.startsWith("runtime.") || evidence.kind.startsWith("telemetry.");
}

async function validateSourceEvidence(input: {
  evidence: FlowEvidence[];
  flowIndex: number;
  cwd: string;
  sourceChecks: Map<string, Promise<SourceFileCheck>>;
  emittedSourceWarnings: Set<string>;
  warnings: FlowValidationIssue[];
}): Promise<void> {
  for (const [evidenceIndex, evidence] of input.evidence.entries()) {
    if (evidence.kind !== "source" || !evidence.file) {
      continue;
    }

    const absoluteFile = await resolveSourcePath(input.cwd, evidence.file);
    const check = await getSourceFileCheck(absoluteFile, input.sourceChecks);
    const pathPrefix = `flows.${input.flowIndex}.evidence.${evidenceIndex}`;

    if (check.status === "missing") {
      pushDedupedWarning(
        input.warnings,
        input.emittedSourceWarnings,
        {
          severity: "warning",
          code: "source_file_missing",
          message: `Source evidence file is missing: ${evidence.file}.`,
          path: `${pathPrefix}.file`
        },
        `source_file_missing:${evidence.file}`
      );
      continue;
    }

    if (check.status === "unreadable") {
      pushDedupedWarning(
        input.warnings,
        input.emittedSourceWarnings,
        {
          severity: "warning",
          code: "source_file_unreadable",
          message: `Source evidence file could not be read: ${evidence.file}.`,
          path: `${pathPrefix}.file`
        },
        `source_file_unreadable:${evidence.file}`
      );
      continue;
    }

    const lineRangeIssue = getLineRangeIssue(evidence, check.lineCount);

    if (lineRangeIssue) {
      const lineStart = evidence.lineStart ?? "";
      const lineEnd = evidence.lineEnd ?? "";

      pushDedupedWarning(
        input.warnings,
        input.emittedSourceWarnings,
        {
          severity: "warning",
          code: "source_line_out_of_range",
          message: `Source evidence line range is invalid or outside the file: ${evidence.file}.`,
          path: `${pathPrefix}.${lineRangeIssue}`
        },
        `source_line_out_of_range:${evidence.file}:${lineStart}:${lineEnd}:${lineRangeIssue}`
      );
    }
  }
}

function getSourceFileCheck(
  absoluteFile: string,
  sourceChecks: Map<string, Promise<SourceFileCheck>>
): Promise<SourceFileCheck> {
  const existingCheck = sourceChecks.get(absoluteFile);

  if (existingCheck) {
    return existingCheck;
  }

  const check: Promise<SourceFileCheck> = readSourceFile(absoluteFile).then(
    (content) => ({
      status: "ok" as const,
      lineCount: countLines(content)
    }),
    (error: unknown) =>
      isMissingSourceFileError(error)
        ? {
            status: "missing" as const
          }
        : {
            status: "unreadable" as const
          }
  );

  sourceChecks.set(absoluteFile, check);

  return check;
}

async function readSourceFile(path: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");

  return readFile(path, "utf8");
}

async function resolveSourcePath(cwd: string, file: string): Promise<string> {
  const { resolve } = await import("node:path");

  return resolve(cwd, file);
}

function countLines(content: string): number {
  if (content.length === 0) {
    return 0;
  }

  const lines = content.split(/\r\n|\n|\r/);

  if (lines.at(-1) === "") {
    lines.pop();
  }

  return lines.length;
}

function isMissingSourceFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

function getLineRangeIssue(
  evidence: FlowEvidence,
  lineCount: number
): "lineStart" | "lineEnd" | null {
  const { lineStart, lineEnd } = evidence;

  if (lineStart === undefined && lineEnd === undefined) {
    return null;
  }

  if (lineStart !== undefined && lineEnd === undefined) {
    return lineStart > lineCount ? "lineStart" : null;
  }

  if (lineStart === undefined && lineEnd !== undefined) {
    return lineEnd > lineCount ? "lineEnd" : null;
  }

  if (lineStart === undefined || lineEnd === undefined) {
    return null;
  }

  if (lineStart > lineEnd) {
    return "lineStart";
  }

  if (lineStart > lineCount) {
    return "lineStart";
  }

  if (lineEnd > lineCount) {
    return "lineEnd";
  }

  return null;
}

function pushDedupedWarning(
  warnings: FlowValidationIssue[],
  emittedSourceWarnings: Set<string>,
  issue: FlowValidationIssue,
  dedupeKey: string
): void {
  if (emittedSourceWarnings.has(dedupeKey)) {
    return;
  }

  emittedSourceWarnings.add(dedupeKey);
  warnings.push(issue);
}

type SourceFileCheck =
  | {
      status: "ok";
      lineCount: number;
    }
  | {
      status: "missing";
    }
  | {
      status: "unreadable";
    };
