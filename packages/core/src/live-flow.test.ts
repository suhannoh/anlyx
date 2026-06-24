import { describe, expect, it } from "vitest";

import {
  buildFlowRecordFromBrowserEvent,
  mergeBackendSpansIntoFlowRecord,
  normalizeBrowserEventPath
} from "./live-flow.js";
import type { Endpoint, EndpointFlow, ScanResult } from "./schema.js";

const savedBenefitEndpoint: Endpoint = {
  id: "endpoint:post:/api/account/saved-benefit",
  method: "POST",
  path: "/api/account/saved-benefit",
  supportLevel: "deep",
  handler: "SavedBenefitController.create",
  confidence: "high"
};

const savedBenefitFlow: EndpointFlow = {
  endpointId: savedBenefitEndpoint.id,
  nodes: [
    { id: "endpoint", type: "endpoint", label: "POST /api/account/saved-benefit" },
    { id: "controller", type: "controller", label: "SavedBenefitController.create" },
    { id: "service", type: "service", label: "SavedBenefitService.save" },
    { id: "repository", type: "repository", label: "SavedBenefitRepository.insert" },
    { id: "database", type: "database", label: "saved_benefit" }
  ],
  edges: [
    { id: "e1", from: "endpoint", to: "controller", kind: "main" },
    { id: "e2", from: "controller", to: "service", kind: "main" },
    { id: "e3", from: "service", to: "repository", kind: "main" },
    { id: "e4", from: "repository", to: "database", kind: "db" }
  ],
  mainPath: ["endpoint", "controller", "service", "repository", "database"],
  subFlows: []
};

const publicBenefitEndpoint: Endpoint = {
  id: "endpoint:get:/api/public/benefits/{id}",
  method: "GET",
  path: "/api/public/benefits/{id}",
  supportLevel: "deep",
  confidence: "high"
};

const colonParamEndpoint: Endpoint = {
  id: "endpoint:get:/api/public/perks/:id",
  method: "GET",
  path: "/api/public/perks/:id",
  supportLevel: "deep",
  confidence: "high"
};

const scanResult: ScanResult = {
  projectName: "sample",
  generatedAt: "2026-06-24T00:00:00.000Z",
  schemaVersion: "0.1",
  endpoints: [savedBenefitEndpoint, publicBenefitEndpoint, colonParamEndpoint],
  flows: [savedBenefitFlow],
  pages: [],
  warnings: []
};

