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
        <div className="anlyx-segment-grid anlyx-segment-grid--empty">
          <PlaceholderSegment index={1} title="Overview" />
          <PlaceholderSegment index={2} title="Primary content" />
          <PlaceholderSegment index={3} title="Related sections" />
        </div>
      )}
    </section>
  );
}

function PlaceholderSegment({ index, title }: { index: number; title: string }): JSX.Element {
  return (
    <article className="anlyx-segment-card anlyx-segment-card--placeholder">
      <div className="anlyx-segment-card__image" aria-hidden="true">
        <span>{index}</span>
      </div>
      <div className="anlyx-segment-card__body">
        <h3>{title}</h3>
        <p>Waiting for capture data</p>
        <div className="anlyx-segment-card__meta">
          <span>Viewport pending</span>
          <span>Capture pending</span>
        </div>
      </div>
    </article>
  );
}
