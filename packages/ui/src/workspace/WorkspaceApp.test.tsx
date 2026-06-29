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

  it("renders project architecture from agent-authored project data only", () => {
    render(<WorkspaceApp projectData={projectDataWithArchitecture} />);

    fireEvent.click(screen.getByRole("tab", { name: "Map" }));

    expect(screen.getByTestId("project-architecture-map")).toBeTruthy();
    expect(screen.getByText("HomePage")).toBeTruthy();
    expect(screen.getByText("GET /api/home")).toBeTruthy();
    expect(screen.getByText("HomeController.index")).toBeTruthy();
    expect(screen.getByText("HomeService.load")).toBeTruthy();
    expect(screen.getByText("home")).toBeTruthy();
    expect(
      screen.getByText(
        "Agent-authored architecture map. The viewer renders only nodes and edges from project JSON."
      )
    ).toBeTruthy();
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
        evidenceIds: []
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
