import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction
} from "react";
import type { EndpointFlow, FlowNode, ScanResult } from "@anlyx/core";

import { EndpointMapCanvas } from "./EndpointMapCanvas.js";
import { InspectorPanel } from "./InspectorPanel.js";
import { PageStoryboardView } from "./PageStoryboardView.js";
import { ProcessFlowView } from "./ProcessFlowView.js";
import { Sidebar } from "./Sidebar.js";
import { useReplayLite } from "../replay/use-replay-lite.js";

export type AnlyxAppShellProps = {
  data: ScanResult;
};

export type ViewMode = "structure" | "frontend" | "process";

const DEFAULT_LEFT_WIDTH = 300;
const DEFAULT_RIGHT_WIDTH = 360;
const LEFT_WIDTH_RANGE = { min: 240, max: 420 };
const RIGHT_WIDTH_RANGE = { min: 300, max: 520 };
const STORAGE_KEYS = {
  leftCollapsed: "anlyx:ui:leftCollapsed",
  leftWidth: "anlyx:ui:leftWidth",
  rightCollapsed: "anlyx:ui:rightCollapsed",
  rightWidth: "anlyx:ui:rightWidth",
  selectedEndpointId: "anlyx:ui:selectedEndpointId",
  selectedPageId: "anlyx:ui:selectedPageId"
} as const;

export function AnlyxAppShell({ data }: AnlyxAppShellProps): JSX.Element {
  const [activeView, setActiveView] = useState<ViewMode>("structure");
  const [selectedEndpointId, setSelectedEndpointId] = usePersistentString(
    STORAGE_KEYS.selectedEndpointId,
    selectInitialEndpointId(data)
  );
  const [selectedPageId, setSelectedPageId] = usePersistentString(
    STORAGE_KEYS.selectedPageId,
    data.pages[0]?.id
  );
  const [leftWidth, setLeftWidth] = usePersistentNumber(STORAGE_KEYS.leftWidth, DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = usePersistentNumber(
    STORAGE_KEYS.rightWidth,
    DEFAULT_RIGHT_WIDTH
  );
  const [leftCollapsed, setLeftCollapsed] = usePersistentBoolean(STORAGE_KEYS.leftCollapsed, false);
  const [rightCollapsed, setRightCollapsed] = usePersistentBoolean(
    STORAGE_KEYS.rightCollapsed,
    false
  );
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

  const startPanelResize = useCallback(
    (panel: "left" | "right", pointerClientX: number) => {
      const startWidth = panel === "left" ? leftWidth : rightWidth;

      const onPointerMove = (event: PointerEvent) => {
        const delta =
          panel === "left" ? event.clientX - pointerClientX : pointerClientX - event.clientX;
        const range = panel === "left" ? LEFT_WIDTH_RANGE : RIGHT_WIDTH_RANGE;
        const nextWidth = clamp(startWidth + delta, range.min, range.max);

        if (panel === "left") {
          setLeftCollapsed(false);
          setLeftWidth(nextWidth);
        } else {
          setRightCollapsed(false);
          setRightWidth(nextWidth);
        }
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [leftWidth, rightWidth, setLeftCollapsed, setLeftWidth, setRightCollapsed, setRightWidth]
  );

  const shellColumns = [
    leftCollapsed ? "52px" : `${leftWidth}px`,
    "8px",
    "minmax(0, 1fr)",
    "8px",
    rightCollapsed ? "52px" : `${rightWidth}px`
  ].join(" ");

  return (
    <div
      className="anlyx-shell"
      role="application"
      aria-label="Anlyx application shell"
      style={{ gridTemplateColumns: shellColumns }}
    >
      <Sidebar
        data={data}
        activeView={activeView}
        collapsed={leftCollapsed}
        selectedEndpointId={selectedEndpoint?.id}
        selectedPageId={selectedPage?.id}
        onSelectView={setActiveView}
        onToggleCollapsed={() => setLeftCollapsed((current) => !current)}
        onSelectEndpoint={(endpoint) => {
          setSelectedEndpointId(endpoint.id);
          setActiveView("structure");
        }}
        onSelectPage={(page) => {
          setSelectedPageId(page.id);
          setActiveView("frontend");
        }}
      />
      <div
        aria-label="Resize navigation panel"
        className="anlyx-resize-handle anlyx-resize-handle--left"
        role="separator"
        tabIndex={0}
        onPointerDown={(event) => startPanelResize("left", event.clientX)}
      >
        <span aria-hidden="true" />
      </div>
      <div
        className={activeView === "process" ? "anlyx-main anlyx-main--process" : "anlyx-main"}
        aria-live="polite"
      >
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
          <PageStoryboardView data={data} page={selectedPage} onViewProcessFlow={setActiveView} />
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
      <div
        aria-label="Resize inspector panel"
        className="anlyx-resize-handle anlyx-resize-handle--right"
        role="separator"
        tabIndex={0}
        onPointerDown={(event) => startPanelResize("right", event.clientX)}
      >
        <span aria-hidden="true" />
      </div>
      <InspectorPanel
        activeView={activeView}
        collapsed={rightCollapsed}
        data={data}
        replayState={replay.state}
        selectedFlow={selectedFlow}
        selectedNode={selectedNode}
        selectedPage={selectedPage}
        onToggleCollapsed={() => setRightCollapsed((current) => !current)}
      />
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

function usePersistentNumber(
  key: string,
  defaultValue: number
): [number, Dispatch<SetStateAction<number>>] {
  const [value, setValue] = useState(() => {
    const storedValue = readLocalStorage(key);
    const parsedValue = storedValue ? Number(storedValue) : Number.NaN;

    return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
  });

  useEffect(() => {
    writeLocalStorage(key, String(value));
  }, [key, value]);

  return [value, setValue];
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
