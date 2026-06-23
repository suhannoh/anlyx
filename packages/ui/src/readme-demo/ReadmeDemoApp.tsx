import "@xyflow/react/dist/style.css";
import "../overlay/overlay.css";
import "./readme-demo.css";

import { useEffect, useMemo, useState } from "react";

import type { Endpoint, EndpointFlow, FlowNode, HttpMethod } from "@anlyx/core";

import { FlowDrawer } from "../overlay/FlowDrawer.js";
import type { OverlayApiEvent } from "../overlay/types.js";

type DemoKey = "search" | "detail" | "save" | "admin";
export type FixtureDetailFlow = {
  endpoint: Endpoint;
  flow: EndpointFlow;
};
export type ReadmeDemoAppProps = {
  eyebrow?: string;
  fixtureDetail?: FixtureDetailFlow | null;
  iconSrc?: string;
  logoSrc?: string;
};

const demoOrder: DemoKey[] = ["detail", "search", "save", "admin"];
const fixtureEndpointsUrl = "/fixtures/spring-next-sample/expected/endpoints.json";
const fixtureFlowsUrl = "/fixtures/spring-next-sample/expected/flows.json";
const defaultLogoSrc = "/docs/assets/brand/anlyx-logo-transparent.png";
const defaultIconSrc = "/docs/assets/brand/anlyx-icon-transparent.png";

const flows: Record<DemoKey, EndpointFlow> = {
  search: makeFlow("GET", "/api/public/search", [
    ["endpoint:search", "endpoint", "GET /api/public/search"],
    ["controller:search", "controller", "PublicViewController#search"],
    ["service:search", "service", "SearchIndexService#find"],
    ["repository:search", "repository", "BenefitSearchRepository#query"],
    ["database:search", "database", "benefits_search_index"]
  ]),
  detail: makeFlow("GET", "/api/public/benefits/{id}", [
    ["endpoint:detail", "endpoint", "GET /api/public/benefits/{id}"],
    ["controller:detail", "controller", "PublicBenefitController#getDetail"],
    ["service:detail", "service", "PublicBenefitService#getDetail"],
    ["repository:detail", "repository", "BenefitRepository#findById"],
    ["database:detail", "database", "benefits"]
  ]),
  save: makeFlow("POST", "/api/account/saved-benefits", [
    ["endpoint:save", "endpoint", "POST /api/account/saved-benefits"],
    ["controller:save", "controller", "SavedBenefitController#create"],
    ["service:save", "service", "SavedBenefitService#save"],
    ["repository:save", "repository", "SavedBenefitRepository#insert"],
    ["database:save", "database", "saved_benefit"]
  ]),
  admin: makeFlow("POST", "/api/admin/benefits", [
    ["endpoint:admin", "endpoint", "POST /api/admin/benefits"],
    ["controller:admin", "controller", "AdminBenefitController#create"],
    ["policy:admin", "validator", "AdminRolePolicy#check"],
    ["service:admin", "service", "AdminBenefitService#create"],
    ["repository:admin", "repository", "BenefitRepository#save"]
  ])
};

const endpoints: Record<DemoKey, Endpoint> = {
  search: endpoint("GET", "/api/public/search", "PublicViewController#search"),
  detail: endpoint("GET", "/api/public/benefits/{id}", "PublicBenefitController#getDetail"),
  save: endpoint("POST", "/api/account/saved-benefits", "SavedBenefitController#create"),
  admin: endpoint("POST", "/api/admin/benefits", "AdminBenefitController#create")
};

const baseEvents: Record<DemoKey, OverlayApiEvent> = {
  search: event("search", "GET", "/api/public/search", 200, 28, "Clicked Search benefits"),
  detail: event("detail", "GET", "/api/public/benefits/123", 200, 34, "Opened benefit detail"),
  save: event("save", "POST", "/api/account/saved-benefits", 401, 31, "Clicked Save to my box"),
  admin: event("admin", "POST", "/api/admin/benefits", 403, 42, "Clicked Try admin action")
};

