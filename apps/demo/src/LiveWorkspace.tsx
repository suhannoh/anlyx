import "./live-workspace.css";

import {
  BaseEdge,
  Handle,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps
} from "@xyflow/react";
import {
  BarChart3,
  Box,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Database,
  FileCode2,
  Flag,
  Gauge,
  Layers3,
  Lock,
  MousePointerClick,
  Minus,
  Network,
  Plus,
  RotateCw,
  Search,
  Shield,
  Workflow,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import logoSrc from "../../../docs/assets/brand/anlyx-logo-transparent.png";
import { createAnlyxEventSource, installAnlyxDemoRuntime } from "./anlyxLiveRuntime";
import {
  demoFlow,
  type BackendSpan,
  type DemoLiveEvent,
  type FlowLayer,
  type FlowNode,
  type FlowNodeStatus,
  type FlowRecord
} from "./anlyxDemoFlow";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import type { ReactNode } from "react";

type WorkspaceTab = "summary" | "timing" | "diagram";
type WorkspaceLocale = "en" | "ko";

type CaptureStatus = {
  busyAction: string | null;
  connected: boolean;
  lastResponse: string;
};

const timingRows = [
  { id: "action", label: "Action", icon: Zap, accent: "blue" },
  { id: "api", label: "API", icon: Network, accent: "blue" },
  { id: "controller", label: "Controller", icon: FileCode2, accent: "purple" },
  { id: "auth", label: "Auth / Session", icon: Lock, accent: "red" },
  { id: "service", label: "Service", icon: Layers3, accent: "muted" },
  { id: "repository", label: "Repository", icon: Box, accent: "muted" },
  { id: "database", label: "Database", icon: Database, accent: "muted" },
  { id: "result", label: "Result", icon: Flag, accent: "orange" }
] as const;

type TimingRowDefinition = (typeof timingRows)[number];

export function DemoWorkspacePage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("timing");
  const [locale, setLocale] = useState<WorkspaceLocale>("en");
  const [events, setEvents] = useState<DemoLiveEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>({
    busyAction: null,
    connected: false,
    lastResponse: "Ready"
  });
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? events[0];
  const selectedFlow = selectedEvent?.flow ?? demoFlow;

  useEffect(() => {
    const uninstallRuntime = installAnlyxDemoRuntime();
    const source = createAnlyxEventSource();

    source.onopen = () => {
      setCaptureStatus((current) => ({ ...current, connected: true }));
    };

    source.onerror = () => {
      setCaptureStatus((current) => ({ ...current, connected: false }));
    };

    source.addEventListener("flow", (message) => {
      const event = JSON.parse((message as MessageEvent<string>).data) as DemoLiveEvent;
      setEvents((current) =>
        [event, ...current.filter((item) => item.id !== event.id)].slice(0, 12)
      );
      setSelectedEventId(event.id);
    });

    return () => {
      source.close();
      uninstallRuntime();
    };
  }, []);

  return (
    <main className={`live-workspace live-workspace--${activeTab}`}>
      <AnlyxSidebar locale={locale} onLocaleChange={setLocale} />
      <section className="workspace-main">
        <DemoWorkspaceShell
          flow={selectedFlow}
          activeTab={activeTab}
          events={events}
          locale={locale}
          captureStatus={captureStatus}
          selectedEventId={selectedEvent?.id ?? null}
          onSelectEvent={setSelectedEventId}
          onCaptureStatusChange={setCaptureStatus}
          onTabChange={setActiveTab}
        />
      </section>
    </main>
  );
}

function AnlyxSidebar({
  locale,
  onLocaleChange
}: {
  locale: WorkspaceLocale;
  onLocaleChange: (locale: WorkspaceLocale) => void;
}): JSX.Element {
  return (
    <aside className="workspace-sidebar workspace-sidebar--timing">
      <div className="workspace-brand">
        <img alt="Anlyx" src={logoSrc} />
      </div>
      <nav className="workspace-nav" aria-label="Workspace">
        <a className="is-active" href="#workspace">
          <Workflow size={19} />
          <span>{t(locale, "nav.flows")}</span>
        </a>
      </nav>
      <div className="workspace-sidebar__bottom">
        <div className="language-toggle" aria-label={t(locale, "language.aria")}>
          <button
            className={locale === "en" ? "is-active" : ""}
            type="button"
            onClick={() => onLocaleChange("en")}
          >
            EN
          </button>
          <button
            className={locale === "ko" ? "is-active" : ""}
            type="button"
            onClick={() => onLocaleChange("ko")}
          >
            한
          </button>
        </div>
      </div>
    </aside>
  );
}

function DemoWorkspaceShell({
  flow,
  activeTab,
  events,
  locale,
  captureStatus,
  selectedEventId,
  onSelectEvent,
  onCaptureStatusChange,
  onTabChange
}: {
  flow: FlowRecord;
  activeTab: WorkspaceTab;
  events: DemoLiveEvent[];
  locale: WorkspaceLocale;
  captureStatus: CaptureStatus;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
  onCaptureStatusChange: (status: CaptureStatus) => void;
  onTabChange: (tab: WorkspaceTab) => void;
}): JSX.Element {
  return (
    <div className="timing-layout" id="workspace">
      <div className="timing-content">
        <WorkspaceHeader
          flow={flow}
          activeTab={activeTab}
          locale={locale}
          captureStatus={captureStatus}
          onTabChange={onTabChange}
        />
        <BenefitsStudioPanel
          locale={locale}
          captureStatus={captureStatus}
          onCaptureStatusChange={onCaptureStatusChange}
        />
        <WorkspaceContent flow={flow} activeTab={activeTab} locale={locale} />
      </div>
      <FlowInspectorPanel
        flow={flow}
        events={events}
        locale={locale}
        selectedEventId={selectedEventId}
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
}

function WorkspaceContent({
  flow,
  activeTab,
  locale
}: {
  flow: FlowRecord;
  activeTab: WorkspaceTab;
  locale: WorkspaceLocale;
}): JSX.Element {
  if (activeTab === "summary") {
    return <SummaryFlowView flow={flow} locale={locale} />;
  }

  if (activeTab === "diagram") {
    return <DiagramFlowView flow={flow} locale={locale} />;
  }

  return <TimingWaterfallView flow={flow} locale={locale} />;
}

function WorkspaceHeader({
  flow,
  activeTab,
  locale,
  captureStatus,
  onTabChange
}: {
  flow: FlowRecord;
  activeTab: WorkspaceTab;
  locale: WorkspaceLocale;
  captureStatus: CaptureStatus;
  onTabChange: (tab: WorkspaceTab) => void;
}): JSX.Element {
  return (
    <header className="workspace-header">
      <div className="workspace-header__top">
        <div>
          <div className="breadcrumbs">
            <span>{t(locale, "nav.flows")}</span>
            <ChevronRight size={13} />
            <strong>
              {t(locale, "header.flow")} {flow.id}
            </strong>
          </div>
          <div className="title-row">
            <h1>{t(locale, "header.title")}</h1>
            <CaptureLiveBadge connected={captureStatus.connected} />
          </div>
          <p>{t(locale, "header.subtitle")}</p>
        </div>
        <div className="header-meta">
          <span>
            <Clock3 size={15} />
            {flow.createdAtLabel}
          </span>
        </div>
      </div>
      <div className="workspace-header__tabs">
        <FlowTabs activeTab={activeTab} locale={locale} onTabChange={onTabChange} />
      </div>
    </header>
  );
}

function FlowTabs({
  activeTab,
  locale,
  onTabChange
}: {
  activeTab: WorkspaceTab;
  locale: WorkspaceLocale;
  onTabChange: (tab: WorkspaceTab) => void;
}): JSX.Element {
  return (
    <div className="flow-tabs" role="tablist" aria-label="Flow views">
      {(["summary", "timing", "diagram"] as const).map((tab) => (
        <button
          aria-selected={activeTab === tab}
          className={activeTab === tab ? "is-active" : ""}
          key={tab}
          role="tab"
          type="button"
          onClick={() => onTabChange(tab)}
        >
          {tabLabel(tab, locale)}
        </button>
      ))}
    </div>
  );
}

function BenefitsStudioPanel({
  locale,
  captureStatus,
  onCaptureStatusChange
}: {
  locale: WorkspaceLocale;
  captureStatus: CaptureStatus;
  onCaptureStatusChange: (status: CaptureStatus) => void;
}): JSX.Element {
  const runAction = async (action: string, request: () => Promise<Response>): Promise<void> => {
    onCaptureStatusChange({ ...captureStatus, busyAction: action });

    try {
      const response = await request();
      const body = (await response.json()) as {
        message?: string;
        results?: unknown[];
        title?: string;
      };
      const detail =
        body.message ??
        body.title ??
        (Array.isArray(body.results)
          ? `${body.results.length} benefits found`
          : "Response received");
      onCaptureStatusChange({
        ...captureStatus,
        busyAction: null,
        lastResponse: `${response.status} ${detail}`
      });
    } catch {
      onCaptureStatusChange({ ...captureStatus, busyAction: null, lastResponse: "Request failed" });
    }
  };

  return (
    <section className="benefits-studio" aria-label={t(locale, "example.aria")}>
      <div className="benefits-studio__main">
        <div className="benefits-studio__brand">
          <span>EX</span>
          <div>
            <strong>{t(locale, "example.title")}</strong>
            <small>{t(locale, "example.connected")}</small>
          </div>
        </div>
        <div className="benefits-studio__copy">
          <h2>{t(locale, "example.heading")}</h2>
          <p>{t(locale, "example.description")}</p>
        </div>
      </div>
      <div className="benefits-actions" aria-label={t(locale, "example.actions")}>
        <ActionButton
          action="search"
          busyAction={captureStatus.busyAction}
          label={t(locale, "action.search")}
          onRun={() =>
            runAction("search", () => fetch("/api/public/benefits?query=coffee", { method: "GET" }))
          }
        />
        <ActionButton
          action="detail"
          busyAction={captureStatus.busyAction}
          label={t(locale, "action.detail")}
          onRun={() => runAction("detail", () => fetch("/api/public/benefits/123"))}
        />
        <ActionButton
          action="save"
          busyAction={captureStatus.busyAction}
          label={t(locale, "action.save")}
          onRun={() =>
            runAction("save", () =>
              fetch("/api/account/saved-benefit", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ benefitId: 123 })
              })
            )
          }
        />
        <ActionButton
          action="admin"
          busyAction={captureStatus.busyAction}
          label={t(locale, "action.admin")}
          onRun={() =>
            runAction("admin", () =>
              fetch("/api/admin/sync", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ source: "catalog" })
              })
            )
          }
        />
        <ActionButton
          action="redeem"
          busyAction={captureStatus.busyAction}
          label={t(locale, "action.redeem")}
          onRun={() =>
            runAction("redeem", () =>
              fetch("/api/account/redeem", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ benefitId: 123 })
              })
            )
          }
        />
      </div>
    </section>
  );
}

