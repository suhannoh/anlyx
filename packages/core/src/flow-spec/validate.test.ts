import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { AnlyxFlowFile } from "./schema.js";
import { validateAnlyxFlowFile } from "./validate.js";

function minimalFlowFile(): AnlyxFlowFile {
  return {
    schemaVersion: "0.1.5",
    project: {
      name: "sample",
      root: "."
    },
    flows: [
      {
        id: "flow:login",
        title: "Login",
        nodes: [
          {
            id: "node:login-button",
            type: "ui.action",
            label: "Login button",
            status: "unknown"
          },
          {
            id: "node:login-request",
            type: "api.request",
            label: "POST /api/login",
            status: "unknown"
          }
        ],
        edges: [
          {
            from: "node:login-button",
            to: "node:login-request",
            status: "unknown"
          }
        ],
        evidence: []
      }
    ]
  };
}

const tempRoots: string[] = [];

function issueCodes(result: Awaited<ReturnType<typeof validateAnlyxFlowFile>>): string[] {
  return result.errors.map((issue) => issue.code);
}

async function createTempRoot(): Promise<string> {
  const tempRoot = await mkdtemp(join(tmpdir(), "anlyx-flow-validate-"));
  tempRoots.push(tempRoot);
  return tempRoot;
}

describe("Anlyx Flow semantic validation", () => {
  afterEach(async () => {
    await Promise.all(
      tempRoots.splice(0).map((tempRoot) => rm(tempRoot, { recursive: true, force: true }))
    );
  });

  it("passes a minimal valid flow", async () => {
    const result = await validateAnlyxFlowFile(minimalFlowFile(), {
      cwd: await createTempRoot()
    });

    expect(result).toEqual({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it("rejects duplicate node ids", async () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.nodes.push({
      id: "node:login-request",
      type: "service",
      label: "LoginService",
      status: "unknown"
    });

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd: await createTempRoot()
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "duplicate_node_id",
        path: "flows.0.nodes.2.id"
      })
    );
  });

  it("rejects missing edge references", async () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.edges[0] = {
      from: "node:missing-from",
      to: "node:missing-to",
      status: "unknown"
    };

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd: await createTempRoot()
    });

    expect(issueCodes(result)).toEqual(["edge_missing_from_node", "edge_missing_to_node"]);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "edge_missing_from_node",
        path: "flows.0.edges.0.from"
      })
    );
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "edge_missing_to_node",
        path: "flows.0.edges.0.to"
      })
    );
  });

  it("rejects node evidenceIds that reference missing evidence", async () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.nodes[0]!.evidenceIds = ["evidence:missing"];

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd: await createTempRoot()
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "missing_evidence",
        path: "flows.0.nodes.0.evidenceIds.0"
      })
    );
  });

  it("rejects edge evidenceIds that reference missing evidence", async () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.edges[0]!.evidenceIds = ["evidence:missing"];

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd: await createTempRoot()
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "missing_evidence",
        path: "flows.0.edges.0.evidenceIds.0"
      })
    );
  });

  it("accepts measured timing with runtime and telemetry evidence", async () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push(
      {
        id: "evidence:fetch",
        kind: "runtime.browser.fetch"
      },
      {
        id: "evidence:span",
        kind: "telemetry.span"
      }
    );
    flowFile.flows[0]!.nodes[0]!.timing = {
      kind: "measured",
      durationMs: 12,
      evidenceId: "evidence:fetch"
    };
    flowFile.flows[0]!.edges[0]!.timing = {
      kind: "measured",
      durationMs: 8,
      evidenceId: "evidence:span"
    };

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd: await createTempRoot()
    });

    expect(result).toEqual({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it("rejects measured timing when evidence is source rather than runtime/telemetry", async () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push({
      id: "evidence:source",
      kind: "source"
    });
    flowFile.flows[0]!.nodes[0]!.timing = {
      kind: "measured",
      durationMs: 12,
      evidenceId: "evidence:source"
    };

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd: await createTempRoot()
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "measured_timing_requires_runtime_evidence",
        path: "flows.0.nodes.0.timing.evidenceId"
      })
    );
  });

  it("rejects measured timing when evidence id is absent", async () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.edges[0]!.timing = {
      kind: "measured",
      durationMs: 12,
      evidenceId: "evidence:missing"
    };

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd: await createTempRoot()
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "missing_timing_evidence",
        path: "flows.0.edges.0.timing.evidenceId"
      })
    );
  });

  it("warns when source evidence points to a missing file", async () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push(
      {
        id: "evidence:controller",
        kind: "source",
        file: "src/LoginController.java"
      },
      {
        id: "evidence:controller-duplicate",
        kind: "source",
        file: "src/LoginController.java"
      }
    );

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd: await createTempRoot()
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "source_file_missing",
        path: "flows.0.evidence.0.file"
      })
    );
  });

  it("warns distinctly when a source evidence file exists but cannot be read", async () => {
    const cwd = await createTempRoot();
    await mkdir(join(cwd, "LoginController.java"));

    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push({
      id: "evidence:controller",
      kind: "source",
      file: "LoginController.java"
    });

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "source_file_unreadable",
        path: "flows.0.evidence.0.file"
      })
    );
  });

  it("deduplicates out-of-range source line warnings for the same existing file", async () => {
    const cwd = await createTempRoot();
    await writeFile(join(cwd, "LoginController.java"), "line 1\nline 2\n", "utf8");

    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push(
      {
        id: "evidence:controller",
        kind: "source",
        file: "LoginController.java",
        lineStart: 2,
        lineEnd: 4
      },
      {
        id: "evidence:controller-duplicate",
        kind: "source",
        file: "LoginController.java",
        lineStart: 2,
        lineEnd: 4
      }
    );

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd
    });

    expect(result.valid).toBe(true);
    expect(
      result.warnings.filter((issue) => issue.code === "source_line_out_of_range")
    ).toHaveLength(1);
  });

  it("keeps distinct out-of-range source line warnings for different ranges in the same file", async () => {
    const cwd = await createTempRoot();
    await writeFile(join(cwd, "LoginController.java"), "line 1\nline 2\n", "utf8");

    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push(
      {
        id: "evidence:controller-end",
        kind: "source",
        file: "LoginController.java",
        lineStart: 1,
        lineEnd: 4
      },
      {
        id: "evidence:controller-start",
        kind: "source",
        file: "LoginController.java",
        lineStart: 3,
        lineEnd: 4
      }
    );

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd
    });

    expect(result.valid).toBe(true);
    expect(
      result.warnings.filter((issue) => issue.code === "source_line_out_of_range")
    ).toHaveLength(2);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "source_line_out_of_range",
        path: "flows.0.evidence.0.lineEnd"
      })
    );
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "source_line_out_of_range",
        path: "flows.0.evidence.1.lineStart"
      })
    );
  });

  it("accepts source evidence with only an in-range lineStart", async () => {
    const cwd = await createTempRoot();
    await writeFile(join(cwd, "LoginController.java"), "line 1\nline 2\n", "utf8");

    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push({
      id: "evidence:controller",
      kind: "source",
      file: "LoginController.java",
      lineStart: 2
    });

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd
    });

    expect(result).toEqual({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it("reports lineEnd when only lineEnd exceeds the file", async () => {
    const cwd = await createTempRoot();
    await writeFile(join(cwd, "LoginController.java"), "line 1\nline 2\n", "utf8");

    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push({
      id: "evidence:controller",
      kind: "source",
      file: "LoginController.java",
      lineEnd: 4
    });

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "source_line_out_of_range",
        path: "flows.0.evidence.0.lineEnd"
      })
    );
  });

  it("reports lineStart when lineStart is greater than lineEnd", async () => {
    const cwd = await createTempRoot();
    await writeFile(join(cwd, "LoginController.java"), "line 1\nline 2\nline 3\n", "utf8");

    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push({
      id: "evidence:controller",
      kind: "source",
      file: "LoginController.java",
      lineStart: 3,
      lineEnd: 2
    });

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "source_line_out_of_range",
        path: "flows.0.evidence.0.lineStart"
      })
    );
  });

  it("warns when source evidence line range exceeds the file", async () => {
    const cwd = await createTempRoot();
    await writeFile(join(cwd, "LoginController.java"), "line 1\nline 2\n", "utf8");

    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push({
      id: "evidence:controller",
      kind: "source",
      file: "LoginController.java",
      lineStart: 2,
      lineEnd: 4
    });

    const result = await validateAnlyxFlowFile(flowFile, {
      cwd
    });

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "source_line_out_of_range",
        path: "flows.0.evidence.0.lineEnd"
      })
    );
  });
});