export function ReadmeDemoApp({
  eyebrow = "Real UI preview",
  fixtureDetail: fixtureDetailProp,
  iconSrc = defaultIconSrc,
  logoSrc = defaultLogoSrc
}: ReadmeDemoAppProps = {}): JSX.Element {
  const [selectedKey, setSelectedKey] = useState<DemoKey>("detail");
  const fetchedFixtureDetail = useFixtureDetailFlow(fixtureDetailProp !== undefined);
  const fixtureDetail = fixtureDetailProp ?? fetchedFixtureDetail;
  const hydratedEvents = useMemo(
    () =>
      Object.fromEntries(
        demoOrder.map((key) => [key, hydrateEvent(key, key === "detail" ? fixtureDetail : null)])
      ) as Record<DemoKey, OverlayApiEvent>,
    [fixtureDetail]
  );
  const selectedEvent = hydratedEvents[selectedKey];
  const eventList = useMemo(
    () => [
      selectedEvent,
      {
        id: "background-account",
        method: "GET",
        path: "/api/account/me",
        status: 401,
        durationMs: 19,
        count: 3,
        source: "background",
        matchedEndpoint: endpoint("GET", "/api/account/me", "AccountController#me"),
        matchedFlow: null
      } satisfies OverlayApiEvent,
      ...demoOrder.filter((key) => key !== selectedKey).map((key) => hydratedEvents[key])
    ],
    [hydratedEvents, selectedEvent, selectedKey]
  );

  return (
    <main className="anlyx-readme-demo">
      <section className="anlyx-readme-demo__control">
        <div className="anlyx-readme-demo__intro">
          <img src={logoSrc} alt="Anlyx" />
          <div>
            <p className="anlyx-readme-demo__eyebrow">{eyebrow}</p>
            <h1>Click an action. See the backend path.</h1>
            <p>Rendered by the same Flow Drawer component used by the Anlyx overlay.</p>
          </div>
        </div>
        <div className="anlyx-readme-demo__actions" aria-label="Demo actions">
          <div className="anlyx-readme-demo__actions-head">
            <span>Demo buttons</span>
            <small>Pick one request</small>
          </div>
          <DemoButton
            active={selectedKey === "search"}
            index="01"
            method="GET"
            label="Search benefits"
            meta="GET /api/public/search"
            onClick={() => setSelectedKey("search")}
            demoKey="search"
          />
          <DemoButton
            active={selectedKey === "detail"}
            index="02"
            method="GET"
            label="Open benefit detail"
            meta="GET /api/public/benefits/{id}"
            onClick={() => setSelectedKey("detail")}
            demoKey="detail"
          />
          <DemoButton
            active={selectedKey === "save"}
            index="03"
            method="POST"
            label="Save to my box"
            meta="POST /api/account/saved-benefits"
            onClick={() => setSelectedKey("save")}
            demoKey="save"
          />
          <DemoButton
            active={selectedKey === "admin"}
            index="04"
            method="POST"
            label="Try admin action"
            meta="POST /api/admin/benefits"
            onClick={() => setSelectedKey("admin")}
            demoKey="admin"
          />
        </div>
      </section>

      <section className="anlyx-readme-demo__drawer-shell" aria-label="Anlyx Flow Drawer">
        <header className="anlyx-readme-demo__drawer-head">
          <div className="anlyx-readme-demo__drawer-brand">
            <img src={iconSrc} alt="" />
            <div>
              <strong>Anlyx Flow Drawer</strong>
              <span>Actual component preview</span>
            </div>
          </div>
          <div className="anlyx-readme-demo__drawer-tools">
            <span>Live</span>
            <span>fixture-backed</span>
          </div>
        </header>
        <FlowDrawer
          events={eventList}
          latestAction={selectedEvent.triggeredBy ?? null}
          scannedHints={[]}
          selectedEvent={selectedEvent}
        />
      </section>
    </main>
  );
}

