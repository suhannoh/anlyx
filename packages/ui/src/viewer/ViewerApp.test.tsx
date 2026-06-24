// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ScanResult } from "@anlyx/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ViewerApp } from "./ViewerApp.js";

const scanResult: ScanResult = {
  projectName: "Anlyx test project",
  generatedAt: "2026-06-24T00:00:00.000Z",
  schemaVersion: "0.1",
  endpoints: [],
  flows: [],
  pages: [],
  warnings: []
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

    const state = screen.getByRole("status", { name: "Anlyx report loading" });
    expect(within(state).getByText("Loading Anlyx report")).toBeTruthy();
    expect(
      within(state).getByText("Reading /api/report-data from the local Anlyx runtime.")
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

    const state = await screen.findByRole("alert", { name: "Anlyx report load failed" });
    expect(within(state).getByText("Failed to load Anlyx report")).toBeTruthy();
    expect(
      within(state).getByText("Run `anlyx scan` or `anlyx dev` again, then reload this viewer.")
    ).toBeTruthy();
    expect(within(state).getByText("/api/report-data returned 500")).toBeTruthy();
  });

  it("renders the live workspace after successful report fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => scanResult
      }))
    );

    render(<ViewerApp />);

    expect(await screen.findByRole("application", { name: "Anlyx live workspace" })).toBeTruthy();
  });
});