describe("live flow records", () => {
  it("normalizes absolute request URLs into local API paths", () => {
    expect(normalizeBrowserEventPath("http://localhost:8080/api/account/saved-benefit")).toBe(
      "/api/account/saved-benefit"
    );
  });

  it("keeps query strings in normalized browser paths for event display", () => {
    expect(normalizeBrowserEventPath("/api/public/benefits?sort=latest")).toBe(
      "/api/public/benefits?sort=latest"
    );
  });

  it("matches method and path to scanned endpoint data", () => {
    const record = buildFlowRecordFromBrowserEvent(
      {
        id: "evt_1",
        type: "request",
        method: "POST",
        url: "http://localhost:8080/api/account/saved-benefit",
        path: "/api/account/saved-benefit",
        status: 401,
        durationMs: 56,
        observedAt: "2026-06-24T00:00:01.000Z",
        action: { label: "Save perk", selector: "button[data-action='save']" }
      },
      scanResult
    );

    expect(record.matchState).toBe("matched");
    expect(record.method).toBe("POST");
    expect(record.path).toBe("/api/account/saved-benefit");
    expect(record.trigger).toBe("user_action");
    expect(record.status).toBe(401);
    expect(record.duration).toBe(56);
    expect(record.action?.label).toBe("Save perk");
    expect(record.endpoint?.id).toBe(savedBenefitEndpoint.id);
    expect(record.flow?.endpointId).toBe(savedBenefitFlow.endpointId);
    expect(record.layers.map((layer) => layer.type)).toEqual([
      "action",
      "api",
      "controller",
      "auth",
      "service",
      "repository",
      "database",
      "result"
    ]);
    expect(record.layers.find((layer) => layer.type === "action")?.execution).toBe("executed");
    expect(record.layers.find((layer) => layer.type === "api")?.evidenceLevel).toBe(
      "browser_observed"
    );
    expect(record.layers.find((layer) => layer.type === "controller")?.execution).toBe("scanned");
    expect(record.layers.find((layer) => layer.type === "controller")?.evidenceLevel).toBe(
      "source_derived"
    );
    expect(record.layers.find((layer) => layer.type === "auth")?.execution).toBe("blocked");
    expect(record.layers.find((layer) => layer.type === "auth")?.evidenceLevel).toBe("inferred");
    expect(record.layers.find((layer) => layer.type === "service")?.execution).toBe("not_proven");
    expect(record.layers.find((layer) => layer.type === "repository")?.execution).toBe(
      "not_proven"
    );
    expect(record.layers.find((layer) => layer.type === "database")?.execution).toBe("not_proven");
    expect(record.layers.find((layer) => layer.type === "result")?.execution).toBe("blocked");
  });

  it("adds an auth layer for 403 responses", () => {
    const record = buildFlowRecordFromBrowserEvent(
      {
        id: "evt_403",
        type: "request",
        method: "POST",
        url: "/api/account/saved-benefit",
        status: 403,
        durationMs: 41,
        observedAt: "2026-06-24T00:00:01.250Z"
      },
      scanResult
    );

    expect(record.layers.map((layer) => layer.type)).toEqual([
      "api",
      "controller",
      "auth",
      "service",
      "repository",
      "database",
      "result"
    ]);
    expect(record.layers.find((layer) => layer.type === "auth")?.execution).toBe("blocked");
    expect(record.layers.find((layer) => layer.type === "auth")?.evidence).toContain(
      "inferred: 403 response suggests an auth or policy stop along the scanned path"
    );
  });

  it("adds a decision layer near service for 409 responses", () => {
    const record = buildFlowRecordFromBrowserEvent(
      {
        id: "evt_409",
        type: "request",
        method: "POST",
        url: "/api/account/saved-benefit",
        status: 409,
        durationMs: 38,
        observedAt: "2026-06-24T00:00:01.400Z"
      },
      scanResult
    );

    expect(record.layers.map((layer) => layer.type)).toEqual([
      "api",
      "controller",
      "service",
      "decision",
      "repository",
      "database",
      "result"
    ]);
    expect(record.layers.find((layer) => layer.type === "service")?.execution).toBe("scanned");
    expect(record.layers.find((layer) => layer.type === "decision")?.execution).toBe("blocked");
    expect(record.layers.find((layer) => layer.type === "decision")?.evidence).toContain(
      "inferred: 409 response suggests a business decision stop along the scanned path"
    );
    expect(record.layers.find((layer) => layer.type === "repository")?.execution).toBe(
      "not_proven"
    );
    expect(record.layers.find((layer) => layer.type === "database")?.execution).toBe("not_proven");
  });

  it("marks scanned downstream layers as scanned for 2xx responses", () => {
    const record = buildFlowRecordFromBrowserEvent(
      {
        id: "evt_2xx",
        type: "request",
        method: "POST",
        url: "/api/account/saved-benefit",
        status: 201,
        durationMs: 64,
        observedAt: "2026-06-24T00:00:01.500Z"
      },
      scanResult
    );

    expect(record.matchState).toBe("matched");
    expect(record.trigger).toBe("background");
    expect(record.layers.find((layer) => layer.type === "service")?.execution).toBe("scanned");
    expect(record.layers.find((layer) => layer.type === "repository")?.execution).toBe("scanned");
    expect(record.layers.find((layer) => layer.type === "database")?.execution).toBe("scanned");
    expect(record.layers.find((layer) => layer.type === "result")?.execution).toBe("executed");
  });

  it("keeps backend-observed repeated spans separately from source-derived layers", () => {
    const record = buildFlowRecordFromBrowserEvent(
      {
        id: "evt_backend_spans",
        type: "request",
        method: "POST",
        url: "/api/account/saved-benefit",
        status: 201,
        durationMs: 142,
        observedAt: "2026-06-24T00:00:01.750Z"
      },
      scanResult
    );

    const merged = mergeBackendSpansIntoFlowRecord(record, [
      {
        id: "span-controller",
        type: "controller",
        label: "SavedBenefitController.create",
        nodeId: "controller",
        startOffsetMs: 12,
        durationMs: 118
      },
      {
        id: "span-service-1",
        parentId: "span-controller",
        type: "service",
        label: "SavedBenefitService.save",
        nodeId: "service",
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
        nodeId: "repository",
        startOffsetMs: 98,
        durationMs: 18
      }
    ]);

    expect(merged.layers.find((layer) => layer.type === "service")?.evidenceLevel).toBe(
      "source_derived"
    );
    expect(merged.backendSpans?.map((span) => span.type)).toEqual([
      "controller",
      "service",
      "repository",
      "service",
      "repository"
    ]);
    expect(merged.evidence).toContain(
      "backend_observed: development runtime reported server-side method spans"
    );
  });

  it("matches dynamic scanned path params with brace syntax", () => {
    const record = buildFlowRecordFromBrowserEvent(
      {
        id: "evt_2",
        type: "request",
        method: "GET",
        url: "http://localhost:8080/api/public/benefits/123?expand=brand",
        status: 200,
        durationMs: 42,
        observedAt: "2026-06-24T00:00:02.000Z"
      },
      scanResult
    );

    expect(record.matchState).toBe("matched");
    expect(record.endpoint?.id).toBe(publicBenefitEndpoint.id);
  });

  it("matches dynamic scanned path params with colon syntax", () => {
    const record = buildFlowRecordFromBrowserEvent(
      {
        id: "evt_3",
        type: "request",
        method: "GET",
        url: "/api/public/perks/123",
        status: 200,
        durationMs: 42,
        observedAt: "2026-06-24T00:00:03.000Z"
      },
      scanResult
    );

    expect(record.matchState).toBe("matched");
    expect(record.endpoint?.id).toBe(colonParamEndpoint.id);
  });

  it("does not over-match unrelated endpoints", () => {
    const record = buildFlowRecordFromBrowserEvent(
      {
        id: "evt_4",
        type: "request",
        method: "GET",
        url: "/api/public/benefits/123/history",
        status: 404,
        durationMs: 18,
        observedAt: "2026-06-24T00:00:04.000Z"
      },
      scanResult
    );

    expect(record.matchState).toBe("unmatched");
    expect(record.endpoint).toBeUndefined();
    expect(record.layers.map((layer) => layer.type)).toEqual(["api", "result"]);
  });
});
