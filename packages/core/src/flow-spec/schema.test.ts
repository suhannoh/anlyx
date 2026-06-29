import { describe, expect, it } from "vitest";

import { parseAnlyxFlowFile } from "./schema.js";

type FlowFileFixture = {
  schemaVersion: string;
  project: Record<string, unknown>;
  generatedBy?: {
    type: string;
    name?: string;
    version?: string;
    skill?: string;
  };
  snapshot?: {
    id: string;
    createdAt: string;
    source: string;
    git?: {
      branch?: string;
      commit?: string;
    };
  };
  flows: Array<{
    id: string;
    title: string;
    entry?: {
      type: string;
      label: string;
      page?: string;
    };
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
    evidence: Array<Record<string, unknown>>;
  }>;
};

function minimalFlowFile(): FlowFileFixture {
  return {
    schemaVersion: "0.1.5",
    project: {
      name: "sample"
    },
    flows: [
      {
        id: "flow:login",
        title: "Login",
        nodes: [
          {
            id: "node:login-button",
            type: "ui.action",
            label: "Login button"
          },
          {
            id: "node:login-request",
            type: "api.request",
            label: "POST /api/login"
          }
        ],
        edges: [
          {
            from: "node:login-button",
            to: "node:login-request"
          }
        ],
        evidence: []
      }
    ]
  };
}

