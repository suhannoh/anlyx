import { useEffect, useState } from "react";
import { projectDataSchema, type ProjectData } from "@anlyx/core";

import { WorkspaceApp } from "../workspace/WorkspaceApp.js";

type ViewerState =
  | { status: "loading" }
  | { status: "error"; detail: string }
  | { status: "success"; viewerData: ViewerData };

type ViewerData = { kind: "project"; data: ProjectData };

export function ViewerApp(): JSX.Element {
  const [state, setState] = useState<ViewerState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function loadViewerData(): Promise<void> {
      try {
        const viewerData = await fetchViewerData();

        if (active) {
          setState({ status: "success", viewerData });
        }
      } catch (error) {
        if (active) {
          setState({
            status: "error",
            detail: error instanceof Error ? error.message : "Unknown project data loading error"
          });
        }
      }
    }

    void loadViewerData();

    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <ViewerStateCard
        detail="Reading /api/project-data from the local Anlyx runtime."
        label="Anlyx project data loading"
        status="loading"
        title="Loading Anlyx project data"
      />
    );
  }

  if (state.status === "error") {
    return (
      <ViewerStateCard
        detail={state.detail}
        label="Anlyx project data load failed"
        status="error"
        title="Failed to load Anlyx project data"
      />
    );
  }

  return <WorkspaceApp projectData={state.viewerData.data} />;
}

async function fetchViewerData(): Promise<ViewerData> {
  const projectResponse = await fetch("/api/project-data");

  if (projectResponse.ok) {
    return { kind: "project", data: projectDataSchema.parse(await projectResponse.json()) };
  }

  throw new Error(`/api/project-data returned ${projectResponse.status}`);
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
          {status === "error" ? "Viewer waiting for project data" : "Preparing local project"}
        </span>
        <h1>{title}</h1>
        <p>{detail}</p>
        {status === "error" ? <p>Run `anlyx dev` again, then reload.</p> : null}
      </section>
    </main>
  );
}
