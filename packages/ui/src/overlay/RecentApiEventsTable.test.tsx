// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RecentApiEventsTable } from "./RecentApiEventsTable.js";
import type { OverlayApiEvent } from "./types.js";

afterEach(() => {
  cleanup();
});

describe("RecentApiEventsTable", () => {
  it("keeps background requests quiet behind a filter", () => {
    render(<RecentApiEventsTable events={events} selectedEventId="action-1" />);

    const table = screen.getByRole("table");

    expect(screen.getByRole("button", { name: "Actions 1" }).getAttribute("aria-selected")).toBe(
      "true"
    );
    expect(within(table).getByText("/api/public/benefits/123")).toBeTruthy();
    expect(within(table).queryByText("/api/account/me")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Background 2" }));

    expect(
      screen.getByRole("button", { name: "Background 2" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(within(table).getByText("/api/account/me")).toBeTruthy();
    expect(within(table).getByText("/actuator/health")).toBeTruthy();
  });

  it("marks the selected API event row", () => {
    render(<RecentApiEventsTable events={events} selectedEventId="action-1" />);

    const selectedRow = screen.getByTitle("Inspect this API event");

    expect(selectedRow.className).toContain("anlyx-events-table-row--selected");
  });
});

const events: OverlayApiEvent[] = [
  {
    id: "action-1",
    method: "GET",
    path: "/api/public/benefits/123",
    status: 200,
    durationMs: 32,
    source: "action",
    triggeredBy: {
      type: "Clicked",
      label: "Birthday reward",
      selector: "a.benefit-card"
    }
  },
  {
    id: "background-1",
    method: "GET",
    path: "/api/account/me",
    status: 401,
    durationMs: 18,
    source: "background",
    triggeredBy: null
  },
  {
    id: "health-1",
    method: "GET",
    path: "/actuator/health",
    status: 200,
    durationMs: 6,
    source: "health",
    triggeredBy: null
  }
];
