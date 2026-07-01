import { mkdir, mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseProjectData,
  parseScanResult,
  type AnlyxFlowFile,
  type ProjectData
} from "@anlyx/core";
import { afterEach, describe, expect, it } from "vitest";

import { findLatestFlowSnapshot, runImportCommand, runValidateCommand } from "./flow-commands.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const tempRoot = await mkdtemp(join(tmpdir(), "anlyx-flow-command-"));
  tempRoots.push(tempRoot);
  return tempRoot;
}

describe("Flow JSON CLI commands", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((tempRoot) => rm(tempRoot, { recursive: true, force: true }))
    );
  });

  it("validates a valid Flow JSON file", async () => {
    const cwd = await createTempRoot();
    await writeFlowFile(cwd, "anlyx.flow.json", validFlowFile());

    const result = await runValidateCommand({
      cwd,
      filePath: "anlyx.flow.json"
    });

    expect(result).toEqual({
      kind: "flow",
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it("returns errors when measured timing uses source evidence", async () => {
    const cwd = await createTempRoot();
    const flowFile = validFlowFile();
    flowFile.flows[0]!.evidence = [{ id: "ev.source", kind: "source" }];
    flowFile.flows[0]!.nodes[0]!.timing = {
      kind: "measured",
      durationMs: 42,
      evidenceId: "ev.source"
    };
    flowFile.flows[0]!.nodes[0]!.evidenceIds = ["ev.source"];
    await writeFlowFile(cwd, "invalid.flow.json", flowFile);

    const result = await runValidateCommand({
      cwd,
      filePath: "invalid.flow.json"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "measured_timing_requires_runtime_evidence",
        path: "flows.0.nodes.0.timing.evidenceId"
      })
    );
  });

  it("reports malformed Anlyx JSON clearly", async () => {
    const cwd = await createTempRoot();
    await writeFile(join(cwd, "broken.flow.json"), "{", "utf8");

    await expect(
      runValidateCommand({
        cwd,
        filePath: "broken.flow.json"
      })
    ).rejects.toThrow("Failed to parse Anlyx JSON");
  });

  it("rejects Anlyx JSON paths outside the working directory", async () => {
    const cwd = await createTempRoot();

    await expect(
      runValidateCommand({
        cwd,
        filePath: "../outside.flow.json"
      })
    ).rejects.toThrow("Anlyx JSON file path must stay inside the working directory");
  });

  it("imports a valid Flow JSON file as a snapshot and viewer report data", async () => {
    const cwd = await createTempRoot();
    await writeFlowFile(cwd, "anlyx.flow.json", validFlowFile());

    const result = await runImportCommand({
      cwd,
      filePath: "anlyx.flow.json"
    });
    expect(result.kind).toBe("flow");
    if (result.kind !== "flow") {
      throw new Error("Expected Flow import result.");
    }
    const snapshot = JSON.parse(await readFile(result.snapshotPath, "utf8")) as unknown;
    const reportData = parseScanResult(
      JSON.parse(await readFile(result.reportDataPath, "utf8")) as unknown
    );

    expect(result.snapshotPath).toBe(
      join(cwd, ".anlyx/snapshots/2026-06-26T01-02-03.000Z.flow.json")
    );
    expect(result.reportDataPath).toBe(join(cwd, ".anlyx/report-data.json"));
    expect(result.warnings).toEqual([]);
    expect(snapshot).toEqual(validFlowFile());
    expect(reportData.projectName).toBe("Flow Command Fixture");
    expect(reportData.generatedAt).toBe("2026-06-26T01:02:03.000Z");
    expect(reportData.endpoints[0]).toMatchObject({
      id: "api.search",
      method: "GET",
      path: "/api/search"
    });
  });

  it("rejects invalid Flow JSON import without writing output files", async () => {
    const cwd = await createTempRoot();
    const flowFile = validFlowFile();
    flowFile.flows[0]!.evidence = [{ id: "ev.source", kind: "source" }];
    flowFile.flows[0]!.nodes[0]!.timing = {
      kind: "measured",
      durationMs: 42,
      evidenceId: "ev.source"
    };
    await writeFlowFile(cwd, "invalid.flow.json", flowFile);

    await expect(
      runImportCommand({
        cwd,
        filePath: "invalid.flow.json"
      })
    ).rejects.toMatchObject({
      name: "FlowImportValidationError",
      errors: expect.arrayContaining([
        expect.objectContaining({
          code: "measured_timing_requires_runtime_evidence",
          path: "flows.0.nodes.0.timing.evidenceId"
        })
      ])
    });
    await expect(stat(join(cwd, ".anlyx/report-data.json"))).rejects.toThrow();
    await expect(stat(join(cwd, ".anlyx/snapshots"))).rejects.toThrow();
  });

  it("imports to a custom output directory", async () => {
    const cwd = await createTempRoot();
    await writeFlowFile(cwd, "anlyx.flow.json", validFlowFile());

    const result = await runImportCommand({
      cwd,
      filePath: "anlyx.flow.json",
      outputDir: "flow-output"
    });
    expect(result.kind).toBe("flow");
    if (result.kind !== "flow") {
      throw new Error("Expected Flow import result.");
    }

    expect(result.snapshotPath).toBe(
      join(cwd, "flow-output/snapshots/2026-06-26T01-02-03.000Z.flow.json")
    );
    expect(result.reportDataPath).toBe(join(cwd, "flow-output/report-data.json"));
    await expect(readFile(result.snapshotPath, "utf8")).resolves.toContain(
      '"schemaVersion": "0.1.5"'
    );
    await expect(readFile(result.reportDataPath, "utf8")).resolves.toContain(
      '"schemaVersion": "0.1"'
    );
  });

  it("rejects output directories outside the working directory", async () => {
    const cwd = await createTempRoot();
    await writeFlowFile(cwd, "anlyx.flow.json", validFlowFile());

    await expect(
      runImportCommand({
        cwd,
        filePath: "anlyx.flow.json",
        outputDir: "../flow-output"
      })
    ).rejects.toThrow("Output directory must stay inside the working directory");
    await expect(stat(join(cwd, ".anlyx/report-data.json"))).rejects.toThrow();
  });

  it("returns the newest snapshot by deterministic filename sort", async () => {
    const cwd = await createTempRoot();
    const snapshotsDir = join(cwd, ".anlyx/snapshots");
    await mkdir(snapshotsDir, { recursive: true });
    const older = join(snapshotsDir, "2026-06-26T01-00-00.000Z.flow.json");
    const newer = join(snapshotsDir, "2026-06-26T02-00-00.000Z.flow.json");
    await writeFile(newer, "{}", "utf8");
    await writeFile(older, "{}", "utf8");
    await utimes(newer, new Date("2026-06-26T01:00:00.000Z"), new Date("2026-06-26T01:00:00.000Z"));
    await utimes(older, new Date("2026-06-26T02:00:00.000Z"), new Date("2026-06-26T02:00:00.000Z"));

    await expect(findLatestFlowSnapshot({ cwd })).resolves.toBe(newer);
  });

  it("returns null when no snapshots exist", async () => {
    await expect(findLatestFlowSnapshot({ cwd: await createTempRoot() })).resolves.toBeNull();
  });

  it("validates a valid Project JSON file", async () => {
    const cwd = await createTempRoot();
    await mkdir(join(cwd, "src"), { recursive: true });
    await writeFile(join(cwd, "src/search.ts"), "\nexport function search() {}\n", "utf8");
    await writeProjectFile(cwd, "anlyx.project.json", validProjectFile());

    const result = await runValidateCommand({
      cwd,
      filePath: "anlyx.project.json"
    });

    expect(result).toMatchObject({
      kind: "project",
      valid: true,
      errors: [],
      warnings: [],
      report: {
        schemaVersion: "0.1",
        valid: true,
        summary: {
          sourceIssueCount: 0,
          coverageStatus: "unknown"
        },
        issues: []
      }
    });
  });

  it("warns when source-matched Project JSON references cannot be trusted", async () => {
    const cwd = await createTempRoot();
    await mkdir(join(cwd, "src"), { recursive: true });
    await writeFile(join(cwd, "src/search.ts"), "\nexport function search() {}\n", "utf8");
    const project = validProjectFile();
    project.evidence = [
      {
        id: "ev.missing",
        status: "source-matched",
        label: "Missing source",
        targetIds: [],
        source: {
          filePath: "src/missing.ts",
          symbol: "missingHandler",
          lineStart: 1
        }
      },
      {
        id: "ev.symbol",
        status: "source-matched",
        label: "Wrong symbol",
        targetIds: [],
        source: {
          filePath: "src/search.ts",
          symbol: "missingHandler",
          lineStart: 1
        }
      }
    ];
    project.coverage = {
      status: "partial",
      detected: {
        pages: 4,
        backendEndpoints: 9
      },
      modeled: {
        pages: 1,
        requests: 1,
        flows: 1,
        architectureNodes: 1
      },
      unmodeled: {
        pages: ["/admin"],
        requests: [],
        endpoints: ["GET /api/admin"],
        notes: []
      },
      evidenceIds: []
    };
    await writeProjectFile(cwd, "anlyx.project.json", project);

    const result = await runValidateCommand({
      cwd,
      filePath: "anlyx.project.json"
    });

    expect(result.valid).toBe(true);
    expect(result.kind).toBe("project");
    if (result.kind !== "project") {
      throw new Error("Expected project validation result.");
    }
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "source_file_missing",
          path: "evidence.0.source.filePath"
        }),
        expect.objectContaining({
          code: "source_line_placeholder",
          path: "evidence.1.source.lineStart"
        }),
        expect.objectContaining({
          code: "source_symbol_not_found",
          path: "evidence.1.source.symbol"
        }),
        expect.objectContaining({
          code: "coverage_pages_partial",
          path: "coverage.detected.pages"
        }),
        expect.objectContaining({
          code: "partial_analysis",
          path: "coverage.status"
        })
      ])
    );
    expect(result.report.summary.sourceIssueCount).toBeGreaterThanOrEqual(3);
    expect(result.report.summary.sourceIssueBreakdown).toMatchObject({
      missingFiles: 1,
      placeholderLines: 1,
      missingSymbols: 1
    });
    expect(result.report.summary.coverageStatus).toBe("partial");
  });

  it("imports a valid Project JSON file as the viewer project data", async () => {
    const cwd = await createTempRoot();
    await mkdir(join(cwd, "src"), { recursive: true });
    await writeFile(join(cwd, "src/search.ts"), "\nexport function search() {}\n", "utf8");
    await writeProjectFile(cwd, "source.project.json", validProjectFile());

    const result = await runImportCommand({
      cwd,
      filePath: "source.project.json"
    });

    expect(result.kind).toBe("project");
    if (result.kind !== "project") {
      throw new Error("Expected Project import result.");
    }

    const projectData = parseProjectData(
      JSON.parse(await readFile(result.projectDataPath, "utf8")) as unknown
    );

    expect(result.projectDataPath).toBe(join(cwd, "anlyx.project.json"));
    expect(result.validationReportPath).toBe(join(cwd, ".anlyx/validation-report.json"));
    expect(result.warnings).toEqual([]);
    expect(projectData.project.name).toBe("Project Command Fixture");
    expect(projectData.pages[0]).toMatchObject({
      id: "page.home",
      path: "/"
    });
    await expect(readFile(result.validationReportPath, "utf8")).resolves.toContain(
      '"schemaVersion": "0.1"'
    );
  });
});