function ActionButton({
  action,
  busyAction,
  label,
  onRun
}: {
  action: string;
  busyAction: string | null;
  label: string;
  onRun: () => Promise<void>;
}): JSX.Element {
  return (
    <button
      data-anlyx-action={action}
      data-anlyx-label={label}
      disabled={busyAction !== null}
      type="button"
      onClick={() => void onRun()}
    >
      <MousePointerClick size={15} />
      {label}
    </button>
  );
}

type TimingDisplayRow =
  | {
      id: string;
      kind: "node";
      label: string;
      icon: LucideIcon;
      node: FlowNode;
    }
  | {
      id: string;
      kind: "backend-summary";
      label: string;
      icon: LucideIcon;
      span: BackendSpan;
      spanCount: number;
    }
  | {
      id: string;
      kind: "span";
      label: string;
      icon: LucideIcon;
      span: BackendSpan;
    };

type TimingOverviewItem = {
  id: string;
  layer: FlowLayer;
  status: FlowNodeStatus;
  durationMs: number;
  offsetMs: number;
};

type TimingIdleSegment = {
  id: string;
  startMs: number;
  endMs: number;
};

function timingDisplayRows(flow: FlowRecord, showBackendDetail: boolean): TimingDisplayRow[] {
  if (flow.outcome === "success" && flow.backendSpans?.length) {
    const baseRows = [timingRows[0], timingRows[1], timingRows[2], timingRows[3]];
    const resultRow = timingRows[7];
    const detailSpans = flow.backendSpans.filter((span) => span.id !== "controller-span");
    const summarySpan = backendSummarySpan(detailSpans);
    const expandedDetailSpans = summarySpan
      ? detailSpans.filter((span) => span.id !== summarySpan.id)
      : detailSpans;
    const rows = baseRows.reduce<TimingDisplayRow[]>((items, row) => {
      const node = flow.nodes.find((item) => item.id === row.id);

      if (!node) return items;

      items.push({
        id: row.id,
        kind: "node",
        label: row.label,
        icon: row.icon,
        node
      });

      return items;
    }, []);

    if (summarySpan) {
      rows.push({
        id: "backend-detail-summary",
        kind: "backend-summary",
        label: layerLabel(summarySpan.layer),
        icon: layerIconFor(summarySpan.layer),
        span: summarySpan,
        spanCount: expandedDetailSpans.length
      });
    }

    if (showBackendDetail) {
      expandedDetailSpans.forEach((span) => {
        rows.push({
          id: span.id,
          kind: "span",
          label: layerLabel(span.layer),
          icon: layerIconFor(span.layer),
          span
        });
      });
    }

    const result = flow.nodes.find((item) => item.id === resultRow.id);

    if (result) {
      rows.push({
        id: resultRow.id,
        kind: "node",
        label: resultRow.label,
        icon: resultRow.icon,
        node: result
      });
    }

    return rows;
  }

  const orderedRows: TimingRowDefinition[] = [
    timingRows[0],
    timingRows[1],
    timingRows[2],
    timingRows[3],
    timingRows[7],
    timingRows[4],
    timingRows[5],
    timingRows[6]
  ];

  return orderedRows.reduce<TimingDisplayRow[]>((rows, row) => {
    const node = flow.nodes.find((item) => item.id === row.id);

    if (!node) return rows;

    rows.push({
      id: row.id,
      kind: "node",
      label: row.label,
      icon: row.icon,
      node
    });

    return rows;
  }, []);
}

function timingOverviewItems(rows: TimingDisplayRow[]): TimingOverviewItem[] {
  return rows.reduce<TimingOverviewItem[]>((items, row) => {
    if (row.kind === "node") {
      if (row.node.status === "not-proven" || !row.node.durationMs) return items;

      items.push({
        id: row.node.id,
        layer: row.node.layer,
        status: row.node.status,
        durationMs: row.node.durationMs,
        offsetMs: row.node.offsetMs ?? 0
      });

      return items;
    }

    if (row.kind === "backend-summary") {
      items.push({
        id: row.id,
        layer: row.span.layer,
        status: "matched",
        durationMs: row.span.durationMs,
        offsetMs: row.span.offsetMs
      });

      return items;
    }

    items.push({
      id: row.span.id,
      layer: row.span.layer,
      status: "matched",
      durationMs: row.span.durationMs,
      offsetMs: row.span.offsetMs
    });

    return items;
  }, []);
}

function TimingWaterfallView({
  flow,
  locale
}: {
  flow: FlowRecord;
  locale: WorkspaceLocale;
}): JSX.Element {
  const totalDurationMs = Math.max(flow.totalDurationMs, 1);
  const [showBackendDetail, setShowBackendDetail] = useState(false);
  const displayRows = timingDisplayRows(flow, showBackendDetail);
  const overviewItems = timingOverviewItems(displayRows);
  const slowest = timingBottleneck(overviewItems);
  const [showIdleTime, setShowIdleTime] = useState(false);
  const [viewRange, setViewRange] = useState({ startMs: 0, endMs: totalDurationMs });
  const normalizedRange = normalizeTimingRange(viewRange, totalDurationMs);
  const visibleDurationMs = Math.max(normalizedRange.endMs - normalizedRange.startMs, 1);
  const ticks = timingTicks(normalizedRange.startMs, normalizedRange.endMs);
  const tickCount = Math.max(ticks.length - 1, 1);
  const zoomPercent = Math.round((totalDurationMs / visibleDurationMs) * 100);
  const idleSegments = showIdleTime ? timingIdleSegments(overviewItems, totalDurationMs) : [];

  useEffect(() => {
    setViewRange({ startMs: 0, endMs: totalDurationMs });
  }, [flow.id, totalDurationMs]);

  const fitTimeline = () => setViewRange({ startMs: 0, endMs: totalDurationMs });
  const zoomIn = () => {
    const center = (normalizedRange.startMs + normalizedRange.endMs) / 2;
    const nextDuration = Math.max(totalDurationMs * 0.18, visibleDurationMs / 1.45);

    setViewRange(rangeAround(center, nextDuration, totalDurationMs));
  };
  const focusSlowest = () => {
    if (!slowest) return;

    const center = slowest.offsetMs + slowest.durationMs / 2;
    const nextDuration = Math.min(
      totalDurationMs * 0.72,
      Math.max(totalDurationMs * 0.24, slowest.durationMs * 1.25, 48)
    );

    setViewRange(rangeAround(center, nextDuration, totalDurationMs));
  };

  return (
    <>
      <section className="waterfall-card">
        <div className="waterfall-toolbar">
          <div className="duration-chip">
            {t(locale, "timing.totalDuration")}&nbsp; <strong>{flow.totalDurationMs} ms</strong>
          </div>
          <div className="waterfall-toolbar__right">
            <button
              aria-pressed={showIdleTime}
              className="idle-toggle"
              type="button"
              onClick={() => setShowIdleTime((current) => !current)}
            >
              <span>{t(locale, "timing.showIdle")}</span>
              <i className="toggle" />
            </button>
            <div className="zoom-group">
              <button type="button" onClick={fitTimeline}>
                {t(locale, "timing.fit")}
              </button>
              <button type="button" onClick={fitTimeline}>
                {zoomPercent}%
              </button>
            </div>
            <div className="zoom-icons">
              <button aria-label="Focus slowest segment" type="button" onClick={focusSlowest}>
                <Search size={17} />
              </button>
              <button aria-label="Zoom in" type="button" onClick={zoomIn}>
                <Plus size={17} />
              </button>
            </div>
          </div>
        </div>
        <TimingOverview
          flow={flow}
          axisMax={totalDurationMs}
          displayRows={displayRows}
          locale={locale}
          tickCount={1}
          ticks={[0, flow.totalDurationMs]}
        />
        <div className="waterfall-grid">
          <div className="waterfall-axis">
            <span>{t(locale, "timing.layer")}</span>
            <span>{t(locale, "timing.node")}</span>
            <span>{t(locale, "timing.duration")}</span>
            <div
              className="waterfall-axis__timeline"
              style={{ "--tick-count": tickCount } as CSSProperties}
            >
              {ticks.map((tick) => (
                <strong key={tick} style={{ left: `${timeToPercent(tick, normalizedRange)}%` }}>
                  {Math.round(tick)} ms
                </strong>
              ))}
            </div>
          </div>
          {displayRows.map((row) =>
            row.kind === "node" ? (
              <WaterfallRow
                idleSegments={idleSegments}
                key={row.id}
                node={row.node}
                label={layerLabel(row.node.layer, locale)}
                icon={row.icon}
                showIdleTime={showIdleTime}
                tickCount={tickCount}
                totalDurationMs={flow.totalDurationMs}
                viewRange={normalizedRange}
              />
            ) : row.kind === "backend-summary" ? (
              <BackendSummaryRow
                expanded={showBackendDetail}
                idleSegments={idleSegments}
                key={row.id}
                span={row.span}
                spanCount={row.spanCount}
                label={layerLabel(row.span.layer, locale)}
                locale={locale}
                icon={row.icon}
                onToggle={() => setShowBackendDetail((current) => !current)}
                showIdleTime={showIdleTime}
                tickCount={tickCount}
                totalDurationMs={flow.totalDurationMs}
                viewRange={normalizedRange}
              />
            ) : (
              <BackendWaterfallRow
                idleSegments={idleSegments}
                key={row.id}
                span={row.span}
                label={layerLabel(row.span.layer, locale)}
                icon={row.icon}
                showIdleTime={showIdleTime}
                tickCount={tickCount}
                totalDurationMs={flow.totalDurationMs}
                viewRange={normalizedRange}
              />
            )
          )}
        </div>
        <DurationLegend />
      </section>
    </>
  );
}

