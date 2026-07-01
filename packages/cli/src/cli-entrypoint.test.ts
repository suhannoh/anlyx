import { execFile } from "node:child_process";
import type { ExecFileException } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  parseProjectData,
  scanResultSchema,
  type AnlyxFlowFile,
  type ProjectData
} from "@anlyx/core";
import { beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const cliDistEntry = join(repositoryRoot, "packages/cli/dist/index.js");

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "anlyx-built-cli-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runBuiltCli(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(process.execPath, [cliDistEntry, ...args], {
    cwd,
    timeout: 30_000
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr
  };
}

describe("built CLI entrypoint", () => {
  beforeAll(async () => {
    await execFileAsync("corepack", ["pnpm", "--filter", "anlyx", "build"], {
      cwd: repositoryRoot,
      timeout: 60_000
    });
  }, 90_000);

  it("can run --help without top-level await warnings", async () => {
    await withTempDir(async (dir) => {
      const { stdout, stderr } = await runBuiltCli(["--help"], dir);

      expect(stdout).toContain("Anlyx");
      expect(stdout).toContain("anlyx init");
      expect(stdout).toContain("anlyx validate <file>");
      expect(stdout).toContain("anlyx import <file> [--out <dir>]");
      expect(stdout).not.toContain("anlyx scan");
      expect(stdout).toContain("anlyx dev");
      expect(stderr).not.toContain("unsettled top-level await");
    });
  });

  it("can run init --force", async () => {
    await withTempDir(async (dir) => {
      const { stdout, stderr } = await runBuiltCli(["init", "--force"], dir);
      const config = await readFile(join(dir, "anlyx.config.ts"), "utf8");

      expect(stdout).toContain("Created ");
      expect(stdout).toContain("anlyx.config.ts");
      expect(config).toContain("export default {");
      expect(config).not.toContain("defineConfig");
      expect(stderr).not.toContain("unsettled top-level await");
    });
  });

  it("exports the Next.js development overlay helper", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const helperPath = join(repositoryRoot, "packages/cli/dist/next.js");
    const helper = (await import(helperPath)) as {
      AnlyxDevOverlay: () => unknown;
      getAnlyxDevOverlayScriptSrc: () => string;
    };

    try {
      process.env.NODE_ENV = "development";
      expect(helper.getAnlyxDevOverlayScriptSrc()).toBe("http://localhost:4777/_anlyx/overlay.js");
      expect(helper.AnlyxDevOverlay()).toMatchObject({
        type: "script",
        props: {
          src: "http://localhost:4777/_anlyx/overlay.js",
          defer: true
        }
      });

      process.env.NODE_ENV = "production";
      expect(helper.AnlyxDevOverlay()).toBeNull();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("can validate and import Flow JSON", async () => {
    await withTempDir(async (dir) => {
      const flowPath = join(dir, "anlyx.flow.json");
      await writeFile(flowPath, JSON.stringify(createValidFlowFile(), null, 2), "utf8");

      const validateResult = await runBuiltCli(["validate", "anlyx.flow.json"], dir);
      const importResult = await runBuiltCli(["import", "anlyx.flow.json"], dir);
      const reportData = scanResultSchema.parse(
        JSON.parse(await readFile(join(dir, ".anlyx/report-data.json"), "utf8")) as unknown
      );

      expect(validateResult.stdout).toContain("Valid Flow JSON: anlyx.flow.json");
      expect(validateResult.stderr).not.toContain("unsettled top-level await");
      expect(importResult.stdout).toContain("Imported Flow JSON snapshot: ");
      expect(importResult.stdout).toContain(".anlyx/snapshots/2026-06-26T01-02-03.000Z.flow.json");
      expect(importResult.stdout).toContain("Wrote legacy viewer report data: ");
      expect(importResult.stdout).toContain(".anlyx/report-data.json");
      expect(reportData.projectName).toBe("Built CLI Flow Fixture");
      expect(reportData.endpoints[0]?.path).toBe("/api/search");
      expect(importResult.stderr).not.toContain("unsettled top-level await");
    });
  });

  it("can validate and import Project JSON", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        join(dir, "source.project.json"),
        JSON.stringify(createValidProjectFile(), null, 2),
        "utf8"
      );

      const validateResult = await runBuiltCli(["validate", "source.project.json"], dir);
      const importResult = await runBuiltCli(["import", "source.project.json"], dir);
      const projectData = parseProjectData(
        JSON.parse(await readFile(join(dir, "anlyx.project.json"), "utf8")) as unknown
      );

      expect(validateResult.stdout).toContain("Valid Project JSON: source.project.json");
      expect(validateResult.stderr).not.toContain("unsettled top-level await");
      expect(importResult.stdout).toContain("Imported Project JSON: ");
      expect(importResult.stdout).toContain("anlyx.project.json");
      expect(projectData.project.name).toBe("Built CLI Project Fixture");
      expect(projectData.pages[0]?.path).toBe("/");
      expect(importResult.stderr).not.toContain("unsettled top-level await");
    });
  });

  it("returns formatted errors for invalid Flow JSON import", async () => {
    await withTempDir(async (dir) => {
      const invalidFlow = createValidFlowFile();
      invalidFlow.flows[0]!.evidence = [{ id: "ev.source", kind: "source" }];
      invalidFlow.flows[0]!.nodes[0]!.timing = {
        kind: "measured",
        durationMs: 42,
        evidenceId: "ev.source"
      };
      invalidFlow.flows[0]!.nodes[0]!.evidenceIds = ["ev.source"];
      await writeFile(join(dir, "invalid.flow.json"), JSON.stringify(invalidFlow, null, 2), "utf8");

      const result = await runBuiltCliExpectFailure(["import", "invalid.flow.json"], dir);

      expect(result.code).toBe(1);
      expect(result.stdout).toContain("Import failed: Invalid Flow JSON: invalid.flow.json");
      expect(result.stdout).toContain("ERROR flows.0.nodes.0.timing.evidenceId");
      expect(result.stdout).toContain("measured_timing_requires_runtime_evidence");
      await expect(readFile(join(dir, ".anlyx/report-data.json"), "utf8")).rejects.toThrow();
    });
  });

  it("rejects the removed scan command", async () => {
    await withTempDir(async (dir) => {
      const result = await runBuiltCliExpectFailure(["scan", "--skip-capture"], dir);

      expect(result.code).toBe(1);
      expect(result.stdout).toContain("Unknown command: scan");
      expect(result.stdout).toContain("Available commands: init, prompt, validate, import, dev");
      expect(result.stdout).not.toContain("scan (legacy)");
      expect(result.stderr).not.toContain("unsettled top-level await");
    });
  });
});

async function runBuiltCliExpectFailure(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  try {
    await runBuiltCli(args, cwd);
  } catch (error) {
    const execError = error as ExecFileException & { stdout?: string; stderr?: string };

    return {
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? "",
      code: typeof execError.code === "number" ? execError.code : null
    };
  }

  throw new Error(`Expected built CLI command to fail: ${args.join(" ")}`);
}

function createValidFlowFile(): AnlyxFlowFile {
  return {
    schemaVersion: "0.1.5",
    project: {
      name: "Built CLI Flow Fixture",
      root: "."
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
            }
          }
        ],
        edges: [],
        evidence: [
          {
            id: "ev.fetch",
            kind: "runtime.browser.fetch"
          }
        ]
      }
    ]
  };
}

function createValidProjectFile(): ProjectData {
  return {
    schemaVersion: "0.2.0",
    project: {
      id: "built-cli-project",
      name: "Built CLI Project Fixture",
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
        evidenceIds: []
      }
    ],
    pages: [
      {
        id: "page.home",
        path: "/",
        title: "Home",
        areaId: "area.public",
        featureIds: [],
        evidenceIds: [],
        confidence: "high"
      }
    ],
    features: [],
    requests: [],
    flows: [],
    architecture: {
      nodes: [],
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
