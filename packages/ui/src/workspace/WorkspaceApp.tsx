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
  Minus,
  Network,
  Plus,
  RotateCw,
  Search,
  Shield,
  Workflow,
  Zap
} from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { BackendObservedSpan, FlowLayer, FlowRecord, ScanResult } from "@anlyx/core";

type WorkspaceTab = "summary" | "timing" | "diagram";
type WorkspaceLocale = "en" | "ko";
type TranslationKey =
  | "appLabel"
  | "sidebarLabel"
  | "primaryNavLabel"
  | "flows"
  | "docs"
  | "language"
  | "flowViews"
  | "flow"
  | "waiting"
  | "matchedBackendFlow"
  | "liveWorkspace"
  | "captureConnected"
  | "waitingForCapture"
  | "matchedSubtitle"
  | "readyPrefix"
  | "readySuffix"
  | "selectedRequest"
  | "selectedRequestLabel"
  | "requestEvidenceSummary"
  | "mappedEvidence"
  | "mappedEvidenceWithRuntime"
  | "controllerPending"
  | "flowTiming"
  | "totalDuration"
  | "showIdleTime"
  | "fit"
  | "focusSlowestSegment"
  | "zoomIn"
  | "totalDurationOverview"
  | "slowestShownSegment"
  | "startsAt"
  | "layer"
  | "node"
  | "duration"
  | "notProven"
  | "knownBySourceOnly"
  | "bottleneck"
  | "slowestSourceSegment"
  | "blocked"
  | "flowSummary"
  | "observedSourceMatchedPath"
  | "summaryMatchedCopy"
  | "layers"
  | "knownDownstreamPath"
  | "summaryNote"
  | "flowDiagram"
  | "observedSourceMatchedLegend"
  | "knownDownstreamLegend"
  | "entryPoint"
  | "fitView"
  | "reset"
  | "zoomOut"
  | "authDecision"
  | "backend"
  | "service"
  | "repository"
  | "database"
  | "noScannedNode"
  | "downstreamMatched"
  | "knownScannedNotProven"
  | "inferred"
  | "matched"
  | "evidenceInspector"
  | "anlyxFlow"
  | "recentRequests"
  | "request"
  | "method"
  | "path"
  | "outcome"
  | "mappingConfidence"
  | "evidenceUsed"
  | "coverage"
  | "traceNote"
  | "keepWorkspaceOpen"
  | "firstRequestHint"
  | "waitingForBrowserRequests"
  | "liveCaptureReady"
  | "noRequestSelected"
  | "emptyWorkspaceCopy"
  | "requestProcessing"
  | "application"
  | "authDecisionLegend"
  | "result"
  | "pending"
  | "ok"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "serverError"
  | "observed"
  | "sourceMatched"
  | "browserSpan"
  | "browserObserved"
  | "devRuntimeSpan"
  | "sourceDerivedEstimate"
  | "responseMarker"
  | "estimate"
  | "browser"
  | "source"
  | "backendCoverage";

const WorkspaceLocaleContext = createContext<WorkspaceLocale>("en");

const translations: Record<WorkspaceLocale, Record<TranslationKey, string>> = {
  en: {
    appLabel: "Anlyx live workspace",
    sidebarLabel: "Workspace navigation",
    primaryNavLabel: "Primary",
    flows: "Flows",
    docs: "Docs",
    language: "Language",
    flowViews: "Flow views",
    flow: "Flow",
    waiting: "waiting",
    matchedBackendFlow: "Matched backend flow",
    liveWorkspace: "Live workspace",
    captureConnected: "Capture connected",
    waitingForCapture: "Waiting for capture",
    matchedSubtitle: "Browser request first, scanned backend path follows.",
    readyPrefix: "is ready. Use your local app and Anlyx will stream requests here.",
    readySuffix: "",
    selectedRequest: "Selected request",
    selectedRequestLabel: "Selected request",
    requestEvidenceSummary: "Request evidence summary",
    mappedEvidence: "Browser-observed request mapped to scanned backend evidence.",
    mappedEvidenceWithRuntime:
      "Browser-observed request mapped to scanned backend evidence and development runtime spans.",
    controllerPending: "Controller pending",
    flowTiming: "Flow timing",
    totalDuration: "Total duration",
    showIdleTime: "Show idle time",
    fit: "Fit",
    focusSlowestSegment: "Focus slowest segment",
    zoomIn: "Zoom in",
    totalDurationOverview: "Total duration overview",
    slowestShownSegment: "Slowest shown segment",
    startsAt: "starts at",
    layer: "Layer",
    node: "Node",
    duration: "Duration",
    notProven: "not proven",
    knownBySourceOnly: "known by source scan only",
    bottleneck: "Bottleneck",
    slowestSourceSegment: "Slowest source segment",
    blocked: "blocked",
    flowSummary: "Flow summary",
    observedSourceMatchedPath: "Observed / source-matched path",
    summaryMatchedCopy: "Browser-observed request first, then scanned backend evidence.",
    layers: "layers",
    knownDownstreamPath: "Known downstream path",
    summaryNote:
      "Anlyx maps this browser-observed request to scanned backend evidence. Source-matched rows are not a production runtime trace; muted rows were not proven executed.",
    flowDiagram: "Flow diagram",
    observedSourceMatchedLegend: "Observed / source-matched path",
    knownDownstreamLegend: "Known downstream (not proven)",
    entryPoint: "Entry point",
    fitView: "Fit view",
    reset: "Reset",
    zoomOut: "Zoom out",
    authDecision: "Auth / Decision",
    backend: "Backend",
    service: "Service",
    repository: "Repository",
    database: "Database",
    noScannedNode: "No scanned node matched",
    downstreamMatched: "Downstream path matched by browser request and scanned evidence",
    knownScannedNotProven: "Known scanned path, not proven executed",
    inferred: "Inferred",
    matched: "Matched",
    evidenceInspector: "Evidence inspector",
    anlyxFlow: "Anlyx Flow",
    recentRequests: "Recent requests",
    request: "Request",
    method: "Method",
    path: "Path",
    outcome: "Outcome",
    mappingConfidence: "Mapping confidence",
    evidenceUsed: "Evidence used",
    coverage: "Coverage",
    traceNote: "Trace note",
    keepWorkspaceOpen:
      "Keep this workspace open, then use your local app. Captured requests will appear here.",
    firstRequestHint: "Click your local app to stream the first browser request.",
    waitingForBrowserRequests: "Waiting for browser requests",
    liveCaptureReady: "Live capture ready",
    noRequestSelected: "No request selected yet",
    emptyWorkspaceCopy: "has scanned endpoints. Open your local app and click an API action.",
    requestProcessing: "Request/Processing",
    application: "Application",
    authDecisionLegend: "Auth / Decision",
    result: "Result",
    pending: "Pending",
    ok: "OK",
    unauthorized: "Unauthorized",
    forbidden: "Forbidden",
    conflict: "Conflict",
    serverError: "Server error",
    observed: "observed",
    sourceMatched: "source matched",
    browserSpan: "browser span",
    browserObserved: "browser observed",
    devRuntimeSpan: "dev runtime span",
    sourceDerivedEstimate: "source-derived estimate",
    responseMarker: "response marker",
    estimate: "estimate",
    browser: "Browser",
    source: "Source",
    backendCoverage: "Backend"
  },
  ko: {
    appLabel: "Anlyx 라이브 워크스페이스",
    sidebarLabel: "워크스페이스 내비게이션",
    primaryNavLabel: "주 메뉴",
    flows: "흐름",
    docs: "문서",
    language: "언어",
    flowViews: "흐름 보기",
    flow: "흐름",
    waiting: "대기 중",
    matchedBackendFlow: "매칭된 백엔드 흐름",
    liveWorkspace: "라이브 워크스페이스",
    captureConnected: "캡처 연결됨",
    waitingForCapture: "캡처 대기 중",
    matchedSubtitle: "브라우저 요청을 먼저 보고, 스캔된 백엔드 경로를 이어서 보여줍니다.",
    readyPrefix: "준비되었습니다. 로컬 앱을 사용하면 Anlyx가 요청을 이곳으로 스트리밍합니다.",
    readySuffix: "",
    selectedRequest: "선택된 요청",
    selectedRequestLabel: "선택된 요청",
    requestEvidenceSummary: "요청 근거 요약",
    mappedEvidence: "브라우저에서 관찰된 요청을 스캔된 백엔드 근거와 매칭했습니다.",
    mappedEvidenceWithRuntime:
      "브라우저에서 관찰된 요청을 스캔된 백엔드 근거와 개발용 런타임 span에 매칭했습니다.",
    controllerPending: "컨트롤러 확인 대기",
    flowTiming: "흐름 타이밍",
    totalDuration: "전체 소요 시간",
    showIdleTime: "빈 구간 표시",
    fit: "맞춤",
    focusSlowestSegment: "가장 느린 구간 강조",
    zoomIn: "확대",
    totalDurationOverview: "전체 소요 시간 요약",
    slowestShownSegment: "가장 긴 구간",
    startsAt: "시작",
    layer: "레이어",
    node: "노드",
    duration: "소요 시간",
    notProven: "실행 확인 안 됨",
    knownBySourceOnly: "소스 스캔으로만 확인됨",
    bottleneck: "병목",
    slowestSourceSegment: "가장 긴 소스 구간",
    blocked: "차단됨",
    flowSummary: "흐름 요약",
    observedSourceMatchedPath: "관찰 / 소스 매칭 경로",
    summaryMatchedCopy: "브라우저 요청을 먼저 보여주고, 이어서 스캔된 백엔드 근거를 보여줍니다.",
    layers: "개 레이어",
    knownDownstreamPath: "알려진 하위 경로",
    summaryNote:
      "Anlyx는 브라우저에서 관찰된 요청을 스캔된 백엔드 근거와 연결합니다. 소스 매칭 행은 운영 런타임 트레이스가 아니며, 흐리게 표시된 행은 실제 실행이 확인되지 않았습니다.",
    flowDiagram: "흐름 다이어그램",
    observedSourceMatchedLegend: "관찰 / 소스 매칭 경로",
    knownDownstreamLegend: "알려진 하위 경로(실행 미확인)",
    entryPoint: "진입점",
    fitView: "화면 맞춤",
    reset: "초기화",
    zoomOut: "축소",
    authDecision: "인증 / 결정",
    backend: "백엔드",
    service: "서비스",
    repository: "레포지토리",
    database: "데이터베이스",
    noScannedNode: "매칭된 스캔 노드 없음",
    downstreamMatched: "브라우저 요청과 스캔 근거로 하위 경로가 매칭되었습니다",
    knownScannedNotProven: "스캔으로 알려진 경로지만 실행은 확인되지 않았습니다",
    inferred: "추론됨",
    matched: "매칭됨",
    evidenceInspector: "근거 인스펙터",
    anlyxFlow: "Anlyx 흐름",
    recentRequests: "최근 요청",
    request: "요청",
    method: "메서드",
    path: "경로",
    outcome: "결과",
    mappingConfidence: "매핑 신뢰도",
    evidenceUsed: "사용된 근거",
    coverage: "근거 범위",
    traceNote: "트레이스 참고",
    keepWorkspaceOpen:
      "이 워크스페이스를 열어둔 뒤 로컬 앱을 사용하세요. 캡처된 요청이 이곳에 표시됩니다.",
    firstRequestHint: "로컬 앱을 클릭하면 첫 브라우저 요청이 스트리밍됩니다.",
    waitingForBrowserRequests: "브라우저 요청 대기 중",
    liveCaptureReady: "라이브 캡처 준비됨",
    noRequestSelected: "아직 선택된 요청이 없습니다",
    emptyWorkspaceCopy: "개의 엔드포인트가 스캔되어 있습니다. 로컬 앱에서 API 액션을 클릭하세요.",
    requestProcessing: "요청/처리",
    application: "애플리케이션",
    authDecisionLegend: "인증 / 결정",
    result: "결과",
    pending: "대기 중",
    ok: "정상",
    unauthorized: "인증 필요",
    forbidden: "권한 없음",
    conflict: "충돌",
    serverError: "서버 오류",
    observed: "관찰됨",
    sourceMatched: "소스 매칭",
    browserSpan: "브라우저 구간",
    browserObserved: "브라우저 관찰",
    devRuntimeSpan: "개발 런타임 구간",
    sourceDerivedEstimate: "소스 기반 추정",
    responseMarker: "응답 지점",
    estimate: "추정",
    browser: "브라우저",
    source: "소스",
    backendCoverage: "백엔드"
  }
};

