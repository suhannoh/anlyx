// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockScanResult } from "../mock-data.js";
import { ViewerApp } from "./ViewerApp.js";

describe("ViewerApp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders loading state", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined))
    );

    render(<ViewerApp />);

    expect(screen.getByText("Loading Anlyx report...")).toBeTruthy();
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

    expect(await screen.findByText("Failed to load Anlyx report.")).toBeTruthy();
  });

  it("renders AnlyxAppShell after successful report fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => mockScanResult
      }))
    );

    render(<ViewerApp />);

    expect(
      await screen.findByRole("application", { name: "Anlyx application shell" })
    ).toBeTruthy();
  });
});
