import { describe, expect, it } from "vitest";
import { normalizeProjectInput } from "./project-normalize.js";

describe("normalizeProjectInput", () => {
  it("normalizes a full single anlyx.project.json object", () => {
    const data = normalizeProjectInput({
      schemaVersion: "0.2.0",
      project: { id: "app", name: "App" },
      areas: [{ id: "support", name: "Support" }],
      pages: [
        {
          id: "page.contact",
          path: "/contact",
          title: "Contact",
          areaId: "support",
          featureIds: ["feature.contact.read"]
        }
      ],
      features: [
        {
          id: "feature.contact.read",
          pageId: "page.contact",
          name: "Read contact help",
          requestIds: []
        }
      ],
      requests: [],
      flows: [],
      architecture: { nodes: [], edges: [] },
      evidence: [],
      measurements: [],
      dictionary: { defaultLanguage: "en", terms: [] }
    });

    expect(data.pages).toHaveLength(1);
    expect(data.pages[0]?.path).toBe("/contact");
  });

  it("normalizes split project files into one ProjectData object", () => {
    const data = normalizeProjectInput({
      index: {
        schemaVersion: "0.2.0",
        project: { id: "app", name: "App" }
      },
      areas: [],
      pages: [{ id: "page.home", path: "/", title: "Home", featureIds: [] }],
      features: [],
      requests: [],
      flows: [],
      architecture: { nodes: [], edges: [] },
      evidence: [],
      measurements: [],
      dictionary: {
        defaultLanguage: "ko",
        terms: [{ id: "term.home", term: "홈", definition: "서비스 진입 페이지" }]
      }
    });

    expect(data.project.name).toBe("App");
    expect(data.pages[0]?.title).toBe("Home");
    expect(data.dictionary.defaultLanguage).toBe("ko");
    expect(data.dictionary.terms[0]?.term).toBe("홈");
  });

  it("fills missing measurements, architecture, dictionary, and understanding surfaces with defaults", () => {
    const data = normalizeProjectInput({
      index: {
        schemaVersion: "0.2.0",
        project: { id: "app", name: "App" }
      },
      areas: [],
      pages: [],
      features: [],
      requests: [],
      flows: [],
      evidence: []
    });

    expect(data.measurements).toEqual([]);
    expect(data.architecture).toEqual({ nodes: [], edges: [] });
    expect(data.dictionary).toEqual({ defaultLanguage: "en", terms: [] });
    expect(data.overview).toEqual({
      actors: [],
      coreEntities: [],
      mainAreas: [],
      implementation: [],
      suggestedReadingPath: [],
      evidenceIds: []
    });
    expect(data.capabilities).toEqual([]);
    expect(data.dataLifecycles).toEqual([]);
    expect(data.impactMaps).toEqual([]);
  });

  it("normalizes split project understanding files", () => {
    const data = normalizeProjectInput({
      index: {
        schemaVersion: "0.3.0",
        project: { id: "app", name: "App" }
      },
      overview: {
        summary: "Project summary",
        actors: [{ id: "actor.user", name: "User", role: "user" }]
      },
      capabilities: [
        {
          id: "capability.view",
          actorRole: "user",
          name: "View project",
          status: "connected"
        }
      ],
      dataLifecycles: [
        {
          id: "lifecycle.project-data",
          entity: { name: "ProjectData", kind: "core-entity" },
          name: "ProjectData lifecycle"
        }
      ],
      impactMaps: [
        {
          id: "impact.project-data",
          target: { id: "target.project-data", kind: "entity", label: "ProjectData" },
          name: "ProjectData impact",
          affected: {}
        }
      ]
    });

    expect(data.overview.summary).toBe("Project summary");
    expect(data.capabilities[0]?.name).toBe("View project");
    expect(data.dataLifecycles[0]?.entity.name).toBe("ProjectData");
    expect(data.impactMaps[0]?.target.label).toBe("ProjectData");
  });

  it("fails schema parsing for invalid split child data", () => {
    expect(() =>
      normalizeProjectInput({
        index: {
          schemaVersion: "0.2.0",
          project: { id: "app", name: "App" }
        },
        pages: [{ id: "page.home", path: "/", featureIds: [] }]
      } as never)
    ).toThrow();
  });

  it("reports malformed split containers as schema errors", () => {
    expect(() => normalizeProjectInput({ index: null } as never)).toThrow();
  });
});
