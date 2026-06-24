import { useEffect, useState } from "react";
import { scanResultSchema, type ScanResult } from "@anlyx/core";

import { WorkspaceApp } from "../workspace/WorkspaceApp.js";

type ViewerState =
  | { status: "loading" }
  | { status: "error"; detail: string }
  | { status: "success"; data: ScanResult };

export function ViewerApp(): JSX.Element {
  const [state, setState] = useState<ViewerState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function loadReportData(): Promise<void> {
      try {
        const response = await fetch("/api/report-data");

        if (!response.ok) {
          throw new Error(`/api/report-data returned ${response.status}`);
        }

        const parsed = scanResultSchema.parse(await response.json());

        if (active) {
          setState({ status: "success", data: parsed });
        }
      } catch (error) {
        if (active) {
          setState({
            status: "error",
            detail: error instanceof Error ? error.message : "Unknown report loading error"
          });
        }
      }
    }

    void loadReportData();

    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <ViewerStateCard
        detail="Reading /api/report-data from the local Anlyx runtime."
        label="Anlyx report loading"
        status="loading"
        title="Loading Anlyx report"
      />
    );
  }

  if (state.status === "error") {
    return (
      <ViewerStateCard
        detail={state.detail}
        label="Anlyx report load failed"
        status="error"
        title="Failed to load Anlyx report"
      />
    );
  }

  return <WorkspaceApp data={state.data} />;
}

function ViewerStateCard({
  detail,
  label,
  status,
  title
}: {
  detail: string;
  label: string;
  status: "error" | "loading";
  title: string;
}): JSX.Element {
  const role = status === "error" ? "alert" : "status";

  return (
    <main className={`anlyx-viewer-state anlyx-viewer-state--${status}`}>
      <section className="anlyx-viewer-state__card" role={role} aria-label={label}>
        <span className="anlyx-viewer-state__eyebrow">
          {status === "error" ? "Viewer waiting for report data" : "Preparing local report"}
        </span>
        <h1>{title}</h1>
        <p>{detail}</p>
        {status === "error" ? (
          <p>Run `anlyx scan` or `anlyx dev` again, then reload this viewer.</p>
        ) : null}
      </section>
    </main>
  );
}
