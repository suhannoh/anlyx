// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { EndpointFlow } from "@anlyx/core";

import { buildDrawerFlowModel, MainFlowCanvas } from "./MainFlowCanvas.js";

afterEach(() => {
  cleanup();
});

const accountFlow: EndpointFlow = {
  endpointId: "endpoint:get:/api/account/me",
  nodes: [
    {
      id: "endpoint:get:/api/account/me",
      type: "endpoint",
      label: "GET /api/account/me",
      confidence: "high"
    },
    {
      id: "controller:com.zup.account.ZupAccountController#me",
      type: "controller",
      label: "com.zup.account.ZupAccountController#me",
      confidence: "high"
    },
    {
      id: "service:com.zup.account.AccountService#getMe",
      type: "service",
      label: "com.zup.account.AccountService#getMe",
      confidence: "high"
    }
  ],
  edges: [
    {
      id: "edge:endpoint-to-controller",
      from: "endpoint:get:/api/account/me",
      to: "controller:com.zup.account.ZupAccountController#me",
      kind: "main",
      confidence: "high"
    }
  ],
  mainPath: [
    "endpoint:get:/api/account/me",
    "controller:com.zup.account.ZupAccountController#me",
    "service:com.zup.account.AccountService#getMe"
  ],
  subFlows: []
};

const savedBenefitsFlow: EndpointFlow = {
  endpointId: "GET:/api/account/saved-benefits",
  nodes: [
    {
      id: "endpoint:GET:/api/account/saved-benefits",
      type: "endpoint",
      label: "GET /api/account/saved-benefits",
      confidence: "high"
    },
    {
      id: "controller:AccountController",
      type: "controller",
      label: "AccountController#savedBenefits",
      confidence: "high"
    },
    {
      id: "service:SavedBenefitService",
      type: "service",
      label: "SavedBenefitService#list",
      confidence: "high"
    },
    {
      id: "repository:SavedBenefitRepository",
      type: "repository",
      label: "SavedBenefitRepository#findAllByUserAccountOrderBySavedAtDesc",
      confidence: "high"
    },
    {
      id: "database:saved_benefit",
      type: "database",
      label: "saved_benefit",
      confidence: "high"
    }
  ],
  edges: [],
  mainPath: [
    "endpoint:GET:/api/account/saved-benefits",
    "controller:AccountController",
    "service:SavedBenefitService",
    "repository:SavedBenefitRepository",
    "database:saved_benefit"
  ],
  subFlows: []
};

describe("MainFlowCanvas", () => {
  it("renders the matched backend path with a real React Flow canvas", () => {
    render(
      <MainFlowCanvas
        endpointConfidence="high"
        flow={accountFlow}
        method="GET"
        path="/api/account/me"
        status={401}
      />
    );

    const canvas = screen.getByTestId("anlyx-react-flow-main");

    expect(within(canvas).getByText("API")).toBeTruthy();
    expect(within(canvas).getByText("GET /api/account/me")).toBeTruthy();
    expect(within(canvas).getByText("Controller")).toBeTruthy();
    expect(within(canvas).getByText("ZupAccountController#me")).toBeTruthy();
    expect(within(canvas).getByText("ZupAccountController")).toBeTruthy();
    expect(within(canvas).getByText("Auth / Session")).toBeTruthy();
    expect(within(canvas).getByText("SessionAuthFilter")).toBeTruthy();
    expect(within(canvas).getByText("Service")).toBeTruthy();
    expect(within(canvas).getByText("AccountService#getMe")).toBeTruthy();
    expect(within(canvas).getByText("Result")).toBeTruthy();
    expect(within(canvas).getByText("401 Auth required")).toBeTruthy();
    expect(canvas.querySelector(".react-flow")).toBeTruthy();
    expect(canvas.querySelectorAll(".react-flow__node")).toHaveLength(5);
  });

  it("builds node and edge data for the active request path", () => {
    const model = buildDrawerFlowModel({
      flow: accountFlow,
      method: "GET",
      path: "/api/account/me",
      status: 401
    });

    expect(model.nodes.map((node) => node.data.label)).toEqual([
      "API",
      "Controller",
      "Auth / Session",
      "Result",
      "Service"
    ]);
    expect(model.nodes.map((node) => node.data.state)).toEqual([
      "taken",
      "taken",
      "taken",
      "blocked",
      "scanned"
    ]);
    expect(model.nodes.map((node) => node.data.step)).toEqual(["01", "02", "03", "04", undefined]);
    expect(model.edges).toHaveLength(4);
    expect(model.edges.map((edge) => edge.data?.tone)).toEqual(["blue", "violet", "amber", "gray"]);
    expect(model.edges.every((edge) => edge.type === "anlyxFlowEdge")).toBe(true);
    expect(model.edges.map((edge) => edge.animated)).toEqual([true, true, true, false]);
    expect(model.nodes.find((node) => node.data.label === "Service")?.position.y).toBeGreaterThan(
      model.nodes.find((node) => node.data.label === "Result")?.position.y ?? 0
    );
  });

  it("renders the full scanned backend path for successful requests", () => {
    const model = buildDrawerFlowModel({
      flow: savedBenefitsFlow,
      method: "GET",
      path: "/api/account/saved-benefits",
      status: 200
    });

    expect(model.nodes.map((node) => node.data.label)).toEqual([
      "API",
      "Controller",
      "Service",
      "Repository",
      "Database",
      "Result"
    ]);
    expect(model.nodes.map((node) => node.data.value)).toEqual([
      "GET /api/account/saved-benefits",
      "AccountController#savedBenefits",
      "SavedBenefitService#list",
      "SavedBenefitRepository#findAllByUserAccountOrderBySavedAtDesc",
      "saved_benefit",
      "200 OK"
    ]);
    expect(model.edges).toHaveLength(5);
  });

  it("keeps the scanned downstream path visible when auth blocks the live request", () => {
    const model = buildDrawerFlowModel({
      flow: savedBenefitsFlow,
      method: "GET",
      path: "/api/account/saved-benefits",
      status: 401
    });

    expect(model.nodes.map((node) => node.data.label)).toEqual([
      "API",
      "Controller",
      "Auth / Session",
      "Result",
      "Service",
      "Repository",
      "Database"
    ]);
    expect(model.nodes.map((node) => node.data.value)).toContain("SavedBenefitService#list");
    expect(model.nodes.map((node) => node.data.value)).toContain(
      "SavedBenefitRepository#findAllByUserAccountOrderBySavedAtDesc"
    );
    expect(model.nodes.map((node) => node.data.value)).toContain("saved_benefit");
    expect(
      model.nodes
        .filter((node) => ["Service", "Repository", "Database"].includes(node.data.label))
        .map((node) => node.data.state)
    ).toEqual(["scanned", "scanned", "scanned"]);
    expect(
      model.nodes
        .filter((node) => ["Service", "Repository", "Database"].includes(node.data.label))
        .map((node) => node.data.badge)
    ).toEqual(["scanned", "scanned", "scanned"]);
    expect(model.edges).toHaveLength(6);
    expect(model.edges.map((edge) => edge.data?.tone)).toEqual([
      "blue",
      "violet",
      "amber",
      "gray",
      "gray",
      "gray"
    ]);
  });
});
