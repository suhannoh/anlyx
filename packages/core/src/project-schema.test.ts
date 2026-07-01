import { describe, expect, it } from "vitest";
import {
  evidenceStatusSchema,
  flowLayerKindSchema,
  measurementSourceSchema,
  parseProjectData,
  projectDataSchema,
  projectLanguageSchema,
  requestPurposeSchema,
  requestRoleSchema
} from "./project-schema.js";

describe("projectDataSchema", () => {
  it("parses the minimum anlyx.project.json contract", () => {
    const parsed = parseProjectData({
      schemaVersion: "0.2.0",
      project: {
        id: "app",
        name: "App",
        analyzedAt: "2026-06-27T09:00:00.000Z",
        generatedBy: { kind: "agent", name: "Codex" }
      },
      areas: [],
      pages: [],
      features: [],
      flows: [],
      architecture: { nodes: [], edges: [] },
      evidence: [],
      measurements: [],
      dictionary: { defaultLanguage: "en", terms: [] }
    });

    expect(parsed.schemaVersion).toBe("0.2.0");
    expect(parsed.project.name).toBe("App");
    expect(parsed.dictionary.defaultLanguage).toBe("en");
    expect(parsed.overview).toEqual({
      actors: [],
      coreEntities: [],
      mainAreas: [],
      implementation: [],
      suggestedReadingPath: [],
      evidenceIds: []
    });
    expect(parsed.capabilities).toEqual([]);
    expect(parsed.dataLifecycles).toEqual([]);
    expect(parsed.impactMaps).toEqual([]);
  });

  it("parses the 0.3.0 project understanding contract", () => {
    const parsed = parseProjectData({
      schemaVersion: "0.3.0",
      project: { id: "app", name: "App" },
      areas: [],
      pages: [],
      features: [],
      requests: [],
      flows: [],
      architecture: { nodes: [], edges: [] },
      evidence: [],
      measurements: [],
      dictionary: { defaultLanguage: "en", terms: [] },
      overview: {
        summary: "A local project viewer.",
        actors: [{ id: "actor.user", name: "User", role: "user" }],
        coreEntities: [{ id: "entity.project-data", name: "ProjectData", kind: "core-entity" }]
      },
      capabilities: [
        {
          id: "capability.view-project",
          actorRole: "user",
          name: "View project",
          status: "connected",
          requestIds: [],
          flowIds: [],
          pageIds: [],
          featureIds: [],
          dataRefs: [{ kind: "model", name: "ProjectData", operation: "read" }]
        }
      ],
      dataLifecycles: [],
      impactMaps: []
    });

    expect(parsed.schemaVersion).toBe("0.3.0");
    expect(parsed.overview.actors[0]?.name).toBe("User");
    expect(parsed.capabilities[0]?.dataRefs[0]?.name).toBe("ProjectData");
  });

  it("keeps generated defaults isolated between parses", () => {
    const first = parseProjectData({
      schemaVersion: "0.2.0",
      project: { id: "app", name: "App" },
      areas: [],
      pages: [],
      features: [],
      flows: [],
      evidence: [],
      measurements: []
    });
    const second = parseProjectData({
      schemaVersion: "0.2.0",
      project: { id: "app", name: "App" },
      areas: [],
      pages: [],
      features: [],
      flows: [],
      evidence: [],
      measurements: []
    });

    first.architecture.nodes.push({
      id: "node.api",
      kind: "api",
      label: "GET /api/example",
      evidenceIds: []
    });
    first.dictionary.terms.push({
      id: "term.flow",
      term: "Flow",
      definition: "A request path.",
      relatedIds: []
    });

    expect(second.architecture.nodes).toEqual([]);
    expect(second.dictionary.terms).toEqual([]);
  });

  it("supports exactly the viewer chrome languages", () => {
    expect(projectLanguageSchema.options).toEqual(["ko", "en", "zh", "ja", "fr"]);
  });

  it("supports exactly the framework-neutral request roles", () => {
    expect(requestRoleSchema.options).toEqual(["primary", "supporting", "background", "external"]);
  });

  it("supports exactly the framework-neutral request purposes", () => {
    expect(requestPurposeSchema.options).toEqual([
      "data-load",
      "mutation",
      "auth-session",
      "preload",
      "analytics",
      "tracking",
      "permission",
      "notification",
      "polling",
      "health-check",
      "external-api",
      "dev-runtime",
      "unknown"
    ]);
  });

  it("supports exactly the framework-neutral flow layers", () => {
    expect(flowLayerKindSchema.options).toEqual([
      "frontend",
      "request",
      "api",
      "controller",
      "handler",
      "middleware",
      "service",
      "policy",
      "mapper",
      "repository",
      "database",
      "cache",
      "queue",
      "job",
      "external",
      "result",
      "unknown"
    ]);
  });

  it("keeps evidence status explicit instead of inferring proof", () => {
    expect(evidenceStatusSchema.options).toEqual([
      "observed",
      "measured",
      "source-matched",
      "agent-inferred",
      "manual",
      "not-proven",
      "unknown"
    ]);
  });

  it("rejects estimated measurements", () => {
    const result = projectDataSchema.safeParse({
      schemaVersion: "0.2.0",
      project: { id: "app", name: "App" },
      areas: [],
      pages: [],
      features: [],
      flows: [],
      architecture: { nodes: [], edges: [] },
      evidence: [],
      measurements: [
        {
          id: "m1",
          targetId: "flow.home",
          source: "agent-estimate",
          durationMs: 120
        }
      ],
      dictionary: { defaultLanguage: "en", terms: [] }
    });

    expect(result.success).toBe(false);
  });

  it("supports exactly the explicit measurement sources", () => {
    expect(measurementSourceSchema.options).toEqual([
      "har",
      "browser-network",
      "log",
      "trace",
      "opentelemetry",
      "framework-profiler",
      "apm-export",
      "test-trace"
    ]);
  });
});