function useFixtureDetailFlow(skip: boolean): FixtureDetailFlow | null {
  const [fixtureDetail, setFixtureDetail] = useState<FixtureDetailFlow | null>(null);

  useEffect(() => {
    if (skip) {
      return undefined;
    }

    const controller = new AbortController();

    const loadFixture = async () => {
      try {
        const [endpointResponse, flowResponse] = await Promise.all([
          fetch(fixtureEndpointsUrl, { signal: controller.signal }),
          fetch(fixtureFlowsUrl, { signal: controller.signal })
        ]);
        if (!endpointResponse.ok || !flowResponse.ok) {
          throw new Error("README fixture request failed");
        }

        const fixtureEndpoints = (await endpointResponse.json()) as Endpoint[];
        const fixtureFlows = (await flowResponse.json()) as EndpointFlow[];
        const flow = fixtureFlows.find(
          (candidate) => candidate.endpointId === "endpoint:get:/api/public/benefits/{id}"
        );
        const endpoint = fixtureEndpoints.find(
          (candidate) => candidate.id === "endpoint:get:/api/public/benefits/{id}"
        );

        if (flow && endpoint) {
          setFixtureDetail({ endpoint, flow: toBackendOnlyFlow(flow) });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("[anlyx] Falling back to embedded README demo data.", error);
        }
      }
    };

    void loadFixture();

    return () => controller.abort();
  }, [skip]);

  return fixtureDetail;
}

function toBackendOnlyFlow(flow: EndpointFlow): EndpointFlow {
  const backendNodeIds = new Set(
    flow.nodes.filter((node) => node.type !== "page").map((node) => node.id)
  );

  return {
    ...flow,
    nodes: flow.nodes.filter((node) => backendNodeIds.has(node.id)),
    edges: flow.edges.filter(
      (edge) => backendNodeIds.has(edge.from) && backendNodeIds.has(edge.to)
    ),
    mainPath: flow.mainPath.filter((nodeId) => backendNodeIds.has(nodeId)),
    subFlows: flow.subFlows.map((subFlow) => ({
      ...subFlow,
      nodes: subFlow.nodes.filter((node) => node.type !== "page"),
      edges: subFlow.edges.filter(
        (edge) => !edge.from.startsWith("page:") && !edge.to.startsWith("page:")
      )
    }))
  };
}

function hydrateEvent(key: DemoKey, fixtureDetail: FixtureDetailFlow | null): OverlayApiEvent {
  return {
    ...baseEvents[key],
    matchedEndpoint: fixtureDetail?.endpoint ?? endpoints[key],
    matchedFlow: fixtureDetail?.flow ?? flows[key]
  };
}

function DemoButton({
  active,
  index,
  method,
  label,
  meta,
  onClick,
  demoKey
}: {
  active: boolean;
  index: string;
  method: HttpMethod;
  label: string;
  meta: string;
  onClick: () => void;
  demoKey: DemoKey;
}): JSX.Element {
  return (
    <button
      aria-pressed={active}
      className="anlyx-readme-demo__action"
      data-demo={demoKey}
      type="button"
      onClick={onClick}
    >
      <span className="anlyx-readme-demo__action-index">{index}</span>
      <span className="anlyx-readme-demo__action-copy">
        <strong>{label}</strong>
        <span>{meta}</span>
      </span>
      <span className="anlyx-readme-demo__method">{method}</span>
    </button>
  );
}

function makeFlow(
  method: HttpMethod,
  path: string,
  nodes: Array<[string, FlowNode["type"], string]>
): EndpointFlow {
  const mainPath = nodes.map(([id]) => id);

  return {
    endpointId: `${method}:${path}`,
    nodes: nodes.map(([id, type, label]) => ({
      id,
      type,
      label,
      confidence: "high"
    })),
    edges: mainPath.slice(1).map((to, index) => ({
      id: `edge:${mainPath[index]}:${to}`,
      from: mainPath[index] ?? "",
      to,
      kind: "main",
      confidence: "high"
    })),
    mainPath,
    subFlows: []
  };
}

function endpoint(method: HttpMethod, path: string, handler: string): Endpoint {
  return {
    id: `${method}:${path}`,
    method,
    path,
    supportLevel: "deep",
    handler,
    confidence: "high"
  };
}

function event(
  id: DemoKey,
  method: HttpMethod,
  path: string,
  status: number,
  durationMs: number,
  label: string
): OverlayApiEvent {
  return {
    id,
    method,
    path,
    status,
    durationMs,
    count: id === "save" ? 2 : 1,
    source: "action",
    triggeredBy: {
      type: "Clicked",
      label,
      selector: `button[data-demo="${id}"]`
    },
    matchedEndpoint: null,
    matchedFlow: null
  };
}
