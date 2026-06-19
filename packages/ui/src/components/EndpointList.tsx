import type { Endpoint } from "@anlyx/core";

import { StatusBadge } from "./StatusBadge.js";

type EndpointListProps = {
  endpoints: Endpoint[];
  selectedEndpointId: string | undefined;
  onSelectEndpoint: (endpoint: Endpoint) => void;
};

export function EndpointList({
  endpoints,
  selectedEndpointId,
  onSelectEndpoint
}: EndpointListProps): JSX.Element {
  return (
    <section className="anlyx-sidebar-section" aria-labelledby="anlyx-endpoints-heading">
      <div className="anlyx-section-heading" id="anlyx-endpoints-heading">
        Endpoints
      </div>
      <ul className="anlyx-list" aria-label="Endpoint list">
        {endpoints.map((endpoint) => (
          <li className="anlyx-list-item" key={endpoint.id}>
            <button
              className="anlyx-endpoint-button"
              type="button"
              aria-label={`${endpoint.method} ${endpoint.path} ${formatEndpointHandler(endpoint)}`}
              aria-current={endpoint.id === selectedEndpointId ? "true" : undefined}
              onClick={() => onSelectEndpoint(endpoint)}
            >
              <span className="anlyx-list-item__line">
                <StatusBadge tone={endpoint.method}>{endpoint.method}</StatusBadge>
                <span className="anlyx-list-item__primary">{endpoint.path}</span>
              </span>
              <span className="anlyx-list-item__meta">{formatEndpointHandler(endpoint)}</span>
            </button>
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
