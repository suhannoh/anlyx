import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { EndpointFlow, FlowNode, ScanResult } from "@anlyx/core";
import { Group, Panel, Separator, usePanelRef } from "react-resizable-panels";

import { EndpointMapCanvas } from "./EndpointMapCanvas.js";
import { FlowStoryView } from "./FlowStoryView.js";
import { InspectorPanel } from "./InspectorPanel.js";
import { PageStoryboardView } from "./PageStoryboardView.js";
import { ProcessFlowView } from "./ProcessFlowView.js";
import { Sidebar } from "./Sidebar.js";
import { useReplayLite } from "../replay/use-replay-lite.js";

export type AnlyxAppShellProps = {
  data: ScanResult;
};

export type ViewMode = "flowStory" | "structure" | "frontend" | "process";

const STORAGE_KEYS = {
  leftCollapsed: "anlyx:ui:v2:leftCollapsed",
  panelLayout: "anlyx:ui:v2:panelLayout",
  rightCollapsed: "anlyx:ui:v2:rightCollapsed",
  selectedEndpointId: "anlyx:ui:selectedEndpointId",
  selectedPageId: "anlyx:ui:selectedPageId"
} as const;

const DEFAULT_PANEL_LAYOUT = {
  left: 22,
  center: 52,
  right: 26
};

