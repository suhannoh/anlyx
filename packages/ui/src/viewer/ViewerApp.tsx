import { useEffect, useState } from "react";
import { scanResultSchema, type ScanResult } from "@anlyx/core";

import { AnlyxAppShell } from "../components/AnlyxAppShell.js";

type ViewerState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; data: ScanResult };

export function ViewerApp(): JSX.Element {
  const [state, setState] = useState<ViewerState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function loadReportData(): Promise<void> {
      try {
        const response = await fetch("/api/report-data");

        if (!response.ok) {
          throw new Error(`Failed to fetch report data: ${response.status}`);
        }

        const parsed = scanResultSchema.parse(await response.json());

        if (active) {
          setState({ status: "success", data: parsed });
        }
      } catch {
        if (active) {
          setState({ status: "error" });
        }
      }
    }

    void loadReportData();

    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return <main className="anlyx-viewer-state">Loading Anlyx report...</main>;
  }

  if (state.status === "error") {
    return <main className="anlyx-viewer-state">Failed to load Anlyx report.</main>;
  }

  return <AnlyxAppShell data={state.data} />;
}
