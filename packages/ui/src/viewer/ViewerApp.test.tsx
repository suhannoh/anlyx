// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ViewerApp } from "./ViewerApp.js";

const mockProjectData = {
  schemaVersion: "0.2.0",
  project: {
    id: "acme",
    name: "Acme Portal",
    frameworkNotes: []
  },
  areas: [
    {
      id: "workspace",
      name: "Workspace"
    }
  ],
  pages: [
    {
      id: "home",
      path: "/",
      title: "Home",
      areaId: "workspace"
    }
  ],
  features: [],
  requests: [
    {
      id: "home-load",
      method: "GET",
      path: "/api/home",
      role: "primary",
      purpose: "data-load"
    },
    {
      id: "session",
      method: "GET",
      path: "/api/me",
      role: "background",
      purpose: "auth-session"
    }
  ],
  flows: [],
  architecture: {
    nodes: [],
    edges: []
  },
  evidence: [
    {
      id: "route",
      status: "source-matched",
      label: "Route found"
    }
  ],
  measurements: [],
  dictionary: {
    defaultLanguage: "en",
    terms: []
  }
};

describe("ViewerApp", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders loading state", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined))
    );

    render(<ViewerApp />);

    const state = screen.getByRole("status", { name: "Anlyx project data loading" });
    expect(within(state).getByText("Loading Anlyx project data")).toBeTruthy();
    expect(
      within(state).getByText("Reading /api/project-data from the local Anlyx runtime.")
    ).toBeTruthy();
  });

  it("renders error state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({})
      }))
    );

    render(<ViewerApp />);

    const state = await screen.findByRole("alert", { name: "Anlyx project data load failed" });
    expect(within(state).getByText("Failed to load Anlyx project data")).toBeTruthy();
    expect(within(state).getByText("Run `anlyx dev` again, then reload.")).toBeTruthy();
    expect(within(state).getByText("/api/project-data returned 500")).toBeTruthy();
  });

  it("renders project workspace after successful project data fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => mockProjectData
      }))
    );

    render(<ViewerApp />);

    expect(
      await screen.findByRole("application", { name: "Anlyx project workspace" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Acme Portal" })).toBeTruthy();
    expect(screen.getAllByText(/anlyx\.project\.json/).length).toBeGreaterThan(0);
  });

  it("does not fall back to legacy report data when project data is missing", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({})
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ViewerApp />);

    const state = await screen.findByRole("alert", { name: "Anlyx project data load failed" });
    expect(within(state).getByText("/api/project-data returned 404")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/project-data");
  });
});