function BackendWaterfallRow({
  icon: Icon,
  idleSegments,
  label,
  showIdleTime,
  span,
  tickCount,
  totalDurationMs,
  viewRange
}: {
  icon: LucideIcon;
  idleSegments: TimingIdleSegment[];
  label: string;
  showIdleTime: boolean;
  span: BackendSpan;
  tickCount: number;
  totalDurationMs: number;
  viewRange: { startMs: number; endMs: number };
}): JSX.Element {
  const barStyle = timeSpanStyle(span.offsetMs, span.durationMs, viewRange, 1.8);
  const share = durationShare(span.durationMs, totalDurationMs);
  const isReturn = span.id.includes("return");
  const depth = backendSpanDepth(span);

  return (
    <div
      className={`waterfall-row waterfall-row--${span.layer} waterfall-row--backend-span ${
        isReturn ? "is-return-span" : ""
      }`}
    >
      <div className="waterfall-layer waterfall-layer--nested">
        <span className={`layer-icon layer-icon--${span.layer}`}>
          <Icon size={18} />
        </span>
        <span>{label}</span>
      </div>
      <div
        className="waterfall-node waterfall-node--nested"
        style={{ "--depth": depth } as CSSProperties}
      >
        <div className="waterfall-node__title">
          <strong title={span.title}>{span.title}</strong>
          <span className="evidence-badge evidence-badge--source">
            {isReturn ? "return" : "span"}
          </span>
        </div>
        <span title={span.subtitle}>{span.subtitle}</span>
      </div>
      <div className="waterfall-duration">
        <strong>{span.durationMs} ms</strong>
        <small>{isReturn ? "return path" : `estimate · ${share}%`}</small>
      </div>
      <div className="waterfall-track" style={{ "--tick-count": tickCount } as CSSProperties}>
        {showIdleTime && <IdleSegments segments={idleSegments} viewRange={viewRange} />}
        <span
          className={`waterfall-bar waterfall-bar--${span.layer} waterfall-bar--backend-span${
            isReturn ? " is-return" : ""
          }`}
          style={barStyle}
        />
      </div>
    </div>
  );
}

function BackendSummaryRow({
  expanded,
  icon: Icon,
  idleSegments,
  label,
  locale,
  onToggle,
  showIdleTime,
  span,
  spanCount,
  tickCount,
  totalDurationMs,
  viewRange
}: {
  expanded: boolean;
  icon: LucideIcon;
  idleSegments: TimingIdleSegment[];
  label: string;
  locale: WorkspaceLocale;
  onToggle: () => void;
  showIdleTime: boolean;
  span: BackendSpan;
  spanCount: number;
  tickCount: number;
  totalDurationMs: number;
  viewRange: { startMs: number; endMs: number };
}): JSX.Element {
  const barStyle = timeSpanStyle(span.offsetMs, span.durationMs, viewRange, 1.8);
  const share = durationShare(span.durationMs, totalDurationMs);

  return (
    <div className="waterfall-row waterfall-row--backend-summary">
      <div className="waterfall-layer">
        <span className={`layer-icon layer-icon--${span.layer}`}>
          <Icon size={18} />
        </span>
        <span>{label}</span>
      </div>
      <div className="waterfall-node">
        <div className="waterfall-node__title">
          <strong title={span.title}>{span.title}</strong>
          <span className="evidence-badge evidence-badge--source">
            {t(locale, "timing.longestSegment")}
          </span>
        </div>
        <span title={span.subtitle}>{span.subtitle}</span>
      </div>
      <div className="waterfall-duration waterfall-duration--toggle">
        <strong>{span.durationMs} ms</strong>
        <small>estimate · {share}%</small>
        <button aria-expanded={expanded} type="button" onClick={onToggle}>
          <ChevronRight size={14} />
          {expanded ? t(locale, "timing.hideDetail") : t(locale, "timing.showDetail")}
        </button>
        <em>{t(locale, "timing.spanCount").replace("{count}", String(spanCount))}</em>
      </div>
      <div className="waterfall-track" style={{ "--tick-count": tickCount } as CSSProperties}>
        {showIdleTime && <IdleSegments segments={idleSegments} viewRange={viewRange} />}
        <span
          className="waterfall-bar waterfall-bar--service waterfall-bar--backend-summary"
          style={barStyle}
        />
      </div>
    </div>
  );
}

function IdleSegments({
  segments,
  viewRange
}: {
  segments: TimingIdleSegment[];
  viewRange: { startMs: number; endMs: number };
}): JSX.Element {
  return (
    <>
      {segments.map((segment) => {
        const width = visibleSpanWidth(segment.startMs, segment.endMs - segment.startMs, viewRange);

        if (width <= 0) return null;

        return (
          <span
            aria-hidden="true"
            className="waterfall-idle-segment"
            key={segment.id}
            style={{
              left: `${timeToPercent(segment.startMs, viewRange)}%`,
              width: `${width}%`
            }}
          />
        );
      })}
    </>
  );
}

