// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AnlyxAppShell } from "../components/AnlyxAppShell.js";
import { mockScanResult } from "../mock-data.js";

afterEach(() => {
  cleanup();
});

describe("AnlyxAppShell", () => {
  it("renders Anlyx app shell", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByRole("application", { name: "Anlyx application shell" })).toBeTruthy();
    expect(screen.getByText("Anlyx")).toBeTruthy();
    expect(screen.getByText("Zup")).toBeTruthy();
  });

  it("renders endpoint list", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    const endpointList = screen.getByRole("list", { name: "Endpoint list" });
    expect(within(endpointList).getByText("GET")).toBeTruthy();
    expect(within(endpointList).getByText("/api/public/benefits/{id}")).toBeTruthy();
    expect(within(endpointList).getByText("PublicBenefitController#getDetail")).toBeTruthy();
  });

  it("renders page list", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    const pageList = screen.getByRole("list", { name: "Page list" });
    expect(within(pageList).getByText("/benefit/[brandSlug]/[benefitSlugWithId]")).toBeTruthy();
    expect(within(pageList).getByText("/admin/benefits")).toBeTruthy();
  });

  it("renders Endpoint Map canvas", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByRole("region", { name: "Endpoint Map" })).toBeTruthy();
    expect(screen.getAllByText("GET /api/public/benefits/{id}").length).toBeGreaterThan(0);
  });

  it("renders inspector", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    expect(within(inspector).getByText("Selected Node")).toBeTruthy();
    expect(within(inspector).getByText("GET /api/public/benefits/{id}")).toBeTruthy();
    expect(within(inspector).getByText("Linked pages")).toBeTruthy();
    expect(within(inspector).getByText("Sub flows")).toBeTruthy();
    expect(within(inspector).getByText("DB tables")).toBeTruthy();
  });

  it("renders replay controls", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    const replay = screen.getByRole("region", { name: "Replay Lite controls" });
    expect(within(replay).getByRole("button", { name: "Play" })).toBeTruthy();
    expect(within(replay).getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(within(replay).getByRole("button", { name: "Restart" })).toBeTruthy();
    expect(within(replay).getByRole("button", { name: "Loop off" })).toBeTruthy();
    expect(within(replay).getByText("Main Flow only")).toBeTruthy();
  });

  it("displays failed page status", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByText("failed")).toBeTruthy();
    expect(screen.getByText("Login required")).toBeTruthy();
  });

  it("displays pending page status", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByText("pending")).toBeTruthy();
    expect(screen.getByText("Missing sampleParams")).toBeTruthy();
  });

  it("does not hide unknown/confidence status", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByText("unknown")).toBeTruthy();
    expect(screen.getAllByText("confidence").length).toBeGreaterThan(0);
  });

  it("accepts a valid ScanResult prop", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByText("Generated 2026-06-19T00:00:00.000Z")).toBeTruthy();
  });
});
