import type { CaptureStatus } from "@anlyx/core";

export type CaptureStatusEmptyStateProps = {
  status: CaptureStatus;
  reason?: string;
};

export function CaptureStatusEmptyState({
  status,
  reason
}: CaptureStatusEmptyStateProps): JSX.Element | null {
  if (status === "success") {
    return null;
  }

  const title = status === "failed" ? "Capture failed" : "Capture was skipped.";
  const fallbackReason =
    status === "pending"
      ? "Run `anlyx scan` without `--skip-capture` while your frontend server is running."
      : "Unknown";

  return (
    <section className={`anlyx-capture-state anlyx-capture-state--${status}`}>
      <h2>{title}</h2>
      <p>Reason: {reason ?? fallbackReason}</p>
      {status === "pending" ? (
        <p>Dynamic routes may require `sampleParams` in `anlyx.config.ts`.</p>
      ) : null}
    </section>
  );
}
