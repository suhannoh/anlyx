import type { PageStoryboard } from "@anlyx/core";

import { ApiCallList } from "./ApiCallList.js";
import { CaptureStatusEmptyState } from "./CaptureStatusEmptyState.js";
import { PageStoryboardCard } from "./PageStoryboardCard.js";
import { StatusBadge } from "./StatusBadge.js";

export type PageStoryboardViewProps = {
  page: PageStoryboard | undefined;
};

export function PageStoryboardView({ page }: PageStoryboardViewProps): JSX.Element {
  return (
    <main className="anlyx-workspace">
      <header className="anlyx-workspace-header">
        <div>
          <p className="anlyx-eyebrow">Frontend Page Storyboard</p>
          <h1>{page ? page.route : "Page Storyboard"}</h1>
        </div>
        {page ? <StatusBadge tone={page.captureStatus}>{page.captureStatus}</StatusBadge> : null}
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
            </section>

            <CaptureStatusEmptyState
              status={page.captureStatus}
              {...(page.errorMessage ? { reason: page.errorMessage } : {})}
            />

            <div className="anlyx-storyboard-grid">
              <PageStoryboardCard page={page} />
              <ApiCallList apiCalls={page.apiCalls} />
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
