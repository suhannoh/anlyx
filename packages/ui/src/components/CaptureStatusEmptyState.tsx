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
      ? "The imported Flow JSON did not include page capture evidence."
      : "Unknown";

  return (
    <section className={`anlyx-capture-state anlyx-capture-state--${status}`}>
      <h2>{title}</h2>
      <p>Reason: {reason ?? fallbackReason}</p>
      {status === "pending" ? (
        <p>Add page evidence to Flow JSON, then run `anlyx import` again.</p>
      ) : null}
    </section>
  );
}