async function writeFlowFile(cwd: string, name: string, value: unknown): Promise<void> {
  await writeFile(join(cwd, name), JSON.stringify(value, null, 2), "utf8");
}

async function writeProjectFile(cwd: string, name: string, value: unknown): Promise<void> {
  await writeFile(join(cwd, name), JSON.stringify(value, null, 2), "utf8");
}

function validFlowFile(): AnlyxFlowFile {
  return {
    schemaVersion: "0.1.5",
    project: {
      name: "Flow Command Fixture",
      root: "."
    },
    generatedBy: {
      type: "agent",
      name: "Codex"
    },
    snapshot: {
      id: "snapshot.fixture",
      createdAt: "2026-06-26T01:02:03.000Z",
      source: "anlyx.flow.json"
    },
    flows: [
      {
        id: "flow.search",
        title: "Search",
        nodes: [
          {
            id: "api.search",
            type: "api.request",
            label: "GET /api/search",
            status: "observed",
            timing: {
              kind: "measured",
              durationMs: 42,
              evidenceId: "ev.fetch"
            },
            evidenceIds: ["ev.fetch"]
          },
          {
            id: "service.search",
            type: "service",
            label: "SearchService.search",
            status: "source-matched"
          }
        ],
        edges: [
          {
            from: "api.search",
            to: "service.search",
            status: "source-matched"
          }
        ],
        evidence: [
          {
            id: "ev.fetch",
            kind: "runtime.browser.fetch",
            label: "Captured fetch"
          }
        ]
      }
    ]
  };
}

