import type { Endpoint } from "@anlyx/core";

import { StatusBadge } from "./StatusBadge.js";

type CanvasPlaceholderProps = {
  endpoint: Endpoint | undefined;
};

export function CanvasPlaceholder({ endpoint }: CanvasPlaceholderProps): JSX.Element {
  return (
    <main className="anlyx-workspace" aria-label="Workspace">
      <header className="anlyx-workspace-header">
        <div>
          <p className="anlyx-eyebrow">Selected endpoint</p>
          <h1>{endpoint ? `${endpoint.method} ${endpoint.path}` : "No endpoint selected"}</h1>
        </div>
        {endpoint ? (
          <StatusBadge tone={endpoint.confidence ?? "unknown"}>
            {endpoint.confidence ?? "unknown"}
          </StatusBadge>
        ) : null}
      </header>

      <section
        className="anlyx-canvas-placeholder"
        aria-label="Endpoint map canvas placeholder"
      >
        <div className="anlyx-canvas-placeholder__content">
          <p className="anlyx-eyebrow">Canvas</p>
          <h2>Endpoint Map will render here</h2>
        </div>
      </section>
    </main>
  );
}
