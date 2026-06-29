import { createElement, type ReactElement } from "react";

export type AnlyxDevOverlayProps = {
  runtimeUrl?: string;
};

export type AnlyxScriptElement = ReactElement;

const DEFAULT_RUNTIME_URL = "http://localhost:4777";

export function AnlyxDevOverlay({
  runtimeUrl = DEFAULT_RUNTIME_URL
}: AnlyxDevOverlayProps = {}): AnlyxScriptElement | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return createElement("script", {
    src: getAnlyxDevOverlayScriptSrc(runtimeUrl),
    defer: true,
    "data-anlyx-dev-overlay": "true"
  });
}

export function getAnlyxDevOverlayScriptSrc(runtimeUrl = DEFAULT_RUNTIME_URL): string {
  return `${runtimeUrl.replace(/\/$/, "")}/_anlyx/overlay.js`;
}
