import type { Endpoint } from "@anlyx/core";

import { StatusBadge } from "./StatusBadge.js";

type EndpointListProps = {
  endpoints: Endpoint[];
};

export function EndpointList({ endpoints }: EndpointListProps): JSX.Element {
  return (
    <section className="anlyx-sidebar-section" aria-labelledby="anlyx-endpoints-heading">
      <div className="anlyx-section-heading" id="anlyx-endpoints-heading">
        Endpoints
      </div>
      <ul className="anlyx-list" aria-label="Endpoint list">
        {endpoints.map((endpoint) => (
          <li className="anlyx-list-item" key={endpoint.id}>
            <div className="anlyx-list-item__line">
              <StatusBadge tone={endpoint.method}>{endpoint.method}</StatusBadge>
              <span className="anlyx-list-item__primary">{endpoint.path}</span>
            </div>
            <div className="anlyx-list-item__meta">
              {formatEndpointHandler(endpoint)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatEndpointHandler(endpoint: Endpoint): string {
  if (endpoint.controller && endpoint.handler) {
    return `${endpoint.controller}#${endpoint.handler}`;
  }

  return endpoint.handler ?? endpoint.controller ?? endpoint.id;
}
