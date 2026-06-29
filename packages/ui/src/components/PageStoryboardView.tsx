import type { PageStoryboard, ScanResult } from "@anlyx/core";

import { ApiCallList } from "./ApiCallList.js";
import { CaptureStatusEmptyState } from "./CaptureStatusEmptyState.js";
import { PageStoryboardCard } from "./PageStoryboardCard.js";
import { StatusBadge } from "./StatusBadge.js";

export type PageStoryboardViewProps = {
  data: ScanResult;
  page: PageStoryboard | undefined;
  onViewProcessFlow: (view: "process") => void;
};

export function PageStoryboardView({
  data,
  page,
  onViewProcessFlow
}: PageStoryboardViewProps): JSX.Element {
  const linkedEndpoints = page
    ? data.endpoints.filter((endpoint) =>
        page.apiCalls.some((apiCall) => apiCall.endpointId === endpoint.id)
      )
    : [];
  const linkedApiCallCount = page?.apiCalls.filter((apiCall) => apiCall.endpointId).length ?? 0;
  const unmatchedApiCallCount = page ? page.apiCalls.length - linkedApiCallCount : 0;

  return (
    <main className="anlyx-workspace">
      <header className="anlyx-workspace-header">
        <div>
          <p className="anlyx-eyebrow">Connected Frontend</p>
          <h1>{page ? page.route : "Page Storyboard"}</h1>
        </div>
        <div className="anlyx-workspace-actions">
          <button
            className="anlyx-toolbar-button"
            type="button"
            disabled={linkedEndpoints.length === 0}
            onClick={() => onViewProcessFlow("process")}
          >
            View Process Flow
          </button>
          {page ? <StatusBadge tone={page.captureStatus}>{page.captureStatus}</StatusBadge> : null}
        </div>
      </header>

      <section className="anlyx-page-storyboard" role="region" aria-label="Page Storyboard">
        {page ? (
          <>
            <section className="anlyx-page-summary" aria-label="Selected page summary">
              <div>
                <span className="anlyx-field__label">Route</span>
                <h2>{page.route}</h2>
              </div>
              <div>
                <span className="anlyx-field__label">File</span>
                <p>{page.filePath ?? "Unknown"}</p>
              </div>
              <div>
                <span className="anlyx-field__label">Status</span>
                <StatusBadge tone={page.captureStatus}>{page.captureStatus}</StatusBadge>
              </div>
              <div>
                <span className="anlyx-field__label">Linked endpoints</span>
                <p>{linkedEndpoints.length}</p>
              </div>
            </section>

            <CaptureStatusEmptyState
              status={page.captureStatus}
              {...(page.errorMessage ? { reason: page.errorMessage } : {})}
            />

            <PageEvidenceBoard
              linkedApiCallCount={linkedApiCallCount}
              linkedEndpointCount={linkedEndpoints.length}
              page={page}
              unmatchedApiCallCount={unmatchedApiCallCount}
            />

            <div className="anlyx-storyboard-grid">
              <PageStoryboardCard page={page} />
              <div className="anlyx-storyboard-side">
                <ApiCallList apiCalls={page.apiCalls} endpoints={data.endpoints} />
                <section
                  className="anlyx-storyboard-panel"
                  aria-label="Page to endpoint relationship"
                >
                  <div className="anlyx-storyboard-section-heading">
                    <h2>Page to Endpoint</h2>
                    <span>{linkedEndpoints.length}</span>
                  </div>
                  {linkedEndpoints.length > 0 ? (
                    <div className="anlyx-relationship-diagram">
                      <div className="anlyx-relationship-source">
                        <strong>{page.route}</strong>
                        <span>Frontend Page</span>
                      </div>
                      <ul className="anlyx-relationship-list">
                        {linkedEndpoints.map((endpoint) => (
                          <li key={endpoint.id}>
                            <span className="anlyx-relationship-line" aria-hidden="true" />
                            <StatusBadge tone={endpoint.method}>{endpoint.method}</StatusBadge>
                            <span>{endpoint.path}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="anlyx-empty-inline">
                      No backend endpoint was linked during capture.
                    </p>
                  )}
                </section>
              </div>
            </div>
          </>
        ) : (
          <div className="anlyx-storyboard-empty">
            <p>No pages available yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function PageEvidenceBoard({
  linkedApiCallCount,
  linkedEndpointCount,
  page,
  unmatchedApiCallCount
}: {
  linkedApiCallCount: number;
  linkedEndpointCount: number;
  page: PageStoryboard;
  unmatchedApiCallCount: number;
}): JSX.Element {
  return (
    <section
      className="anlyx-page-evidence-board"
      role="region"
      aria-label="Page execution evidence"
    >
      <div className="anlyx-page-evidence-board__intro">
        <span>Capture proof</span>
        <strong>
          {page.captureStatus === "success" ? "Observed page run" : "Incomplete page run"}
        </strong>
      </div>
      <EvidenceMetric
        label="Screenshots"
        value={String(page.screenshots.length)}
        detail={page.screenshots.length > 0 ? "visual segments captured" : "waiting for capture"}
      />
      <EvidenceMetric
        label="API evidence"
        value={String(page.apiCalls.length)}
        detail={`${linkedApiCallCount} linked`}
      />
      <EvidenceMetric
        label="Backend linkage"
        value={String(linkedEndpointCount)}
        detail={`${unmatchedApiCallCount} unmatched`}
      />
    </section>
  );
}

function EvidenceMetric({
  detail,
  label,
  value
}: {
  detail: string;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="anlyx-page-evidence-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  );
}