function useWorkspaceLocale(): WorkspaceLocale {
  return useContext(WorkspaceLocaleContext);
}

function t(locale: WorkspaceLocale, key: TranslationKey): string {
  return translations[locale][key] ?? translations.en[key];
}

export type WorkspaceAppProps = {
  data: ScanResult;
  streamUrl?: string;
  initialRecords?: FlowRecord[];
};

const layerOrder: readonly FlowLayer["type"][] = [
  "action",
  "api",
  "controller",
  "auth",
  "decision",
  "service",
  "repository",
  "database",
  "result"
];

const layerIcons: Partial<Record<FlowLayer["type"], LucideIcon>> = {
  action: Zap,
  api: Network,
  auth: Lock,
  controller: FileCode2,
  database: Database,
  decision: Lock,
  repository: Box,
  result: Flag,
  service: Layers3
};

export function WorkspaceApp({
  data,
  streamUrl = "/_anlyx/events/stream",
  initialRecords = []
}: WorkspaceAppProps): JSX.Element {
  const [records, setRecords] = useState<FlowRecord[]>(initialRecords);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialRecords[0]?.id);
  const [tab, setTab] = useState<WorkspaceTab>("timing");
  const [locale, setLocale] = useState<WorkspaceLocale>("en");
  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0];

  useEffect(() => {
    if (!selectedId && records[0]) {
      setSelectedId(records[0].id);
    }
  }, [records, selectedId]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return undefined;
    }

    const source = new EventSource(streamUrl);
    const handleFlow = (event: MessageEvent<string>) => {
      const record = parseFlowRecord(event.data);

      if (!record) {
        return;
      }

      setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      setSelectedId((current) =>
        record.trigger === "user_action" || !current ? record.id : current
      );
    };

    source.addEventListener("flow", handleFlow);

    return () => {
      source.removeEventListener("flow", handleFlow);
      source.close();
    };
  }, [streamUrl]);

  return (
    <WorkspaceLocaleContext.Provider value={locale}>
      <main
        className={`live-workspace live-workspace--${tab}`}
        role="application"
        aria-label={t(locale, "appLabel")}
      >
        <WorkspaceSidebar locale={locale} onLocaleChange={setLocale} />
        <section className="workspace-main">
          <div className="timing-layout" id="workspace">
            <div className="timing-content">
              <WorkspaceHeader
                data={data}
                record={selectedRecord}
                recordCount={records.length}
                activeTab={tab}
                onTabChange={setTab}
              />
              {selectedRecord ? (
                <>
                  <RequestContextPanel data={data} record={selectedRecord} />
                  <WorkspaceContent record={selectedRecord} tab={tab} />
                </>
              ) : (
                <EmptyWorkspace data={data} />
              )}
            </div>
            <FlowInspector
              record={selectedRecord}
              records={records}
              selectedId={selectedRecord?.id}
              onSelect={setSelectedId}
            />
          </div>
        </section>
      </main>
    </WorkspaceLocaleContext.Provider>
  );
}

function WorkspaceSidebar({
  locale,
  onLocaleChange
}: {
  locale: WorkspaceLocale;
  onLocaleChange(locale: WorkspaceLocale): void;
}): JSX.Element {
  return (
    <aside
      className="workspace-sidebar workspace-sidebar--timing"
      aria-label={t(locale, "sidebarLabel")}
    >
      <div className="workspace-brand workspace-brand--wordmark">
        <img alt="Anlyx" src="/workspace/anlyx-logo-transparent.png" />
      </div>
      <nav className="workspace-nav" aria-label={t(locale, "primaryNavLabel")}>
        <button className="is-active" type="button">
          <Workflow size={19} />
          <span>{t(locale, "flows")}</span>
        </button>
      </nav>
      <div className="workspace-sidebar__bottom">
        <div className="language-toggle" aria-label={t(locale, "language")}>
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
        <a className="workspace-doc-link" href="#workspace">
          <FileCode2 size={19} />
          <span>{t(locale, "docs")}</span>
        </a>
      </div>
    </aside>
  );
}

