import { createRoot } from "react-dom/client";
import "@xyflow/react/dist/style.css";

import "../styles.css";
import { ViewerApp } from "./ViewerApp.js";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Anlyx viewer root element was not found.");
}

createRoot(root).render(<ViewerApp />);
