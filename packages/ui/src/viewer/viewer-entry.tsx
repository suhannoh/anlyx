import { createRoot } from "react-dom/client";

import "../styles.css";
import "../workspace/workspace.css";
import { ViewerApp } from "./ViewerApp.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Anlyx viewer root element was not found.");
}

createRoot(root).render(<ViewerApp />);
