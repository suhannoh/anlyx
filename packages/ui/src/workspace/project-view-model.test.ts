import { describe, expect, it } from "vitest";
import type { ProjectData } from "@anlyx/core";
import { buildProjectWorkspaceViewModel } from "./project-view-model.js";

describe("buildProjectWorkspaceViewModel", () => {
  it("groups pages only by agent-authored areas", () => {
    const model = buildProjectWorkspaceViewModel(projectData);

    expect(model.pageGroups.map((group) => group.name)).toEqual(["Public", "Uncategorized"]);
    expect(model.pageGroups[0]?.pages.map((page) => page.path)).toEqual(["/"]);
    expect(model.pageGroups[1]?.pages.map((page) => page.path)).toEqual(["/orphan"]);
  });

  it("builds the selected page from explicit feature, request, flow, and evidence links", () => {
    const model = buildProjectWorkspaceViewModel(projectData, "home");
    const selectedPage = model.selectedPage;

    expect(selectedPage?.page.title).toBe("Home");
    expect(selectedPage?.features.map((feature) => feature.name)).toEqual(["Load home"]);
    expect(selectedPage?.requests.map((request) => request.id)).toEqual([
      "request.home",
      "request.session"
    ]);
    expect(selectedPage?.requests.map((request) => request.role)).toEqual([
      "primary",
      "background"
    ]);
    expect(selectedPage?.flows.map((flow) => flow.id)).toEqual(["flow.home"]);
    expect(selectedPage?.flows[0]?.layers.map((layer) => layer.kind)).toEqual([
      "frontend",
      "api",
      "controller",
      "service",
      "repository",
      "database",
      "result"
    ]);
    expect(selectedPage?.evidenceSummary.sourceMatched).toBe(2);
    expect(selectedPage?.evidenceSummary.agentInferred).toBe(1);
    expect(selectedPage?.hasMeasurements).toBe(false);
  });

  it("marks timing as available only when measurements target selected page data", () => {
    const model = buildProjectWorkspaceViewModel(
      {
        ...projectData,
        measurements: [
          {
            id: "measurement.home",
            targetId: "flow.home",
            source: "trace",
            durationMs: 123
          }
        ]
      },
      "home"
    );

    expect(model.selectedPage?.hasMeasurements).toBe(true);
  });
});

const projectData: ProjectData = {
  schemaVersion: "0.2.0",
  project: {
    id: "app",
    name: "App",
    frameworkNotes: []
  },
  areas: [
    {
      id: "public",
      name: "Public",
      order: 1,
      evidenceIds: []
    }
  ],
  pages: [
    {
      id: "home",
      path: "/",
      title: "Home",
      areaId: "public",
      featureIds: [],
      evidenceIds: ["e.page.home"]
    },
    {
      id: "orphan",
      path: "/orphan",
      title: "Orphan",
      featureIds: [],
      evidenceIds: []
    }
  ],
  features: [
    {
      id: "feature.home.load",
      pageId: "home",
      name: "Load home",
      requests: [],
      requestIds: ["request.home", "request.session"],
      evidenceIds: []
    }
  ],
  requests: [
    {
      id: "request.home",
      method: "GET",
      path: "/api/home",
      role: "primary",
      purpose: "data-load",
      flowId: "flow.home",
      evidenceIds: ["e.request.home"]
    },
    {
      id: "request.session",
      method: "GET",
      path: "/api/me",
      role: "background",
      purpose: "auth-session",
      evidenceIds: []
    }
  ],
  flows: [
    {
      id: "flow.home",
      requestId: "request.home",
      layers: [
        layer("layer.frontend", "frontend", "HomePage", "e.layer.frontend"),
        layer("layer.api", "api", "GET /api/home", "e.layer.api"),
        layer("layer.controller", "controller", "HomeController.index", "e.layer.controller"),
        layer("layer.service", "service", "HomeService.load", "e.layer.service"),
        layer("layer.repository", "repository", "HomeRepository.find", "e.layer.repository"),
        layer("layer.database", "database", "home", "e.layer.database"),
        layer("layer.result", "result", "200 OK", "e.layer.result")
      ],
      layerIds: [],
      evidenceIds: []
    }
  ],
  architecture: {
    nodes: [],
    edges: []
  },
  evidence: [
    {
      id: "e.page.home",
      status: "source-matched",
      label: "Page found",
      targetIds: ["home"]
    },
    {
      id: "e.request.home",
      status: "source-matched",
      label: "Request found",
      targetIds: ["request.home"]
    },
    {
      id: "e.layer.service",
      status: "agent-inferred",
      label: "Service inferred",
      targetIds: ["layer.service"]
    }
  ],
  measurements: [],
  dictionary: {
    defaultLanguage: "en",
    terms: []
  }
};

function layer(
  id: string,
  kind: ProjectData["flows"][number]["layers"][number]["kind"],
  label: string,
  evidenceId: string
): ProjectData["flows"][number]["layers"][number] {
  return {
    id,
    kind,
    label,
    evidenceIds: [evidenceId],
    status: "source-matched"
  };
}
