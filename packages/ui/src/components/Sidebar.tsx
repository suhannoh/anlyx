import type { Endpoint, PageStoryboard, ScanResult } from "@anlyx/core";
import { Box, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import { EndpointList } from "./EndpointList.js";
import { PageList } from "./PageList.js";

type SidebarProps = {
  data: ScanResult;
  activeView: "flowStory" | "structure" | "frontend" | "process";
  collapsed: boolean;
  selectedEndpointId: string | undefined;
  selectedPageId: string | undefined;
  onSelectView: (view: "flowStory" | "structure" | "frontend" | "process") => void;
  onToggleCollapsed: () => void;
  onSelectEndpoint: (endpoint: Endpoint) => void;
  onSelectPage: (page: PageStoryboard) => void;
};

export function Sidebar({
  data,
  activeView,
  collapsed,
  selectedEndpointId,
  selectedPageId,
  onSelectView,
  onToggleCollapsed,
  onSelectEndpoint,
  onSelectPage
}: SidebarProps): JSX.Element {
  if (collapsed) {
    return (
      <aside className="anlyx-sidebar anlyx-sidebar--collapsed" aria-label="Primary navigation">
        <button
          className="anlyx-panel-toggle"
          type="button"
          aria-label="Expand navigation panel"
          onClick={onToggleCollapsed}
        >
          <PanelLeftOpen size={15} strokeWidth={2.4} />
        </button>
        <span className="anlyx-collapsed-label">Nav</span>
      </aside>
    );
  }

  return (
    <aside className="anlyx-sidebar" aria-label="Primary navigation">
      <div className="anlyx-brand">
        <div className="anlyx-brand__mark" aria-hidden="true">
          A
        </div>
        <div>
          <div className="anlyx-brand__name">Anlyx</div>
          <div className="anlyx-brand__project">Interaction flow map</div>
        </div>
        <button
          className="anlyx-panel-toggle"
          type="button"
          aria-label="Collapse navigation panel"
          onClick={onToggleCollapsed}
        >
          <PanelLeftClose size={15} strokeWidth={2.4} />
        </button>
      </div>

      <button
        className="anlyx-project-select"
        type="button"
        aria-label={`Project ${data.projectName}`}
      >
        <Box size={15} strokeWidth={2.4} />
        <span>{data.projectName}</span>
      </button>

      <nav className="anlyx-tabs" aria-label="Views">
        <button
          className={activeView === "flowStory" ? "anlyx-tab anlyx-tab--active" : "anlyx-tab"}
          type="button"
          onClick={() => onSelectView("flowStory")}
        >
          Flow Story
        </button>
        <button
          className={activeView === "structure" ? "anlyx-tab anlyx-tab--active" : "anlyx-tab"}
          type="button"
          onClick={() => onSelectView("structure")}
        >
          Structure
        </button>
        <button
          className={activeView === "frontend" ? "anlyx-tab anlyx-tab--active" : "anlyx-tab"}
          type="button"
          onClick={() => onSelectView("frontend")}
        >
          Captures
        </button>
        <button
          className={activeView === "process" ? "anlyx-tab anlyx-tab--active" : "anlyx-tab"}
          type="button"
          onClick={() => onSelectView("process")}
        >
          Process
        </button>
      </nav>

      <label className="anlyx-search">
        <span className="anlyx-search__label">Search</span>
        <span className="anlyx-search__control">
          <Search size={14} strokeWidth={2.4} />
          <input placeholder="Search pages, endpoints, or services" type="search" />
        </span>
      </label>

      <div className="anlyx-sidebar__list-region">
        <PageList pages={data.pages} selectedPageId={selectedPageId} onSelectPage={onSelectPage} />
        <EndpointList
          endpoints={data.endpoints}
          selectedEndpointId={selectedEndpointId}
          onSelectEndpoint={onSelectEndpoint}
        />
        <BackendServiceList data={data} />
      </div>
    </aside>
  );
}

function BackendServiceList({ data }: { data: ScanResult }): JSX.Element {
  const services = [
    ...new Map(
      data.flows
        .flatMap((flow) => [...flow.nodes, ...flow.subFlows.flatMap((subFlow) => subFlow.nodes)])
        .filter((node) =>
          ["service", "repository", "mapper", "validator", "utility"].includes(node.type)
        )
        .map((node) => [node.id, node])
    ).values()
  ];

  if (services.length === 0) {
    return <></>;
  }

  return (
    <section className="anlyx-sidebar-section" aria-labelledby="anlyx-services-heading">
      <div className="anlyx-section-heading" id="anlyx-services-heading">
        Backend Services
      </div>
      <ul className="anlyx-list anlyx-list--compact" aria-label="Backend service list">
        {services.map((node) => (
          <li className="anlyx-service-row" key={node.id}>
            <Box size={14} strokeWidth={2.3} />
            <span>{node.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