describe("Anlyx Flow JSON schema", () => {
  it("parses a minimal valid Flow JSON file", () => {
    const flowFile = parseAnlyxFlowFile(minimalFlowFile());

    expect(flowFile.schemaVersion).toBe("0.1.5");
    expect(flowFile.project.root).toBe(".");
    expect(flowFile.flows[0]?.nodes[0]?.status).toBe("unknown");
    expect(flowFile.flows[0]?.edges[0]?.status).toBe("unknown");
  });

  it("parses an entry object", () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.entry = {
      type: "ui.action",
      label: "Login button",
      page: "/login"
    };

    const parsed = parseAnlyxFlowFile(flowFile);

    expect(parsed.flows[0]?.entry).toEqual({
      type: "ui.action",
      label: "Login button",
      page: "/login"
    });
  });

  it("supports node types queue and auth.session", () => {
    const flowFile = minimalFlowFile();
    const flow = flowFile.flows[0]!;
    flow.nodes.push(
      {
        id: "node:session",
        type: "auth.session",
        label: "Session"
      },
      {
        id: "node:jobs",
        type: "queue",
        label: "Jobs queue"
      }
    );

    const parsed = parseAnlyxFlowFile(flowFile);

    expect(parsed.flows[0]?.nodes.map((node) => node.type)).toContain("auth.session");
    expect(parsed.flows[0]?.nodes.map((node) => node.type)).toContain("queue");
  });

  it("supports statuses agent-inferred and source-matched", () => {
    const flowFile = minimalFlowFile();
    const flow = flowFile.flows[0]!;
    flow.nodes[0] = {
      ...flow.nodes[0],
      status: "agent-inferred"
    };
    flow.edges[0] = {
      ...flow.edges[0],
      status: "source-matched"
    };

    const parsed = parseAnlyxFlowFile(flowFile);

    expect(parsed.flows[0]?.nodes[0]?.status).toBe("agent-inferred");
    expect(parsed.flows[0]?.edges[0]?.status).toBe("source-matched");
  });

  it("keeps measured and estimated timing distinct", () => {
    const flowFile = minimalFlowFile();
    const flow = flowFile.flows[0]!;
    flow.evidence.push({
      id: "evidence:fetch",
      kind: "runtime.browser.fetch"
    });
    flow.nodes[0] = {
      ...flow.nodes[0],
      timing: {
        kind: "measured",
        durationMs: 42,
        evidenceId: "evidence:fetch"
      }
    };
    flow.nodes[1] = {
      ...flow.nodes[1],
      timing: {
        kind: "estimate",
        durationMs: 120,
        reason: "Static source path estimate"
      }
    };

    const parsed = parseAnlyxFlowFile(flowFile);
    const [measuredNode, estimatedNode] = parsed.flows[0]?.nodes ?? [];

    expect(measuredNode?.timing).toEqual({
      kind: "measured",
      durationMs: 42,
      evidenceId: "evidence:fetch"
    });
    expect(estimatedNode?.timing).toEqual({
      kind: "estimate",
      durationMs: 120,
      reason: "Static source path estimate"
    });
  });

  it("parses first-class evidence source fields", () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push({
      id: "evidence:controller",
      kind: "source",
      label: "LoginController",
      file: "src/main/java/LoginController.java",
      symbol: "LoginController.login",
      lineStart: 12,
      lineEnd: 24,
      observedAt: "2026-06-26T00:00:00.000Z",
      detail: "Matched controller method"
    });

    const parsed = parseAnlyxFlowFile(flowFile);

    expect(parsed.flows[0]?.evidence[0]).toMatchObject({
      file: "src/main/java/LoginController.java",
      symbol: "LoginController.login",
      lineStart: 12,
      lineEnd: 24
    });
  });

  it("rejects evidence metadata", () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.evidence.push({
      id: "evidence:metadata",
      kind: "source",
      metadata: {
        file: "src/main/java/LoginController.java"
      }
    });

    expect(() => parseAnlyxFlowFile(flowFile)).toThrow();
  });

  it("parses structured request and response shapes", () => {
    const flowFile = minimalFlowFile();
    flowFile.flows[0]!.nodes[1] = {
      ...flowFile.flows[0]!.nodes[1],
      request: {
        pathParams: {
          id: "42"
        },
        query: {
          redirect: "/dashboard"
        },
        headers: {
          authorization: "Bearer token"
        },
        body: {
          username: "demo"
        }
      },
      response: {
        statusCodes: [200, 401],
        bodyShape: {
          token: "string"
        },
        source: {
          file: "src/main/java/LoginResponse.java",
          symbol: "LoginResponse",
          lineStart: 5,
          lineEnd: 11
        }
      }
    };

    const parsed = parseAnlyxFlowFile(flowFile);
    const apiNode = parsed.flows[0]?.nodes[1];

    expect(apiNode?.request?.pathParams).toEqual({
      id: "42"
    });
    expect(apiNode?.request?.query).toEqual({
      redirect: "/dashboard"
    });
    expect(apiNode?.request?.headers).toEqual({
      authorization: "Bearer token"
    });
    expect(apiNode?.request?.body).toEqual({
      username: "demo"
    });
    expect(apiNode?.response?.statusCodes).toEqual([200, 401]);
    expect(apiNode?.response?.bodyShape).toEqual({
      token: "string"
    });
    expect(apiNode?.response?.source).toEqual({
      file: "src/main/java/LoginResponse.java",
      symbol: "LoginResponse",
      lineStart: 5,
      lineEnd: 11
    });
  });

  it("parses project frameworks", () => {
    const flowFile = minimalFlowFile();
    flowFile.project.frameworks = ["spring-boot", "nextjs"];

    const parsed = parseAnlyxFlowFile(flowFile);

    expect(parsed.project.frameworks).toEqual(["spring-boot", "nextjs"]);
  });

  it("parses structured generatedBy and snapshot metadata", () => {
    const flowFile = minimalFlowFile();
    flowFile.generatedBy = {
      type: "agent",
      name: "Codex",
      version: "gpt-5.5",
      skill: "executor"
    };
    flowFile.snapshot = {
      id: "snapshot:login",
      createdAt: "2026-06-26T00:00:00.000Z",
      source: "anlyx.flow.json",
      git: {
        branch: "main",
        commit: "abc123"
      }
    };

    const parsed = parseAnlyxFlowFile(flowFile);

    expect(parsed.generatedBy).toEqual({
      type: "agent",
      name: "Codex",
      version: "gpt-5.5",
      skill: "executor"
    });
    expect(parsed.snapshot).toEqual({
      id: "snapshot:login",
      createdAt: "2026-06-26T00:00:00.000Z",
      source: "anlyx.flow.json",
      git: {
        branch: "main",
        commit: "abc123"
      }
    });
  });
});
