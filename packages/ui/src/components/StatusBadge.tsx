import type { BridgeFlowStatus, CaptureStatus, ConfidenceLevel, HttpMethod } from "@anlyx/core";

type StatusBadgeProps = {
  children: string;
  tone?: CaptureStatus | ConfidenceLevel | HttpMethod | BridgeFlowStatus | "neutral";
  label?: string;
};

export function StatusBadge({ children, tone = "neutral", label }: StatusBadgeProps): JSX.Element {
  return (
    <span className={`anlyx-status-badge anlyx-status-badge--${tone.toLowerCase()}`}>
      {label ? <span className="anlyx-status-badge__label">{label}</span> : null}
      {children}
    </span>
  );
}
