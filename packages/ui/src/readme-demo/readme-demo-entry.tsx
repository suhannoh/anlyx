import { createRoot } from "react-dom/client";

import { ReadmeDemoApp } from "./ReadmeDemoApp.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root for Anlyx README demo");
}

createRoot(root).render(<ReadmeDemoApp />);
