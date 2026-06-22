import type { ReactNode } from "react";

export function Card({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return <div className={`anlyx-ov-card ${className}`.trim()}>{children}</div>;
}

export function Badge({
  children,
  tone = "neutral",
  className = ""
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "amber" | "violet" | "gray" | "neutral";
  className?: string;
}): JSX.Element {
  return (
    <span className={`anlyx-ov-badge anlyx-ov-badge--${tone} ${className}`.trim()}>
      {children}
    </span>
  );
}

export function Tooltip({
  children,
  content
}: {
  children: ReactNode;
  content: string;
}): JSX.Element {
  return <span title={content}>{children}</span>;
}

export function Table({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return <table className={`anlyx-ov-table ${className}`.trim()}>{children}</table>;
}