export function AnlyxAppShell({ data }: AnlyxAppShellProps): JSX.Element {
  const [activeView, setActiveView] = useState<ViewMode>("flowStory");
  const [selectedEndpointId, setSelectedEndpointId] = usePersistentString(
    STORAGE_KEYS.selectedEndpointId,
    selectInitialEndpointId(data)
  );
  const [selectedPageId, setSelectedPageId] = usePersistentString(
    STORAGE_KEYS.selectedPageId,
    data.pages[0]?.id
  );
  const leftPanelRef = usePanelRef();
  const rightPanelRef = usePanelRef();
  const [leftCollapsed, setLeftCollapsed] = usePersistentBoolean(STORAGE_KEYS.leftCollapsed, false);
  const [rightCollapsed, setRightCollapsed] = usePersistentBoolean(
    STORAGE_KEYS.rightCollapsed,
    false
  );
  const panelLayout = useMemo(() => readPanelLayout(), []);
  const [replaySpeed, setReplaySpeed] = useState(800);
  const selectedEndpoint =
    data.endpoints.find((endpoint) => endpoint.id === selectedEndpointId) ?? data.endpoints[0];
  const selectedPage = data.pages.find((page) => page.id === selectedPageId) ?? data.pages[0];
  const selectedFlow = useMemo(
    () => data.flows.find((flow) => flow.endpointId === selectedEndpoint?.id),
    [data.flows, selectedEndpoint?.id]
  );
  const replayMainPath = useMemo(
    () => getReplayMainPath(selectedFlow, selectedEndpoint?.id),
    [selectedEndpoint?.id, selectedFlow]
  );
  const replay = useReplayLite({ intervalMs: replaySpeed, mainPath: replayMainPath });
  const replayUnavailable = replayMainPath.length === 0;
  const [selectedNodeId, setSelectedNodeId] = useState(() => findDefaultNode(selectedFlow)?.id);
  const selectedNode = findFlowNode(selectedFlow, selectedNodeId) ?? findDefaultNode(selectedFlow);

  useEffect(() => {
    setSelectedEndpointId((current) =>
      data.endpoints.some((endpoint) => endpoint.id === current)
        ? current
        : selectInitialEndpointId(data)
    );
  }, [data, setSelectedEndpointId]);

  useEffect(() => {
    setSelectedPageId((current) =>
      data.pages.some((page) => page.id === current) ? current : data.pages[0]?.id
    );
  }, [data.pages]);

  useEffect(() => {
    setSelectedNodeId(findDefaultNode(selectedFlow)?.id);
  }, [selectedFlow]);

  useEffect(() => {
    if (leftCollapsed) {
      leftPanelRef.current?.collapse();
    }
  }, [leftCollapsed, leftPanelRef]);

  useEffect(() => {
    if (rightCollapsed) {
      rightPanelRef.current?.collapse();
    }
  }, [rightCollapsed, rightPanelRef]);

  const toggleLeftPanel = () => {
    if (leftCollapsed) {
      leftPanelRef.current?.expand();
      setLeftCollapsed(false);
    } else {
      leftPanelRef.current?.collapse();
      setLeftCollapsed(true);
    }
  };

  const toggleRightPanel = () => {
    if (rightCollapsed) {
      rightPanelRef.current?.expand();
      setRightCollapsed(false);
    } else {
      rightPanelRef.current?.collapse();
      setRightCollapsed(true);
    }
  };

  return (
    <div className="anlyx-shell" role="application" aria-label="Anlyx application shell">
      <Group
        className="anlyx-panel-group"
        defaultLayout={panelLayout}
        id="anlyx-main-panels"
        orientation="horizontal"
        onLayoutChanged={(layout) =>
          writeLocalStorage(STORAGE_KEYS.panelLayout, JSON.stringify(layout))
        }
      >
        <Panel
          className="anlyx-panel anlyx-panel--sidebar"
          collapsedSize="52px"
          collapsible
          defaultSize="300px"
          id="left"
          maxSize="420px"
          minSize="240px"
          panelRef={leftPanelRef}
        >
          <Sidebar
            data={data}
            activeView={activeView}
            collapsed={leftCollapsed}
            selectedEndpointId={selectedEndpoint?.id}
            selectedPageId={selectedPage?.id}
            onSelectView={setActiveView}
            onToggleCollapsed={toggleLeftPanel}
            onSelectEndpoint={(endpoint) => {
              setSelectedEndpointId(endpoint.id);
              if (activeView !== "structure" && activeView !== "process") {
                setActiveView("flowStory");
              }
            }}
            onSelectPage={(page) => {
              setSelectedPageId(page.id);
              const linkedEndpointId = page.apiCalls.find(
                (apiCall) => apiCall.endpointId
              )?.endpointId;

              if (linkedEndpointId) {
                setSelectedEndpointId(linkedEndpointId);
              }

              if (activeView !== "frontend") {
                setActiveView("flowStory");
              }
            }}
          />
        </Panel>
        <Separator aria-label="Resize navigation panel" className="anlyx-resize-handle">
          <span aria-hidden="true" />
        </Separator>
        <Panel className="anlyx-panel anlyx-panel--main" id="center" minSize="420px">
          <div
            className={activeView === "process" ? "anlyx-main anlyx-main--process" : "anlyx-main"}
            aria-live="polite"
          >
            {activeView === "flowStory" ? (
              <FlowStoryView
                data={data}
                endpoint={selectedEndpoint}
                flow={selectedFlow}
                page={selectedPage}
                replayDisabled={replayUnavailable}
                replayLoop={replay.loop}
                replaySpeed={replaySpeed}
                replayState={replay.state}
                replaySteps={replay.steps}
                selectedNodeId={selectedNode?.id}
                onPause={replay.pause}
                onPlay={replay.play}
                onRestart={replay.restart}
                onSelectNode={(node) => setSelectedNodeId(node.id)}
                onSpeedChange={setReplaySpeed}
                onToggleLoop={replay.toggleLoop}
              />
            ) : null}
            {activeView === "structure" ? (
              <EndpointMapCanvas
                eyebrow="Backend API Structure"
                endpoint={selectedEndpoint}
                flow={selectedFlow}
                replayState={replay.state}
                selectedNodeId={selectedNode?.id}
                toolbar={<StructureToolbar />}
                onSelectNode={(node) => setSelectedNodeId(node.id)}
              />
            ) : null}
            {activeView === "frontend" ? (
              <PageStoryboardView
                data={data}
                page={selectedPage}
                onViewProcessFlow={setActiveView}
              />
            ) : null}
            {activeView === "process" ? (
              <ProcessFlowView
                endpoint={selectedEndpoint}
                flow={selectedFlow}
                replayDisabled={replayUnavailable}
                replayLoop={replay.loop}
                replaySpeed={replaySpeed}
                replayState={replay.state}
                replaySteps={replay.steps}
                selectedNodeId={selectedNode?.id}
                onPause={replay.pause}
                onPlay={replay.play}
                onRestart={replay.restart}
                onSelectNode={(node) => setSelectedNodeId(node.id)}
                onSpeedChange={setReplaySpeed}
                onToggleLoop={replay.toggleLoop}
                onViewStructure={() => setActiveView("structure")}
              />
            ) : null}
          </div>
        </Panel>
        <Separator aria-label="Resize inspector panel" className="anlyx-resize-handle">
          <span aria-hidden="true" />
        </Separator>
        <Panel
          className="anlyx-panel anlyx-panel--inspector"
          collapsedSize="52px"
          collapsible
          defaultSize="360px"
          id="right"
          maxSize="520px"
          minSize="300px"
          panelRef={rightPanelRef}
        >
          <InspectorPanel
            activeView={activeView}
            collapsed={rightCollapsed}
            data={data}
            replayState={replay.state}
            selectedFlow={selectedFlow}
            selectedNode={selectedNode}
            selectedPage={selectedPage}
            onToggleCollapsed={toggleRightPanel}
          />
        </Panel>
      </Group>
      <div className="anlyx-generated-at">Generated {data.generatedAt}</div>
    </div>
  );
}

