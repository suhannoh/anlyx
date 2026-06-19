// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ScanResult } from "@anlyx/core";

import { AnlyxAppShell } from "../components/AnlyxAppShell.js";
import { mockScanResult } from "../mock-data.js";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Connected Frontend view", () => {
  it("renders Connected Frontend view from the tab", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));

    expect(screen.getByRole("region", { name: "Page Storyboard" })).toBeTruthy();
    expect(
      screen.getAllByRole("heading", { name: "/benefit/[brandSlug]/[benefitSlugWithId]" }).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Connected Frontend").length).toBeGreaterThan(0);
  });

  it("page tab switches from Endpoint Map to Page Storyboard", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByRole("region", { name: "Endpoint Map" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));

    expect(screen.queryByRole("region", { name: "Endpoint Map" })).toBeNull();
    expect(screen.getByRole("region", { name: "Page Storyboard" })).toBeTruthy();
  });

  it("page list click changes selected page", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));
    fireEvent.click(
      screen.getByRole("button", { name: "/admin/benefits failed 0 API calls 0 screenshots" })
    );

    expect(screen.getAllByRole("heading", { name: "/admin/benefits" }).length).toBeGreaterThan(0);
    expect(screen.getByText("Capture failed")).toBeTruthy();
  });

  it("selected page route and filePath are visible", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));

    const storyboard = screen.getByRole("region", { name: "Page Storyboard" });
    expect(
      within(storyboard).getAllByText("/benefit/[brandSlug]/[benefitSlugWithId]").length
    ).toBeGreaterThan(0);
    expect(
      within(storyboard).getByText("frontend/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx")
    ).toBeTruthy();
  });

  it("screenshot segments and metadata are rendered without requiring files", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));

    const storyboard = screen.getByRole("region", { name: "Page Storyboard" });
    expect(within(storyboard).getByText("Segment 1")).toBeTruthy();
    expect(within(storyboard).getByAltText("Hero / Summary")).toBeTruthy();
    expect(within(storyboard).getByText(".anlyx/screenshots/benefit-detail-0.png")).toBeTruthy();
    expect(within(storyboard).getByText("scrollY 0")).toBeTruthy();
    expect(within(storyboard).getByText("1440 x 900")).toBeTruthy();
  });

  it("API calls are rendered with linked and unmatched states", () => {
    render(<AnlyxAppShell data={withUnmatchedApiCall(mockScanResult)} />);

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));

    const storyboard = screen.getByRole("region", { name: "Page Storyboard" });
    expect(within(storyboard).getByText("/api/public/benefits/123")).toBeTruthy();
    expect(within(storyboard).getByText("Linked endpoint")).toBeTruthy();
    expect(within(storyboard).getByText("/api/public/benefits/123/related")).toBeTruthy();
    expect(within(storyboard).getByText("Unmatched")).toBeTruthy();
  });

  it("renders page to endpoint relationship panel", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));

    const relationship = screen.getByRole("region", { name: "Page to endpoint relationship" });
    expect(within(relationship).getByText("Page to Endpoint")).toBeTruthy();
    expect(within(relationship).getByText("/api/public/benefits/{id}")).toBeTruthy();
  });

  it("failed page status and errorMessage are visible", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));
    fireEvent.click(
      screen.getByRole("button", { name: "/admin/benefits failed 0 API calls 0 screenshots" })
    );

    expect(screen.getByText("Capture failed")).toBeTruthy();
    expect(screen.getByText("Reason: Login required")).toBeTruthy();
    expect(screen.getAllByText("Waiting for capture data").length).toBeGreaterThan(0);
  });

  it("pending page status and errorMessage are visible", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));
    fireEvent.click(
      screen.getByRole("button", { name: "/preview/[slug] pending 0 API calls 0 screenshots" })
    );

    expect(screen.getByText("Capture was skipped.")).toBeTruthy();
    expect(screen.getByText("Reason: Missing sampleParams")).toBeTruthy();
    expect(
      screen.getByText("Dynamic routes may require `sampleParams` in `anlyx.config.ts`.")
    ).toBeTruthy();
  });

  it("empty page list shows empty state", () => {
    render(<AnlyxAppShell data={{ ...mockScanResult, pages: [] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Connected Frontend" }));

    expect(screen.getByText("No pages available yet.")).toBeTruthy();
  });

  it("Process Flow tab shows the replay-capable Endpoint Map", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Process Flow" }));

    expect(screen.getByRole("region", { name: "Process Flow map" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Process Flow controls" })).toBeTruthy();
    expect(screen.queryByText("Endpoint Map will render here")).toBeNull();
  });
});

function withUnmatchedApiCall(data: ScanResult): ScanResult {
  const firstPage = data.pages[0]!;

  return {
    ...data,
    pages: [
      {
        ...firstPage,
        apiCalls: [
          ...firstPage.apiCalls,
          {
            method: "GET",
            path: "/api/public/benefits/123/related",
            status: 200
          }
        ]
      },
      ...data.pages.slice(1)
    ]
  };
}
