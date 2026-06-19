// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ScanResult } from "@anlyx/core";

import { AnlyxAppShell } from "../components/AnlyxAppShell.js";
import { mockScanResult } from "../mock-data.js";

afterEach(() => {
  cleanup();
});

describe("Endpoint Map canvas", () => {
  it("AnlyxAppShell renders Endpoint Map instead of placeholder", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByRole("region", { name: "Endpoint Map" })).toBeTruthy();
    expect(screen.queryByText("Endpoint Map will render here")).toBeNull();
  });

  it("endpoint list click changes selected endpoint", () => {
    render(<AnlyxAppShell data={withSecondEndpoint(mockScanResult)} />);

    fireEvent.click(
      screen.getByRole("button", { name: "GET /api/public/brands BrandController#list" })
    );

    expect(screen.getByRole("heading", { name: "GET /api/public/brands" })).toBeTruthy();
  });

  it("flow node labels are visible", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    const map = screen.getByRole("region", { name: "Endpoint Map" });
    expect(within(map).getByText("GET /api/public/benefits/{id}")).toBeTruthy();
    expect(within(map).getByText("PublicBenefitService#getBenefitDetail")).toBeTruthy();
  });

  it("unknown node is visible", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    const map = screen.getByRole("region", { name: "Endpoint Map" });
    expect(within(map).getByText("unknown")).toBeTruthy();
  });

  it("inspector shows selected node details", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Select node benefits" }));

    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    expect(within(inspector).getByText("database")).toBeTruthy();
    expect(within(inspector).getAllByText("benefits").length).toBeGreaterThan(0);
  });

  it("empty state is shown when selected endpoint has no flow", () => {
    render(<AnlyxAppShell data={withSecondEndpoint(mockScanResult)} />);

    fireEvent.click(
      screen.getByRole("button", { name: "GET /api/public/brands BrandController#list" })
    );

    expect(screen.getByText("No flow available for this endpoint yet.")).toBeTruthy();
  });
});

function withSecondEndpoint(data: ScanResult): ScanResult {
  return {
    ...data,
    endpoints: [
      ...data.endpoints,
      {
        id: "endpoint:get:/api/public/brands",
        method: "GET",
        path: "/api/public/brands",
        framework: "spring",
        supportLevel: "deep",
        controller: "BrandController",
        handler: "list",
        confidence: "high"
      }
    ]
  };
}
