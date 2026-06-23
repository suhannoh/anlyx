// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FlowDrawer } from "./FlowDrawer.js";
import type { OverlayApiEvent } from "./types.js";

afterEach(() => {
  cleanup();
});

describe("FlowDrawer", () => {
  it("explains when a recent action only produced background requests", () => {
    render(
      <FlowDrawer
        events={backgroundEvents}
        latestAction={{
          type: "Clicked",
          label: "Login",
          selector: "button.login"
        }}
        selectedEvent={null}
      />
    );

    expect(screen.getByText("No primary API captured")).toBeTruthy();
    expect(screen.getByText("Clicked Login")).toBeTruthy();
    expect(screen.getByText("button.login")).toBeTruthy();
    expect(
      screen.getByText(
        "Only background account/auth checks were observed. They stay in Recent API events and do not replace the main flow."
      )
    ).toBeTruthy();

    expect(screen.getByText("No user-action API requests yet.")).toBeTruthy();
    expect(screen.queryByText("/api/account/me")).toBeNull();
  });

  it("shows scanned page hints separately from live browser requests", () => {
    render(
      <FlowDrawer
        events={backgroundEvents}
        latestAction={{
          type: "Clicked",
          label: "Open detail",
          selector: "a.benefit-card"
        }}
        scannedHints={[
          {
            pageRoute: "/benefit/[brandSlug]/[benefitSlugWithId]",
            pageFilePath: "src/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx",
            method: "GET",
            path: "/api/public/benefits/{id}",
            endpointLabel: "GET /api/public/benefits/{id}",
            evidence: "scanned-page"
          }
        ]}
        selectedEvent={null}
      />
    );

    expect(screen.getByText("Scanned / inferred hints")).toBeTruthy();
    expect(screen.getByText("GET /api/public/benefits/{id}")).toBeTruthy();
    expect(screen.getByText("/benefit/[brandSlug]/[benefitSlugWithId]")).toBeTruthy();
    expect(screen.getByText("scanned page link")).toBeTruthy();
    expect(screen.getByText("Not browser-live")).toBeTruthy();
  });
});

const backgroundEvents: OverlayApiEvent[] = [
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
    id: "background-2",
    method: "POST",
    path: "/api/auth/refresh",
    status: 401,
    durationMs: 20,
    source: "background",
    triggeredBy: null
  }
];
