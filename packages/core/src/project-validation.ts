import type { FlowValidationIssue } from "./flow-spec/validate.js";
import type {
  ProjectCoverageCounts,
  ProjectData,
  SourceLocation
} from "./project-schema.js";
import type { ProjectValidationReport } from "./project-validation-report.js";

export type ProjectValidationResult = {
  valid: boolean;
  errors: FlowValidationIssue[];
  warnings: FlowValidationIssue[];
  report: ProjectValidationReport;
};

type SourceCandidate = {
  source: SourceLocation | undefined;
  path: string;
  requiresSourceMatch: boolean;
};

type ModeledCounts = {
  pages: number;
  requests: number;
  flows: number;
  architectureNodes: number;
};

export async function validateProjectData(
  projectData: ProjectData,
  options: { cwd: string; generatedAt?: string }
): Promise<ProjectValidationResult> {
  const errors: FlowValidationIssue[] = [];
  const warnings: FlowValidationIssue[] = [];

  for (const candidate of collectSourceCandidates(projectData)) {
    warnings.push(...(await validateSourceCandidate(candidate, options.cwd)));
  }

  warnings.push(...validateCoverage(projectData));

  const issues = [...errors, ...warnings];
  const sourceIssueCount = issues.filter((issue) => issue.code.startsWith("source_")).length;
  const sourceIssueBreakdown = summarizeSourceIssues(issues);
  const modeled = getModeledCounts(projectData);
  const summary: ProjectValidationReport["summary"] = {
    sourceIssueCount,
    sourceIssueBreakdown,
    coverageStatus: projectData.coverage?.status ?? "unknown",
    modeled
  };

  if (projectData.coverage?.detected) {
    summary.detected = projectData.coverage.detected;
  }

  const report: ProjectValidationReport = {
    schemaVersion: "0.1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    valid: errors.length === 0,
    summary,
    issues
  };

  return {
    valid: report.valid,
    errors,
    warnings,
    report
  };
}

function collectSourceCandidates(projectData: ProjectData): SourceCandidate[] {
  const candidates: SourceCandidate[] = [];

  projectData.evidence.forEach((evidence, evidenceIndex) => {
    candidates.push({
      source: evidence.source,
      path: `evidence.${evidenceIndex}.source`,
      requiresSourceMatch: evidence.status === "source-matched"
    });
  });

  projectData.flows.forEach((flow, flowIndex) => {
    flow.layers.forEach((layer, layerIndex) => {
      candidates.push({
        source: layer.source,
        path: `flows.${flowIndex}.layers.${layerIndex}.source`,
        requiresSourceMatch: layer.status === "source-matched"
      });
    });
  });

  projectData.pages.forEach((page, pageIndex) => {
    candidates.push({
      source: page.source,
      path: `pages.${pageIndex}.source`,
      requiresSourceMatch: false
    });
  });

  projectData.architecture.nodes.forEach((node, nodeIndex) => {
    candidates.push({
      source: node.source,
      path: `architecture.nodes.${nodeIndex}.source`,
      requiresSourceMatch: false
    });
  });

  return candidates.filter((candidate) => candidate.source || candidate.requiresSourceMatch);
}

async function validateSourceCandidate(
  candidate: SourceCandidate,
  cwd: string
): Promise<FlowValidationIssue[]> {
  const issues: FlowValidationIssue[] = [];
  const source = candidate.source;

  if (!source?.filePath) {
    if (candidate.requiresSourceMatch) {
      issues.push(
        warning(
          "source_matched_missing_source",
          `${candidate.path}.filePath`,
          "source-matched requires a concrete source file."
        )
      );
    }

    return issues;
  }

  const { readFile } = await import("node:fs/promises");
  const { isAbsolute, relative, resolve } = await import("node:path");
  const absolutePath = resolve(cwd, source.filePath);
  const relativePath = relative(resolve(cwd), absolutePath);

  if (isAbsolute(relativePath) || relativePath.startsWith("..")) {
    return [
      warning(
        "source_path_outside_root",
        `${candidate.path}.filePath`,
        `Source path must stay inside the working directory: ${source.filePath}`
      )
    ];
  }

  let content: string;

  try {
    content = await readFile(absolutePath, "utf8");
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error ? error.code : undefined;

    return [
      warning(
        code === "ENOENT" ? "source_file_missing" : "source_file_unreadable",
        `${candidate.path}.filePath`,
        `Source file could not be verified: ${source.filePath}`
      )
    ];
  }

  const lineCount = content.split(/\r?\n/).length;

  if (candidate.requiresSourceMatch && source.lineStart === 1) {
    issues.push(
      warning(
        "source_line_placeholder",
        `${candidate.path}.lineStart`,
        "lineStart: 1 looks like a placeholder. Use the actual symbol line or downgrade the evidence status."
      )
    );
  }

  if (source.lineStart && source.lineStart > lineCount) {
    issues.push(
      warning(
        "source_line_out_of_range",
        `${candidate.path}.lineStart`,
        `lineStart ${source.lineStart} is outside ${source.filePath}.`
      )
    );
  }

  if (source.lineEnd && source.lineEnd > lineCount) {
    issues.push(
      warning(
        "source_line_out_of_range",
        `${candidate.path}.lineEnd`,
        `lineEnd ${source.lineEnd} is outside ${source.filePath}.`
      )
    );
  }

  if (source.symbol && !content.includes(source.symbol)) {
    issues.push(
      warning(
        "source_symbol_not_found",
        `${candidate.path}.symbol`,
        `Symbol was not found in ${source.filePath}: ${source.symbol}`
      )
    );
  }

  return issues;
}

