import type { FlowNode, ScanResult } from "@anlyx/core";

import { CanvasPlaceholder } from "./CanvasPlaceholder.js";
import { InspectorPanel } from "./InspectorPanel.js";
import { ReplayControls } from "./ReplayControls.js";
import { Sidebar } from "./Sidebar.js";

export type AnlyxAppShellProps = {
  data: ScanResult;
};

export function AnlyxAppShell({ data }: AnlyxAppShellProps): JSX.Element {
  const selectedEndpoint = data.endpoints[0];
  const selectedNode = findSelectedNode(data);

  return (
    <div className="anlyx-shell" role="application" aria-label="Anlyx application shell">
      <Sidebar data={data} />
      <div className="anlyx-main">
        <CanvasPlaceholder endpoint={selectedEndpoint} />
        <ReplayControls />
      </div>
      <InspectorPanel data={data} selectedNode={selectedNode} />
      <div className="anlyx-generated-at">Generated {data.generatedAt}</div>
    </div>
  );
}

function findSelectedNode(data: ScanResult): FlowNode | undefined {
  return (
    data.flows
      .flatMap((flow) => flow.nodes)
      .find((node) => node.confidence === "unknown") ??
    data.flows.flatMap((flow) => flow.nodes).find((node) => node.type !== "page")
  );
}
