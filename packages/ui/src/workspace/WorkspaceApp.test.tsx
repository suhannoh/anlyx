// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { FlowRecord, ScanResult } from "@anlyx/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceApp } from "./WorkspaceApp.js";

const scanResult: ScanResult = {
  projectName: "Anlyx test project",
  generatedAt: "2026-06-24T00:00:00.000Z",
  schemaVersion: "0.1",
  endpoints: [],
  flows: [],
  pages: [],
  warnings: []
};

class MockEventSource {
  static instances: MockEventSource[] = [];

  listeners = new Map<string, Array<(event: MessageEvent<string>) => void>>();
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((item) => item !== listener)
    );
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new MessageEvent(type, { data: JSON.stringify(data) }));
    }
  }
}

describe("WorkspaceApp", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    MockEventSource.instances = [];
  });

  it("renders a full-page live workspace with an empty Recent events state", () => {
    vi.stubGlobal("EventSource", MockEventSource);

    render(<WorkspaceApp data={scanResult} />);

    expect(screen.getByRole("application", { name: "Anlyx live workspace" })).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Evidence inspector" })).toBeTruthy();
    expect(
      screen.getByText("Click your local app to stream the first browser request.")
    ).toBeTruthy();
    expect(MockEventSource.instances[0]?.url).toBe("/_anlyx/events/stream");
  });

  it("renders initial records across Summary, Timing, Diagram, and Inspector", () => {
    render(<WorkspaceApp data={scanResult} initialRecords={[savedBenefitFlow]} />);

    expect(screen.getAllByText("/api/account/saved-benefit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SavedBenefitController").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "Timing" }));
    expect(screen.getByLabelText("Flow timing")).toBeTruthy();
    expect(screen.getAllByText("612 ms").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "Diagram" }));
    expect(screen.getByLabelText("Flow diagram")).toBeTruthy();
    expect(screen.getByText("Browser")).toBeTruthy();
    expect(screen.getByText("Application")).toBeTruthy();
    expect(screen.getAllByText("Known but not proven").length).toBeGreaterThan(0);

    const inspector = screen.getByRole("complementary", { name: "Evidence inspector" });
    expect(within(inspector).getByText("Browser-observed request")).toBeTruthy();
  });

  it("adds streamed flow records and auto-selects the latest request", async () => {
    vi.stubGlobal("EventSource", MockEventSource);
    render(<WorkspaceApp data={scanResult} />);

    MockEventSource.instances[0]?.emit("flow", savedBenefitFlow);

    expect((await screen.findAllByText("/api/account/saved-benefit")).length).toBeGreaterThan(0);
    expect(screen.getByText("Matched backend flow")).toBeTruthy();
    expect(screen.getAllByText("SavedBenefitController").length).toBeGreaterThan(0);
  });

  it("clears streamed requests when the server starts a new page scope", async () => {
    vi.stubGlobal("EventSource", MockEventSource);
    render(<WorkspaceApp data={scanResult} />);

    MockEventSource.instances[0]?.emit("flow", savedBenefitFlow);
    expect((await screen.findAllByText("/api/account/saved-benefit")).length).toBeGreaterThan(0);

    MockEventSource.instances[0]?.emit("reset", {});

    await waitFor(() => {
      expect(screen.getByText("Click your local app to stream the first browser request.")).toBeTruthy();
    });
  });

  it("keeps a selected user-action request when a background request streams later", async () => {
    vi.stubGlobal("EventSource", MockEventSource);
    render(<WorkspaceApp data={scanResult} />);

    MockEventSource.instances[0]?.emit("flow", savedBenefitFlow);
    expect((await screen.findAllByText("SavedBenefitController")).length).toBeGreaterThan(0);

    MockEventSource.instances[0]?.emit("flow", backgroundSessionFlow);

    expect(await screen.findByText("/api/session/ping")).toBeTruthy();
    const inspector = screen.getByRole("complementary", { name: "Evidence inspector" });
    expect(within(inspector).getAllByText("/api/account/saved-benefit").length).toBeGreaterThan(0);
    expect(within(inspector).getAllByText("POST").length).toBeGreaterThan(0);
  });

  it("renders backend-observed repeated spans in the Timing view", () => {
    render(<WorkspaceApp data={scanResult} initialRecords={[backendObservedFlow]} />);

    fireEvent.click(screen.getByRole("tab", { name: "Timing" }));

    expect(screen.getAllByText("SavedBenefitController.create").length).toBeGreaterThan(0);
    expect(screen.getByText("SavedBenefitService.save")).toBeTruthy();
    expect(screen.getByText("UserRepository.findById")).toBeTruthy();
    expect(screen.getByText("BenefitPolicyService.checkEligibility")).toBeTruthy();
    expect(screen.getByText("SavedBenefitRepository.insert")).toBeTruthy();
    expect(screen.getByText("select * from saved_benefit")).toBeTruthy();
    expect(screen.getAllByText("observed").length).toBeGreaterThanOrEqual(5);

    fireEvent.click(screen.getByRole("tab", { name: "Summary" }));
    expect(screen.getByText("1 JDBC statement")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Diagram" }));
    expect(screen.getByText("1 JDBC statement")).toBeTruthy();
  });

  it("switches the live workspace chrome and panels to Korean", () => {
    render(<WorkspaceApp data={scanResult} initialRecords={[savedBenefitFlow]} />);

    fireEvent.click(screen.getByRole("button", { name: "한" }));

    expect(screen.getByRole("application", { name: "Anlyx 라이브 워크스페이스" })).toBeTruthy();
    expect(screen.getByText("매칭된 백엔드 흐름")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "요약" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "타이밍" })).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "근거 인스펙터" })).toBeTruthy();
    expect(screen.getByText("최근 요청")).toBeTruthy();
    expect(screen.getAllByText("전체 소요 시간").length).toBeGreaterThan(0);
  });
});

