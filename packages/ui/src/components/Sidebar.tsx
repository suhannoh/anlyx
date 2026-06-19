import type { Endpoint, PageStoryboard, ScanResult } from "@anlyx/core";

import { EndpointList } from "./EndpointList.js";
import { PageList } from "./PageList.js";

type SidebarProps = {
  data: ScanResult;
  activeView: "endpoint" | "pages" | "replay";
  selectedEndpointId: string | undefined;
  selectedPageId: string | undefined;
  onSelectView: (view: "endpoint" | "pages" | "replay") => void;
  onSelectEndpoint: (endpoint: Endpoint) => void;
  onSelectPage: (page: PageStoryboard) => void;
};

export function Sidebar({
  data,
  activeView,
  selectedEndpointId,
  selectedPageId,
  onSelectView,
  onSelectEndpoint,
  onSelectPage
}: SidebarProps): JSX.Element {
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
      </div>

      <nav className="anlyx-tabs" aria-label="Views">
        <button
          className={activeView === "endpoint" ? "anlyx-tab anlyx-tab--active" : "anlyx-tab"}
          type="button"
          onClick={() => onSelectView("endpoint")}
        >
          Endpoint
        </button>
        <button
          className={activeView === "pages" ? "anlyx-tab anlyx-tab--active" : "anlyx-tab"}
          type="button"
          onClick={() => onSelectView("pages")}
        >
          Pages
        </button>
        <button
          className={activeView === "replay" ? "anlyx-tab anlyx-tab--active" : "anlyx-tab"}
          type="button"
          onClick={() => onSelectView("replay")}
        >
          Replay
        </button>
      </nav>

      <label className="anlyx-search">
        <span className="anlyx-search__label">Search</span>
        <input placeholder="Search endpoints or pages" type="search" />
      </label>

      <EndpointList
        endpoints={data.endpoints}
        selectedEndpointId={selectedEndpointId}
        onSelectEndpoint={onSelectEndpoint}
      />
      <PageList pages={data.pages} selectedPageId={selectedPageId} onSelectPage={onSelectPage} />
    </aside>
  );
}