function WorkspaceHeader({
  activeTab,
  data,
  onTabChange,
  record,
  recordCount
}: {
  activeTab: WorkspaceTab;
  data: ScanResult;
  onTabChange: (tab: WorkspaceTab) => void;
  record: FlowRecord | undefined;
  recordCount: number;
}): JSX.Element {
  const locale = useWorkspaceLocale();

  return (
    <header className="workspace-header">
      <div className="workspace-header__top">
        <div>
          <div className="breadcrumbs">
            <span>{t(locale, "flows")}</span>
            <ChevronRight size={13} />
            <strong>
              {t(locale, "flow")} {record ? compactId(record.requestId) : t(locale, "waiting")}
            </strong>
          </div>
          <div className="title-row">
            <h1>{record ? t(locale, "matchedBackendFlow") : t(locale, "liveWorkspace")}</h1>
            <span
              className={`capture-dot ${recordCount > 0 ? "is-live" : ""}`}
              aria-label={
                recordCount > 0 ? t(locale, "captureConnected") : t(locale, "waitingForCapture")
              }
            />
          </div>
          <p>
            {record
              ? t(locale, "matchedSubtitle")
              : `${data.projectName} ${t(locale, "readyPrefix")}${t(locale, "readySuffix")}`}
          </p>
        </div>
        <div className="header-meta">
          <span>
            <Clock3 size={15} />
            {formatDateTime(record?.createdAt)}
          </span>
        </div>
      </div>
      <div className="workspace-header__tabs">
        <FlowTabs activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </header>
  );
}