function validateCoverage(projectData: ProjectData): FlowValidationIssue[] {
  const issues: FlowValidationIssue[] = [];
  const coverage = projectData.coverage;

  if (!coverage) {
    return issues;
  }

  if (coverage.status === "partial") {
    issues.push(
      warning(
        "partial_analysis",
        "coverage.status",
        "Project JSON declares partial analysis. Keep unmodeled areas visible to users."
      )
    );
  }

  const modeled = {
    ...getModeledCounts(projectData),
    ...coverage.modeled
  };

  addCoverageGap(issues, "pages", coverage.detected?.pages, modeled.pages);
  addCoverageGap(issues, "requests", coverage.detected?.requests, modeled.requests);
  addCoverageGap(issues, "flows", coverage.detected?.flows, modeled.flows);
  addCoverageGap(
    issues,
    "architectureNodes",
    coverage.detected?.architectureNodes,
    modeled.architectureNodes
  );
  addCoverageGap(
    issues,
    "frontendApiUsages",
    coverage.detected?.frontendApiUsages,
    modeled.requests
  );
  addCoverageGap(
    issues,
    "backendEndpoints",
    coverage.detected?.backendEndpoints,
    modeled.requests
  );

  return issues;
}

function addCoverageGap(
  issues: FlowValidationIssue[],
  key: keyof ProjectCoverageCounts,
  detected: number | undefined,
  modeled: number | undefined
) {
  if (detected === undefined || modeled === undefined || detected <= modeled) {
    return;
  }

  issues.push(
    warning(
      `coverage_${toSnakeCase(key)}_partial`,
      `coverage.detected.${key}`,
      `Only ${modeled} of ${detected} detected ${key} are modeled.`
    )
  );
}

function getModeledCounts(projectData: ProjectData): ModeledCounts {
  return {
    pages: projectData.pages.length,
    requests: projectData.requests.length,
    flows: projectData.flows.length,
    architectureNodes: projectData.architecture.nodes.length
  };
}

function summarizeSourceIssues(
  issues: FlowValidationIssue[]
): NonNullable<ProjectValidationReport["summary"]["sourceIssueBreakdown"]> {
  const breakdown: NonNullable<ProjectValidationReport["summary"]["sourceIssueBreakdown"]> = {
    missingSource: 0,
    missingFiles: 0,
    unreadableFiles: 0,
    outsideRoot: 0,
    placeholderLines: 0,
    outOfRangeLines: 0,
    missingSymbols: 0
  };

  for (const issue of issues) {
    switch (issue.code) {
      case "source_matched_missing_source":
        breakdown.missingSource += 1;
        break;
      case "source_file_missing":
        breakdown.missingFiles += 1;
        break;
      case "source_file_unreadable":
        breakdown.unreadableFiles += 1;
        break;
      case "source_path_outside_root":
        breakdown.outsideRoot += 1;
        break;
      case "source_line_placeholder":
        breakdown.placeholderLines += 1;
        break;
      case "source_line_out_of_range":
        breakdown.outOfRangeLines += 1;
        break;
      case "source_symbol_not_found":
        breakdown.missingSymbols += 1;
        break;
    }
  }

  return breakdown;
}

function warning(code: string, path: string, message: string): FlowValidationIssue {
  return {
    severity: "warning",
    code,
    path,
    message
  };
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
}
