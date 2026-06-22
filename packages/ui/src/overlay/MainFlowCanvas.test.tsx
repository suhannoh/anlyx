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
    expect(within(canvas).getAllByText("ZupAccountController#me")).toHaveLength(2);
    expect(within(canvas).getByText("Auth / Session")).toBeTruthy();
    expect(within(canvas).getByText("SessionAuthFilter")).toBeTruthy();
    expect(within(canvas).getByText("Result")).toBeTruthy();
    expect(within(canvas).getByText("401 Auth required")).toBeTruthy();
    expect(canvas.querySelector(".react-flow")).toBeTruthy();
    expect(canvas.querySelectorAll(".react-flow__node")).toHaveLength(4);
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
      "Result"
    ]);
    expect(model.edges).toHaveLength(3);
    expect(model.edges.map((edge) => edge.data?.tone)).toEqual(["blue", "violet", "amber"]);
    expect(model.edges.every((edge) => edge.type === "anlyxFlowEdge")).toBe(true);
  });
});