function validProjectFile(): ProjectData {
  return {
    schemaVersion: "0.2.0",
    project: {
      id: "project.fixture",
      name: "Project Command Fixture",
      analyzedAt: "2026-06-26T01:02:03.000Z",
      frameworkNotes: [],
      generatedBy: {
        kind: "agent",
        name: "Codex"
      }
    },
    areas: [
      {
        id: "area.public",
        name: "Public",
        order: 1,
        evidenceIds: []
      }
    ],
    pages: [
      {
        id: "page.home",
        path: "/",
        title: "Home",
        areaId: "area.public",
        featureIds: ["feature.search"],
        evidenceIds: [],
        confidence: "high"
      }
    ],
    features: [
      {
        id: "feature.search",
        pageId: "page.home",
        name: "Search",
        requestIds: ["request.search"],
        requests: [],
        evidenceIds: [],
        confidence: "high"
      }
    ],
    requests: [
      {
        id: "request.search",
        method: "GET",
        path: "/api/search",
        role: "primary",
        purpose: "data-load",
        flowId: "flow.search",
        evidenceIds: [],
        confidence: "high"
      }
    ],
    flows: [
      {
        id: "flow.search",
        requestId: "request.search",
        name: "Search flow",
        layerIds: ["layer.api.search"],
        layers: [
          {
            id: "layer.api.search",
            kind: "api",
            label: "GET /api/search",
            status: "source-matched",
            source: {
              filePath: "src/search.ts",
              lineStart: 2,
              symbol: "search"
            },
            evidenceIds: [],
            confidence: "high"
          }
        ],
        evidenceIds: [],
        confidence: "high"
      }
    ],
    architecture: {
      nodes: [
        {
          id: "node.api.search",
          kind: "api",
          label: "GET /api/search",
          evidenceIds: [],
          confidence: "high"
        }
      ],
      edges: []
    },
    evidence: [],
    measurements: [],
    dictionary: {
      defaultLanguage: "en",
      terms: []
    },
    overview: {
      actors: [],
      coreEntities: [],
      mainAreas: [],
      implementation: [],
      suggestedReadingPath: [],
      evidenceIds: []
    },
    capabilities: [],
    dataLifecycles: [],
    impactMaps: []
  };
}
