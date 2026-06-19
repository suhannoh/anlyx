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

  const title = status === "failed" ? "Capture failed" : "Capture pending";
  const fallbackReason = status === "pending" ? "Waiting for capture input." : "Unknown";

  return (
    <section className={`anlyx-capture-state anlyx-capture-state--${status}`}>
      <h2>{title}</h2>
      <p>Reason: {reason ?? fallbackReason}</p>
    </section>
  );
}