function FlowTabs({
  activeTab,
  onTabChange
}: {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}): JSX.Element {
  const locale = useWorkspaceLocale();

  return (
    <div className="flow-tabs" role="tablist" aria-label={t(locale, "flowViews")}>
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

function RequestContextPanel({
  data,
  record
}: {
  data: ScanResult;
  record: FlowRecord;
}): JSX.Element {
  const locale = useWorkspaceLocale();
  const backendCount = record.backendSpans?.length ?? 0;
  const layers = diagramLayers(record);
  const controller = findFirstLayer(layers, ["controller"]);
  const result = findFirstLayer(layers, ["result"]);

  return (
    <section
      className="benefits-studio request-context-panel"
      aria-label={t(locale, "selectedRequestLabel")}
    >
      <div className="benefits-studio__main">
        <div className="benefits-studio__brand">
          <span>{record.method.slice(0, 2)}</span>
          <div>
            <strong>{t(locale, "selectedRequest")}</strong>
            <small>{data.projectName}</small>
          </div>
        </div>
        <div className="benefits-studio__copy">
          <h2>{shortPath(record.path)}</h2>
          <p>{t(locale, backendCount > 0 ? "mappedEvidenceWithRuntime" : "mappedEvidence")}</p>
        </div>
      </div>
      <div className="request-context-actions" aria-label={t(locale, "requestEvidenceSummary")}>
        <span>
          <Check size={14} />
          {record.status ?? t(locale, "pending")} {outcomeStatusText(record, locale)}
        </span>
        <span>
          <Clock3 size={14} />
          {formatDuration(record.durationMs ?? record.duration)}
        </span>
        <span>
          <Workflow size={14} />
          {controller?.label ?? t(locale, "controllerPending")}
        </span>
        <span>
          <Flag size={14} />
          {result?.label ?? outcomeLabel(record, locale)}
        </span>
      </div>
    </section>
  );
}

function WorkspaceContent({ record, tab }: { record: FlowRecord; tab: WorkspaceTab }): JSX.Element {
  if (tab === "summary") {
    return <SummaryFlowView record={record} />;
  }

  if (tab === "diagram") {
    return <DiagramFlowView record={record} />;
  }

  return <TimingWaterfallView record={record} />;
}

function TimingWaterfallView({ record }: { record: FlowRecord }): JSX.Element {
  const locale = useWorkspaceLocale();
  const [showIdleTime, setShowIdleTime] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [focusSlowest, setFocusSlowest] = useState(false);
  const rows = timingLayers(record);
  const total = Math.max(record.durationMs ?? record.duration ?? 1, 1);
  const ticks = timelineTicks(total);
  const slowestLayer = rows
    .filter((layer) => !isUnprovenLayer(layer) && layer.type !== "api" && layer.type !== "result")
    .sort((a, b) => estimatedLayerDuration(b, total) - estimatedLayerDuration(a, total))[0];

  return (
    <section className="waterfall-card" aria-label={t(locale, "flowTiming")}>
      <div className="waterfall-toolbar">
        <div className="duration-chip">
          {t(locale, "totalDuration")}&nbsp; <strong>{Math.round(total)} ms</strong>
        </div>
        <div className="waterfall-toolbar__right">
          <button
            className="idle-toggle"
            type="button"
            aria-pressed={showIdleTime}
            onClick={() => setShowIdleTime((value) => !value)}
          >
            {t(locale, "showIdleTime")}
            <span className="toggle" aria-hidden="true" />
          </button>
          <div className="zoom-group">
            <button type="button" onClick={() => setTimelineZoom(0.92)}>
              {t(locale, "fit")}
            </button>
            <button type="button" onClick={() => setTimelineZoom(1)}>
              {Math.round(timelineZoom * 100)}%
            </button>
          </div>
          <div className="zoom-icons">
            <button
              type="button"
              aria-label={t(locale, "focusSlowestSegment")}
              onClick={() => setFocusSlowest((value) => !value)}
            >
              <Search size={17} />
            </button>
            <button
              type="button"
              aria-label={t(locale, "zoomIn")}
              onClick={() => setTimelineZoom((value) => Math.min(1.24, value + 0.08))}
            >
              <Plus size={17} />
            </button>
          </div>
        </div>
      </div>
      <TimingOverview rows={rows} slowestLayer={slowestLayer} total={total} />
      <div
        className={`waterfall-grid ${showIdleTime ? "show-idle-time" : ""}`}
        style={{ "--timeline-zoom": timelineZoom } as CSSProperties}
      >
        <div className="waterfall-axis">
          <span>{t(locale, "layer")}</span>
          <span>{t(locale, "node")}</span>
          <span>{t(locale, "duration")}</span>
          <div
            className="waterfall-axis__timeline"
            style={{ "--tick-count": ticks.length - 1 } as CSSProperties}
          >
            {ticks.map((tick) => (
              <strong key={tick} style={{ left: `${(tick / total) * 100}%` }}>
                {Math.round(tick)} ms
              </strong>
            ))}
          </div>
        </div>
        {rows.map((layer) => (
          <WaterfallRow
            focused={focusSlowest && layer.id === slowestLayer?.id}
            key={layer.id}
            layer={layer}
            total={total}
            tickCount={ticks.length - 1}
          />
        ))}
      </div>
      <DurationLegend />
    </section>
  );
}

function TimingOverview({
  rows,
  slowestLayer,
  total
}: {
  rows: FlowLayer[];
  slowestLayer: FlowLayer | undefined;
  total: number;
}): JSX.Element {
  const locale = useWorkspaceLocale();
  const markers = overviewMarkers(rows, slowestLayer);

  return (
    <section className="timing-overview" aria-label={t(locale, "totalDurationOverview")}>
      <div className="timing-overview__top">
        <div>
          <span>{t(locale, "totalDuration")}</span>
          <strong>0 ms to {Math.round(total)} ms</strong>
        </div>
        {slowestLayer ? (
          <p>
            {t(locale, "slowestShownSegment")}: <strong>{layerLabel(slowestLayer, locale)}</strong>{" "}
            <span>{Math.round(estimatedLayerDuration(slowestLayer, total))} ms</span>
          </p>
        ) : null}
      </div>
      <div className="timing-overview__rail">
        <div className="timing-overview__axis">
          <strong style={{ left: "0%" }}>0</strong>
          <strong style={{ left: "100%" }}>{Math.round(total)} ms</strong>
        </div>
        {markers.map((layer) => {
          const Icon = layerIcons[layer.type] ?? Circle;
          const visualType = visualLayerType(layer);
          const isSlowest = slowestLayer?.id === layer.id;

          return (
            <span
              aria-label={`${layerLabel(layer, locale)} ${t(locale, "startsAt")} ${Math.round(
                layer.startOffsetMs ?? 0
              )} ms`}
              className={`timing-marker timing-marker--${visualType} timing-marker--${
                isUnprovenLayer(layer) ? "not-proven" : layer.execution
              }${isSlowest ? " is-bottleneck" : ""}`}
              key={layer.id}
              style={{ left: `${markerOffset(layer, total)}%` }}
              title={`${layerLabel(layer, locale)} · ${Math.round(
                estimatedLayerDuration(layer, total)
              )} ms`}
            >
              <b>
                <Icon size={16} />
              </b>
              {isSlowest ? <em>{t(locale, "slowestShownSegment")}</em> : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function WaterfallRow({
  layer,
  focused,
  tickCount,
  total
}: {
  focused: boolean;
  layer: FlowLayer;
  tickCount: number;
  total: number;
}): JSX.Element {
  const locale = useWorkspaceLocale();
  const Icon = layerIcons[layer.type] ?? Circle;
  const muted = isUnprovenLayer(layer);
  const sourceMatched = isSourceMatchedLayer(layer);
  const visualType = visualLayerType(layer);
  const isResultMarker = layer.type === "result";
  const duration = layer.durationMs ?? estimatedLayerDuration(layer, total);
  const left = layerOffset(layer, total);
  const width = muted
    ? 0
    : Math.max(isResultMarker ? 0.8 : 1.8, Math.min(100 - left, (duration / total) * 100));

  return (
    <div
      className={`waterfall-row waterfall-row--${visualType} ${muted ? "is-muted" : ""} ${
        sourceMatched ? "is-source-matched" : ""
      } ${focused ? "is-focused" : ""} ${
        layer.execution === "executed" || layer.execution === "inferred" ? "is-neutral" : ""
      }`}
    >
      <div className="waterfall-layer">
        <span className={`layer-icon layer-icon--${visualType}`}>
          <Icon size={18} />
        </span>
        <span>{layerLabel(layer, locale)}</span>
      </div>
      <div className="waterfall-node">
        <strong>{layer.label}</strong>
        <span>{layerSubtitle(layer, locale)}</span>
      </div>
      <div className="waterfall-duration">
        {muted ? (
          <>
            <strong>-</strong>
            <small>{t(locale, "notProven")}</small>
          </>
        ) : (
          <>
            <strong>{Math.round(duration)} ms</strong>
            <small>{durationCaption(layer, duration, total, locale)}</small>
          </>
        )}
      </div>
      <div className="waterfall-track" style={{ "--tick-count": tickCount } as CSSProperties}>
        <span
          className={
            muted
              ? "waterfall-not-proven-label"
              : `waterfall-bar waterfall-bar--${visualType}${isResultMarker ? " is-marker" : ""}`
          }
          style={muted ? undefined : { left: `${left}%`, width: `${width}%` }}
        >
          {muted ? t(locale, "knownBySourceOnly") : null}
        </span>
        {isDecisionLayer(layer) && layer.execution !== "executed" ? (
          <span className="row-badge row-badge--red">{t(locale, "bottleneck")}</span>
        ) : null}
        {sourceMatched && focused ? (
          <span className="row-badge row-badge--blue">{t(locale, "slowestSourceSegment")}</span>
        ) : null}
        {layer.type === "result" && layer.execution === "blocked" ? (
          <span className="row-badge row-badge--orange">{t(locale, "blocked")}</span>
        ) : null}
      </div>
    </div>
  );
}

function SummaryFlowView({ record }: { record: FlowRecord }): JSX.Element {
  const locale = useWorkspaceLocale();
  const rows = summaryRows(record);
  const matchedRows = rows.filter((layer) => !isUnprovenLayer(layer));
  const unprovenRows = rows.filter((layer) => isUnprovenLayer(layer));

  return (
    <section className="summary-view" aria-label={t(locale, "flowSummary")}>
      <div className="summary-panel">
        <div className="summary-panel__header">
          <div>
            <h2>{t(locale, "observedSourceMatchedPath")}</h2>
            <p>{t(locale, "summaryMatchedCopy")}</p>
          </div>
          <span>
            {matchedRows.length} {t(locale, "layers")}
          </span>
        </div>
        <div className="summary-path-list">
          {matchedRows.map((layer, index) => (
            <SummaryPathRow index={index + 1} key={layer.id} layer={layer} />
          ))}
        </div>
        {unprovenRows.length > 0 ? (
          <>
            <div className="summary-panel__subheader">
              <h3>{t(locale, "knownDownstreamPath")}</h3>
              <span>
                {unprovenRows.length} {t(locale, "layers")}
              </span>
            </div>
            <div className="summary-path-list summary-path-list--muted">
              {unprovenRows.map((layer, index) => (
                <SummaryPathRow
                  index={matchedRows.length + index + 1}
                  key={layer.id}
                  layer={layer}
                />
              ))}
            </div>
          </>
        ) : null}
        <p className="summary-note">{t(locale, "summaryNote")}</p>
      </div>
    </section>
  );
}

function SummaryPathRow({ index, layer }: { index: number; layer: FlowLayer }): JSX.Element {
  const locale = useWorkspaceLocale();
  const Icon = layerIcons[layer.type] ?? Circle;
  const visualType = visualLayerType(layer);
  const muted = isUnprovenLayer(layer);

  return (
    <article className={`summary-path-row ${muted ? "is-muted" : ""}`}>
      <span className={`summary-step summary-step--${visualType}`}>{index}</span>
      <span className={`layer-icon layer-icon--${visualType}`}>
        <Icon size={18} />
      </span>
      <div>
        <small>{layerLabel(layer, locale)}</small>
        <strong>{layer.label}</strong>
        <p>{layerSubtitle(layer, locale)}</p>
      </div>
      <span className={`summary-status summary-status--${summaryStatusTone(layer)}`}>
        {summaryStatusLabel(layer, locale)}
      </span>
    </article>
  );
}

function DiagramFlowView({ record }: { record: FlowRecord }): JSX.Element {
  const locale = useWorkspaceLocale();
  const [zoom, setZoom] = useState(1);
  const layers = diagramLayers(record);
  const api = findFirstLayer(layers, ["api"]);
  const controller = findFirstLayer(layers, ["controller"]);
  const decision = findFirstLayer(layers, ["auth", "decision"]);
  const result = findFirstLayer(layers, ["result"]);
  const service = findFirstLayer(layers, ["service"]);
  const repository = findFirstLayer(layers, ["repository"]);
  const database = findFirstLayer(layers, ["database"]);
  const downstreamProven = [service, repository, database].some(
    (layer) => layer && !isUnprovenLayer(layer)
  );

  return (
    <section className="diagram-canvas-card" aria-label={t(locale, "flowDiagram")}>
      <div className="diagram-canvas-toolbar">
        <div className="diagram-legend">
          <span>
            <i className="solid-line" />
            {t(locale, "observedSourceMatchedLegend")}
          </span>
          <span>
            <i className="dashed-line" />
            {t(locale, "knownDownstreamLegend")}
          </span>
          <span>
            <Circle size={12} />
            {t(locale, "entryPoint")}
          </span>
        </div>
        <div className="diagram-controls">
          <button type="button" onClick={() => setZoom(0.92)}>
            <Gauge size={16} />
            {t(locale, "fitView")}
          </button>
          <button type="button" onClick={() => setZoom(1)}>
            <RotateCw size={16} />
            {t(locale, "reset")}
          </button>
          <div>
            <button
              type="button"
              aria-label={t(locale, "zoomOut")}
              onClick={() => setZoom((value) => Math.max(0.8, value - 0.1))}
            >
              <Minus size={16} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              aria-label={t(locale, "zoomIn")}
              onClick={() => setZoom((value) => Math.min(1.2, value + 0.1))}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className="diagram-canvas">
        <div className="diagram-canvas__stage" style={{ transform: `scale(${zoom})` }}>
          <DiagramNode
            layer={api}
            fallbackLabel={`${record.method} ${record.path}`}
            icon={Network}
            className="diagram-node--api"
          />
          <Arrow className="arrow-api-controller" />
          <DiagramNode
            layer={controller}
            fallbackLabel="Controller"
            icon={BarChart3}
            className="diagram-node--controller"
          />
          <Arrow className="arrow-controller-auth" />
          <DiagramNode
            layer={decision}
            fallbackLabel={
              record.status && record.status >= 400
                ? t(locale, "authDecision")
                : t(locale, "backend")
            }
            icon={Lock}
            className={`diagram-node--auth ${
              decision && decision.execution === "blocked" ? "is-selected" : ""
            }`}
          />
          <Arrow className="arrow-auth-result" />
          <DiagramNode
            layer={result}
            fallbackLabel={outcomeLabel(record, locale)}
            icon={Shield}
            className="diagram-node--result"
          />
          <div className={`branch-lines ${downstreamProven ? "is-proven" : ""}`} />
          <GhostNode
            layer={service}
            fallbackLabel={t(locale, "service")}
            className={`ghost-service ${downstreamProven ? "is-proven" : ""}`}
            icon={Box}
          />
          <GhostNode
            layer={repository}
            fallbackLabel={t(locale, "repository")}
            className={`ghost-repository ${downstreamProven ? "is-proven" : ""}`}
            icon={Database}
          />
          <GhostNode
            layer={database}
            fallbackLabel={t(locale, "database")}
            className={`ghost-database ${downstreamProven ? "is-proven" : ""}`}
            icon={Database}
          />
          <p className="diagram-caption">
            {downstreamProven ? t(locale, "downstreamMatched") : t(locale, "knownScannedNotProven")}
          </p>
        </div>
      </div>
    </section>
  );
}

function DiagramNode({
  className,
  fallbackLabel,
  icon: Icon,
  layer
}: {
  className: string;
  fallbackLabel: string;
  icon: LucideIcon;
  layer: FlowLayer | undefined;
}): JSX.Element {
  const locale = useWorkspaceLocale();
  const visualType = layer ? visualLayerType(layer) : "controller";

  return (
    <article className={`diagram-node ${className}`}>
      <span className="diagram-node__check">
        <Check size={14} />
      </span>
      <span className={`diagram-node__icon diagram-node__icon--${visualType}`}>
        <Icon size={24} />
      </span>
      <strong>{diagramTitle(layer, fallbackLabel, locale)}</strong>
      <small>{layer?.label ?? fallbackLabel}</small>
      {layer && isDecisionLayer(layer) ? (
        <span className={layer.execution === "inferred" ? "inferred-chip" : "matched-chip"}>
          {layer.execution === "inferred"
            ? t(locale, "inferred")
            : executionLabel(layer.execution, locale)}
        </span>
      ) : null}
      {layer?.type === "result" ? (
        <span className={layer.execution === "blocked" ? "blocked-chip" : "matched-chip"}>
          {layer.execution === "blocked" ? t(locale, "blocked") : t(locale, "matched")}
        </span>
      ) : null}
      <span className="duration-mini">{Math.round(layer?.durationMs ?? 1)} ms</span>
    </article>
  );
}

function GhostNode({
  className,
  fallbackLabel,
  icon: Icon,
  layer
}: {
  className: string;
  fallbackLabel: string;
  icon: LucideIcon;
  layer: FlowLayer | undefined;
}): JSX.Element {
  const locale = useWorkspaceLocale();

  return (
    <article className={`ghost-node ${className}`}>
      <span>
        <Icon size={21} />
      </span>
      <strong>{fallbackLabel}</strong>
      <small>{layer?.label ?? t(locale, "noScannedNode")}</small>
      <small>{layer ? executionLabel(layer.execution, locale) : t(locale, "notProven")}</small>
      <em>—</em>
    </article>
  );
}

function Arrow({ className }: { className: string }): JSX.Element {
  return (
    <svg className={`diagram-arrow ${className}`} viewBox="0 0 118 24" aria-hidden="true">
      <path d="M2 12H104" />
      <path d="m97 5 12 7-12 7" />
    </svg>
  );
}

function FlowInspector({
  onSelect,
  record,
  records,
  selectedId
}: {
  onSelect(id: string): void;
  record: FlowRecord | undefined;
  records: FlowRecord[];
  selectedId: string | undefined;
}): JSX.Element {
  const locale = useWorkspaceLocale();
  const evidence = useMemo(() => record?.evidence ?? [], [record]);
  const coverage = record
    ? evidenceCoverage(record)
    : { browser: 0, backend: 0, source: 0, notProven: 0 };

  return (
    <aside className="flow-inspector" aria-label={t(locale, "evidenceInspector")}>
      <div className="inspector-title">
        <h2>{t(locale, "anlyxFlow")}</h2>
      </div>
      <InspectorSection title={t(locale, "recentRequests")} count={String(records.length)}>
        <RecentEventsList records={records} selectedId={selectedId} onSelect={onSelect} />
      </InspectorSection>
      {record ? (
        <>
          <InspectorSection title={t(locale, "request")}>
            <dl className="request-dl">
              <div>
                <dt>{t(locale, "method")}</dt>
                <dd>
                  <span className="method-pill">{record.method}</span>
                </dd>
              </div>
              <div>
                <dt>{t(locale, "path")}</dt>
                <dd>{shortPath(record.path)}</dd>
              </div>
            </dl>
          </InspectorSection>
          <InspectorSection title={t(locale, "outcome")}>
            <span className={`outcome-pill outcome-pill--${outcomeTone(record)}`}>
              {record.status ?? "—"}&nbsp;&nbsp;{outcomeStatusText(record, locale)}
            </span>
            <p>
              <strong>{outcomeLabel(record, locale)}</strong>
              {outcomeDescription(record, locale)}
            </p>
          </InspectorSection>
          <InspectorSection title={t(locale, "totalDuration")}>
            <p className="metric-line">
              <Clock3 size={17} />
              <strong>{formatDuration(record.durationMs ?? record.duration)}</strong>
            </p>
          </InspectorSection>
          <InspectorSection title={t(locale, "mappingConfidence")}>
            <div className="confidence-row">
              <span className="confidence-chip">{confidenceLabel(record.confidence, locale)}</span>
              <ConfidenceBars />
            </div>
            <p>{confidenceDescription(record, locale)}</p>
          </InspectorSection>
          <InspectorSection title={t(locale, "evidenceUsed")} count={String(evidence.length)}>
            <ul className="evidence-list">
              {evidence.slice(0, 5).map((item) => (
                <li key={item}>
                  <Check size={14} />
                  {translateEvidence(item, locale)}
                </li>
              ))}
            </ul>
          </InspectorSection>
          <InspectorSection title={t(locale, "coverage")}>
            <div className="layers-bar" aria-hidden="true">
              <span style={{ flex: Math.max(coverage.browser, 1) }} />
              <span style={{ flex: Math.max(coverage.backend, 1) }} />
              <span style={{ flex: Math.max(coverage.source, 1) }} />
              <span style={{ flex: Math.max(coverage.notProven, 1) }} />
            </div>
            <small>
              {t(locale, "browser")} {coverage.browser} · {t(locale, "backendCoverage")}{" "}
              {coverage.backend} · {t(locale, "source")} {coverage.source} ·{" "}
              {t(locale, "notProven")} {coverage.notProven}
            </small>
          </InspectorSection>
          <InspectorSection title={t(locale, "traceNote")}>
            <p>{flowNote(record, locale)}</p>
          </InspectorSection>
        </>
      ) : (
        <InspectorSection title={t(locale, "request")}>
          <p className="events-empty">{t(locale, "keepWorkspaceOpen")}</p>
        </InspectorSection>
      )}
    </aside>
  );
}

function RecentEventsList({
  onSelect,
  records,
  selectedId
}: {
  onSelect(id: string): void;
  records: FlowRecord[];
  selectedId: string | undefined;
}): JSX.Element {
  const locale = useWorkspaceLocale();

  if (records.length === 0) {
    return <p className="events-empty">{t(locale, "firstRequestHint")}</p>;
  }

  return (
    <div className="recent-events" aria-label="Recent events">
      {records.slice(0, 5).map((record) => (
        <button
          className={record.id === selectedId ? "is-selected" : ""}
          key={record.id}
          type="button"
          onClick={() => onSelect(record.id)}
        >
          <span>{record.method}</span>
          <strong>{shortPath(record.path)}</strong>
          <small>
            {record.status ?? "pending"} · {Math.round(record.durationMs ?? record.duration ?? 0)}{" "}
            ms
          </small>
        </button>
      ))}
    </div>
  );
}

function EmptyWorkspace({ data }: { data: ScanResult }): JSX.Element {
  const locale = useWorkspaceLocale();

  return (
    <section
      className="waterfall-card empty-workspace-card"
      aria-label={t(locale, "waitingForBrowserRequests")}
    >
      <span>{t(locale, "liveCaptureReady")}</span>
      <h2>{t(locale, "noRequestSelected")}</h2>
      <p>
        {data.projectName} {data.endpoints.length}
        {t(locale, "emptyWorkspaceCopy")}
      </p>
    </section>
  );
}

function InspectorSection({
  children,
  count,
  title
}: {
  children: ReactNode;
  count?: string;
  title: string;
}): JSX.Element {
  return (
    <section className="inspector-section">
      <h3>
        {title}
        {count ? <span>{count}</span> : null}
      </h3>
      {children}
    </section>
  );
}

function DurationLegend(): JSX.Element {
  const locale = useWorkspaceLocale();

  return (
    <div className="duration-legend">
      <span>
        <i className="legend-blue" />
        {t(locale, "requestProcessing")}
      </span>
      <span>
        <i className="legend-purple" />
        {t(locale, "application")}
      </span>
      <span>
        <i className="legend-red" />
        {t(locale, "authDecisionLegend")}
      </span>
      <span>
        <i className="legend-orange" />
        {t(locale, "result")}
      </span>
      <span>
        <i className="legend-hatched" />
        {t(locale, "notProven")}
      </span>
    </div>
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

function parseFlowRecord(value: string): FlowRecord | null {
  try {
    const parsed = JSON.parse(value) as Partial<FlowRecord>;

    if (
      typeof parsed.id === "string" &&
      typeof parsed.requestId === "string" &&
      typeof parsed.method === "string" &&
      typeof parsed.path === "string" &&
      Array.isArray(parsed.layers)
    ) {
      return {
        ...parsed,
        trigger: parsed.trigger === "user_action" ? "user_action" : "background"
      } as FlowRecord;
    }
  } catch {
    return null;
  }

  return null;
}

function orderedLayers(record: FlowRecord): FlowLayer[] {
  const used = new Set<string>();
  const ordered: FlowLayer[] = [];

  for (const type of layerOrder) {
    for (const layer of record.layers) {
      if (layer.type === type && !used.has(layer.id)) {
        used.add(layer.id);
        ordered.push(layer);
      }
    }
  }

  for (const layer of record.layers) {
    if (!used.has(layer.id)) {
      ordered.push(layer);
    }
  }

  return ordered;
}

function timingLayers(record: FlowRecord): FlowLayer[] {
  if (!record.backendSpans?.length) {
    return assignReadableOffsets(
      orderedLayers(record).filter((layer) => layer.type !== "page"),
      Math.max(record.durationMs ?? record.duration ?? 1, 1)
    );
  }

  const action = record.layers.find((layer) => layer.type === "action");
  const api = record.layers.find((layer) => layer.type === "api");
  const result = record.layers.find((layer) => layer.type === "result");
  const total = Math.max(record.durationMs ?? record.duration ?? 1, 1);
  const layers: FlowLayer[] = [];

  if (action) {
    layers.push({
      ...action,
      startOffsetMs: 0,
      durationMs: Math.min(action.durationMs ?? 4, 4)
    });
  }

  if (api) {
    layers.push({
      ...api,
      startOffsetMs: 3,
      durationMs: Math.max(1, (record.durationMs ?? record.duration ?? api.durationMs ?? 1) - 3)
    });
  }

  layers.push(...[...record.backendSpans].sort(compareBackendSpans).map(backendSpanToLayer));

  if (result) {
    layers.push({
      ...result,
      startOffsetMs: Math.max(0, total - Math.max(1, result.durationMs ?? 1)),
      durationMs: Math.max(1, result.durationMs ?? 1)
    });
  }

  return layers;
}

function summaryRows(record: FlowRecord): FlowLayer[] {
  if (!record.backendSpans?.length) {
    return orderedLayers(record).filter((layer) => layer.type !== "page");
  }

  const sourceRows = orderedLayers(record).filter((layer) => layer.type !== "page");
  const action = sourceRows.find((layer) => layer.type === "action");
  const api = sourceRows.find((layer) => layer.type === "api");
  const result = sourceRows.find((layer) => layer.type === "result");
  const observedRows = summarizeBackendObservedSpans(record.backendSpans);
  const observedTypes = new Set(observedRows.map((layer) => layer.type));
  const unprovenRows = sourceRows.filter(
    (layer) =>
      isUnprovenLayer(layer) &&
      !observedTypes.has(layer.type) &&
      layer.type !== "action" &&
      layer.type !== "api" &&
      layer.type !== "result"
  );

  return [action, api, ...observedRows, result, ...unprovenRows].filter(
    (layer): layer is FlowLayer => Boolean(layer)
  );
}

function assignReadableOffsets(layers: FlowLayer[], total: number): FlowLayer[] {
  const backend = layers.filter(
    (layer) =>
      layer.type !== "action" &&
      layer.type !== "api" &&
      layer.type !== "result" &&
      !isUnprovenLayer(layer)
  );
  const backendStart = Math.max(14, Math.round(total * 0.08));
  const backendEnd = Math.max(backendStart + 1, Math.round(total * 0.78));
  const slot =
    backend.length > 0 ? Math.max(8, Math.round((backendEnd - backendStart) / backend.length)) : 0;

  return layers.map((layer) => {
    if (layer.startOffsetMs !== undefined) return layer;

    if (layer.type === "action") {
      return { ...layer, startOffsetMs: 0, durationMs: Math.min(layer.durationMs ?? 4, 4) };
    }

    if (layer.type === "api") {
      return {
        ...layer,
        startOffsetMs: 3,
        durationMs: Math.max(1, total - 3)
      };
    }

    if (layer.type === "result") {
      return {
        ...layer,
        startOffsetMs: Math.max(0, total - Math.max(1, layer.durationMs ?? 2)),
        durationMs: Math.max(1, layer.durationMs ?? 2)
      };
    }

    if (isUnprovenLayer(layer)) {
      return layer;
    }

    const index = Math.max(
      0,
      backend.findIndex((item) => item.id === layer.id)
    );
    const estimatedDuration = layer.durationMs ?? estimatedLayerDuration(layer, total);

    return {
      ...layer,
      startOffsetMs: Math.min(Math.max(0, total - estimatedDuration), backendStart + slot * index),
      durationMs: estimatedDuration
    };
  });
}

function backendSpanToLayer(span: BackendObservedSpan): FlowLayer {
  return {
    id: `backend:${span.id}`,
    type: span.type,
    label: span.label,
    execution: "observed",
    evidenceLevel: "backend_observed",
    evidence: span.evidence ?? ["backend_observed: server-side method span reported by dev bridge"],
    ...(span.nodeId ? { nodeId: span.nodeId } : {}),
    ...(span.filePath ? { filePath: span.filePath } : {}),
    ...(span.lineNumber !== undefined ? { lineNumber: span.lineNumber } : {}),
    startOffsetMs: span.startOffsetMs,
    durationMs: span.durationMs,
    ...(span.status !== undefined ? { status: span.status } : {})
  };
}

function diagramLayers(record: FlowRecord): FlowLayer[] {
  if (!record.backendSpans?.length) {
    return orderedLayers(record).filter((layer) => layer.type !== "page");
  }

  return summaryRows(record).filter((layer) => !isUnprovenLayer(layer));
}

function summarizeBackendObservedSpans(spans: BackendObservedSpan[]): FlowLayer[] {
  const rows: FlowLayer[] = [];
  const databaseSpans: BackendObservedSpan[] = [];

  for (const span of [...spans].sort(compareBackendSpans)) {
    if (span.type === "database") {
      databaseSpans.push(span);
      continue;
    }

    rows.push(backendSpanToLayer(span));
  }

  if (databaseSpans.length > 0) {
    rows.push(databaseSpansToSummaryLayer(databaseSpans));
  }

  return rows.sort(compareFlowLayersByTiming);
}

function databaseSpansToSummaryLayer(spans: BackendObservedSpan[]): FlowLayer {
  const startOffsetMs = Math.min(...spans.map((span) => span.startOffsetMs));
  const endOffsetMs = Math.max(...spans.map((span) => span.startOffsetMs + span.durationMs));
  const firstEvidence = spans.flatMap((span) => span.evidence ?? [])[0];

  return {
    id: "backend:database-summary",
    type: "database",
    label: `${spans.length} JDBC statement${spans.length === 1 ? "" : "s"}`,
    execution: "observed",
    evidenceLevel: "backend_observed",
    evidence: [
      `backend_observed: ${spans.length} JDBC execute span${spans.length === 1 ? "" : "s"} reported by dev bridge`,
      ...(firstEvidence ? [firstEvidence] : [])
    ],
    startOffsetMs,
    durationMs: Math.max(1, endOffsetMs - startOffsetMs)
  };
}

function findFirstLayer(layers: FlowLayer[], types: FlowLayer["type"][]): FlowLayer | undefined {
  return layers.find((layer) => types.includes(layer.type));
}

function compareBackendSpans(a: BackendObservedSpan, b: BackendObservedSpan): number {
  const timingDelta = a.startOffsetMs - b.startOffsetMs;
  if (timingDelta !== 0) return timingDelta;
  if (a.id === b.parentId) return -1;
  if (a.parentId === b.id) return 1;

  return layerOrderIndex(a.type) - layerOrderIndex(b.type) || a.label.localeCompare(b.label);
}

function compareFlowLayersByTiming(a: FlowLayer, b: FlowLayer): number {
  const timingDelta =
    (a.startOffsetMs ?? Number.MAX_SAFE_INTEGER) - (b.startOffsetMs ?? Number.MAX_SAFE_INTEGER);
  if (timingDelta !== 0) return timingDelta;

  return layerOrderIndex(a.type) - layerOrderIndex(b.type) || a.label.localeCompare(b.label);
}

function layerOrderIndex(type: FlowLayer["type"]): number {
  const index = layerOrder.indexOf(type);
  return index === -1 ? layerOrder.length : index;
}

function isUnprovenLayer(layer: FlowLayer): boolean {
  return layer.execution === "not_proven" || layer.evidenceLevel === "not_proven";
}

function isSourceMatchedLayer(layer: FlowLayer): boolean {
  return layer.execution === "scanned" || layer.evidenceLevel === "source_derived";
}

function isDecisionLayer(layer: FlowLayer): boolean {
  return layer.type === "auth" || layer.type === "decision";
}

function summaryStatusLabel(layer: FlowLayer, locale: WorkspaceLocale): string {
  if (isUnprovenLayer(layer)) return t(locale, "notProven");
  if (layer.execution === "blocked") return t(locale, "blocked");
  if (layer.evidenceLevel === "browser_observed" || layer.evidenceLevel === "backend_observed") {
    return t(locale, "observed");
  }
  if (layer.evidenceLevel === "inferred") return t(locale, "inferred");
  if (isSourceMatchedLayer(layer)) return t(locale, "sourceMatched");
  return t(locale, "matched");
}

function summaryStatusTone(layer: FlowLayer): "matched" | "inferred" | "blocked" | "scanned" {
  if (isUnprovenLayer(layer) || isSourceMatchedLayer(layer)) return "scanned";
  if (layer.execution === "blocked") return "blocked";
  if (layer.evidenceLevel === "inferred") return "inferred";
  return "matched";
}

function visualLayerType(
  layer: FlowLayer
): "action" | "api" | "controller" | "auth" | "result" | "service" | "repository" | "database" {
  if (layer.type === "decision") return "auth";
  if (
    layer.type === "action" ||
    layer.type === "api" ||
    layer.type === "controller" ||
    layer.type === "auth" ||
    layer.type === "result" ||
    layer.type === "service" ||
    layer.type === "repository" ||
    layer.type === "database"
  ) {
    return layer.type;
  }

  return "controller";
}

function layerLabel(layer: FlowLayer, locale: WorkspaceLocale = "en"): string {
  if (layer.type === "api") return "API";
  if (layer.type === "auth") return locale === "ko" ? "인증 / 세션" : "Auth / Session";
  if (layer.type === "action") return locale === "ko" ? "사용자 액션" : "Action";
  if (layer.type === "controller") return locale === "ko" ? "컨트롤러" : "Controller";
  if (layer.type === "decision") return locale === "ko" ? "결정" : "Decision";
  if (layer.type === "service") return t(locale, "service");
  if (layer.type === "repository") return t(locale, "repository");
  if (layer.type === "database") return t(locale, "database");
  if (layer.type === "result") return t(locale, "result");
  return capitalize(layer.type);
}

function estimatedLayerDuration(layer: FlowLayer, total: number): number {
  if (layer.durationMs !== undefined) {
    return layer.durationMs;
  }

  if (isUnprovenLayer(layer)) {
    return Math.max(1, Math.round(total * 0.06));
  }

  if (layer.type === "result") {
    return 1;
  }

  return Math.max(1, Math.round(total * 0.18));
}

function layerOffset(layer: FlowLayer, total: number): number {
  if (layer.startOffsetMs !== undefined) {
    return Math.min(96, Math.max(0, (layer.startOffsetMs / Math.max(total, 1)) * 100));
  }

  if (layer.type === "action" || layer.type === "api") return 0;
  if (layer.type === "controller") return 2;
  if (isDecisionLayer(layer)) return 10;
  if (layer.type === "result") return 76;
  return 9;
}

function markerOffset(layer: FlowLayer, total: number): number {
  if (layer.type === "result") {
    return 100;
  }

  return Math.min(100, Math.max(0, layerOffset(layer, total)));
}

function overviewMarkers(rows: FlowLayer[], slowestLayer: FlowLayer | undefined): FlowLayer[] {
  const preferred = [
    rows.find((layer) => layer.type === "action"),
    rows.find((layer) => layer.type === "api"),
    rows.find((layer) => layer.type === "controller"),
    rows.find((layer) => isDecisionLayer(layer)),
    slowestLayer,
    rows.find((layer) => layer.type === "result")
  ];
  const seen = new Set<string>();

  return preferred.filter((layer): layer is FlowLayer => {
    if (!layer || seen.has(layer.id)) {
      return false;
    }

    seen.add(layer.id);
    return true;
  });
}

function timelineTicks(total: number): number[] {
  const steps = 4;

  return Array.from({ length: steps + 1 }, (_, index) => (total / steps) * index);
}

function hasBlockedOutcome(record: FlowRecord): boolean {
  return record.status !== undefined && [401, 403, 409].includes(record.status);
}

function outcomeLabel(record: FlowRecord, locale: WorkspaceLocale): string {
  if (record.status === undefined) return t(locale, "pending");
  if (record.status >= 200 && record.status < 300) return t(locale, "ok");
  if (hasBlockedOutcome(record)) return t(locale, "blocked");
  if (record.status >= 500) return t(locale, "serverError");
  return locale === "ko" ? "관찰됨" : "Observed";
}

function outcomeStatusText(record: FlowRecord, locale: WorkspaceLocale): string {
  if (record.status === undefined) return t(locale, "pending");
  if (record.status >= 200 && record.status < 300) return t(locale, "ok");
  if (record.status === 401) return t(locale, "unauthorized");
  if (record.status === 403) return t(locale, "forbidden");
  if (record.status === 409) return t(locale, "conflict");
  if (record.status >= 500) return t(locale, "serverError");
  return locale === "ko" ? "관찰됨" : "Observed";
}

function outcomeTone(record: FlowRecord): "success" | "blocked" | "error" {
  if (record.status !== undefined && record.status >= 200 && record.status < 300) return "success";
  if (hasBlockedOutcome(record)) return "blocked";
  return "error";
}

function outcomeDescription(record: FlowRecord, locale: WorkspaceLocale): string {
  if (record.status !== undefined && record.status >= 200 && record.status < 300) {
    return locale === "ko"
      ? "요청이 완료되었고 스캔된 백엔드 흐름과 매칭되었습니다."
      : "Request completed and matched scanned backend flow.";
  }

  if (record.status === 409) {
    return locale === "ko"
      ? "요청이 결정 분기에 도달했고 차단 결과를 반환했습니다."
      : "Request reached a decision branch and returned a blocked result.";
  }

  if (hasBlockedOutcome(record)) {
    return locale === "ko"
      ? "하위 비즈니스 로직의 실행이 확인되기 전에 요청이 차단되었습니다."
      : "Request blocked before downstream business logic was proven executed.";
  }

  return locale === "ko"
    ? "브라우저에서 관찰된 요청과 소스 기반 백엔드 매칭입니다. 서버 런타임 트레이스는 아닙니다."
    : "Browser-observed request with source-derived backend matching. This is not a server runtime trace.";
}

function flowNote(record: FlowRecord, locale: WorkspaceLocale): string {
  if (record.backendSpans?.length) {
    return locale === "ko"
      ? "관찰됨으로 표시된 백엔드 행은 이 요청에 대한 개발 전용 백엔드 브리지에서 왔습니다. 소스 행은 여전히 스캔된 근거를 기반으로 합니다."
      : "Backend rows marked observed came from a development-only backend bridge for this request. Source rows still come from scanned evidence.";
  }

  const hasUnprovenDownstream = record.layers.some(
    (layer) =>
      (layer.type === "service" || layer.type === "repository" || layer.type === "database") &&
      isUnprovenLayer(layer)
  );

  if (hasUnprovenDownstream) {
    return locale === "ko"
      ? "흐리게 표시된 레이어는 소스 스캔으로만 알려진 경로이며 실제 실행은 확인되지 않았습니다."
      : "Muted layers are known by source scan only and were not proven executed.";
  }

  return locale === "ko"
    ? "브라우저 행은 페이지에서 관찰된 내용입니다. 소스 행은 스캔된 백엔드 근거이며 운영 런타임 트레이스가 아닙니다."
    : "Browser rows are observed in the page. Source rows come from scanned backend evidence and are not a production runtime trace.";
}

function confidenceDescription(record: FlowRecord, locale: WorkspaceLocale): string {
  if (record.confidence === "high") {
    return locale === "ko"
      ? "브라우저 요청, 엔드포인트, 컨트롤러, 소스 근거가 모두 매칭되었습니다."
      : "Browser request, endpoint, controller, and source evidence all matched.";
  }

  if (record.confidence === "medium") {
    return locale === "ko"
      ? "브라우저 요청은 스캔된 근거와 매칭되었지만 일부 백엔드 세부 정보는 추론입니다."
      : "The browser request matched scanned evidence, but some backend details are inferred.";
  }

  return locale === "ko"
    ? "Anlyx가 브라우저 요청을 관찰했지만 스캔된 백엔드 근거가 충분하지 않습니다."
    : "Anlyx observed the browser request, but scanned backend evidence is incomplete.";
}

function evidenceCoverage(record: FlowRecord): {
  browser: number;
  backend: number;
  source: number;
  notProven: number;
} {
  return record.layers.reduce(
    (coverage, layer) => {
      if (layer.evidenceLevel === "browser_observed") {
        coverage.browser += 1;
      } else if (layer.evidenceLevel === "backend_observed") {
        coverage.backend += 1;
      } else if (isUnprovenLayer(layer)) {
        coverage.notProven += 1;
      } else {
        coverage.source += 1;
      }

      return coverage;
    },
    { browser: 0, backend: record.backendSpans?.length ?? 0, source: 0, notProven: 0 }
  );
}

function layerSubtitle(layer: FlowLayer, locale: WorkspaceLocale): string {
  if (layer.type === "action")
    return locale === "ko" ? "사용자 클릭 캡처됨" : "user click captured";
  if (layer.type === "api") return t(locale, "browserSpan");
  if (isUnprovenLayer(layer)) return t(locale, "knownBySourceOnly");
  if (layer.evidenceLevel === "browser_observed") return t(locale, "browserObserved");
  if (layer.evidenceLevel === "backend_observed") return t(locale, "devRuntimeSpan");
  if (isSourceMatchedLayer(layer) || layer.evidenceLevel === "inferred") {
    return t(locale, "sourceDerivedEstimate");
  }
  return executionLabel(layer.execution, locale);
}

function durationCaption(
  layer: FlowLayer,
  duration: number,
  total: number,
  locale: WorkspaceLocale
): string {
  if (layer.type === "result") return t(locale, "responseMarker");
  if (layer.type === "action" || layer.type === "api") return t(locale, "browserSpan");
  if (layer.evidenceLevel === "backend_observed") return t(locale, "observed");

  return `${t(locale, "estimate")} · ${Math.round((duration / Math.max(total, 1)) * 100)}%`;
}

function diagramTitle(
  layer: FlowLayer | undefined,
  fallback: string,
  locale: WorkspaceLocale
): string {
  if (!layer) return fallback;
  if (layer.type === "api") return "API";
  if (layer.type === "controller") return locale === "ko" ? "컨트롤러" : "Controller";
  if (isDecisionLayer(layer)) return locale === "ko" ? "인증 / 세션" : "Auth / Session";
  if (layer.type === "result") return t(locale, "result");
  return layerLabel(layer, locale);
}

function tabLabel(tab: WorkspaceTab, locale: WorkspaceLocale): string {
  if (locale === "ko") {
    if (tab === "summary") return "요약";
    if (tab === "timing") return "타이밍";
    return "다이어그램";
  }

  return capitalize(tab);
}

function executionLabel(execution: FlowLayer["execution"], locale: WorkspaceLocale): string {
  if (execution === "blocked") return t(locale, "blocked");
  if (execution === "inferred") return t(locale, "inferred");
  if (execution === "not_proven") return t(locale, "notProven");
  if (execution === "observed") return t(locale, "observed");
  if (execution === "scanned") return locale === "ko" ? "스캔됨" : "scanned";
  if (execution === "executed") return locale === "ko" ? "실행됨" : "executed";

  return execution.replace("_", " ");
}

function confidenceLabel(confidence: FlowRecord["confidence"], locale: WorkspaceLocale): string {
  if (locale === "ko") {
    if (confidence === "high") return "높음";
    if (confidence === "medium") return "보통";
    return "낮음";
  }

  return capitalize(confidence);
}

function translateEvidence(value: string, locale: WorkspaceLocale): string {
  if (locale === "en") return value;

  const normalized = value.toLowerCase();
  if (normalized.includes("click") || normalized.includes("browser-observed request")) {
    return "브라우저에서 사용자 액션을 관찰했습니다";
  }
  if (normalized.includes("fetch") || normalized.includes("xmlhttprequest")) {
    return "브라우저 fetch/XHR 요청을 관찰했습니다";
  }
  if (normalized.includes("endpoint")) {
    return "스캔된 엔드포인트와 매칭되었습니다";
  }
  if (normalized.includes("controller")) {
    return "컨트롤러 근거가 매칭되었습니다";
  }
  if (normalized.includes("backend_observed") || normalized.includes("runtime")) {
    return "개발용 백엔드 브리지에서 런타임 span을 받았습니다";
  }
  if (normalized.includes("source-derived") || normalized.includes("source")) {
    return "소스 스캔 기반 백엔드 근거입니다";
  }
  if (normalized.includes("not a runtime") || normalized.includes("not_proven")) {
    return "운영 런타임 트레이스가 아니며 실행이 확인되지 않은 구간이 있습니다";
  }

  return value;
}

function compactId(value: string): string {
  return value.replace(/^browser-request:/, "").slice(0, 8);
}

function shortPath(value: string): string {
  return value.length > 30 ? `${value.slice(0, 27)}...` : value;
}

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return "Waiting for request";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function formatDuration(value: number | undefined): string {
  return `${Math.round(value ?? 0)} ms`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
