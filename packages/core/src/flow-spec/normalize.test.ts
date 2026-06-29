import { describe, expect, it } from "vitest";

import { scanResultSchema } from "../schema.js";
import type { AnlyxFlowFile } from "./schema.js";
import { normalizeFlowFileToScanResult } from "./normalize.js";

describe("normalizeFlowFileToScanResult", () => {
  it("creates viewer-compatible report data from Flow JSON", () => {
    const report = normalizeFlowFileToScanResult({
      schemaVersion: "0.1.5",
      project: { name: "Sample", root: "." },
      generatedBy: { type: "agent", name: "Codex", version: "5.5" },
      snapshot: {
        id: "snapshot:sample",
        createdAt: "2026-06-26T00:00:00.000Z",
        source: "anlyx.flow.json"
      },
      flows: [
        {
          id: "flow.search",
          title: "Search benefits",
          entry: { type: "user-action", label: "Search", page: "/benefits" },
          nodes: [
            {
              id: "api.search",
              type: "api.request",
              label: "GET /api/public/benefits",
              status: "observed",
              evidenceIds: ["ev.fetch"],
              timing: { kind: "measured", durationMs: 283, evidenceId: "ev.fetch" },
              request: { query: { keyword: "string" } },
              response: { statusCodes: [200], bodyShape: { items: [{ id: "number" }] } },
              metadata: { owner: "benefits" }
            },
            {
              id: "service.search",
              type: "service",
              label: "BenefitSearchService.findVisibleBenefits",
              status: "source-matched",
              evidenceIds: ["ev.service"]
            },
            {
              id: "response.search",
              type: "response",
              label: "Benefit list response",
              status: "measured",
              timing: { kind: "measured", durationMs: 12, evidenceId: "ev.fetch" }
            }
          ],
          edges: [
            {
              from: "api.search",
              to: "service.search",
              label: "calls",
              status: "source-matched",
              evidenceIds: ["ev.service"],
              metadata: { source: "callgraph", generatedBy: { type: "agent", name: "Codex" } }
            },
            {
              from: "service.search",
              to: "response.search",
              status: "measured",
              timing: { kind: "measured", durationMs: 12, evidenceId: "ev.fetch" }
            }
          ],
          evidence: [
            { id: "ev.fetch", kind: "runtime.browser.fetch", label: "Captured fetch" },
            {
              id: "ev.service",
              kind: "source",
              file: "src/BenefitSearchService.java",
              symbol: "findVisibleBenefits"
            }
          ]
        }
      ]
    });

    expect(() => scanResultSchema.parse(report)).not.toThrow();
    expect(report.projectName).toBe("Sample");
    expect(report.generatedAt).toBe("2026-06-26T00:00:00.000Z");
    expect(report.schemaVersion).toBe("0.1");
    expect(report.endpoints).toEqual([
      {
        id: "api.search",
        method: "GET",
        path: "/api/public/benefits",
        supportLevel: "basic",
        confidence: "high",
        requestSchema: "Flow JSON request",
        responseSchema: "Flow JSON response"
      }
    ]);
    expect(report.flows[0]).toMatchObject({
      endpointId: "api.search",
      mainPath: ["api.search", "service.search", "response.search"],
      subFlows: []
    });
    expect(report.flows[0]?.nodes[0]).toMatchObject({
      id: "api.search",
      type: "endpoint",
      confidence: "high",
      status: "observed",
      timing: { kind: "measured", durationMs: 283, evidenceId: "ev.fetch" },
      evidenceIds: ["ev.fetch"],
      request: { query: { keyword: "string" } },
      response: { statusCodes: [200], bodyShape: { items: [{ id: "number" }] } },
      metadata: {
        owner: "benefits",
        flowJsonType: "api.request",
        generatedBy: { type: "agent", name: "Codex", version: "5.5" },
        snapshot: {
          id: "snapshot:sample",
          createdAt: "2026-06-26T00:00:00.000Z",
          source: "anlyx.flow.json"
        }
      }
    });
    expect(report.flows[0]?.nodes[1]).toMatchObject({
      id: "service.search",
      type: "service",
      confidence: "high",
      status: "source-matched"
    });
    expect(report.flows[0]?.nodes[2]).toMatchObject({
      id: "response.search",
      type: "schema"
    });
    expect(report.flows[0]?.edges[0]).toMatchObject({
      id: "edge:api.search:service.search:0",
      from: "api.search",
      to: "service.search",
      kind: "main",
      label: "calls",
      confidence: "high",
      status: "source-matched",
      evidenceIds: ["ev.service"],
      metadata: { source: "callgraph", generatedBy: { type: "agent", name: "Codex" } }
    });
    expect(report.pages).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("falls back to the first node as endpointId when a flow has no API node", () => {
    const file: AnlyxFlowFile = {
      schemaVersion: "0.1.5",
      project: { name: "Worker", root: "." },
      flows: [
        {
          id: "flow.worker",
          title: "Worker job",
          nodes: [
            { id: "job.worker", type: "job", label: "Refresh benefits", status: "manual" },
            {
              id: "queue.worker",
              type: "queue",
              label: "benefits.refresh",
              status: "agent-inferred"
            }
          ],
          edges: [{ from: "job.worker", to: "queue.worker", status: "not-proven" }],
          evidence: []
        }
      ]
    };

    const report = normalizeFlowFileToScanResult(file);

    expect(report.endpoints).toEqual([]);
    expect(report.flows[0]?.endpointId).toBe("job.worker");
    expect(report.flows[0]?.nodes[0]).toMatchObject({
      type: "utility",
      confidence: "medium"
    });
    expect(report.flows[0]?.edges[0]).toMatchObject({
      confidence: "low",
      status: "not-proven"
    });
  });

  it("falls back to GET and the full label when an API label has no method/path pair", () => {
    const report = normalizeFlowFileToScanResult({
      schemaVersion: "0.1.5",
      project: { name: "Sample", root: "." },
      flows: [
        {
          id: "flow.unparsed",
          title: "Unparsed",
          nodes: [
            {
              id: "api.unparsed",
              type: "api.route",
              label: "Public benefits API",
              status: "unknown"
            }
          ],
          edges: [],
          evidence: []
        }
      ]
    });

    expect(report.endpoints[0]).toMatchObject({
      id: "api.unparsed",
      method: "GET",
      path: "Public benefits API",
      confidence: "unknown"
    });
    expect(typeof report.generatedAt).toBe("string");
  });
});
