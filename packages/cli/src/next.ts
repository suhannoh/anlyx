export type AnlyxDevOverlayProps = {
  runtimeUrl?: string;
};

export type AnlyxScriptElement = {
  $$typeof: symbol;
  type: "script";
  key: null;
  ref: null;
  props: {
    src: string;
    defer: true;
    "data-anlyx-dev-overlay": "true";
  };
  _owner: null;
};

const DEFAULT_RUNTIME_URL = "http://localhost:4777";

export function AnlyxDevOverlay({
  runtimeUrl = DEFAULT_RUNTIME_URL
}: AnlyxDevOverlayProps = {}): AnlyxScriptElement | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return {
    $$typeof: Symbol.for("react.element"),
    type: "script",
    key: null,
    ref: null,
    props: {
      src: getAnlyxDevOverlayScriptSrc(runtimeUrl),
      defer: true,
      "data-anlyx-dev-overlay": "true"
    },
    _owner: null
  };
}

export function getAnlyxDevOverlayScriptSrc(runtimeUrl = DEFAULT_RUNTIME_URL): string {
  return `${runtimeUrl.replace(/\/$/, "")}/_anlyx/overlay.js`;
}
