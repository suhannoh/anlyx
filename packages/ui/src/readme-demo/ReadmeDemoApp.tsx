import "@xyflow/react/dist/style.css";
import "../overlay/overlay.css";
import "./readme-demo.css";

import { useMemo, useState } from "react";

import type { Endpoint, EndpointFlow, FlowNode, HttpMethod } from "@anlyx/core";

import { FlowDrawer } from "../overlay/FlowDrawer.js";
import type { OverlayApiEvent } from "../overlay/types.js";

type DemoKey = "search" | "detail" | "save" | "admin";

const demoOrder: DemoKey[] = ["search", "detail", "save", "admin"];

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

const events: Record<DemoKey, OverlayApiEvent> = {
  search: event("search", "GET", "/api/public/search", 200, 28, "Clicked Search benefits"),
  detail: event("detail", "GET", "/api/public/benefits/123", 200, 34, "Opened benefit detail"),
  save: event("save", "POST", "/api/account/saved-benefits", 401, 31, "Clicked Save to my box"),
  admin: event("admin", "POST", "/api/admin/benefits", 403, 42, "Clicked Try admin action")
};

Object.entries(events).forEach(([key, value]) => {
  const demoKey = key as DemoKey;
  value.matchedEndpoint = endpoints[demoKey];
  value.matchedFlow = flows[demoKey];
});

export function ReadmeDemoApp(): JSX.Element {
  const [selectedKey, setSelectedKey] = useState<DemoKey>("save");
  const selectedEvent = events[selectedKey];
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
      ...demoOrder.filter((key) => key !== selectedKey).map((key) => events[key])
    ],
    [selectedEvent, selectedKey]
  );

  return (
    <main className="anlyx-readme-demo">
      <section className="anlyx-readme-demo__control">
        <div className="anlyx-readme-demo__logo-card">
          <img src="/docs/assets/brand/anlyx-logo-card.png" alt="Anlyx" />
        </div>
        <div>
          <p className="anlyx-readme-demo__eyebrow">Real Anlyx UI demo</p>
          <h1>Click an action. Watch the drawer remap the backend flow.</h1>
          <p>
            This README animation renders the actual Anlyx Flow Drawer component from
            <code>@anlyx/ui</code>.
          </p>
        </div>
        <div className="anlyx-readme-demo__actions" aria-label="Demo actions">
          <DemoButton
            active={selectedKey === "search"}
            label="Search benefits"
            meta="GET /api/public/search"
            onClick={() => setSelectedKey("search")}
            demoKey="search"
          />
          <DemoButton
            active={selectedKey === "detail"}
            label="Open benefit detail"
            meta="GET /api/public/benefits/{id}"
            onClick={() => setSelectedKey("detail")}
            demoKey="detail"
          />
          <DemoButton
            active={selectedKey === "save"}
            label="Save to my box"
            meta="POST /api/account/saved-benefits"
            onClick={() => setSelectedKey("save")}
            demoKey="save"
          />
          <DemoButton
            active={selectedKey === "admin"}
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
            <img src="/docs/assets/brand/anlyx-icon-card.png" alt="" />
            <div>
              <strong>Anlyx Flow Drawer</strong>
              <span>Actual component preview</span>
            </div>
          </div>
          <div className="anlyx-readme-demo__drawer-tools">
            <span>Live</span>
            <span>matched</span>
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

function DemoButton({
  active,
  label,
  meta,
  onClick,
  demoKey
}: {
  active: boolean;
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
      <strong>{label}</strong>
      <span>{meta}</span>
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
