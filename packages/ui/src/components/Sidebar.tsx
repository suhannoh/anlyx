import type { Endpoint, PageStoryboard, ScanResult } from "@anlyx/core";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

import { EndpointList } from "./EndpointList.js";
import { PageList } from "./PageList.js";

type SidebarProps = {
  data: ScanResult;
  activeView: "structure" | "frontend" | "process";
  collapsed: boolean;
  selectedEndpointId: string | undefined;
  selectedPageId: string | undefined;
  onSelectView: (view: "structure" | "frontend" | "process") => void;
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
          <div className="anlyx-brand__project">{data.projectName}</div>
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

      <nav className="anlyx-tabs" aria-label="Views">
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
          Connected Frontend
        </button>
        <button
          className={activeView === "process" ? "anlyx-tab anlyx-tab--active" : "anlyx-tab"}
          type="button"
          onClick={() => onSelectView("process")}
        >
          Process Flow
        </button>
      </nav>

      <label className="anlyx-search">
        <span className="anlyx-search__label">Search</span>
        <span className="anlyx-search__control">
          <Search size={14} strokeWidth={2.4} />
          <input placeholder="Search endpoints or pages" type="search" />
        </span>
      </label>

      <div className="anlyx-sidebar__list-region">
        {activeView === "frontend" ? (
          <PageList
            pages={data.pages}
            selectedPageId={selectedPageId}
            onSelectPage={onSelectPage}
          />
        ) : (
          <EndpointList
            endpoints={data.endpoints}
            selectedEndpointId={selectedEndpointId}
            onSelectEndpoint={onSelectEndpoint}
          />
        )}
      </div>
    </aside>
  );
}
