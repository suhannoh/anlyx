import type { Endpoint, ScanResult } from "@anlyx/core";

import { EndpointList } from "./EndpointList.js";
import { PageList } from "./PageList.js";

type SidebarProps = {
  data: ScanResult;
  selectedEndpointId: string | undefined;
  onSelectEndpoint: (endpoint: Endpoint) => void;
};

export function Sidebar({ data, selectedEndpointId, onSelectEndpoint }: SidebarProps): JSX.Element {
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
        <button className="anlyx-tab anlyx-tab--active" type="button">
          Endpoint
        </button>
        <button className="anlyx-tab" type="button">
          Pages
        </button>
        <button className="anlyx-tab" type="button">
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
      <PageList pages={data.pages} />
    </aside>
  );
}