function TimingOverview({
  axisMax,
  displayRows,
  flow,
  locale,
  tickCount,
  ticks
}: {
  axisMax: number;
  displayRows: TimingDisplayRow[];
  flow: FlowRecord;
  locale: WorkspaceLocale;
  tickCount: number;
  ticks: number[];
}): JSX.Element {
  const overviewItems = timingOverviewItems(displayRows);
  const bottleneck = timingBottleneck(overviewItems);

  return (
    <section className="timing-overview" aria-label="Total duration overview">
      <div className="timing-overview__top">
        <div>
          <span>{t(locale, "timing.totalDuration")}</span>
          <strong>0 ms to {flow.totalDurationMs} ms</strong>
        </div>
        {bottleneck ? (
          <p>
            {t(locale, "timing.slowest")}: <strong>{layerLabel(bottleneck.layer, locale)}</strong>{" "}
            <span>{bottleneck.durationMs} ms</span>
          </p>
        ) : null}
      </div>
      <div className="timing-overview__rail" style={{ "--tick-count": tickCount } as CSSProperties}>
        <div className="timing-overview__axis">
          {ticks.map((tick) => (
            <strong key={tick} style={{ left: `${(tick / axisMax) * 100}%` }}>
              {tick === 0
                ? "0"
                : tick === ticks[ticks.length - 1]
                  ? `${flow.totalDurationMs} ms`
                  : ""}
            </strong>
          ))}
        </div>
        {overviewItems.map((item) => {
          const left = Math.min((item.offsetMs / axisMax) * 100, 100);
          const Icon = layerIconFor(item.layer);
          const isBottleneck = bottleneck?.id === item.id;

          return (
            <span
              aria-label={`${layerLabel(item.layer)} starts at ${item.offsetMs} ms`}
              className={`timing-marker timing-marker--${item.layer} timing-marker--${item.status}${
                isBottleneck ? " is-bottleneck" : ""
              }`}
              key={item.id}
              style={{ left: `${left}%` }}
              title={`${layerLabel(item.layer)} · ${item.durationMs} ms`}
            >
              <i />
              <b>
                <Icon size={16} />
              </b>
              {isBottleneck ? <em>{t(locale, "timing.slowestShort")}</em> : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function WaterfallRow({
  idleSegments,
  node,
  label,
  icon: Icon,
  showIdleTime,
  tickCount,
  totalDurationMs,
  viewRange
}: {
  idleSegments: TimingIdleSegment[];
  node: FlowNode;
  label: string;
  icon: LucideIcon;
  showIdleTime: boolean;
  tickCount: number;
  totalDurationMs: number;
  viewRange: { startMs: number; endMs: number };
}): JSX.Element {
  const offsetMs = node.offsetMs ?? 0;
  const durationMs = node.durationMs ?? 0;
  const isResultMarker = node.layer === "result";
  const barStyle = timeSpanStyle(offsetMs, durationMs, viewRange, isResultMarker ? 0.65 : 2);
  const muted = node.status === "not-proven";
  const share = durationShare(durationMs, totalDurationMs);

  const neutralDecision =
    node.layer === "auth" || node.layer === "result" ? node.status === "matched" : false;

  return (
    <div
      className={`waterfall-row waterfall-row--${node.layer} ${muted ? "is-muted" : ""} ${
        neutralDecision ? "is-neutral" : ""
      }`}
    >
      <div className="waterfall-layer">
        <span className={`layer-icon layer-icon--${node.layer}`}>
          <Icon size={18} />
        </span>
        <span>{label}</span>
      </div>
      <div className="waterfall-node">
        <div className="waterfall-node__title">
          <strong title={node.title}>{node.title}</strong>
          <span className={`evidence-badge evidence-badge--${evidenceTone(node)}`}>
            {evidenceLabel(node)}
          </span>
        </div>
        <span title={node.subtitle}>{node.subtitle}</span>
      </div>
      <div className="waterfall-duration">
        {node.durationMs ? (
          <>
            <strong>{node.durationMs} ms</strong>
            <small>{durationCaption(node, share)}</small>
          </>
        ) : (
          <>
            <strong>-</strong>
            <small>not proven</small>
          </>
        )}
      </div>
      <div className="waterfall-track" style={{ "--tick-count": tickCount } as CSSProperties}>
        {showIdleTime && <IdleSegments segments={idleSegments} viewRange={viewRange} />}
        {muted ? (
          <span className="waterfall-not-proven-label">known by source scan only</span>
        ) : (
          <span
            className={`waterfall-bar waterfall-bar--${node.layer}${
              isResultMarker ? " is-marker" : ""
            }`}
            style={barStyle}
          />
        )}
        {node.id === "auth" && node.status === "inferred" && (
          <span className="row-badge row-badge--red">Blocked here</span>
        )}
        {node.id === "result" && node.status === "blocked" && (
          <span className="row-badge row-badge--orange">Blocked</span>
        )}
      </div>
    </div>
  );
}

function backendSpanDepth(span: BackendSpan): number {
  if (span.layer === "service") return 1;
  if (span.layer === "repository") return 2;
  if (span.layer === "database") return 3;

  return span.id.includes("return") ? 1 : 0;
}

function backendSummarySpan(spans: BackendSpan[]): BackendSpan | undefined {
  const serviceSpans = spans.filter((span) => span.layer === "service");
  const candidates = serviceSpans.length ? serviceSpans : spans;

  return [...candidates].sort((first, second) => second.durationMs - first.durationMs)[0];
}

function DiagramFlowView({
  flow,
  locale
}: {
  flow: FlowRecord;
  locale: WorkspaceLocale;
}): JSX.Element {
  const [zoom, setZoom] = useState(0.82);
  const nodeTypes = useMemo(() => ({ anlyxNode: DemoLayeredFlowNode }), []);
  const edgeTypes = useMemo(() => ({ anlyxSmooth: DemoLayeredSmoothEdge }), []);
  const model = useMemo(() => buildDemoReactFlowDiagram(flow, locale), [flow, locale]);

  useEffect(() => {
    setZoom(0.82);
  }, [flow.id]);

  return (
    <section className="diagram-canvas-card">
      <div className="diagram-canvas-toolbar">
        <div className="diagram-legend">
          <span>
            <i className="solid-line" />
            {t(locale, "diagram.provenPath")}
          </span>
          <span>
            <i className="dashed-line" />
            {t(locale, "diagram.knownPath")}
          </span>
          <span>
            <Circle size={12} />
            {t(locale, "diagram.entry")}
          </span>
        </div>
        <div className="diagram-controls">
          <button type="button" onClick={() => setZoom(0.82)}>
            <Gauge size={16} />
            {t(locale, "diagram.fitView")}
          </button>
          <button type="button" onClick={() => setZoom(1)}>
            <RotateCw size={16} />
            {t(locale, "diagram.reset")}
          </button>
          <div>
            <button
              aria-label="Zoom out diagram"
              type="button"
              onClick={() => setZoom((value) => Math.max(0.72, value - 0.1))}
            >
              <Minus size={16} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              aria-label="Zoom in diagram"
              type="button"
              onClick={() => setZoom((value) => Math.min(1.2, value + 0.1))}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
      <div
        className="diagram-canvas diagram-canvas--layered"
        style={
          {
            "--diagram-stage-height": `${Math.ceil(model.canvasHeight * zoom + 72)}px`
          } as CSSProperties
        }
      >
        <div
          className={`layered-diagram layered-diagram--react-flow ${
            zoom === 0.82 ? "layered-diagram--fit" : ""
          }`}
          style={
            {
              "--layered-column-height": `${model.canvasHeight - 50}px`,
              transform: `scale(${zoom})`
            } as CSSProperties
          }
        >
          {model.layers.map((layer) => (
            <LayeredDiagramColumnBackdrop
              hasSecondaryNodes={model.nodes.some(
                (node) => node.data.node.layer === layer && !node.data.node.isMainPath
              )}
              key={layer}
              layer={layer}
              locale={locale}
            />
          ))}
          <ReactFlow
            className="layered-react-flow"
            edgeTypes={edgeTypes}
            edges={model.edges}
            fitView={false}
            maxZoom={1}
            minZoom={1}
            nodes={model.nodes}
            nodesConnectable={false}
            nodesDraggable={false}
            nodeTypes={nodeTypes}
            panOnDrag={false}
            preventScrolling={false}
            proOptions={{ hideAttribution: true }}
            zoomOnDoubleClick={false}
            zoomOnPinch={false}
            zoomOnScroll={false}
          />
        </div>
      </div>
      <div className="layered-diagram-status">
        <span>
          <i className="status-dot status-dot--success" />
          {locale === "ko" ? "성공" : "Success"}
        </span>
        <span>
          <i className="status-dot status-dot--warning" />
          {locale === "ko" ? "주의" : "Warning"}
        </span>
        <span>
          <i className="status-dot status-dot--error" />
          {locale === "ko" ? "오류" : "Error"}
        </span>
        <span>
          <i className="dashed-line" />
          {locale === "ko" ? "미확인" : "not proven"}
        </span>
        <strong>
          {t(locale, "timing.totalDuration")}: {flow.totalDurationMs} ms
        </strong>
      </div>
    </section>
  );
}

type DiagramLayerId = "browser" | "api" | "application" | "data" | "response";
type DemoDiagramNodeStatus =
  | "observed"
  | "matched"
  | "source_matched"
  | "inferred"
  | "not_proven"
  | "success"
  | "blocked";
type DemoDiagramEdgeKind = "executed" | "source_matched" | "inferred" | "not_proven" | "blocked";

type DemoLayeredDiagramNode = {
  id: string;
  sourceNode: FlowNode;
  layer: DiagramLayerId;
  kind: FlowLayer;
  title: string;
  subtitle: string;
  durationMs?: number;
  status: DemoDiagramNodeStatus;
  edgeKind: DemoDiagramEdgeKind;
  isMainPath: boolean;
  slot: number;
  x: number;
  y: number;
};

type DemoLayeredDiagramEdge = {
  id: string;
  from: string;
  to: string;
  kind: DemoDiagramEdgeKind;
};

type DemoReactFlowNodeData = {
  node: DemoLayeredDiagramNode;
};

type DemoReactFlowEdgeData = {
  kind: DemoDiagramEdgeKind;
};

type DemoReactFlowNode = Node<DemoReactFlowNodeData, "anlyxNode">;
type DemoReactFlowEdge = Edge<DemoReactFlowEdgeData, "anlyxSmooth">;

type DemoReactFlowDiagramModel = {
  layers: DiagramLayerId[];
  nodes: DemoReactFlowNode[];
  edges: DemoReactFlowEdge[];
  canvasHeight: number;
};

const layeredDiagramLayers: DiagramLayerId[] = [
  "browser",
  "api",
  "application",
  "data",
  "response"
];

const layeredLayout = {
  canvasHeight: 610,
  columnWidth: 220,
  nodeWidth: 180,
  nodeHeight: 148,
  mainStartY: 98,
  mainGap: 172,
  secondaryStartY: 430,
  secondaryGap: 158,
  layerX: {
    browser: 0,
    api: 260,
    application: 520,
    data: 860,
    response: 1120
  } satisfies Record<DiagramLayerId, number>
} as const;

function LayeredDiagramColumnBackdrop({
  hasSecondaryNodes,
  layer,
  locale
}: {
  hasSecondaryNodes: boolean;
  layer: DiagramLayerId;
  locale: WorkspaceLocale;
}): JSX.Element {
  const heading = layeredLayerMeta(layer, locale);
  const Icon = heading.icon;

  return (
    <section
      className={`layered-column layered-column--${layer}`}
      style={{ left: layeredLayout.layerX[layer] }}
    >
      <header className="layered-column__header">
        <span>
          <Icon size={22} />
        </span>
        <div>
          <strong>{heading.title}</strong>
          <small>{heading.subtitle}</small>
        </div>
      </header>
      {hasSecondaryNodes ? (
        <div className="layered-column__divider layered-column__divider--absolute">
          {locale === "ko" ? "알려졌지만 미확인" : "Known but not proven"}
        </div>
      ) : null}
    </section>
  );
}

function DemoLayeredFlowNode({ data }: NodeProps<DemoReactFlowNode>): JSX.Element {
  return <LayeredNodeCard node={data.node} />;
}

function LayeredNodeCard({ node }: { node: DemoLayeredDiagramNode }): JSX.Element {
  const Icon = layeredNodeIcon(node);

  return (
    <article
      className={`layered-node layered-node--${node.layer} layered-node--${node.status} ${
        node.isMainPath ? "is-main-path" : "is-secondary-path"
      } ${node.kind === "action" ? "is-entry-point" : ""}`}
      title={`${node.title} · ${node.subtitle}`}
    >
      <Handle className="anlyx-flow-handle" id="left" position={Position.Left} type="target" />
      <Handle className="anlyx-flow-handle" id="right" position={Position.Right} type="source" />
      <Handle className="anlyx-flow-handle" id="top" position={Position.Top} type="target" />
      <Handle className="anlyx-flow-handle" id="top" position={Position.Top} type="source" />
      <Handle className="anlyx-flow-handle" id="bottom" position={Position.Bottom} type="source" />
      <Handle className="anlyx-flow-handle" id="bottom" position={Position.Bottom} type="target" />
      {node.kind === "action" ? <span className="layered-node__entry" aria-hidden="true" /> : null}
      <span className={`layered-node__icon layered-node__icon--${node.layer}`}>
        <Icon size={20} />
      </span>
      <span className="layered-node__state">
        {node.status === "not_proven" ? <Minus size={13} /> : <Check size={13} />}
      </span>
      <strong>{node.title}</strong>
      <small>{node.subtitle}</small>
      <div className="layered-node__meta">
        <span>{node.durationMs !== undefined ? `${node.durationMs} ms` : "—"}</span>
        <em>{demoDiagramNodeStatusLabel(node.status)}</em>
      </div>
    </article>
  );
}

function DemoLayeredSmoothEdge({
  data,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY
}: EdgeProps<DemoReactFlowEdge>): JSX.Element {
  const [path] = getSmoothStepPath({
    borderRadius: 18,
    offset: 26,
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY
  });
  const kind = data?.kind ?? "executed";

  return (
    <>
      <path className={`anlyx-flow-edge-halo anlyx-flow-edge-halo--${kind}`} d={path} />
      <BaseEdge className={`anlyx-flow-edge anlyx-flow-edge--${kind}`} path={path} />
    </>
  );
}

function buildDemoReactFlowDiagram(
  flow: FlowRecord,
  locale: WorkspaceLocale
): DemoReactFlowDiagramModel {
  const diagramNodes = assignLayeredNodePositions(
    diagramNodesForFlow(flow).map((node) => toLayeredDiagramNode(node, flow, locale))
  );
  const diagramEdges = buildLayeredDiagramEdges(diagramNodes);

  return {
    layers: layeredDiagramLayers,
    canvasHeight: diagramCanvasHeight(diagramNodes),
    nodes: diagramNodes.map((node) => ({
      id: node.id,
      type: "anlyxNode",
      position: { x: node.x, y: node.y },
      data: { node },
      draggable: false,
      selectable: false
    })),
    edges: diagramEdges.map((edge) => {
      const from = diagramNodes.find((node) => node.id === edge.from);
      const to = diagramNodes.find((node) => node.id === edge.to);
      const handles = from && to ? reactFlowHandlesForEdge(from, to) : {};

      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: "anlyxSmooth",
        data: { kind: edge.kind },
        focusable: false,
        selectable: false,
        ...handles
      };
    })
  };
}

function diagramNodesForFlow(flow: FlowRecord): FlowNode[] {
  const order: FlowLayer[] =
    flow.outcome === "success"
      ? ["action", "api", "controller", "auth", "service", "repository", "database", "result"]
      : ["action", "api", "controller", "auth", "result", "service", "repository", "database"];

  return order
    .map((layer) => flow.nodes.find((node) => node.layer === layer))
    .filter((node): node is FlowNode => Boolean(node));
}

function diagramCanvasHeight(nodes: DemoLayeredDiagramNode[]): number {
  return Math.max(
    layeredLayout.canvasHeight,
    ...nodes.map((node) => node.y + layeredLayout.nodeHeight + 110)
  );
}

function assignLayeredNodePositions(nodes: DemoLayeredDiagramNode[]): DemoLayeredDiagramNode[] {
  const mainSlotByLayer = new Map<DiagramLayerId, number>();
  const secondarySlotByLayer = new Map<DiagramLayerId, number>();

  return nodes.map((node) => {
    const slotMap = node.isMainPath ? mainSlotByLayer : secondarySlotByLayer;
    const slot = slotMap.get(node.layer) ?? 0;
    const y = node.isMainPath
      ? layeredLayout.mainStartY + slot * layeredLayout.mainGap
      : layeredLayout.secondaryStartY + slot * layeredLayout.secondaryGap;

    slotMap.set(node.layer, slot + 1);

    return {
      ...node,
      slot,
      x:
        layeredLayout.layerX[node.layer] +
        (layeredLayout.columnWidth - layeredLayout.nodeWidth) / 2,
      y
    };
  });
}

function toLayeredDiagramNode(
  node: FlowNode,
  flow: FlowRecord,
  locale: WorkspaceLocale
): DemoLayeredDiagramNode {
  const status = layeredDiagramNodeStatus(node, flow);

  return {
    id: node.id,
    sourceNode: node,
    layer: diagramLayerForFlowLayer(node.layer),
    kind: node.layer,
    title: layeredDiagramTitle(node, flow, locale),
    subtitle: layeredDiagramSubtitle(node, flow, locale),
    status,
    edgeKind: edgeKindForNode(node, status),
    isMainPath: node.proven,
    slot: 0,
    x: 0,
    y: 0,
    ...(node.durationMs !== undefined ? { durationMs: node.durationMs } : {})
  };
}

function buildLayeredDiagramEdges(nodes: DemoLayeredDiagramNode[]): DemoLayeredDiagramEdge[] {
  const mainNodes = nodes.filter((node) => node.isMainPath).sort(compareLayeredNodes);
  const secondaryNodes = nodes.filter((node) => !node.isMainPath).sort(compareLayeredNodes);
  const edges: DemoLayeredDiagramEdge[] = [];

  for (let index = 0; index < mainNodes.length - 1; index += 1) {
    const from = mainNodes[index];
    const to = mainNodes[index + 1];

    if (from && to) {
      edges.push({
        id: `${from.id}->${to.id}`,
        from: from.id,
        to: to.id,
        kind: edgeKindBetween(from, to)
      });
    }
  }

  const anchor =
    mainNodes.find((node) => node.layer === "application" && node.kind !== "controller") ??
    mainNodes.find((node) => node.layer === "application") ??
    mainNodes.find((node) => node.layer === "api");

  if (anchor) {
    for (const node of secondaryNodes) {
      edges.push({
        id: `${anchor.id}->${node.id}`,
        from: anchor.id,
        to: node.id,
        kind: "not_proven"
      });
    }
  }

  return edges;
}

function compareLayeredNodes(
  first: DemoLayeredDiagramNode,
  second: DemoLayeredDiagramNode
): number {
  const layerDelta =
    layeredDiagramLayers.indexOf(first.layer) - layeredDiagramLayers.indexOf(second.layer);
  if (layerDelta !== 0) return layerDelta;

  return flowLayerOrder(first.kind) - flowLayerOrder(second.kind);
}

function flowLayerOrder(layer: FlowLayer): number {
  return timingRows.findIndex((row) => row.id === layer);
}

function reactFlowHandlesForEdge(
  from: DemoLayeredDiagramNode,
  to: DemoLayeredDiagramNode
): Pick<DemoReactFlowEdge, "sourceHandle" | "targetHandle"> {
  if (from.layer === to.layer) {
    return to.y > from.y
      ? { sourceHandle: "bottom", targetHandle: "top" }
      : { sourceHandle: "top", targetHandle: "bottom" };
  }

  return { sourceHandle: "right", targetHandle: "left" };
}

function edgeKindBetween(
  from: DemoLayeredDiagramNode,
  to: DemoLayeredDiagramNode
): DemoDiagramEdgeKind {
  if (from.status === "blocked" || to.status === "blocked") return "blocked";
  if (from.status === "inferred" || to.status === "inferred") return "inferred";
  if (from.status === "source_matched" || to.status === "source_matched") return "source_matched";
  return "executed";
}

function edgeKindForNode(node: FlowNode, status: DemoDiagramNodeStatus): DemoDiagramEdgeKind {
  if (status === "blocked") return "blocked";
  if (status === "inferred") return "inferred";
  if (!node.proven || status === "not_proven") return "not_proven";
  if (node.layer !== "action" && node.layer !== "api" && node.layer !== "result") {
    return "source_matched";
  }
  return "executed";
}

function diagramLayerForFlowLayer(layer: FlowLayer): DiagramLayerId {
  if (layer === "action") return "browser";
  if (layer === "api") return "api";
  if (layer === "repository" || layer === "database") return "data";
  if (layer === "result") return "response";
  return "application";
}

function layeredDiagramNodeStatus(node: FlowNode, flow: FlowRecord): DemoDiagramNodeStatus {
  if (!node.proven || node.status === "not-proven") return "not_proven";
  if (node.status === "blocked") return "blocked";
  if (node.status === "inferred") return "inferred";
  if (node.layer === "result" && flow.outcome === "success") return "success";
  if (node.layer === "action" || node.layer === "api") return "observed";
  if (node.layer !== "result") return "source_matched";
  return "matched";
}

function layeredDiagramTitle(node: FlowNode, flow: FlowRecord, locale: WorkspaceLocale): string {
  if (node.layer === "action") return locale === "ko" ? "사용자 액션" : "User Action";
  if (node.layer === "api") return locale === "ko" ? "HTTP 요청" : "HTTP Request";
  if (node.layer === "result") return flow.outcome === "success" ? "OK" : flow.outcomeLabel;
  return diagramTitle(node);
}

function layeredDiagramSubtitle(
  node: FlowNode,
  flow: FlowRecord,
  _locale: WorkspaceLocale
): string {
  if (node.layer === "action") return flow.sourceAction ?? node.title;
  if (node.layer === "api") return `${flow.method} ${flow.shortPath}`;
  if (node.layer === "result") return node.subtitle ?? flow.outcomeLabel;
  return node.title;
}

function layeredLayerMeta(
  layer: DiagramLayerId,
  locale: WorkspaceLocale
): { icon: LucideIcon; title: string; subtitle: string } {
  const ko = locale === "ko";

  if (layer === "browser") {
    return {
      icon: MousePointerClick,
      title: ko ? "브라우저" : "Browser",
      subtitle: ko ? "사용자 상호작용" : "User interaction"
    };
  }

  if (layer === "api") {
    return {
      icon: Network,
      title: "API",
      subtitle: ko ? "요청과 라우팅" : "Edge & routing"
    };
  }

  if (layer === "application") {
    return {
      icon: Workflow,
      title: ko ? "애플리케이션" : "Application",
      subtitle: ko ? "비즈니스 로직" : "Business logic"
    };
  }

  if (layer === "data") {
    return {
      icon: Database,
      title: ko ? "데이터" : "Data",
      subtitle: ko ? "저장소 계층" : "Persistence layer"
    };
  }

  return {
    icon: Flag,
    title: ko ? "응답" : "Response",
    subtitle: ko ? "클라이언트로 반환" : "Back to client"
  };
}

function layeredNodeIcon(node: DemoLayeredDiagramNode): LucideIcon {
  if (node.kind === "action") return MousePointerClick;
  if (node.kind === "api") return Network;
  if (node.kind === "auth") return Lock;
  if (node.kind === "service") return Layers3;
  if (node.kind === "repository") return Box;
  if (node.kind === "database") return Database;
  if (node.kind === "result") return Flag;
  if (node.kind === "controller") return FileCode2;
  return Circle;
}

function demoDiagramNodeStatusLabel(status: DemoDiagramNodeStatus): string {
  if (status === "observed") return "observed";
  if (status === "source_matched") return "source matched";
  if (status === "inferred") return "inferred";
  if (status === "not_proven") return "not proven";
  if (status === "success") return "success";
  if (status === "blocked") return "blocked";
  return "matched";
}

function FlowInspectorPanel({
  flow,
  events,
  locale,
  selectedEventId,
  onSelectEvent
}: {
  flow: FlowRecord;
  events: DemoLiveEvent[];
  locale: WorkspaceLocale;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
}): JSX.Element {
  const browserObservedCount = flow.nodes.filter(
    (node) => node.layer === "action" || node.layer === "api" || node.layer === "result"
  ).length;
  const sourceMatchedCount = flow.nodes.filter(
    (node) =>
      node.proven && node.layer !== "action" && node.layer !== "api" && node.layer !== "result"
  ).length;
  const notProvenCount = flow.nodes.filter((node) => node.status === "not-proven").length;
  const outcomeSummary = inspectorOutcomeSummary(flow, locale);
  const evidenceItems = flow.nodes
    .flatMap((node) => node.evidence ?? [])
    .slice(0, 5)
    .map(formatEvidenceItem);

  return (
    <aside className="flow-inspector">
      <div className="inspector-title">
        <h2>Anlyx Flow</h2>
      </div>
      <InspectorSection title={t(locale, "inspector.recent")} count={String(events.length)}>
        <RecentEventsList
          events={events}
          locale={locale}
          selectedEventId={selectedEventId}
          onSelectEvent={onSelectEvent}
        />
      </InspectorSection>
      <InspectorSection title={t(locale, "inspector.request")}>
        <dl className="request-dl">
          <div>
            <dt>{t(locale, "inspector.method")}</dt>
            <dd>
              <span className="method-pill">{flow.method}</span>
            </dd>
          </div>
          <div>
            <dt>{t(locale, "inspector.path")}</dt>
            <dd>{flow.shortPath}</dd>
          </div>
        </dl>
      </InspectorSection>
      <InspectorSection title={t(locale, "inspector.outcome")}>
        <span className={`outcome-pill outcome-pill--${flow.outcome}`}>
          {flow.statusCode}&nbsp;&nbsp;
          {flow.outcome === "success" ? t(locale, "status.ok") : t(locale, "status.blocked")}
        </span>
        <p>
          <strong>{outcomeSummary.title}</strong>
          {outcomeSummary.description}
        </p>
      </InspectorSection>
      <InspectorSection title={t(locale, "timing.totalDuration")}>
        <p className="metric-line">
          <Clock3 size={17} />
          <strong>{flow.totalDurationMs} ms</strong>
        </p>
      </InspectorSection>
      <InspectorSection title={t(locale, "inspector.mappingConfidence")}>
        <div className="confidence-row">
          <span className="confidence-chip">{capitalize(flow.confidence)}</span>
          <ConfidenceBars />
        </div>
        <p className="confidence-note">{confidenceDescription(flow, locale)}</p>
      </InspectorSection>
      <InspectorSection
        title={t(locale, "inspector.evidenceUsed")}
        count={String(evidenceItems.length)}
      >
        <ul className="evidence-list">
          {evidenceItems.map((item) => (
            <li key={item}>
              <Check size={14} />
              {item}
            </li>
          ))}
        </ul>
      </InspectorSection>
      <InspectorSection title={t(locale, "inspector.coverage")}>
        <div className="layers-bar">
          <span />
          <span />
          <span />
        </div>
        <small>
          {t(locale, "coverage.browser")} {browserObservedCount} · {t(locale, "coverage.source")}{" "}
          {sourceMatchedCount} · {t(locale, "coverage.notProven")} {notProvenCount}
        </small>
      </InspectorSection>
      <InspectorSection title={t(locale, "inspector.traceNote")}>
        <p>{flowNote(flow, locale)}</p>
      </InspectorSection>
    </aside>
  );
}

function RecentEventsList({
  events,
  locale,
  selectedEventId,
  onSelectEvent
}: {
  events: DemoLiveEvent[];
  locale: WorkspaceLocale;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
}): JSX.Element {
  if (events.length === 0) {
    return <p className="events-empty">{t(locale, "events.empty")}</p>;
  }

  return (
    <div className="recent-events">
      {events.slice(0, 5).map((event) => (
        <button
          className={`flow-event-card${event.id === selectedEventId ? " is-selected" : ""}`}
          key={event.id}
          type="button"
          onClick={() => onSelectEvent(event.id)}
        >
          <span>{event.method}</span>
          <strong>{event.flow.shortPath}</strong>
          <small>
            {event.status} · {Math.round(event.durationMs)} ms
          </small>
        </button>
      ))}
    </div>
  );
}

function SummaryFlowView({
  flow,
  locale
}: {
  flow: FlowRecord;
  locale: WorkspaceLocale;
}): JSX.Element {
  const orderedNodes = diagramNodesForFlow(flow);
  const provenNodes = orderedNodes.filter((node) => node.proven);
  const downstreamNodes = orderedNodes.filter((node) => !node.proven);

  return (
    <section className="summary-view">
      <SummaryPathSection
        badge={layerCountLabel(provenNodes.length, locale)}
        locale={locale}
        nodes={provenNodes}
        title={t(locale, "summary.provenPath")}
      />

      {downstreamNodes.length > 0 ? (
        <SummaryPathSection
          badge={layerCountLabel(downstreamNodes.length, locale)}
          locale={locale}
          muted
          nodes={downstreamNodes}
          title={t(locale, "summary.downstreamPath")}
        />
      ) : null}

      <div className="summary-note">
        <Shield size={17} />
        <p>{t(locale, "summary.note")}</p>
      </div>
    </section>
  );
}

function SummaryPathSection({
  badge,
  locale,
  muted = false,
  nodes,
  title
}: {
  badge: string;
  locale: WorkspaceLocale;
  muted?: boolean;
  nodes: FlowNode[];
  title: string;
}): JSX.Element {
  return (
    <article className={`summary-path-card${muted ? " summary-path-card--muted" : ""}`}>
      <div className="summary-path-heading">
        <h3>
          {title}
          {muted ? <span>({t(locale, "summary.notProvenExecuted")})</span> : null}
        </h3>
        <small>{badge}</small>
      </div>
      <div className="summary-steps">
        {nodes.map((node, index) => (
          <SummaryStep key={node.id} index={index + 1} locale={locale} muted={muted} node={node} />
        ))}
      </div>
    </article>
  );
}

function SummaryStep({
  index,
  locale,
  muted,
  node
}: {
  index: number;
  locale: WorkspaceLocale;
  muted: boolean;
  node: FlowNode;
}): JSX.Element {
  const Icon = layerIconFor(node.layer);

  return (
    <div className={`summary-step summary-step--${node.status}${muted ? " is-muted" : ""}`}>
      <span className="summary-step__index">{index}</span>
      <span className="summary-step__icon">
        <Icon size={21} />
      </span>
      <div className="summary-step__copy">
        <small>{layerLabel(node.layer, locale)}</small>
        <strong>{node.method ? `${node.method} ${node.subtitle ?? ""}` : node.title}</strong>
        <span>{node.method ? node.path : node.subtitle}</span>
      </div>
      <span className="summary-step__duration">
        {node.durationMs ? `${node.durationMs} ms` : "-"}
      </span>
      <span className={`summary-status summary-status--${node.status}`}>
        {summaryStatusLabel(node.status)}
      </span>
    </div>
  );
}

function InspectorSection({
  title,
  count,
  children
}: {
  title: string;
  count?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="inspector-section">
      <h3>
        {title}
        {count && <span>{count}</span>}
      </h3>
      {children}
    </section>
  );
}

function DurationLegend(): JSX.Element {
  return (
    <div className="duration-legend">
      <span>
        <i className="legend-blue" />
        Request/Processing
      </span>
      <span>
        <i className="legend-purple" />
        Source estimate
      </span>
      <span>
        <i className="legend-red" />
        Auth / Decision
      </span>
      <span>
        <i className="legend-orange" />
        Result
      </span>
      <span>
        <i className="legend-hatched" />
        Not proven
      </span>
    </div>
  );
}

function CaptureLiveBadge({ connected }: { connected: boolean }): JSX.Element {
  return (
    <span
      aria-label={connected ? "Anlyx capture connected" : "Anlyx capture disconnected"}
      className={`capture-connection-dot${connected ? " is-connected" : ""}`}
      role="status"
    />
  );
}

function ConfidenceBars(): JSX.Element {
  return (
    <span className="confidence-bars" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function flowNote(flow: FlowRecord, locale: WorkspaceLocale = "en"): string {
  const hasUnprovenDownstream = flow.nodes.some(
    (node) =>
      (node.layer === "service" || node.layer === "repository" || node.layer === "database") &&
      !node.proven
  );

  if (hasUnprovenDownstream) {
    return locale === "ko"
      ? "흐리게 표시된 레이어는 소스 스캔으로만 확인된 경로이며, 실제 런타임 실행이 증명된 것은 아닙니다."
      : "Muted layers are known by source scan only and are not proven runtime execution.";
  }

  return locale === "ko"
    ? "브라우저 레이어는 페이지에서 관찰된 요청입니다. 소스 레이어의 시간은 스캔된 백엔드 근거를 바탕으로 만든 데모 타이밍입니다."
    : "Browser rows are observed in the page. Source rows are demo timing from scanned backend evidence.";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function inspectorOutcomeSummary(
  flow: FlowRecord,
  locale: WorkspaceLocale = "en"
): { title: string; description: string } {
  if (flow.outcome === "success") {
    return {
      title: statusTitle(flow, locale),
      description:
        locale === "ko"
          ? "요청이 완료됐고 스캔된 백엔드 경로와 매칭됐습니다."
          : "Request completed and matched the scanned backend path."
    };
  }

  if (flow.statusCode === 409) {
    return {
      title: statusTitle(flow, locale),
      description:
        locale === "ko"
          ? "요청이 백엔드 결정 분기까지 도달했고 차단 결과를 반환했습니다."
          : "Request reached a backend decision branch and returned a blocked result."
    };
  }

  return {
    title: statusTitle(flow, locale),
    description:
      locale === "ko"
        ? "하위 비즈니스 로직 실행이 증명되기 전에 요청이 멈췄습니다."
        : "Request stopped before downstream business logic was proven executed."
  };
}

function statusTitle(flow: FlowRecord, locale: WorkspaceLocale = "en"): string {
  if (flow.statusCode === 200) return locale === "ko" ? "정상 응답" : "OK";
  if (flow.statusCode === 401) return locale === "ko" ? "인증 필요" : "Unauthorized";
  if (flow.statusCode === 403) return locale === "ko" ? "권한 없음" : "Forbidden";
  if (flow.statusCode === 409) return locale === "ko" ? "충돌" : "Conflict";

  return flow.outcome === "success" ? t(locale, "status.completed") : t(locale, "status.blocked");
}

function confidenceDescription(flow: FlowRecord, locale: WorkspaceLocale = "en"): string {
  if (flow.confidence === "high") {
    return locale === "ko"
      ? "브라우저 요청, 엔드포인트, 컨트롤러, 소스 근거가 모두 매칭됐습니다."
      : "Browser request, endpoint, controller, and source evidence all matched.";
  }

  if (flow.confidence === "medium") {
    return locale === "ko"
      ? "브라우저 요청은 매칭됐고, 일부 소스 근거가 확인됐습니다."
      : "Browser request matched, with partial source evidence.";
  }

  return locale === "ko"
    ? "브라우저 요청은 관찰됐지만 백엔드 매핑은 아직 불완전합니다."
    : "Browser request was observed, but backend mapping is incomplete.";
}

function formatEvidenceItem(item: string): string {
  const labels: Record<string, string> = {
    "Click event captured": "Click captured in browser",
    "Browser fetch observed": "Fetch/XHR observed",
    "Endpoint matched": "Endpoint matched",
    "Controller match": "Controller matched",
    "Decision branch observed": "Decision branch observed",
    "Known scanned path": "Scanned backend path",
    "Response observed": "Response observed",
    "status blocked": "Blocked status observed"
  };

  if (item.endsWith(".java")) {
    return `Source evidence: ${item}`;
  }

  return labels[item] ?? item;
}

function layerIconFor(layer: FlowLayer): LucideIcon {
  if (layer === "action") return MousePointerClick;
  if (layer === "api") return Network;
  if (layer === "controller") return FileCode2;
  if (layer === "auth") return Lock;
  if (layer === "service") return Layers3;
  if (layer === "repository") return Database;
  if (layer === "database") return Box;
  return Flag;
}

function layerLabel(layer: FlowLayer, locale: WorkspaceLocale = "en"): string {
  const labels: Record<FlowLayer, { en: string; ko: string }> = {
    action: { en: "Action", ko: "사용자 액션" },
    api: { en: "API", ko: "API 요청" },
    controller: { en: "Controller", ko: "컨트롤러" },
    auth: { en: "Auth / Session", ko: "인증 / 세션" },
    service: { en: "Service", ko: "서비스" },
    repository: { en: "Repository", ko: "레포지토리" },
    database: { en: "Database", ko: "데이터베이스" },
    result: { en: "Result", ko: "응답 결과" }
  };

  return labels[layer][locale];
}

function tabLabel(tab: WorkspaceTab, locale: WorkspaceLocale): string {
  if (tab === "summary") return t(locale, "tabs.summary");
  if (tab === "timing") return t(locale, "tabs.timing");
  return t(locale, "tabs.diagram");
}

function layerCountLabel(count: number, locale: WorkspaceLocale): string {
  return locale === "ko" ? `${count}개 레이어` : `${count} layers`;
}

const translations = {
  en: {
    "nav.flows": "Flows",
    "language.aria": "Switch workspace language",
    "header.flow": "Flow",
    "header.title": "Matched backend flow",
    "header.subtitle": "Browser request first, scanned backend path follows.",
    "tabs.summary": "Summary",
    "tabs.timing": "Timing",
    "tabs.diagram": "Diagram",
    "example.aria": "Example request actions",
    "example.title": "Example",
    "example.connected": "Demo-only actions connected to live Anlyx capture",
    "example.heading": "Example request actions",
    "example.description":
      "These example buttons send real browser requests so the workspace can show how Anlyx maps each request to fixture-backed backend evidence.",
    "example.actions": "Demo actions",
    "action.search": "Search benefits",
    "action.detail": "Open detail",
    "action.save": "Save perk",
    "action.admin": "Admin sync",
    "action.redeem": "Redeem perk",
    "timing.showIdle": "Show idle time",
    "timing.fit": "Fit",
    "timing.layer": "Layer",
    "timing.node": "Node",
    "timing.duration": "Duration",
    "timing.totalDuration": "Total duration",
    "timing.slowest": "Slowest shown segment",
    "timing.slowestShort": "Slowest",
    "timing.longestSegment": "longest",
    "timing.showDetail": "Show detail",
    "timing.hideDetail": "Hide detail",
    "timing.spanCount": "{count} spans",
    "diagram.provenPath": "Proven executed path",
    "diagram.knownPath": "Known path (not proven)",
    "diagram.entry": "Entry point",
    "diagram.fitView": "Fit view",
    "diagram.reset": "Reset",
    "diagram.captionMatched": "Downstream path matched by browser request and scanned evidence",
    "diagram.captionNotProven": "Known scanned path, not proven executed",
    "inspector.recent": "Recent requests",
    "inspector.request": "Request",
    "inspector.method": "Method",
    "inspector.path": "Path",
    "inspector.outcome": "Outcome",
    "inspector.mappingConfidence": "Mapping confidence",
    "inspector.evidenceUsed": "Evidence used",
    "inspector.coverage": "Coverage",
    "inspector.traceNote": "Trace note",
    "coverage.browser": "Browser",
    "coverage.source": "Source",
    "coverage.notProven": "Not proven",
    "events.empty": "Click an Example action to stream the first browser request.",
    "status.ok": "OK",
    "status.blocked": "Blocked",
    "status.completed": "Completed",
    "summary.verdict": "Request verdict",
    "summary.total": "total",
    "summary.provenPath": "Observed / source-matched path",
    "summary.downstreamPath": "Possible downstream path",
    "summary.notProvenExecuted": "not proven executed",
    "summary.note":
      "Anlyx mapped this browser-observed request to scanned backend evidence. Source-derived nodes are not a runtime trace unless marked as proven by request evidence."
  },
  ko: {
    "nav.flows": "흐름",
    "language.aria": "워크스페이스 언어 전환",
    "header.flow": "흐름",
    "header.title": "매칭된 백엔드 흐름",
    "header.subtitle": "브라우저 요청을 먼저 보고, 스캔된 백엔드 경로를 이어서 보여줍니다.",
    "tabs.summary": "요약",
    "tabs.timing": "타이밍",
    "tabs.diagram": "다이어그램",
    "example.aria": "예시 요청 액션",
    "example.title": "예시",
    "example.connected": "라이브 캡처와 연결된 데모 전용 액션",
    "example.heading": "예시 요청 액션",
    "example.description":
      "아래 버튼은 실제 브라우저 요청을 보냅니다. Anlyx는 이 요청을 데모용 백엔드 근거와 매칭해 워크스페이스에 보여줍니다.",
    "example.actions": "데모 액션",
    "action.search": "혜택 검색",
    "action.detail": "상세 열기",
    "action.save": "혜택 저장",
    "action.admin": "관리자 동기화",
    "action.redeem": "혜택 사용",
    "timing.showIdle": "빈 시간 보기",
    "timing.fit": "맞춤",
    "timing.layer": "레이어",
    "timing.node": "노드",
    "timing.duration": "소요 시간",
    "timing.totalDuration": "전체 소요 시간",
    "timing.slowest": "가장 긴 구간",
    "timing.slowestShort": "최장",
    "timing.longestSegment": "최장 구간",
    "timing.showDetail": "상세 열기",
    "timing.hideDetail": "상세 닫기",
    "timing.spanCount": "상세 {count}개",
    "diagram.provenPath": "실행이 확인된 경로",
    "diagram.knownPath": "스캔된 경로 (실행 미확인)",
    "diagram.entry": "시작점",
    "diagram.fitView": "화면 맞춤",
    "diagram.reset": "초기화",
    "diagram.captionMatched": "브라우저 요청과 스캔 근거로 하위 경로가 매칭됐습니다",
    "diagram.captionNotProven": "스캔으로 확인된 경로지만 실제 실행은 증명되지 않았습니다",
    "inspector.recent": "최근 요청",
    "inspector.request": "요청",
    "inspector.method": "메서드",
    "inspector.path": "경로",
    "inspector.outcome": "결과",
    "inspector.mappingConfidence": "매핑 신뢰도",
    "inspector.evidenceUsed": "사용된 근거",
    "inspector.coverage": "근거 범위",
    "inspector.traceNote": "트레이스 참고",
    "coverage.browser": "브라우저",
    "coverage.source": "소스",
    "coverage.notProven": "미확인",
    "events.empty": "예시 액션을 클릭하면 첫 브라우저 요청이 실시간으로 들어옵니다.",
    "status.ok": "정상",
    "status.blocked": "차단됨",
    "status.completed": "완료",
    "summary.verdict": "요청 판정",
    "summary.total": "전체",
    "summary.provenPath": "관측 / 소스 매칭 경로",
    "summary.downstreamPath": "가능한 하위 경로",
    "summary.notProvenExecuted": "실행 미확인",
    "summary.note":
      "Anlyx는 브라우저에서 관찰한 요청을 스캔된 백엔드 근거와 매칭합니다. 요청 근거로 증명되지 않은 소스 기반 노드는 런타임 트레이스가 아닙니다."
  }
} as const satisfies Record<WorkspaceLocale, Record<string, string>>;

function t(locale: WorkspaceLocale, key: keyof (typeof translations)["en"]): string {
  return translations[locale][key];
}

function summaryStatusLabel(status: FlowNodeStatus): string {
  if (status === "not-proven") return "scanned";
  return status;
}

function timingTicks(startMs: number, endMs?: number): number[] {
  const axisStart = endMs === undefined ? 0 : startMs;
  const axisEnd = endMs === undefined ? startMs : endMs;
  const duration = Math.max(axisEnd - axisStart, 1);

  return [
    axisStart,
    axisStart + duration * 0.25,
    axisStart + duration * 0.5,
    axisStart + duration * 0.75,
    axisEnd
  ];
}

function normalizeTimingRange(
  range: { startMs: number; endMs: number },
  totalDurationMs: number
): { startMs: number; endMs: number } {
  const minimumDuration = Math.min(Math.max(totalDurationMs * 0.18, 32), totalDurationMs);
  const startMs = clamp(range.startMs, 0, Math.max(totalDurationMs - minimumDuration, 0));
  const endMs = clamp(range.endMs, startMs + minimumDuration, totalDurationMs);

  return { startMs, endMs };
}

function rangeAround(
  centerMs: number,
  durationMs: number,
  totalDurationMs: number
): { startMs: number; endMs: number } {
  const clampedDuration = clamp(durationMs, 1, totalDurationMs);
  const startMs = clamp(centerMs - clampedDuration / 2, 0, totalDurationMs - clampedDuration);

  return {
    startMs,
    endMs: startMs + clampedDuration
  };
}

function timeToPercent(timeMs: number, range: { startMs: number; endMs: number }): number {
  const duration = Math.max(range.endMs - range.startMs, 1);

  return clamp(((timeMs - range.startMs) / duration) * 100, 0, 100);
}

function visibleSpanWidth(
  startMs: number,
  durationMs: number,
  range: { startMs: number; endMs: number }
): number {
  const visibleStart = Math.max(startMs, range.startMs);
  const visibleEnd = Math.min(startMs + durationMs, range.endMs);

  if (visibleEnd <= visibleStart) return 0;

  return ((visibleEnd - visibleStart) / Math.max(range.endMs - range.startMs, 1)) * 100;
}

function timeSpanStyle(
  startMs: number,
  durationMs: number,
  range: { startMs: number; endMs: number },
  minimumWidthPercent: number
): CSSProperties {
  const width = visibleSpanWidth(startMs, durationMs, range);

  if (width <= 0) {
    return { left: "-9999px", width: 0 };
  }

  return {
    left: `${timeToPercent(startMs, range)}%`,
    width: `${Math.max(width, minimumWidthPercent)}%`
  };
}

function timingIdleSegments(
  items: TimingOverviewItem[],
  totalDurationMs: number
): TimingIdleSegment[] {
  const spans = items
    .filter(
      (item) =>
        item.layer !== "action" &&
        item.layer !== "api" &&
        item.layer !== "result" &&
        item.durationMs > 0
    )
    .map((item) => ({
      startMs: item.offsetMs,
      endMs: Math.min(item.offsetMs + item.durationMs, totalDurationMs)
    }))
    .sort((first, second) => first.startMs - second.startMs);
  const merged = spans.reduce<Array<{ startMs: number; endMs: number }>>((items, span) => {
    const last = items[items.length - 1];

    if (last && span.startMs <= last.endMs) {
      last.endMs = Math.max(last.endMs, span.endMs);
      return items;
    }

    items.push({ ...span });
    return items;
  }, []);
  const gaps: TimingIdleSegment[] = [];
  let cursor = 0;

  merged.forEach((span, index) => {
    if (span.startMs - cursor >= 8) {
      gaps.push({ id: `idle-${index}`, startMs: cursor, endMs: span.startMs });
    }

    cursor = Math.max(cursor, span.endMs);
  });

  if (totalDurationMs - cursor >= 8) {
    gaps.push({ id: "idle-end", startMs: cursor, endMs: totalDurationMs });
  }

  return gaps;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function durationShare(durationMs: number, totalDurationMs: number): number {
  if (durationMs <= 0 || totalDurationMs <= 0) {
    return 0;
  }

  return Math.max(1, Math.round((durationMs / totalDurationMs) * 100));
}

function durationCaption(node: FlowNode, share: number): string {
  if (node.layer === "action" || node.layer === "api") {
    return "browser span";
  }

  if (node.status === "not-proven") {
    return "not proven";
  }

  if (node.layer === "result") {
    return "response marker";
  }

  return `estimate · ${share}%`;
}

function evidenceLabel(node: FlowNode): string {
  if (node.layer === "action" || node.layer === "api") return "browser";
  if (node.layer === "result" && node.status === "matched") return "observed";
  if (node.status === "not-proven") return "not proven";
  if (node.status === "inferred") return "inferred";
  if (node.status === "blocked") return "blocked";
  return "estimate";
}

function evidenceTone(node: FlowNode): string {
  if (node.layer === "action" || node.layer === "api") return "browser";
  if (node.layer === "result" && node.status === "matched") return "browser";
  if (node.status === "not-proven") return "muted";
  if (node.status === "inferred") return "inferred";
  if (node.status === "blocked") return "blocked";
  return "source";
}

function timingBottleneck(items: TimingOverviewItem[]): TimingOverviewItem | undefined {
  const candidates = items.filter(
    (item) =>
      item.durationMs &&
      item.status !== "not-proven" &&
      item.layer !== "action" &&
      item.layer !== "api"
  );

  return candidates.sort((first, second) => second.durationMs - first.durationMs)[0];
}

function diagramTitle(node?: FlowNode): string {
  if (!node) {
    return "";
  }

  if (node.layer === "api") return "API";
  if (node.layer === "controller") return "Controller";
  if (node.layer === "auth") return "Auth / Session";
  if (node.layer === "result") return "Result";
  if (node.layer === "service") return "Service";
  if (node.layer === "repository") return "Repository";
  if (node.layer === "database") return "Database";
  return node.title;
}

function diagramSubtitle(node?: FlowNode): string {
  if (!node) {
    return "";
  }

  if (node.layer === "api") return `${node.method ?? "POST"}\n${node.subtitle ?? node.path ?? ""}`;
  if (node.layer === "auth") return "Auth gate";
  if (node.layer === "result") return node.subtitle ?? node.title;
  return node.subtitle ?? node.title;
}

function diagramStatusLabel(node: FlowNode): string {
  if (node.status === "not-proven") return "Not proven";
  if (node.status === "inferred") return "Inferred";
  if (node.status === "blocked") return "Blocked";
  if (node.layer === "api" || node.layer === "result") return "Observed";

  return "Matched";
}