const savedBenefitFlow: FlowRecord = {
  id: "flow:evt_saved",
  requestId: "evt_saved",
  method: "POST",
  path: "/api/account/saved-benefit",
  trigger: "user_action",
  status: 401,
  duration: 612,
  durationMs: 612,
  matchState: "matched",
  confidence: "high",
  action: {
    label: "Save perk",
    selector: "button[data-action='save-perk']",
    observedAt: "2026-06-24T00:00:00.000Z"
  },
  endpointId: "endpoint:post:/api/account/saved-benefit",
  endpointPath: "/api/account/saved-benefit",
  layers: [
    {
      id: "evt_saved:action",
      type: "action",
      label: "Save perk",
      execution: "executed",
      evidenceLevel: "browser_observed",
      evidence: ["Browser-observed request"],
      durationMs: 612
    },
    {
      id: "evt_saved:api",
      type: "api",
      label: "POST /api/account/saved-benefit",
      execution: "executed",
      evidenceLevel: "browser_observed",
      evidence: ["fetch/XMLHttpRequest observed in browser"],
      durationMs: 612,
      status: 401
    },
    {
      id: "evt_saved:controller",
      type: "controller",
      label: "SavedBenefitController",
      execution: "inferred",
      evidenceLevel: "source_derived",
      evidence: ["Controller match from scanned backend path"],
      durationMs: 8
    },
    {
      id: "evt_saved:auth",
      type: "auth",
      label: "Auth gate inferred",
      execution: "blocked",
      evidenceLevel: "inferred",
      evidence: ["401 response indicates auth gate before downstream service"],
      durationMs: 401,
      status: 401
    },
    {
      id: "evt_saved:service",
      type: "service",
      label: "SavedBenefitService",
      execution: "not_proven",
      evidenceLevel: "not_proven",
      evidence: ["Scanned path, not proven executed"]
    },
    {
      id: "evt_saved:repository",
      type: "repository",
      label: "SavedBenefitRepository",
      execution: "not_proven",
      evidenceLevel: "not_proven",
      evidence: ["Scanned path, not proven executed"]
    },
    {
      id: "evt_saved:result",
      type: "result",
      label: "401 Auth required",
      execution: "blocked",
      evidenceLevel: "browser_observed",
      evidence: ["Browser observed HTTP 401 response"],
      durationMs: 1,
      status: 401
    }
  ],
  evidence: [
    "Browser-observed request",
    "Source-derived backend match",
    "Not a runtime server trace"
  ],
  createdAt: "2026-06-24T00:00:00.000Z",
  label: "POST /api/account/saved-benefit -> 401"
};

const backgroundSessionFlow: FlowRecord = {
  id: "flow:evt_session",
  requestId: "evt_session",
  method: "GET",
  path: "/api/session/ping",
  trigger: "background",
  status: 200,
  duration: 18,
  durationMs: 18,
  matchState: "unmatched",
  confidence: "low",
  layers: [
    {
      id: "evt_session:api",
      type: "api",
      label: "GET /api/session/ping",
      execution: "executed",
      evidenceLevel: "browser_observed",
      evidence: ["fetch/XMLHttpRequest observed in browser"],
      durationMs: 18,
      status: 200
    },
    {
      id: "evt_session:result",
      type: "result",
      label: "200 response",
      execution: "executed",
      evidenceLevel: "browser_observed",
      evidence: ["Browser observed HTTP 200 response"],
      status: 200
    }
  ],
  evidence: ["Browser-observed request", "No scanned endpoint matched"],
  createdAt: "2026-06-24T00:00:01.000Z",
  label: "GET /api/session/ping -> 200"
};

const backendObservedFlow: FlowRecord = {
  ...savedBenefitFlow,
  id: "flow:evt_backend",
  requestId: "evt_backend",
  status: 201,
  duration: 142,
  durationMs: 142,
  label: "POST /api/account/saved-benefit -> 201",
  layers: savedBenefitFlow.layers.map((layer) =>
    layer.type === "api"
      ? { ...layer, id: "evt_backend:api", durationMs: 142, status: 201 }
      : layer.type === "result"
        ? {
            ...layer,
            id: "evt_backend:result",
            label: "201 response",
            execution: "executed",
            durationMs: 1,
            status: 201
          }
        : { ...layer, id: layer.id.replace("evt_saved", "evt_backend") }
  ),
  backendSpans: [
    {
      id: "span-controller",
      type: "controller",
      label: "SavedBenefitController.create",
      startOffsetMs: 12,
      durationMs: 118
    },
    {
      id: "span-service-1",
      parentId: "span-controller",
      type: "service",
      label: "SavedBenefitService.save",
      startOffsetMs: 22,
      durationMs: 44
    },
    {
      id: "span-repository-1",
      parentId: "span-service-1",
      type: "repository",
      label: "UserRepository.findById",
      startOffsetMs: 30,
      durationMs: 11
    },
    {
      id: "span-service-2",
      parentId: "span-service-1",
      type: "service",
      label: "BenefitPolicyService.checkEligibility",
      startOffsetMs: 68,
      durationMs: 28
    },
    {
      id: "span-repository-2",
      parentId: "span-service-2",
      type: "repository",
      label: "SavedBenefitRepository.insert",
      startOffsetMs: 98,
      durationMs: 18
    },
    {
      id: "span-database-1",
      parentId: "span-repository-2",
      type: "database",
      label: "select * from saved_benefit",
      startOffsetMs: 116,
      durationMs: 9,
      evidence: ["jdbc_execute"]
    }
  ],
  evidence: [
    ...savedBenefitFlow.evidence,
    "backend_observed: development runtime reported server-side method spans"
  ]
};
