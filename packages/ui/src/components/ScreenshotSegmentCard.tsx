import type { ScreenshotSegment } from "@anlyx/core";

export type ScreenshotSegmentCardProps = {
  segment: ScreenshotSegment;
};

export function ScreenshotSegmentCard({ segment }: ScreenshotSegmentCardProps): JSX.Element {
  const title = segment.title ?? `Segment ${segment.segmentIndex + 1}`;

  return (
    <article className="anlyx-segment-card">
      <div className="anlyx-segment-card__image">
        {segment.path ? <img alt={title} src={segment.path} /> : <span>No image path</span>}
      </div>
      <div className="anlyx-segment-card__body">
        <h3>Segment {segment.segmentIndex + 1}</h3>
        {segment.title ? <p>{segment.title}</p> : null}
        {segment.path ? <code>{segment.path}</code> : <code>No path</code>}
        <div className="anlyx-segment-card__meta">
          <span>scrollY {segment.scrollY}</span>
          <span>
            {segment.viewport.width} x {segment.viewport.height}
          </span>
        </div>
      </div>
    </article>
  );
}
