// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AnlyxAppShell } from "../components/AnlyxAppShell.js";
import { mockScanResult } from "../mock-data.js";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("AnlyxAppShell", () => {
  it("renders Anlyx app shell", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByRole("application", { name: "Anlyx application shell" })).toBeTruthy();
    expect(screen.getByText("Anlyx")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Project Zup" })).toBeTruthy();
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

    fireEvent.click(screen.getByRole("button", { name: "Captures" }));

    const pageList = screen.getByRole("list", { name: "Page list" });
    expect(within(pageList).getByText("/benefit/[brandSlug]/[benefitSlugWithId]")).toBeTruthy();
    expect(within(pageList).getByText("/admin/benefits")).toBeTruthy();
  });

  it("renders Endpoint Map canvas", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Structure" }));

    expect(screen.getByRole("region", { name: "Endpoint Map" })).toBeTruthy();
    expect(screen.getAllByText("GET /api/public/benefits/{id}").length).toBeGreaterThan(0);
    expect(screen.getByText("Backend API Structure")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fit view" })).toBeTruthy();
  });

  it("renders inspector", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    expect(within(inspector).getByText("Flow Evidence")).toBeTruthy();
    expect(within(inspector).getByText("GET /api/public/benefits/{id}")).toBeTruthy();
    expect(within(inspector).getByText("Analysis evidence")).toBeTruthy();
    expect(within(inspector).getByText("Linked pages")).toBeTruthy();
    expect(within(inspector).getByText("Sub flows")).toBeTruthy();
    expect(within(inspector).getByText("DB tables")).toBeTruthy();
  });

  it("renders replay controls", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    const replay = screen.getByRole("region", { name: "Process Flow controls" });
    expect(within(replay).getByRole("button", { name: "Play" })).toBeTruthy();
    expect(within(replay).getByRole("button", { name: "Pause" })).toBeTruthy();
    expect(within(replay).getByRole("button", { name: "Restart" })).toBeTruthy();
    expect(within(replay).getByRole("button", { name: "Loop off" })).toBeTruthy();
    expect(within(replay).getByRole("combobox", { name: "Replay speed" })).toBeTruthy();
    expect(within(replay).getByText("Main Flow only")).toBeTruthy();
  });

  it("renders Flow Story as a finished default workspace", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByRole("region", { name: "Flow Story canvas" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Flow Story path" })).toBeTruthy();
    expect(screen.getByText("5 main steps")).toBeTruthy();
    expect(screen.getByText("3 support calls")).toBeTruthy();
    expect(screen.getByText("6 evidence items")).toBeTruthy();
    expect(screen.getByText("Support calls from service")).toBeTruthy();
  });

  it("renders the renamed product view tabs", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByRole("button", { name: "Flow Story" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Structure" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Captures" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Process" })).toBeTruthy();
  });

  it("renders process flow timeline", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Process" }));

    const timeline = screen.getByRole("region", { name: "Process Flow timeline" });
    expect(within(timeline).getByText("Inferred request path")).toBeTruthy();
    expect(within(timeline).getAllByText("Controller").length).toBeGreaterThan(0);
    expect(within(timeline).getAllByText("Response").length).toBeGreaterThan(0);
  });

  it("panel collapse state works", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse navigation panel" }));

    expect(screen.getByRole("button", { name: "Expand navigation panel" })).toBeTruthy();
    expect(screen.getByText("Nav")).toBeTruthy();
  });

  it("panel resize handles render from the panel library", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    expect(screen.getByRole("separator", { name: "Resize navigation panel" })).toBeTruthy();
    expect(screen.getByRole("separator", { name: "Resize inspector panel" })).toBeTruthy();
  });

  it("panel collapse state persists", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Collapse navigation panel" }));

    expect(window.localStorage.getItem("anlyx:ui:v2:leftCollapsed")).toBe("true");
  });

  it("displays failed page status", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Captures" }));

    expect(screen.getByText("failed")).toBeTruthy();
    expect(screen.getByText("Login required")).toBeTruthy();
  });

  it("displays pending page status", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Captures" }));
    fireEvent.click(
      screen.getByRole("button", { name: "/preview/[slug] pending 0 API calls 0 screenshots" })
    );

    expect(screen.getAllByText("pending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Missing sampleParams").length).toBeGreaterThan(0);
    expect(screen.getByText("Capture was skipped.")).toBeTruthy();
    expect(
      screen.getByText("Dynamic routes may require `sampleParams` in `anlyx.config.ts`.")
    ).toBeTruthy();
  });

  it("uses a contextual page inspector in the Captures tab", () => {
    render(<AnlyxAppShell data={mockScanResult} />);

    fireEvent.click(screen.getByRole("button", { name: "Captures" }));

    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    expect(within(inspector).getByText("Frontend Page")).toBeTruthy();
    expect(within(inspector).getByText("/benefit/[brandSlug]/[benefitSlugWithId]")).toBeTruthy();
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
