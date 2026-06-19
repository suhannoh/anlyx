import { useEffect, useMemo, useState } from "react";
import type { EndpointFlow, FlowNode, ScanResult } from "@anlyx/core";

import { EndpointMapCanvas } from "./EndpointMapCanvas.js";
import { InspectorPanel } from "./InspectorPanel.js";
import { ReplayControls } from "./ReplayControls.js";
import { Sidebar } from "./Sidebar.js";

export type AnlyxAppShellProps = {
  data: ScanResult;
};

export function AnlyxAppShell({ data }: AnlyxAppShellProps): JSX.Element {
  const [selectedEndpointId, setSelectedEndpointId] = useState(data.endpoints[0]?.id);
  const selectedEndpoint =
    data.endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? data.endpoints[0];
  const selectedFlow = useMemo(
    () => data.flows.find((flow) => flow.endpointId === selectedEndpoint?.id),
    [data.flows, selectedEndpoint?.id]
  );
  const [selectedNodeId, setSelectedNodeId] = useState(() => findDefaultNode(selectedFlow)?.id);
  const selectedNode = findFlowNode(selectedFlow, selectedNodeId) ?? findDefaultNode(selectedFlow);

  useEffect(() => {
    setSelectedEndpointId((current) =>
      data.endpoints.some((endpoint) => endpoint.id === current) ? current : data.endpoints[0]?.id
    );
  }, [data.endpoints]);

  useEffect(() => {
    setSelectedNodeId(findDefaultNode(selectedFlow)?.id);
  }, [selectedFlow]);

  return (
    <div className="anlyx-shell" role="application" aria-label="Anlyx application shell">
      <Sidebar
        data={data}
        selectedEndpointId={selectedEndpoint?.id}
        onSelectEndpoint={(endpoint) => setSelectedEndpointId(endpoint.id)}
      />
      <div className="anlyx-main">
        <EndpointMapCanvas
          endpoint={selectedEndpoint}
          flow={selectedFlow}
          selectedNodeId={selectedNode?.id}
          onSelectNode={(node) => setSelectedNodeId(node.id)}
        />
        <ReplayControls />
      </div>
      <InspectorPanel data={data} selectedFlow={selectedFlow} selectedNode={selectedNode} />
      <div className="anlyx-generated-at">Generated {data.generatedAt}</div>
    </div>
  );
}

function findDefaultNode(flow: EndpointFlow | undefined): FlowNode | undefined {
  if (!flow) {
    return undefined;
  }

  return (
    findFlowNode(flow, flow.mainPath[1]) ?? findFlowNode(flow, flow.mainPath[0]) ?? flow.nodes[0]
  );
}

function findFlowNode(
  flow: EndpointFlow | undefined,
  nodeId: string | undefined
): FlowNode | undefined {
  if (!flow || !nodeId) {
    return undefined;
  }

  return (
    flow.nodes.find((node) => node.id === nodeId) ??
    flow.subFlows.flatMap((subFlow) => subFlow.nodes).find((node) => node.id === nodeId)
  );
}
