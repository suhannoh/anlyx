import type { ApiCall } from "@anlyx/core";

import { StatusBadge } from "./StatusBadge.js";

export type ApiCallListProps = {
  apiCalls: ApiCall[];
};

export function ApiCallList({ apiCalls }: ApiCallListProps): JSX.Element {
  return (
    <section className="anlyx-storyboard-panel" aria-label="API Calls">
      <div className="anlyx-storyboard-section-heading">
        <h2>API Calls</h2>
        <span>{apiCalls.length}</span>
      </div>

      {apiCalls.length > 0 ? (
        <ul className="anlyx-api-call-list">
          {apiCalls.map((apiCall, index) => (
            <li className="anlyx-api-call" key={`${apiCall.method}:${apiCall.path}:${index}`}>
              <div className="anlyx-api-call__line">
                <StatusBadge tone={apiCall.method}>{apiCall.method}</StatusBadge>
                <span className="anlyx-api-call__path">{apiCall.path}</span>
              </div>
              <div className="anlyx-api-call__meta">
                <StatusBadge tone={statusTone(apiCall.status)}>
                  {apiCall.status === undefined ? "unknown" : String(apiCall.status)}
                </StatusBadge>
                <StatusBadge tone={apiCall.endpointId ? "success" : "unknown"}>
                  {apiCall.endpointId ? "Linked endpoint" : "Unmatched"}
                </StatusBadge>
              </div>
              {apiCall.endpointId ? (
                <div className="anlyx-api-call__endpoint">{apiCall.endpointId}</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="anlyx-empty-inline">No API calls captured yet.</p>
      )}
    </section>
  );
}

function statusTone(status: number | undefined): "success" | "pending" | "failed" | "unknown" {
  if (status === undefined) {
    return "unknown";
  }

  if ([200, 201, 204].includes(status)) {
    return "success";
  }

  if (status >= 400) {
    return "failed";
  }

  return "pending";
}
