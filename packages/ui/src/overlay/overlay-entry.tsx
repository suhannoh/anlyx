import { createRoot, type Root } from "react-dom/client";
import "@xyflow/react/dist/style.css";

import "./overlay.css";
import { FlowDrawer } from "./FlowDrawer.js";
import type { FlowDrawerProps } from "./types.js";

declare global {
  interface Window {
    __ANLYX_RENDER_FLOW_DRAWER__?: (container: Element, props: FlowDrawerProps) => void;
  }
}

const roots = new WeakMap<Element, Root>();

window.__ANLYX_RENDER_FLOW_DRAWER__ = (container, props) => {
  const existingRoot = roots.get(container);
  const root = existingRoot ?? createRoot(container);

  if (!existingRoot) {
    roots.set(container, root);
  }

  root.render(<FlowDrawer {...props} />);
};
