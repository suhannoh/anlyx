// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FlowRecord, ProjectData } from "@anlyx/core";

import { mockScanResult } from "../mock-data.js";
import { WorkspaceApp } from "./WorkspaceApp.js";

describe("WorkspaceApp timing view", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows a readable grouped timing path without debug toggles", () => {
    vi.stubGlobal("EventSource", undefined);

    render(<WorkspaceApp data={mockScanResult} initialRecords={[runtimeRecord]} />);

    expect(screen.queryByText("Show raw spans")).toBeNull();
    expect(screen.queryByText("Show idle time")).toBeNull();
    expect(screen.getByText("PageViewRepository.countByTargetKeysSince ×2")).toBeTruthy();
    expect(screen.getByText("2 JDBC statements")).toBeTruthy();
    expect(screen.getByText("Untracked application time")).toBeTruthy();
    expect(screen.getByText("not yet split into lower layers")).toBeTruthy();
    expect(screen.getAllByText("91 ms").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("7 ms").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2 ms").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2 calls")).toHaveLength(2);
    expect(screen.queryByText(/overlap|not additive|nested/i)).toBeNull();
    expect(screen.queryAllByText("PageViewRepository.countByTargetKeysSince")).toHaveLength(0);
  });

  it("opens the Map navigation and renders a project graph", () => {
    vi.stubGlobal("EventSource", undefined);

    render(<WorkspaceApp data={mockScanResult} initialRecords={[runtimeRecord]} />);

    fireEvent.click(screen.getByRole("button", { name: /map/i }));

    expect(screen.getByRole("heading", { name: "Map" })).toBeTruthy();
    expect(
      screen.getByText(
        "Primary request paths stay visible. Hover a node to reveal shared dependencies."
      )
    ).toBeTruthy();
    expect(screen.getByText(/curated tree mock/i)).toBeTruthy();
    expect(screen.getByTestId("map-graph")).toBeTruthy();
    expect(screen.getByText("Benefits requests")).toBeTruthy();
    expect(screen.getByText("+14")).toBeTruthy();
    expect(screen.getByText("BenefitService")).toBeTruthy();
    expect(screen.getByText("DB table")).toBeTruthy();
  });
});

