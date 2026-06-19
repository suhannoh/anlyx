import type { PageStoryboard } from "@anlyx/core";

import { ScreenshotSegmentCard } from "./ScreenshotSegmentCard.js";

export type PageStoryboardCardProps = {
  page: PageStoryboard;
};

export function PageStoryboardCard({ page }: PageStoryboardCardProps): JSX.Element {
  return (
    <section className="anlyx-storyboard-panel" aria-label="Screenshot segments">
      <div className="anlyx-storyboard-section-heading">
        <h2>Segments</h2>
        <span>{page.screenshots.length}</span>
      </div>

      {page.screenshots.length > 0 ? (
        <div className="anlyx-segment-grid">
          {page.screenshots.map((segment) => (
            <ScreenshotSegmentCard
              key={`${page.id}:segment:${segment.segmentIndex}`}
              segment={segment}
            />
          ))}
        </div>
      ) : (
        <p className="anlyx-empty-inline">No screenshots captured yet.</p>
      )}
    </section>
  );
}