function StructureToolbar(): JSX.Element {
  return (
    <div className="anlyx-toolbar" aria-label="Structure view actions">
      <button className="anlyx-toolbar-button" type="button">
        Fit view
      </button>
      <select aria-label="Zoom level" className="anlyx-toolbar-select" defaultValue="100">
        <option value="75">75%</option>
        <option value="100">100%</option>
        <option value="125">125%</option>
      </select>
      <button className="anlyx-toolbar-button anlyx-toolbar-button--icon" type="button">
        More
      </button>
    </div>
  );
}

function getReplayMainPath(
  flow: EndpointFlow | undefined,
  endpointId: string | undefined
): string[] {
  if (!flow || flow.mainPath.length === 0) {
    return [];
  }

  const endpointIndex = endpointId ? flow.mainPath.indexOf(endpointId) : -1;

  if (endpointIndex >= 0) {
    return flow.mainPath.slice(endpointIndex);
  }

  return flow.mainPath;
}

function selectInitialEndpointId(data: ScanResult): string | undefined {
  const flowByEndpointId = new Map(data.flows.map((flow) => [flow.endpointId, flow]));
  const endpointsByScore = [...data.endpoints].sort(
    (left, right) => scoreEndpoint(right, flowByEndpointId) - scoreEndpoint(left, flowByEndpointId)
  );

  return endpointsByScore[0]?.id;
}

function scoreEndpoint(
  endpoint: ScanResult["endpoints"][number],
  flowByEndpointId: Map<string, EndpointFlow>
): number {
  const flow = flowByEndpointId.get(endpoint.id);
  const hasDatabase = flow?.nodes.some((node) => node.type === "database") ? 1 : 0;
  const confidenceScore =
    endpoint.confidence === "high" ? 4 : endpoint.confidence === "medium" ? 2 : 0;

  return (
    (flow?.mainPath.length ?? 0) * 8 +
    (flow?.subFlows.length ?? 0) * 5 +
    hasDatabase * 6 +
    confidenceScore
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

function usePersistentBoolean(
  key: string,
  defaultValue: boolean
): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [value, setValue] = useState(() => {
    const storedValue = readLocalStorage(key);

    if (storedValue === "true") {
      return true;
    }

    if (storedValue === "false") {
      return false;
    }

    return defaultValue;
  });

  useEffect(() => {
    writeLocalStorage(key, String(value));
  }, [key, value]);

  return [value, setValue];
}

function usePersistentString(
  key: string,
  fallback: string | undefined
): [string | undefined, Dispatch<SetStateAction<string | undefined>>] {
  const [value, setValue] = useState<string | undefined>(() => {
    if (typeof window === "undefined") {
      return fallback;
    }

    return window.localStorage.getItem(key) ?? fallback;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  }, [key, value]);

  return [value, setValue];
}

function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}

function readPanelLayout(): typeof DEFAULT_PANEL_LAYOUT {
  const storedValue = readLocalStorage(STORAGE_KEYS.panelLayout);

  if (!storedValue) {
    return DEFAULT_PANEL_LAYOUT;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<typeof DEFAULT_PANEL_LAYOUT>;

    return {
      left: sanitizePanelSize(parsedValue.left, DEFAULT_PANEL_LAYOUT.left),
      center: sanitizePanelSize(parsedValue.center, DEFAULT_PANEL_LAYOUT.center),
      right: sanitizePanelSize(parsedValue.right, DEFAULT_PANEL_LAYOUT.right)
    };
  } catch {
    return DEFAULT_PANEL_LAYOUT;
  }
}

function sanitizePanelSize(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}