describe("WorkspaceApp project workspace", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the Pages surface from agent-authored project JSON", () => {
    const { container } = render(<WorkspaceApp projectData={projectDataWithPages} />);

    expect(screen.getByRole("heading", { name: "Projects" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Page Brief/i })).toBeNull();
    expect(screen.queryByText("OSS")).toBeNull();
    expect(screen.queryByLabelText("Language")).toBeNull();
    expect(screen.queryByText("AI-authored")).toBeNull();
    expect(container.querySelector(".project-page-brief__number")).toBeNull();
    expect(container.querySelector(".anlyx-user-actions")).toBeTruthy();
    expect(container.querySelector(".anlyx-action-item")).toBeTruthy();
    expect(container.querySelector(".anlyx-trust-unknowns")).toBeTruthy();
    expect(container.querySelector(".anlyx-unknowns")).toBeTruthy();
    expect(screen.getAllByText("Public").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Page metadata")).toBeNull();
    expect(screen.getAllByText("/projects").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Lists and searches projects.")).toHaveLength(2);
    expect(screen.getByText("Search projects")).toBeTruthy();
    expect(screen.getByText("Primary")).toBeTruthy();
    expect(screen.getByText("Supporting")).toBeTruthy();
    expect(screen.getByText("Background")).toBeTruthy();
    expect(screen.queryByRole("complementary", { name: "Page details" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("complementary", { name: "Page details" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Page Details" })).toBeTruthy();
    expect(screen.getByText("Area")).toBeTruthy();
    expect(screen.getByText("Page Type")).toBeTruthy();
    expect(screen.getByText("Related Pages")).toBeTruthy();
    expect(screen.getByText("Tags")).toBeTruthy();
    expect(screen.queryByText("External")).toBeNull();
    expect(screen.getAllByText("GET /api/projects").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("ProjectsController.list")).toBeTruthy();
    expect(screen.getByText("ProjectRepository.findMany")).toBeTruthy();
    expect(screen.getByText("Selected Flow")).toBeTruthy();
    expect(screen.getByText("Session refresh interval was not found in source.")).toBeTruthy();
    expect(screen.getByText("src/pages/projects.tsx:12")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Collapse page details" }));
    expect(screen.queryByRole("complementary", { name: "Page details" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.getByRole("complementary", { name: "Page details" })).toBeTruthy();

    const supportingRequest = screen.getByText("/api/projects/:id/detail").closest("button");
    if (!supportingRequest) {
      throw new Error("Expected supporting request button to be rendered.");
    }
    fireEvent.click(supportingRequest);

    expect(screen.getByText("No backend flow linked to this request.")).toBeTruthy();
  });

  it("renders project architecture from agent-authored project data only", () => {
    const { container } = render(<WorkspaceApp projectData={projectDataWithArchitecture} />);

    fireEvent.click(screen.getByRole("tab", { name: "Map" }));

    expect(screen.getByTestId("project-architecture-map")).toBeTruthy();
    expect(screen.getAllByText("HomePage").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GET /api/home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HomeController.index").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HomeService.load").length).toBeGreaterThan(0);
    expect(screen.getAllByText("home").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Agent-authored architecture map. The viewer renders nodes and edges from project JSON."
      )
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Details" })).toBeNull();
    expect(screen.queryByLabelText("Map inspector")).toBeNull();
    expect(container.querySelector(".anlyx-map-node.is-muted")).toBeNull();
    expect(container.querySelector(".anlyx-map-edge.is-selected")).toBeNull();
    const edgePaths = Array.from(container.querySelectorAll<SVGPathElement>(".anlyx-map-edge"));
    expect(edgePaths.length).toBeGreaterThan(0);
    edgePaths.forEach((edgePath) => {
      const path = edgePath.getAttribute("d") ?? "";
      expect(path).toMatch(/^M [\d.]+ [\d.]+ H [\d.]+ V [\d.]+ H [\d.]+$/);
      expect(path).not.toContain("C");
    });

    const homeNode = container.querySelector<HTMLButtonElement>('.anlyx-map-node[title="HomePage"]');
    if (!homeNode) {
      throw new Error("Expected HomePage map node to be rendered.");
    }
    fireEvent.click(homeNode);

    expect(screen.getByLabelText("Map inspector")).toBeTruthy();
    expect(container.querySelector(".anlyx-map-node.is-selected")).toBeTruthy();
    expect(container.querySelector(".anlyx-map-edge.is-selected")).toBeTruthy();
    expect(screen.getByText("Data Contract")).toBeTruthy();
    expect(screen.getByText("No contract authored.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByLabelText("Map inspector")).toBeNull();
    expect(container.querySelector(".anlyx-map-node.is-selected")).toBeNull();
    expect(container.querySelector(".anlyx-map-edge.is-selected")).toBeNull();

    const apiNode = container.querySelector<HTMLButtonElement>(
      '.anlyx-map-node[title="GET /api/home"]'
    );
    if (!apiNode) {
      throw new Error("Expected API map node to be rendered.");
    }
    fireEvent.click(apiNode);

    expect(screen.getByText("Endpoint")).toBeTruthy();
    expect(screen.getAllByText("GET /api/home").length).toBeGreaterThan(0);
    expect(screen.getByText("HomeDto (dto)")).toBeTruthy();
    expect(container.textContent).toContain("message: string");
  });

  it("does not invent map nodes when project architecture is empty", () => {
    render(
      <WorkspaceApp
        projectData={{ ...projectDataWithArchitecture, architecture: { nodes: [], edges: [] } }}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Map" }));

    expect(
      screen.getByText(
        "No architecture graph was authored yet. The viewer will not invent mock project data."
      )
    ).toBeTruthy();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
  });
});

const runtimeRecord: FlowRecord = {
  id: "flow:test-home",
  requestId: "request:test-home",
  label: "Home request",
  method: "GET",
  path: "/api/public/home",
  trigger: "background",
  priority: "primary",
  runtimeSource: "server",
  status: 200,
  duration: 120,
  durationMs: 120,
  matchState: "matched",
  confidence: "high",
  layers: [
    {
      id: "api:test-home",
      type: "api",
      label: "GET /api/public/home",
      execution: "observed",
      evidenceLevel: "browser_observed",
      evidence: ["runtime.server.fetch"],
      durationMs: 120
    },
    {
      id: "result:test-home",
      type: "result",
      label: "200 response",
      execution: "observed",
      evidenceLevel: "browser_observed",
      evidence: ["runtime.server.fetch"],
      durationMs: 1
    }
  ],
  backendSpans: [
    {
      id: "span:controller",
      type: "controller",
      label: "PublicViewController.home",
      startOffsetMs: 10,
      durationMs: 100,
      evidence: ["runtime.server.span"]
    },
    {
      id: "span:repo:1",
      parentId: "span:controller",
      type: "repository",
      label: "PageViewRepository.countByTargetKeysSince",
      startOffsetMs: 20,
      durationMs: 4,
      evidence: ["runtime.server.span"]
    },
    {
      id: "span:db:1",
      parentId: "span:repo:1",
      type: "database",
      label: "select count(*) from page_views",
      startOffsetMs: 21,
      durationMs: 1,
      evidence: ["runtime.database.query"]
    },
    {
      id: "span:repo:2",
      parentId: "span:controller",
      type: "repository",
      label: "PageViewRepository.countByTargetKeysSince",
      startOffsetMs: 70,
      durationMs: 5,
      evidence: ["runtime.server.span"]
    },
    {
      id: "span:db:2",
      parentId: "span:repo:2",
      type: "database",
      label: "select count(*) from page_views",
      startOffsetMs: 71,
      durationMs: 1,
      evidence: ["runtime.database.query"]
    }
  ],
  evidence: [
    "source_derived: endpoint match and backend flow came from imported report data",
    "backend_observed: development runtime reported server-side method spans"
  ],
  createdAt: "2026-06-26T09:53:36.211Z"
};

const projectDataWithArchitecture: ProjectData = {
  schemaVersion: "0.2.0",
  project: {
    id: "project",
    name: "Project",
    frameworkNotes: []
  },
  areas: [
    {
      id: "public",
      name: "Public",
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
      evidenceIds: []
    }
  ],
  features: [],
  requests: [],
  flows: [],
  architecture: {
    nodes: [
      {
        id: "node.frontend",
        kind: "frontend",
        label: "HomePage",
        domain: "Public",
        evidenceIds: []
      },
      {
        id: "node.api",
        kind: "api",
        label: "GET /api/home",
        domain: "Public",
        evidenceIds: [],
        metadata: {
          contracts: {
            endpoint: "GET /api/home",
            input: {
              name: "None",
              shape: null
            },
            output: {
              name: "HomeDto",
              kind: "dto",
              shape: {
                message: "string",
                highlights: "Highlight[]"
              }
            },
            relatedModels: ["HomeDto", "Highlight"]
          }
        }
      },
      {
        id: "node.controller",
        kind: "controller",
        label: "HomeController.index",
        domain: "Public",
        evidenceIds: []
      },
      {
        id: "node.service",
        kind: "service",
        label: "HomeService.load",
        domain: "Public",
        evidenceIds: []
      },
      {
        id: "node.database",
        kind: "database",
        label: "home",
        domain: "Public",
        evidenceIds: []
      }
    ],
    edges: [
      {
        id: "edge.frontend.api",
        source: "node.frontend",
        target: "node.api",
        role: "primary",
        evidenceIds: []
      },
      {
        id: "edge.api.controller",
        source: "node.api",
        target: "node.controller",
        role: "primary",
        evidenceIds: []
      },
      {
        id: "edge.controller.service",
        source: "node.controller",
        target: "node.service",
        role: "primary",
        evidenceIds: []
      },
      {
        id: "edge.service.database",
        source: "node.service",
        target: "node.database",
        role: "primary",
        evidenceIds: []
      }
    ]
  },
  evidence: [],
  measurements: [],
  dictionary: {
    defaultLanguage: "en",
    terms: []
  }
};

const projectDataWithPages: ProjectData = {
  ...projectDataWithArchitecture,
  pages: [
    {
      id: "projects",
      path: "/projects",
      title: "Projects",
      areaId: "public",
      description: "Lists and searches projects.",
      source: {
        filePath: "src/pages/projects.tsx",
        lineStart: 12
      },
      featureIds: ["feature.search"],
      evidenceIds: ["evidence.page", "evidence.session"],
      confidence: "high",
      metadata: {
        relatedPageIds: ["project-detail"],
        tags: ["projects", "search"]
      }
    }
  ],
  features: [
    {
      id: "feature.search",
      pageId: "projects",
      name: "Search projects",
      description: "Find projects by name.",
      requests: [],
      requestIds: ["request.projects"],
      evidenceIds: ["evidence.feature"],
      confidence: "high"
    }
  ],
  requests: [
    {
      id: "request.session",
      method: "GET",
      path: "/api/session",
      role: "background",
      purpose: "auth-session",
      description: "Session validation.",
      evidenceIds: ["evidence.session"],
      confidence: "medium",
      metadata: {
        pageId: "projects"
      }
    },
    {
      id: "request.projects",
      method: "GET",
      path: "/api/projects",
      role: "primary",
      purpose: "data-load",
      description: "Load project list.",
      flowId: "flow.projects",
      evidenceIds: ["evidence.request"],
      confidence: "high",
      metadata: {
        pageId: "projects"
      }
    },
    {
      id: "request.detail",
      method: "GET",
      path: "/api/projects/:id/detail",
      role: "supporting",
      purpose: "data-load",
      description: "Load project detail.",
      evidenceIds: [],
      confidence: "medium",
      metadata: {
        pageId: "projects"
      }
    }
  ],
  flows: [
    {
      id: "flow.projects",
      requestId: "request.projects",
      name: "Load projects",
      evidenceIds: ["evidence.flow"],
      confidence: "high",
      layerIds: [],
      layers: [
        {
          id: "layer.frontend",
          kind: "frontend",
          label: "ProjectsPage.tsx",
          status: "source-matched",
          evidenceIds: ["evidence.request"],
          confidence: "high"
        },
        {
          id: "layer.request",
          kind: "request",
          label: "GET /api/projects",
          status: "source-matched",
          evidenceIds: ["evidence.request"],
          confidence: "high"
        },
        {
          id: "layer.controller",
          kind: "controller",
          label: "ProjectsController.list",
          status: "source-matched",
          evidenceIds: ["evidence.request"],
          confidence: "high"
        },
        {
          id: "layer.service",
          kind: "service",
          label: "ProjectService.findAll",
          status: "agent-inferred",
          evidenceIds: ["evidence.feature"],
          confidence: "medium"
        },
        {
          id: "layer.repository",
          kind: "repository",
          label: "ProjectRepository.findMany",
          status: "source-matched",
          evidenceIds: ["evidence.request"],
          confidence: "high"
        },
        {
          id: "layer.database",
          kind: "database",
          label: "projects",
          status: "observed",
          evidenceIds: ["evidence.flow"],
          confidence: "high"
        },
        {
          id: "layer.result",
          kind: "result",
          label: "Project[]",
          status: "source-matched",
          evidenceIds: ["evidence.flow"],
          confidence: "high"
        }
      ]
    }
  ],
  evidence: [
    {
      id: "evidence.page",
      status: "source-matched",
      label: "Page source found",
      targetIds: ["projects"],
      confidence: "high"
    },
    {
      id: "evidence.feature",
      status: "agent-inferred",
      label: "User action inferred",
      targetIds: ["feature.search", "layer.service"],
      confidence: "medium"
    },
    {
      id: "evidence.request",
      status: "source-matched",
      label: "Request source matched",
      targetIds: ["request.projects", "flow.projects"],
      confidence: "high"
    },
    {
      id: "evidence.flow",
      status: "observed",
      label: "Database table observed",
      targetIds: ["flow.projects", "layer.database", "layer.result"],
      confidence: "high"
    },
    {
      id: "evidence.session",
      status: "not-proven",
      label: "Session refresh cadence not proven",
      detail: "Session refresh interval was not found in source.",
      targetIds: ["projects", "request.session"],
      confidence: "low"
    }
  ]
};
