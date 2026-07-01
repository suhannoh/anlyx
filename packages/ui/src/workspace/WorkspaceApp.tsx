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
  BookOpen,
  Box,
  Braces,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  FileCode2,
  FileText,
  Flag,
  Folder,
  Gauge,
  Layers3,
  Languages,
  Lock,
  Minus,
  MousePointerClick,
  Network,
  PanelLeft,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  Tag,
  Workflow,
  Zap
} from "lucide-react";
import { siExpress, siNodedotjs, siReact, siTypescript } from "simple-icons";
import { Fragment, createContext, useContext, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type {
  BackendObservedSpan,
  FlowLayer,
  FlowRecord,
  ProjectData,
  ProjectValidationReport,
  ReportData
} from "@anlyx/core";
import { ScanTreeMap } from "./ScanTreeMap.js";
import {
  buildProjectWorkspaceViewModel,
  type ProjectFeatureView,
  type ProjectFlowView,
  type ProjectRequestView,
  type ProjectSelectedPageView,
  type ProjectWorkspaceViewModel
} from "./project-view-model.js";

type WorkspaceTab = "summary" | "timing" | "diagram";
type WorkspaceView = "flows" | "map" | "json";
type ProjectWorkspaceTab = "pages" | "map" | "overview" | "capabilities" | "json";
type JsonReaderTab = "overview" | "flows" | "raw";
type WorkspaceLocale = "en" | "ko";
type ProjectChromeLocale = ProjectData["dictionary"]["defaultLanguage"];
type ProjectJsonFileView = {
  id: string;
  name: string;
  description: string;
  countLabel: string;
  content: string;
  icon: LucideIcon;
};
type ProjectJsonInventoryItem = {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
};
type ProjectStackIcon =
  | { kind: "lucide"; icon: LucideIcon }
  | { kind: "simple"; hex: string; path: string; title: string };
type ProjectStackItem = {
  detail: string;
  icon: ProjectStackIcon;
  name: string;
  tone: string;
};
type ProjectChromeTranslationKey =
  | "agent"
  | "available"
  | "disabled"
  | "language"
  | "lastAnalysis"
  | "overview"
  | "capabilities"
  | "dataLifecycle"
  | "impactMap"
  | "map"
  | "pages"
  | "source"
  | "timing"
  | "upToDate"
  | "pagesAnalyzed";
type TimingBreakdownType =
  | "api"
  | "controller"
  | "service"
  | "repository"
  | "database"
  | "untracked"
  | "result";
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
  | "lastScan"
  | "matchedBackendFlow"
  | "liveWorkspace"
  | "captureConnected"
  | "waitingForCapture"
  | "matchedSubtitle"
  | "readyPrefix"
  | "readySuffix"
  | "selectedRequest"
  | "selectedRequestLabel"
  | "currentPage"
  | "pageUrlNotCaptured"
  | "requestEvidenceSummary"
  | "mappedEvidence"
  | "mappedEvidenceWithRuntime"
  | "controllerPending"
  | "flowTiming"
  | "totalDuration"
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
  | "untrackedApp"
  | "untrackedRuntime"
  | "noScannedNode"
  | "downstreamMatched"
  | "knownScannedNotProven"
  | "inferred"
  | "matched"
  | "evidenceInspector"
  | "anlyxFlow"
  | "recentRequests"
  | "background"
  | "currentRequestWindow"
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
  | "noCurrentPageRequests"
  | "noCurrentPageRequestsCopy"
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
  | "serverRequestSpan"
  | "browserObserved"
  | "devRuntimeSpan"
  | "measuredRuntime"
  | "callCount"
  | "sourceDerivedEstimate"
  | "responseMarker"
  | "estimate"
  | "browser"
  | "source"
  | "backendCoverage";

const WorkspaceLocaleContext = createContext<WorkspaceLocale>("en");
const TIMELINE_START_INSET_PERCENT = 2.5;

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
    lastScan: "Last import",
    matchedBackendFlow: "Matched backend flow",
    liveWorkspace: "Live workspace",
    captureConnected: "Capture connected",
    waitingForCapture: "Waiting for capture",
    matchedSubtitle: "Browser request first, source-matched backend path follows.",
    readyPrefix: "is ready. Use your local app and Anlyx will stream requests here.",
    readySuffix: "",
    selectedRequest: "Selected request",
    selectedRequestLabel: "Selected request",
    currentPage: "Current page",
    pageUrlNotCaptured: "Page URL not captured",
    requestEvidenceSummary: "Request evidence summary",
    mappedEvidence: "Browser-observed request mapped to imported source evidence.",
    mappedEvidenceWithRuntime:
      "Browser-observed request mapped to imported source evidence and development runtime spans.",
    controllerPending: "Controller pending",
    flowTiming: "Flow timing",
    totalDuration: "Total duration",
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
    knownBySourceOnly: "known by source evidence only",
    bottleneck: "Bottleneck",
    slowestSourceSegment: "Slowest source segment",
    blocked: "blocked",
    flowSummary: "Flow summary",
    observedSourceMatchedPath: "Observed / source-matched path",
    summaryMatchedCopy: "Browser-observed request first, then imported source evidence.",
    layers: "layers",
    knownDownstreamPath: "Known downstream path",
    summaryNote:
      "Anlyx maps this browser-observed request to imported source evidence. Source-matched rows are not a production runtime trace; muted rows were not proven executed.",
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
    untrackedApp: "Untracked app",
    untrackedRuntime: "not yet split into lower layers",
    noScannedNode: "No source node matched",
    downstreamMatched: "Downstream path matched by browser request and source evidence",
    knownScannedNotProven: "Known source path, not proven executed",
    inferred: "Inferred",
    matched: "Matched",
    evidenceInspector: "Evidence inspector",
    anlyxFlow: "Anlyx Flow",
    recentRequests: "Recent requests",
    background: "Background",
    currentRequestWindow: "Current page/action only",
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
    noCurrentPageRequests: "No requests observed on this page",
    noCurrentPageRequestsCopy:
      "Anlyx captured the current page, but no API request has been observed for this page/action yet.",
    emptyWorkspaceCopy: "No flow entries are loaded yet. Add Flow JSON to populate this workspace.",
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
    serverRequestSpan: "server request span",
    browserObserved: "browser observed",
    devRuntimeSpan: "dev runtime span",
    measuredRuntime: "measured runtime",
    callCount: "calls",
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
    lastScan: "마지막 가져오기",
    matchedBackendFlow: "매칭된 백엔드 흐름",
    liveWorkspace: "라이브 워크스페이스",
    captureConnected: "캡처 연결됨",
    waitingForCapture: "캡처 대기 중",
    matchedSubtitle: "브라우저 요청을 먼저 보고, 소스 매칭 백엔드 경로를 이어서 보여줍니다.",
    readyPrefix: "준비되었습니다. 로컬 앱을 사용하면 Anlyx가 요청을 이곳으로 스트리밍합니다.",
    readySuffix: "",
    selectedRequest: "선택된 요청",
    selectedRequestLabel: "선택된 요청",
    currentPage: "현재 페이지",
    pageUrlNotCaptured: "페이지 URL 미수집",
    requestEvidenceSummary: "요청 근거 요약",
    mappedEvidence: "브라우저에서 관찰된 요청을 가져온 소스 근거와 매칭했습니다.",
    mappedEvidenceWithRuntime:
      "브라우저에서 관찰된 요청을 가져온 소스 근거와 개발용 런타임 span에 매칭했습니다.",
    controllerPending: "컨트롤러 확인 대기",
    flowTiming: "흐름 타이밍",
    totalDuration: "전체 소요 시간",
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
    knownBySourceOnly: "소스 근거로만 확인됨",
    bottleneck: "병목",
    slowestSourceSegment: "가장 긴 소스 구간",
    blocked: "차단됨",
    flowSummary: "흐름 요약",
    observedSourceMatchedPath: "관찰 / 소스 매칭 경로",
    summaryMatchedCopy: "브라우저 요청을 먼저 보여주고, 이어서 가져온 소스 근거를 보여줍니다.",
    layers: "개 레이어",
    knownDownstreamPath: "알려진 하위 경로",
    summaryNote:
      "Anlyx는 브라우저에서 관찰된 요청을 가져온 소스 근거와 연결합니다. 소스 매칭 행은 운영 런타임 트레이스가 아니며, 흐리게 표시된 행은 실제 실행이 확인되지 않았습니다.",
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
    untrackedApp: "미분해 앱 시간",
    untrackedRuntime: "하위 레이어로 아직 분해되지 않음",
    noScannedNode: "매칭된 소스 노드 없음",
    downstreamMatched: "브라우저 요청과 소스 근거로 하위 경로가 매칭되었습니다",
    knownScannedNotProven: "소스 근거로 알려진 경로지만 실행은 확인되지 않았습니다",
    inferred: "추론됨",
    matched: "매칭됨",
    evidenceInspector: "근거 인스펙터",
    anlyxFlow: "Anlyx 흐름",
    recentRequests: "최근 요청",
    background: "백그라운드",
    currentRequestWindow: "현재 페이지/액션만",
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
    noCurrentPageRequests: "이 페이지에서 관찰된 요청이 없습니다",
    noCurrentPageRequestsCopy:
      "현재 페이지는 감지됐지만, 이 페이지/액션에 연결된 API 요청은 아직 관찰되지 않았습니다.",
    emptyWorkspaceCopy:
      "아직 불러온 flow entry가 없습니다. Flow JSON을 추가하면 이 워크스페이스가 채워집니다.",
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
    serverRequestSpan: "서버 요청 구간",
    browserObserved: "브라우저 관찰",
    devRuntimeSpan: "개발 런타임 구간",
    measuredRuntime: "실측 시간",
    callCount: "회 호출",
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

const projectChromeTranslations: Record<
  ProjectChromeLocale,
  Record<ProjectChromeTranslationKey, string>
> = {
  en: {
    agent: "AI Agent",
    available: "Available",
    disabled: "Disabled",
    language: "Language",
    lastAnalysis: "Last analysis",
    overview: "Overview",
    capabilities: "Capabilities",
    dataLifecycle: "Data Lifecycle",
    impactMap: "Impact Map",
    map: "Map",
    pages: "Pages",
    source: "Source",
    timing: "Timing",
    upToDate: "Up to date",
    pagesAnalyzed: "pages analyzed"
  },
  ko: {
    agent: "AI Agent",
    available: "사용 가능",
    disabled: "비활성",
    language: "언어",
    lastAnalysis: "마지막 분석",
    overview: "Overview",
    capabilities: "Capabilities",
    dataLifecycle: "Data Lifecycle",
    impactMap: "Impact Map",
    map: "맵",
    pages: "페이지",
    source: "소스",
    timing: "타이밍",
    upToDate: "최신 상태",
    pagesAnalyzed: "개 페이지 분석됨"
  },
  zh: {
    agent: "AI Agent",
    available: "可用",
    disabled: "已停用",
    language: "语言",
    lastAnalysis: "最后分析",
    overview: "Overview",
    capabilities: "Capabilities",
    dataLifecycle: "Data Lifecycle",
    impactMap: "Impact Map",
    map: "地图",
    pages: "页面",
    source: "来源",
    timing: "计时",
    upToDate: "已是最新",
    pagesAnalyzed: "个页面已分析"
  },
  ja: {
    agent: "AI Agent",
    available: "利用可能",
    disabled: "無効",
    language: "言語",
    lastAnalysis: "最終分析",
    overview: "Overview",
    capabilities: "Capabilities",
    dataLifecycle: "Data Lifecycle",
    impactMap: "Impact Map",
    map: "マップ",
    pages: "ページ",
    source: "ソース",
    timing: "タイミング",
    upToDate: "最新",
    pagesAnalyzed: "ページ分析済み"
  },
  fr: {
    agent: "Agent IA",
    available: "Disponible",
    disabled: "Désactivé",
    language: "Langue",
    lastAnalysis: "Dernière analyse",
    overview: "Overview",
    capabilities: "Capabilities",
    dataLifecycle: "Data Lifecycle",
    impactMap: "Impact Map",
    map: "Carte",
    pages: "Pages",
    source: "Source",
    timing: "Timing",
    upToDate: "À jour",
    pagesAnalyzed: "pages analysées"
  }
};

function tp(locale: ProjectChromeLocale, key: ProjectChromeTranslationKey): string {
  return projectChromeTranslations[locale]?.[key] ?? projectChromeTranslations.en[key];
}

function projectDefaultLocale(data: ProjectData): ProjectChromeLocale {
  return data.dictionary?.defaultLanguage ?? "en";
}

export type WorkspaceAppProps = {
  data?: ReportData;
  projectData?: ProjectData;
  projectValidationReport?: ProjectValidationReport;
  streamUrl?: string;
  initialRecords?: FlowRecord[];
};

type PageContextEvent = {
  type: "page_context";
  pageUrl: string;
  contextId: string;
  observedAt: string;
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
  projectData,
  projectValidationReport,
  streamUrl = "/_anlyx/events/stream",
  initialRecords = []
}: WorkspaceAppProps): JSX.Element {
  if (projectData) {
    return (
      <ProjectWorkspacePreview
        data={projectData}
        {...(projectValidationReport ? { validationReport: projectValidationReport } : {})}
      />
    );
  }

  if (!data) {
    return (
      <main className="project-workspace-preview" role="application" aria-label="Anlyx workspace">
        <section className="project-workspace-preview__empty">
          <strong>No Anlyx project data loaded</strong>
          <span>Start the local 4777 viewer with anlyx.project.json.</span>
        </section>
      </main>
    );
  }

  return <LegacyWorkspaceApp data={data} initialRecords={initialRecords} streamUrl={streamUrl} />;
}

function LegacyWorkspaceApp({
  data,
  streamUrl,
  initialRecords
}: {
  data: ReportData;
  streamUrl: string;
  initialRecords: FlowRecord[];
}): JSX.Element {
  const [records, setRecords] = useState<FlowRecord[]>(initialRecords);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialRecords[0]?.id);
  const [tab, setTab] = useState<WorkspaceTab>("timing");
  const [activeView, setActiveView] = useState<WorkspaceView>("flows");
  const [locale, setLocale] = useState<WorkspaceLocale>("en");
  const [pageContext, setPageContext] = useState<PageContextEvent | undefined>();
  const currentPageRecords = useMemo(
    () => recordsForPageContext(records, pageContext),
    [records, pageContext]
  );
  const currentPagePrimaryRecords = useMemo(
    () => currentPageRecords.filter(isPrimaryRecord),
    [currentPageRecords]
  );
  const selectedRecord =
    currentPagePrimaryRecords.find((record) => record.id === selectedId) ??
    currentPagePrimaryRecords[0];
  const scopedRecords = scopedRecentRecords(currentPageRecords, selectedRecord);

  useEffect(() => {
    if (currentPagePrimaryRecords.length === 0) {
      if (pageContext && selectedId) {
        setSelectedId(undefined);
      }
      return;
    }

    if (!selectedId || !currentPagePrimaryRecords.some((record) => record.id === selectedId)) {
      const firstRecord = currentPagePrimaryRecords[0];
      if (firstRecord) {
        setSelectedId(firstRecord.id);
      }
    }
  }, [currentPagePrimaryRecords, pageContext, selectedId]);

  useEffect(() => {
    if (typeof EventSource === "undefined") {
      return undefined;
    }

    const source = new EventSource(streamUrl);
    const handlePageContext = (event: MessageEvent<string>) => {
      const context = parsePageContextEvent(event.data);

      if (context) {
        setPageContext(context);
      }
    };
    const handleFlow = (event: MessageEvent<string>) => {
      const record = parseFlowRecord(event.data);

      if (!record) {
        return;
      }

      setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      setSelectedId((current) => {
        if (isPrimaryRecord(record)) {
          return record.id;
        }

        return current;
      });
    };

    source.addEventListener("page-context", handlePageContext);
    source.addEventListener("flow", handleFlow);

    return () => {
      source.removeEventListener("page-context", handlePageContext);
      source.removeEventListener("flow", handleFlow);
      source.close();
    };
  }, [streamUrl]);

  return (
    <WorkspaceLocaleContext.Provider value={locale}>
      <main
        className={`live-workspace live-workspace--${activeView === "flows" ? tab : activeView}`}
        role="application"
        aria-label={t(locale, "appLabel")}
      >
        <WorkspaceSidebar
          activeView={activeView}
          locale={locale}
          onLocaleChange={setLocale}
          onViewChange={setActiveView}
        />
        <section className="workspace-main">
          {activeView === "json" ? (
            <JsonReaderView data={data} />
          ) : activeView === "map" ? (
            <ScanTreeMap data={data} />
          ) : (
            <div className="timing-layout" id="workspace">
              <div className="timing-content">
                <WorkspaceHeader
                  data={data}
                  record={selectedRecord}
                  recordCount={records.length}
                  activeTab={tab}
                  onTabChange={setTab}
                />
                <RequestContextPanel
                  data={data}
                  pageContext={pageContext}
                  record={selectedRecord}
                />
                {selectedRecord ? (
                  <WorkspaceContent record={selectedRecord} tab={tab} />
                ) : (
                  <EmptyWorkspace pageContext={pageContext} />
                )}
              </div>
              <FlowInspector
                pageContext={pageContext}
                record={selectedRecord}
                records={scopedRecords}
                selectedId={selectedRecord?.id}
                onSelect={setSelectedId}
              />
            </div>
          )}
        </section>
      </main>
    </WorkspaceLocaleContext.Provider>
  );
}

function ProjectWorkspacePreview({
  data,
  validationReport
}: {
  data: ProjectData;
  validationReport?: ProjectValidationReport;
}): JSX.Element {
  const [activeTab, setActiveTab] = useState<ProjectWorkspaceTab>("pages");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [projectLocale, setProjectLocale] = useState<ProjectChromeLocale>(() =>
    projectDefaultLocale(data)
  );
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(data.pages[0]?.id);
  const model = useMemo(
    () => buildProjectWorkspaceViewModel(data, selectedPageId),
    [data, selectedPageId]
  );
  const rawJson = useMemo(() => JSON.stringify(data, null, 2), [data]);

  useEffect(() => {
    setProjectLocale(projectDefaultLocale(data));
  }, [data]);

  return (
    <main
      className="project-workspace-preview"
      role="application"
      aria-label="Anlyx project workspace"
    >
      <ProjectTopBar model={model} locale={projectLocale} onLocaleChange={setProjectLocale} />
      <div className={`project-workspace-shell${isSidebarCollapsed ? " is-sidebar-collapsed" : ""}`}>
        <ProjectSidebar
          activeTab={activeTab}
          isCollapsed={isSidebarCollapsed}
          locale={projectLocale}
          onTabChange={setActiveTab}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
        <div className="project-workspace-surface">
          {activeTab === "pages" ? (
            <ProjectPagesWorkspace
              data={data}
              model={model}
              {...(validationReport ? { validationReport } : {})}
              selectedPageId={model.selectedPage?.page.id}
              onPageSelect={setSelectedPageId}
              onOpenMap={() => setActiveTab("map")}
            />
          ) : activeTab === "map" ? (
            <ProjectMapView data={data} model={model} />
          ) : activeTab === "overview" ? (
            <ProjectOverviewView data={data} />
          ) : activeTab === "capabilities" ? (
            <ProjectCapabilitiesView data={data} model={model} />
          ) : (
            <ProjectJsonView
              data={data}
              rawJson={rawJson}
              model={model}
              {...(validationReport ? { validationReport } : {})}
            />
          )}
        </div>
      </div>
      <ProjectStatusBar
        data={data}
        locale={projectLocale}
        model={model}
        {...(validationReport ? { validationReport } : {})}
      />
    </main>
  );
}

function readProjectMetadataString(
  model: ProjectWorkspaceViewModel,
  key: string
): string | undefined {
  const value = model.project.metadata?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function projectAgentName(model: ProjectWorkspaceViewModel): string {
  return model.project.generatedBy?.name ?? model.project.generatedBy?.kind ?? "AI Agent";
}

function projectSourceFile(model: ProjectWorkspaceViewModel): string {
  return readProjectMetadataString(model, "sourceFile") ?? "anlyx.project.json";
}

function ProjectTopBar({
  model
}: {
  locale: ProjectChromeLocale;
  model: ProjectWorkspaceViewModel;
  onLocaleChange(locale: ProjectChromeLocale): void;
}): JSX.Element {
  return (
    <header className="project-topbar">
      <div className="project-topbar__brand">
        <img alt="Anlyx" src="/workspace/anlyx-logo-transparent.png" />
        <span>v{model.schemaVersion}</span>
      </div>
      <button className="project-topbar__project" type="button">
        <Folder size={17} />
        <span>{model.project.name}</span>
        <ChevronRight size={14} />
      </button>
      <div className="project-topbar__spacer" />
    </header>
  );
}

function projectTabLabel(tab: ProjectWorkspaceTab, locale: ProjectChromeLocale): string {
  if (tab === "pages") return tp(locale, "pages");
  if (tab === "map") return tp(locale, "map");
  if (tab === "overview") return tp(locale, "overview");
  if (tab === "capabilities") return tp(locale, "capabilities");
  return "JSON";
}

function ProjectSidebar({
  activeTab,
  isCollapsed,
  locale,
  onTabChange,
  onToggleCollapse
}: {
  activeTab: ProjectWorkspaceTab;
  isCollapsed: boolean;
  locale: ProjectChromeLocale;
  onTabChange(tab: ProjectWorkspaceTab): void;
  onToggleCollapse(): void;
}): JSX.Element {
  const items: Array<{ icon: LucideIcon; tab: ProjectWorkspaceTab }> = [
    { icon: FileText, tab: "pages" },
    { icon: Network, tab: "map" },
    { icon: Gauge, tab: "overview" },
    { icon: Workflow, tab: "capabilities" },
    { icon: Braces, tab: "json" }
  ];

  return (
    <aside className={`project-sidebar${isCollapsed ? " is-collapsed" : ""}`} aria-label="Project navigation">
      <div className="project-sidebar__group">
        {isCollapsed ? null : <h2>Project</h2>}
        {items.map(({ icon: Icon, tab }) => (
          <button
            aria-current={activeTab === tab ? "page" : undefined}
            aria-label={isCollapsed ? projectTabLabel(tab, locale) : undefined}
            className={activeTab === tab ? "is-active" : ""}
            key={tab}
            title={isCollapsed ? projectTabLabel(tab, locale) : undefined}
            type="button"
            onClick={() => onTabChange(tab)}
          >
            <Icon size={17} />
            {isCollapsed ? null : <span>{projectTabLabel(tab, locale)}</span>}
          </button>
        ))}
      </div>
      <button
        aria-label={isCollapsed ? "Expand project navigation" : "Collapse project navigation"}
        className="project-sidebar__collapse"
        title={isCollapsed ? "Expand" : undefined}
        type="button"
        onClick={onToggleCollapse}
      >
        <PanelLeft size={16} />
        {isCollapsed ? null : <span>Collapse</span>}
      </button>
    </aside>
  );
}

function ProjectOverviewView({
  data
}: {
  data: ProjectData;
}): JSX.Element {
  const overview = data.overview;
  const stack = projectOverviewStack(overview.implementation);
  const summary =
    overview.summary ??
    "Inspect the authored Project JSON to understand pages, flows, requests, architecture, evidence, and unknowns.";

  return (
    <section className="anlyx-understanding anlyx-overview" aria-label="Project overview">
      <div className="anlyx-overview-layout">
        <div className="anlyx-overview-main">
          <header className="anlyx-readme-header">
            <h1>Anlyx overview</h1>
            <p>{summary}</p>
          </header>

          <section className="anlyx-readme-section" aria-label="Built with">
            <h2>Built with</h2>
            {stack.length > 0 ? (
              <div className="anlyx-stack-grid">
                {stack.map((item) => (
                  <div className="anlyx-stack-item" key={item.name}>
                    <ProjectStackIconView icon={item.icon} tone={item.tone} />
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.detail}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="project-muted">No implementation stack authored.</p>
            )}
          </section>

          <section className="anlyx-readme-section" aria-label="What it does">
            <h2>What it does</h2>
            <div className="anlyx-feature-list">
              <ProjectReadmeFeature
                icon={FileText}
                title="Inspect pages"
                description="Explore the UI surfaces, components, and states that make up your app."
              />
              <ProjectReadmeFeature
                icon={Workflow}
                title="Trace request flows"
                description="Follow the path from UI events to API requests and data responses."
              />
              <ProjectReadmeFeature
                icon={Braces}
                title="Review authored JSON"
                description="Open the source Project JSON and understand the modeled structure."
              />
              <ProjectReadmeFeature
                icon={Search}
                title="Check evidence & unknowns"
                description="See what’s backed by evidence and what needs review or clarification."
              />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

function ProjectStackIconView({
  icon,
  tone
}: {
  icon: ProjectStackIcon;
  tone: string;
}): JSX.Element {
  if (icon.kind === "lucide") {
    const Icon = icon.icon;

    return (
      <span className={`anlyx-stack-icon is-${tone}`} aria-hidden="true">
        <Icon size={22} />
      </span>
    );
  }

  return (
    <span
      className={`anlyx-stack-icon is-${tone}`}
      aria-hidden="true"
      style={{ "--stack-icon-color": `#${icon.hex}` } as CSSProperties}
    >
      <svg role="img" viewBox="0 0 24 24" aria-label={icon.title}>
        <path d={icon.path} />
      </svg>
    </span>
  );
}

function ProjectReadmeFeature({
  description,
  icon: Icon,
  title
}: {
  description: string;
  icon: LucideIcon;
  title: string;
}): JSX.Element {
  return (
    <div className="anlyx-readme-feature">
      <span>
        <Icon size={20} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}


function projectOverviewStack(
  implementation: ProjectData["overview"]["implementation"]
): ProjectStackItem[] {
  return implementation.slice(0, 5).map((item) => ({
    detail: item.description ?? capitalize(item.kind),
    icon: stackIcon(item.name, item.kind),
    name: stackDisplayName(item.name),
    tone: stackTone(item.name, item.kind)
  }));
}

function stackDisplayName(value: string): string {
  if (/react/i.test(value)) return "React";
  if (/typescript|ts\b/i.test(value)) return "TypeScript";
  if (/node|runtime|cli/i.test(value)) return "Node.js";
  if (/express/i.test(value)) return "Express";
  if (/schema|project json|contract/i.test(value)) return "Project JSON";

  return value;
}

function stackIcon(name: string, kind: string): ProjectStackIcon {
  const value = `${name} ${kind}`;
  if (/react/i.test(value)) return simpleStackIcon(siReact);
  if (/typescript|ts\b/i.test(value)) return simpleStackIcon(siTypescript);
  if (/node|runtime|cli/i.test(value)) return simpleStackIcon(siNodedotjs);
  if (/express/i.test(value)) return simpleStackIcon(siExpress);
  if (/schema|json|contract/i.test(value)) return { kind: "lucide", icon: Braces };

  return { kind: "lucide", icon: Code2 };
}

function simpleStackIcon(icon: { hex: string; path: string; title: string }): ProjectStackIcon {
  return {
    hex: icon.hex,
    kind: "simple",
    path: icon.path,
    title: icon.title
  };
}

function stackTone(name: string, kind: string): string {
  const value = `${name} ${kind}`;
  if (/react/i.test(value)) return "react";
  if (/typescript|ts\b/i.test(value)) return "typescript";
  if (/node|runtime|cli/i.test(value)) return "node";
  if (/express/i.test(value)) return "express";
  if (/schema|json|contract/i.test(value)) return "json";

  return "json";
}

function ProjectCapabilitiesView({
  data
}: {
  data: ProjectData;
  model: ProjectWorkspaceViewModel;
}): JSX.Element {
  const defaultCapability =
    data.capabilities.find((capability) => /inspect page behavior/i.test(capability.name)) ??
    data.capabilities[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultCapability?.id);
  const [capabilityFilter, setCapabilityFilter] = useState<"all" | "connected" | "entry" | "user">("all");
  const visibleCapabilities = data.capabilities.filter((capability) => {
    if (capabilityFilter === "connected") return capability.status === "connected";
    if (capabilityFilter === "entry") return Boolean(capability.entry);
    if (capabilityFilter === "user") return capability.actorRole === "user";

    return true;
  });
  const selected =
    visibleCapabilities.find((capability) => capability.id === selectedId) ??
    data.capabilities.find((capability) => capability.id === selectedId) ??
    defaultCapability;
  const connected = data.capabilities.filter((capability) => capability.status === "connected").length;
  const userFacing = data.capabilities.filter((capability) => capability.actorRole !== "system").length;
  const unresolved = data.capabilities.filter((capability) => capability.status !== "connected").length;

  return (
    <section className="anlyx-understanding anlyx-capabilities" aria-label="Project capabilities">
      <div className="anlyx-overview-layout">
        <div className="anlyx-overview-main">
          <div className="anlyx-metric-row">
            <ProjectUnderstandingMetric icon={Workflow} label="Total capabilities" value={String(data.capabilities.length)} detail="Authored" />
            <ProjectUnderstandingMetric icon={Check} label="Connected" value={String(connected)} detail={`${percentage(connected, data.capabilities.length)}% of total`} />
            <ProjectUnderstandingMetric icon={MousePointerClick} label="User-facing" value={String(userFacing)} detail={`${percentage(userFacing, data.capabilities.length)}% of total`} />
            <ProjectUnderstandingMetric icon={Gauge} label="Unresolved" value={String(unresolved)} detail="Requires review" />
          </div>

          <div className="anlyx-filter-row" aria-label="Filter capabilities by actor">
            <span>Filter by</span>
            <button
              className={capabilityFilter === "all" ? "is-selected" : ""}
              type="button"
              onClick={() => setCapabilityFilter("all")}
            >
              All
            </button>
            <button
              className={capabilityFilter === "user" ? "is-selected" : ""}
              type="button"
              onClick={() => setCapabilityFilter("user")}
            >
              User
            </button>
            <button
              className={capabilityFilter === "entry" ? "is-selected" : ""}
              type="button"
              onClick={() => setCapabilityFilter("entry")}
            >
              Entry surface
            </button>
            <button
              className={capabilityFilter === "connected" ? "is-selected" : ""}
              type="button"
              onClick={() => setCapabilityFilter("connected")}
            >
              Connected only
            </button>
          </div>

          {data.capabilities.length === 0 ? (
            <ProjectSurfaceEmpty
              title="No capabilities authored"
              description="Add capabilities to describe product behavior without opening source code."
            />
          ) : (
            <div className="anlyx-capability-table" role="table" aria-label="Capabilities">
              <div className="anlyx-capability-row is-header" role="row">
                <span>Actor</span>
                <span>Capability</span>
                <span>Entry surface</span>
                <span>Request</span>
                <span>Data touched</span>
                <span>Status</span>
              </div>
              {visibleCapabilities.map((capability) => (
                <button
                  className={`anlyx-capability-row${capability.id === selected?.id ? " is-selected" : ""}`}
                  key={capability.id}
                  type="button"
                  onClick={() => setSelectedId(capability.id)}
                >
                  <span className={`anlyx-role-badge is-${capability.actorRole}`}>
                    <span className={`anlyx-role-dot is-${capability.actorRole}`} />
                    {capitalize(capability.actorRole)}
                  </span>
                  <span className="anlyx-capability-name">
                    <strong>{capability.name}</strong>
                    <em>{capability.description ?? capability.visibleResult ?? "No capability description authored."}</em>
                  </span>
                  <span>{capability.entry?.label ?? "No entry authored"}</span>
                  <span>{requestSummary(data, capability.requestIds)}</span>
                  <span>{capability.dataRefs.map((ref) => ref.name).join(", ") || "No data refs"}</span>
                  <ProjectStatusPill status={capability.status} />
                </button>
              ))}
              <div className="anlyx-capability-footer">
                Showing {visibleCapabilities.length} of {data.capabilities.length} capabilities
              </div>
            </div>
          )}
        </div>

        <aside className="anlyx-surface-rail" aria-label="Capability details">
          {selected ? (
            <>
              <div className="anlyx-rail-section is-tinted">
                <h2>{selected.name}</h2>
                <ProjectStatusPill status={selected.status} />
              </div>
              <div className="anlyx-rail-section">
                <h3>Why this matters</h3>
                <p>{capabilityWhyThisMatters(selected)}</p>
              </div>
              <div className="anlyx-rail-section">
                <h3>Trace summary</h3>
                <dl className="anlyx-capability-compact-facts">
                  <div>
                    <dt>Actor</dt>
                    <dd>{capitalize(selected.actorRole)}</dd>
                  </div>
                  <div>
                    <dt>Request</dt>
                    <dd>{requestSummary(data, selected.requestIds)}</dd>
                  </div>
                  <div>
                    <dt>Confidence</dt>
                    <dd>{capitalize(selected.confidence ?? "unknown")}</dd>
                  </div>
                </dl>
              </div>
              <div className="anlyx-rail-section">
                <h3>Evidence summary</h3>
                <ProjectCapabilityEvidenceSummary capability={selected} />
              </div>
            </>
          ) : (
            <ProjectSurfaceEmpty title="No capability selected" description="Select a capability row." />
          )}
        </aside>
      </div>
    </section>
  );
}

function ProjectCapabilityEvidenceSummary({
  capability
}: {
  capability: ProjectData["capabilities"][number];
}): JSX.Element {
  const pageCount = new Set(capability.pageIds).size;
  const flowCount = new Set(capability.flowIds).size;
  const dataCount = capability.dataRefs.length;

  return (
    <div className="anlyx-evidence-summary-list">
      <span><FileText size={14} />{pageCount} pages analyzed</span>
      <span><Workflow size={14} />{flowCount} flows connected</span>
      <span><Database size={14} />{dataCount} data objects referenced</span>
    </div>
  );
}

function ProjectTrustSummary({
  data,
  validationReport
}: {
  data: ProjectData;
  validationReport?: ProjectValidationReport;
}): JSX.Element | null {
  const coverage = projectPageCoverageSummary(data, validationReport);
  const coverageStatus = validationReport?.summary.coverageStatus ?? data.coverage?.status;
  const sourceIssueCount = validationReport?.summary.sourceIssueCount;
  const sourceIssueDetails = validationReport
    ? formatSourceIssueDetails(validationReport.summary.sourceIssueBreakdown)
    : "";
  const issueCount = validationReport?.issues.length;
  const shouldShow =
    Boolean(coverage.detected) ||
    coverageStatus === "partial" ||
    coverageStatus === "unknown" ||
    (sourceIssueCount ?? 0) > 0 ||
    (issueCount ?? 0) > 0;

  if (!shouldShow) {
    return null;
  }

  return (
    <section className="project-trust-summary" aria-label="Project analysis coverage">
      <div>
        <span className="project-trust-summary__eyebrow">Analysis scope</span>
        <strong>{coverageStatus === "partial" ? "Partial analysis" : "Coverage summary"}</strong>
      </div>
      <dl>
        <div>
          <dt>Pages</dt>
          <dd>{coverage.value}</dd>
        </div>
        {sourceIssueCount !== undefined ? (
          <div>
            <dt>Source issues</dt>
            <dd className={sourceIssueCount > 0 ? "is-warning" : "is-ok"}>
              {sourceIssueCount}
              {sourceIssueDetails ? <small>{sourceIssueDetails}</small> : null}
            </dd>
          </div>
        ) : null}
        {issueCount !== undefined ? (
          <div>
            <dt>Validation issues</dt>
            <dd className={issueCount > 0 ? "is-warning" : "is-ok"}>{issueCount}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function capabilityWhyThisMatters(capability: ProjectData["capabilities"][number]): string {
  if (/inspect page behavior/i.test(capability.name)) {
    return "This capability lets a user inspect authored pages, primary requests, selected flow layers, evidence, and unknowns—providing clarity into how data moves and where gaps exist.";
  }

  return capability.visibleResult ?? capability.description ?? "This capability ties a user-facing action to authored requests, data, evidence, and confidence.";
}

function ProjectUnderstandingMetric({
  detail,
  icon: Icon,
  label,
  value
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="anlyx-understanding-metric">
      <span>
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </div>
  );
}

function ProjectSurfaceEmpty({
  description,
  title
}: {
  description: string;
  title: string;
}): JSX.Element {
  return (
    <div className="anlyx-surface-empty">
      <Minus size={18} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function ProjectStatusPill({ status }: { status: string }): JSX.Element {
  return <span className={`anlyx-status-pill is-${status}`}>{status}</span>;
}

function percentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function requestSummary(data: ProjectData, requestIds: string[]): string {
  const requests = requestIds
    .map((id) => data.requests.find((request) => request.id === id))
    .filter((request): request is ProjectData["requests"][number] => Boolean(request));

  if (requests.length === 0) return "No request authored";

  return requests
    .slice(0, 2)
    .map((request) => `${request.method ?? "REQ"} ${request.path ?? request.label ?? request.id}`)
    .join(", ");
}

function ProjectPagesWorkspace({
  data,
  model,
  onOpenMap,
  onPageSelect,
  selectedPageId,
  validationReport
}: {
  data: ProjectData;
  model: ProjectWorkspaceViewModel;
  onOpenMap(): void;
  onPageSelect(pageId: string): void;
  selectedPageId: string | undefined;
  validationReport?: ProjectValidationReport;
}): JSX.Element {
  const [isPageIndexCollapsed, setIsPageIndexCollapsed] = useState(false);

  return (
    <div
      className={`anlyx-pages project-pages-layout${
        isPageIndexCollapsed ? " is-index-collapsed" : ""
      }`}
    >
      <ProjectPageIndex
        data={data}
        isCollapsed={isPageIndexCollapsed}
        model={model}
        {...(validationReport ? { validationReport } : {})}
        selectedPageId={selectedPageId}
        onPageSelect={onPageSelect}
        onToggleCollapse={() => setIsPageIndexCollapsed((value) => !value)}
      />
      <ProjectPagesView
        data={data}
        model={model}
        {...(validationReport ? { validationReport } : {})}
        selectedPage={model.selectedPage}
        onOpenMap={onOpenMap}
      />
    </div>
  );
}

function ProjectPageIndex({
  data,
  isCollapsed,
  model,
  onPageSelect,
  onToggleCollapse,
  selectedPageId,
  validationReport
}: {
  data: ProjectData;
  isCollapsed: boolean;
  model: ProjectWorkspaceViewModel;
  onPageSelect(pageId: string): void;
  onToggleCollapse(): void;
  selectedPageId: string | undefined;
  validationReport?: ProjectValidationReport;
}): JSX.Element {
  const pages = model.pageGroups.flatMap((group) => group.pages);
  const pageCoverage = projectPageCoverageSummary(data, validationReport);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGroups = normalizedQuery
    ? model.pageGroups
        .map((group) => ({
          ...group,
          pages: group.pages.filter(
            (page) =>
              page.title.toLowerCase().includes(normalizedQuery) ||
              page.path.toLowerCase().includes(normalizedQuery)
          )
        }))
        .filter((group) => group.pages.length > 0)
    : model.pageGroups;

  return (
    <aside
      className={`anlyx-page-index project-page-index-panel${isCollapsed ? " is-collapsed" : ""}`}
      aria-label="Page index"
    >
      <div className="project-panel-title">
        {isCollapsed ? null : (
          <div>
            <h2>Page Index</h2>
            <span>{pageCoverage.label}</span>
          </div>
        )}
        <button
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand page index" : "Collapse page index"}
          type="button"
          onClick={onToggleCollapse}
        >
          <PanelLeft size={15} />
        </button>
      </div>
      {isCollapsed ? (
        <nav className="project-page-index--collapsed" aria-label="Project pages">
          {pages.map((page) => (
            <button
              aria-label={`${page.title} ${page.path}`}
              className={selectedPageId === page.id ? "is-active" : ""}
              key={page.id}
              title={`${page.title} ${page.path}`}
              type="button"
              onClick={() => onPageSelect(page.id)}
            >
              <BookOpen size={16} />
            </button>
          ))}
        </nav>
      ) : (
        <>
          <div className="project-page-index__search">
            <Search size={16} />
            <input
              aria-label="Search pages"
              placeholder="Search pages..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            <kbd>/</kbd>
          </div>
          <nav className="project-page-index" aria-label="Project pages">
            {visibleGroups.map((group) => (
              <section key={group.id}>
                <h2>
                  <span>{group.name}</span>
                  <span>{group.pages.length}</span>
                </h2>
                {group.pages.map((page) => (
                  <button
                    className={selectedPageId === page.id ? "is-active" : ""}
                    key={page.id}
                    type="button"
                    onClick={() => onPageSelect(page.id)}
                  >
                    <BookOpen size={15} />
                    <span>{page.title}</span>
                    <em>{page.path}</em>
                  </button>
                ))}
              </section>
            ))}
          </nav>
          <div className="project-page-index-panel__footer">
            <span>Total pages</span>
            <strong>{model.totals.pages}</strong>
          </div>
        </>
      )}
    </aside>
  );
}

function ProjectPagesView({
  data,
  model,
  onOpenMap,
  selectedPage,
  validationReport
}: {
  data: ProjectData;
  model: ProjectWorkspaceViewModel;
  onOpenMap(): void;
  selectedPage: ProjectSelectedPageView | undefined;
  validationReport?: ProjectValidationReport;
}): JSX.Element {
  const defaultRequestId = getDefaultPageRequestId(selectedPage);
  const [selectedRequestId, setSelectedRequestId] = useState<string | undefined>(defaultRequestId);
  const [isRailOpen, setIsRailOpen] = useState(false);

  useEffect(() => {
    setSelectedRequestId(defaultRequestId);
  }, [defaultRequestId, selectedPage?.page.id]);

  if (!selectedPage) {
    return (
      <section className="project-workspace-preview__empty">
        <strong>No pages authored yet</strong>
        <span>Ask the project Agent to write pages into anlyx.project.json.</span>
      </section>
    );
  }

  const selectedRequest =
    selectedPage.requests.find((request) => request.id === selectedRequestId) ??
    getDefaultPageRequest(selectedPage);
  const selectedRequestLabel =
    selectedRequest?.path ?? selectedRequest?.label ?? selectedRequest?.id ?? "selected request";
  const requestGroups = groupRequestsByRole(selectedPage.requests);
  const selectedRequestFlows = selectedRequest
    ? selectedPage.flows.filter(
        (flow) =>
          flow.request?.id === selectedRequest.id ||
          (flow.request?.path && flow.request.path === selectedRequest.path)
      )
    : [];
  const visibleFlows = selectedRequest ? selectedRequestFlows : selectedPage.flows;
  const unknownEvidence = selectedPage.evidence.filter(
    (item) => item.status === "not-proven" || item.status === "unknown"
  );
  const selectedFlow = visibleFlows[0];

  return (
    <div className={`project-page-workspace${isRailOpen ? "" : " is-rail-collapsed"}`}>
      <main className="anlyx-page-report project-page-workspace__main">
        {!isRailOpen ? (
          <button
            className="anlyx-rail-reopen"
            type="button"
            onClick={() => setIsRailOpen(true)}
          >
            <PanelLeft size={14} />
            Details
          </button>
        ) : null}
        <ProjectTrustSummary
          data={data}
          {...(validationReport ? { validationReport } : {})}
        />
        <PageBrief selectedPage={selectedPage} />
        <div className="project-page-two-up">
          <ProjectSection title="Story">
            <p className="project-story-copy">
              {selectedPage.page.description ??
                "No story was authored for this page yet. Ask the project Agent to describe what this page does and why it exists."}
            </p>
          </ProjectSection>
          <ProjectSection className="anlyx-user-actions" title="User actions">
            <div className="anlyx-action-list project-action-list">
              {selectedPage.features.length > 0 ? (
                selectedPage.features.map((feature) => (
                  <ProjectFeatureCard feature={feature} key={feature.id} />
                ))
              ) : (
                <p className="project-muted">No user actions authored for this page.</p>
              )}
            </div>
          </ProjectSection>
        </div>
        <RequestsByRole
          groups={requestGroups}
          selectedRequest={selectedRequest}
          onRequestSelect={setSelectedRequestId}
        />
        <ProjectSection
          className="anlyx-flow-section"
          meta={
            selectedRequest
              ? `${selectedRequest.method ?? "HTTP"} ${selectedRequestLabel}`
              : undefined
          }
          title="Selected Flow"
        >
          {selectedFlow ? (
            <ProjectFlowTrace flow={selectedFlow} />
          ) : (
            <p className="project-muted">No backend flow linked to this request.</p>
          )}
        </ProjectSection>
        <div className="anlyx-trust-unknowns project-page-two-up project-page-two-up--trust">
          <ProjectSection className="anlyx-trust-breakdown" title="Trust Breakdown">
            <div className="anlyx-trust-grid project-evidence-row">
              <EvidenceChip
                label="Source-matched"
                total={selectedPage.evidenceSummary.total}
                value={selectedPage.evidenceSummary.sourceMatched}
              />
              <EvidenceChip
                label="Agent-inferred"
                total={selectedPage.evidenceSummary.total}
                value={selectedPage.evidenceSummary.agentInferred}
              />
              <EvidenceChip
                label="Observed"
                total={selectedPage.evidenceSummary.total}
                value={selectedPage.evidenceSummary.observed}
              />
              <EvidenceChip
                label="Not-proven"
                total={selectedPage.evidenceSummary.total}
                value={selectedPage.evidenceSummary.notProven}
              />
              <EvidenceChip
                label="Unknown"
                total={selectedPage.evidenceSummary.total}
                value={selectedPage.evidenceSummary.unknown}
              />
            </div>
          </ProjectSection>
          <ProjectSection className="anlyx-unknowns" title="Unknowns">
            {unknownEvidence.length > 0 ? (
              <ul className="anlyx-unknown-list project-unknown-list">
                {unknownEvidence.slice(0, 4).map((item) => (
                  <li key={item.id}>{item.detail ?? item.label}</li>
                ))}
              </ul>
            ) : (
              <div className="anlyx-unknown-empty">
                <p>No unknown or not-proven evidence authored for this page.</p>
                <p>All detected elements are source-matched.</p>
              </div>
            )}
          </ProjectSection>
        </div>
      </main>
      {isRailOpen ? (
        <PageDetailsRail
          model={model}
          selectedPage={selectedPage}
          onCollapse={() => setIsRailOpen(false)}
          onOpenMap={onOpenMap}
        />
      ) : null}
    </div>
  );
}

function PageBrief({
  selectedPage
}: {
  selectedPage: ProjectSelectedPageView;
}): JSX.Element {
  return (
    <header className="project-page-brief">
      <div className="project-page-brief__body">
        <div className="project-page-brief__title">
          <div>
            <h1>{selectedPage.page.title}</h1>
            <code>{selectedPage.page.path}</code>
          </div>
          <p>
            {selectedPage.page.description ??
              "No page story was authored yet. Ask the project Agent to describe what this page does and why it exists."}
          </p>
        </div>
      </div>
    </header>
  );
}

function RequestsByRole({
  groups,
  onRequestSelect,
  selectedRequest
}: {
  groups: Array<{ label: string; requests: ProjectRequestView[]; role: ProjectRequestView["role"] }>;
  onRequestSelect(requestId: string): void;
  selectedRequest: ProjectRequestView | undefined;
}): JSX.Element {
  return (
    <ProjectSection title="Requests">
      <div className="anlyx-requests-grid project-request-columns">
        {groups.some((group) => group.requests.length > 0) ? (
          groups.map((group) => (
            <section className="project-request-column" key={group.role}>
              <header>
                <strong>{group.label}</strong>
                <span>{group.requests.length}</span>
              </header>
              {group.requests.length > 0 ? (
                group.requests.map((request) => (
                  <ProjectRequestCard
                    isSelected={selectedRequest?.id === request.id}
                    key={request.id}
                    request={request}
                    onSelect={() => onRequestSelect(request.id)}
                  />
                ))
              ) : (
                <div className="anlyx-request-empty">
                  <Minus size={18} />
                  <strong>No {group.label.toLowerCase()} requests</strong>
                  <span>None detected for this page.</span>
                </div>
              )}
            </section>
          ))
        ) : (
          <p className="project-muted">No requests linked to this page.</p>
        )}
      </div>
    </ProjectSection>
  );
}

function getDefaultPageRequestId(
  selectedPage: ProjectSelectedPageView | undefined
): string | undefined {
  return getDefaultPageRequest(selectedPage)?.id;
}

function getDefaultPageRequest(
  selectedPage: ProjectSelectedPageView | undefined
): ProjectRequestView | undefined {
  if (!selectedPage) return undefined;

  return (
    selectedPage.requests.find((request) => request.role === "primary") ??
    selectedPage.requests.find((request) => request.role === "supporting") ??
    selectedPage.requests[0]
  );
}

function groupRequestsByRole(
  requests: ProjectRequestView[]
): Array<{ label: string; requests: ProjectRequestView[]; role: ProjectRequestView["role"] }> {
  const groups: Array<{
    label: string;
    requests: ProjectRequestView[];
    role: ProjectRequestView["role"];
  }> = [
    { role: "primary", label: "Primary", requests: [] },
    { role: "supporting", label: "Supporting", requests: [] },
    { role: "background", label: "Background", requests: [] },
    { role: "external", label: "External", requests: [] }
  ];

  for (const request of requests) {
    const group = groups.find((item) => item.role === request.role);

    group?.requests.push(request);
  }

  const externalGroup = groups.find((group) => group.role === "external");
  const baseGroups = groups.filter((group) => group.role !== "external");

  return externalGroup && externalGroup.requests.length > 0
    ? [...baseGroups, externalGroup]
    : baseGroups;
}

function ProjectSection({
  children,
  className,
  index,
  meta,
  title
}: {
  children: ReactNode;
  className?: string | undefined;
  index?: number | undefined;
  meta?: string | undefined;
  title: string;
}): JSX.Element {
  return (
    <section className={`anlyx-report-section project-section${className ? ` ${className}` : ""}`}>
      <header className="project-section__header">
        <h3>
          {index ? (
            <span className="project-section__number" aria-hidden="true">
              {index}
            </span>
          ) : null}
          <span>{title}</span>
        </h3>
        {meta ? <span>{meta}</span> : null}
      </header>
      {children}
    </section>
  );
}

function ProjectFeatureCard({ feature }: { feature: ProjectFeatureView }): JSX.Element {
  return (
    <article className="anlyx-action-item project-feature-card">
      <div>
        <strong>{feature.name}</strong>
        <p>{feature.description ?? "No feature description authored yet."}</p>
      </div>
    </article>
  );
}

function ProjectRequestCard({
  isSelected,
  onSelect,
  request
}: {
  isSelected: boolean;
  onSelect(): void;
  request: ProjectRequestView;
}): JSX.Element {
  const label = request.path ?? request.label ?? request.id;

  return (
    <button
      className={`anlyx-request-card project-request-card project-request-card--${request.role} ${
        isSelected ? "is-selected" : ""
      }`}
      type="button"
      onClick={onSelect}
    >
      <header>
        <span className={`project-method-badge project-method-badge--${request.method ?? "HTTP"}`}>
          {request.method ?? "HTTP"}
        </span>
        {isSelected ? <Check size={15} /> : null}
      </header>
      <strong>
        {label}
      </strong>
      <p>{request.description ?? request.purpose}</p>
      <footer>
        <b>{request.role}</b>
      </footer>
    </button>
  );
}

function ProjectFlowTrace({ flow }: { flow: ProjectFlowView }): JSX.Element {
  const layers = flow.layers.length > 0 ? flow.layers : [];
  const [expandedLayerId, setExpandedLayerId] = useState<string | undefined>();

  return (
    <article className="anlyx-flow-trace project-flow-trace">
      <header className="project-flow-trace__header">
        <span>{flow.request?.role ?? "flow"}</span>
        <strong>{flow.name ?? flow.request?.path ?? flow.id}</strong>
      </header>
      <div className="anlyx-flow-scroll">
        <div className="anlyx-flow-track project-flow-trace__layers">
          {layers.map((layer, index) => (
            <Fragment key={layer.id}>
              <ProjectFlowLayerCard
                isExpanded={expandedLayerId === layer.id}
                layer={layer}
                onToggle={() =>
                  setExpandedLayerId((current) => (current === layer.id ? undefined : layer.id))
                }
              />
              {index < layers.length - 1 ? (
                <span className="anlyx-flow-arrow" aria-hidden="true">
                  <ChevronRight size={18} />
                </span>
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>
    </article>
  );
}

function ProjectFlowLayerCard({
  isExpanded,
  onToggle,
  layer
}: {
  isExpanded: boolean;
  layer: ProjectFlowView["layers"][number];
  onToggle(): void;
}): JSX.Element {
  const source = formatSourceLocation(layer.source) ?? formatLayerHint(layer);

  return (
    <button
      aria-expanded={isExpanded}
      className={`anlyx-flow-node project-flow-layer project-flow-layer--${layer.kind}${
        isExpanded ? " is-expanded" : ""
      }`}
      title={source}
      type="button"
      onClick={onToggle}
    >
      <span className="anlyx-flow-layer">{titleCase(layer.kind)}</span>
      <strong className="anlyx-flow-title">{layer.label}</strong>
      <em className="anlyx-flow-source">{source}</em>
      <small className="anlyx-evidence-pill">{evidenceStatusLabel(layer.status)}</small>
    </button>
  );
}

function EvidenceChip({
  label,
  total,
  value
}: {
  label: string;
  total: number;
  value: number;
}): JSX.Element {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const status = label.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

  return (
    <span className={`anlyx-trust-card anlyx-trust-card--${status} project-evidence-chip`}>
      <span>
        <i aria-hidden="true" />
        {label}
      </span>
      <strong>{value}</strong>
      <em>{percent}%</em>
    </span>
  );
}

function PageDetailsRail({
  model,
  onCollapse,
  onOpenMap,
  selectedPage
}: {
  model: ProjectWorkspaceViewModel;
  onCollapse(): void;
  onOpenMap(): void;
  selectedPage: ProjectSelectedPageView;
}): JSX.Element {
  const page = selectedPage.page;
  const relatedPages = getRelatedPages(model, page.metadata?.["relatedPageIds"]);
  const tags = getStringList(page.metadata?.["tags"]);
  const evidenceLabel = formatEvidenceSummary(selectedPage.evidenceSummary);

  return (
    <aside className="anlyx-page-rail project-page-details-panel" aria-label="Page details">
      <div className="anlyx-page-rail__header">
        <h2>Page Details</h2>
        <button aria-label="Collapse page details" type="button" onClick={onCollapse}>
          <PanelLeft size={14} />
        </button>
      </div>
      <dl>
        <ProjectDetailField label="Area" value={selectedPage.areaName} />
        <ProjectDetailField label="Route" value={page.path} />
        <ProjectDetailField
          label="Page Type"
          value={metadataString(page.metadata?.["pageType"]) ?? "Not authored"}
        />
        <ProjectDetailField
          label="Auth Required"
          value={metadataBooleanLabel(page.metadata?.["authRequired"])}
        />
        <ProjectDetailField
          label="Layout"
          value={metadataString(page.metadata?.["layout"]) ?? "Not authored"}
        />
        <ProjectDetailField
          label="Last Seen"
          value={formatAnalysisTime(model.project.analyzedAt) ?? "Not authored"}
        />
      </dl>
      <section>
        <h3>Evidence</h3>
        <p>{evidenceLabel}</p>
        {page.source ? <p>{formatSourceLocation(page.source)}</p> : null}
      </section>
      <section>
        <h3>Related Pages</h3>
        {relatedPages.length > 0 ? (
          <ul>
            {relatedPages.map((relatedPage) => (
              <li key={relatedPage.id}>
                <strong>{relatedPage.title}</strong>
                <span>{relatedPage.path}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No related pages authored.</p>
        )}
      </section>
      <section>
        <h3>Tags</h3>
        {tags.length > 0 ? (
          <div className="project-page-tags">
            {tags.map((tag) => (
              <span key={tag}>
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p>No tags authored.</p>
        )}
      </section>
      <button type="button" onClick={onOpenMap}>
        <Network size={15} />
        View in Map
      </button>
    </aside>
  );
}

function ProjectDetailField({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function getRelatedPages(
  model: ProjectWorkspaceViewModel,
  value: unknown
): Array<{ id: string; path: string; title: string }> {
  const ids = getStringList(value);
  const pages = model.pageGroups.flatMap((group) => group.pages);

  return ids.flatMap((id) => {
    const page = pages.find((item) => item.id === id);

    return page ? [{ id: page.id, path: page.path, title: page.title }] : [];
  });
}

function getStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function metadataString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function metadataBooleanLabel(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.trim().length > 0) return value;

  return "Not authored";
}

function formatAnalysisTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatEvidenceSummary(summary: ProjectSelectedPageView["evidenceSummary"]): string {
  if (summary.total === 0) return "Not authored";

  const strongest =
    summary.sourceMatched > 0
      ? "Source-matched"
      : summary.observed > 0
        ? "Observed"
        : summary.agentInferred > 0
          ? "Agent-inferred"
          : summary.notProven > 0
            ? "Not-proven"
            : "Unknown";

  return `${strongest} (${summary.total})`;
}

function formatSourceLocation(
  source: ProjectFlowView["layers"][number]["source"] | undefined
): string | undefined {
  if (!source) return undefined;
  const line = source.lineStart ? `:${source.lineStart}` : "";
  const symbol = source.symbol ? ` ${source.symbol}` : "";

  return `${source.filePath}${line}${symbol}`;
}

function formatLayerHint(layer: ProjectFlowView["layers"][number]): string {
  return metadataString(layer.metadata?.["module"]) ?? metadataString(layer.metadata?.["file"]) ?? layer.id;
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join("-");
}

function ProjectMapView({
  data,
  model
}: {
  data: ProjectData;
  model: ProjectWorkspaceViewModel;
}): JSX.Element {
  const map = useMemo(() => buildProjectArchitectureMap(data), [data]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const selectedNode = map.nodes.find((node) => node.id === selectedNodeId);
  const focus = useMemo(
    () => buildProjectArchitectureFocus(map, selectedNode?.id),
    [map, selectedNode?.id]
  );
  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setInspectorOpen(true);
  };

  if (data.architecture.nodes.length === 0) {
    return (
      <section className="project-map-placeholder" aria-label="Project architecture map">
        <div>
          <Network size={24} />
          <h2>Map</h2>
          <p>
            No architecture graph was authored yet. The viewer will not invent mock project data.
          </p>
        </div>
        <dl>
          <div>
            <dt>Nodes</dt>
            <dd>0</dd>
          </div>
          <div>
            <dt>Edges</dt>
            <dd>0</dd>
          </div>
        </dl>
      </section>
    );
  }

  return (
    <section className="project-architecture-map anlyx-map-shell" aria-label="Project architecture map">
      <header className="project-architecture-map__toolbar">
        <div>
          <h1>Map</h1>
          <p>Agent-authored architecture map. The viewer renders nodes and edges from project JSON.</p>
        </div>
        <div className="anlyx-map-header-actions">
          <ProjectArchitectureMapStats map={map} model={model} />
        </div>
      </header>
      <div className={`anlyx-map-body${inspectorOpen ? " has-inspector" : ""}`}>
        <div
          className={`project-architecture-map__canvas${selectedNode ? " is-focused" : ""}${
            map.isCompact ? " is-small-graph" : ""
          }`}
          data-testid="project-architecture-map"
          style={
            {
              "--anlyx-map-width": `${map.width}px`,
              "--anlyx-map-height": `${map.height}px`
            } as CSSProperties
          }
        >
          <div className="anlyx-map-stage">
            <svg
              aria-hidden="true"
              className="anlyx-map-edges"
              height={map.height}
              viewBox={`0 0 ${map.width} ${map.height}`}
              width={map.width}
            >
              {map.edges.map((edge) => (
                <ProjectArchitectureMapEdge edge={edge} focus={focus} key={edge.id} />
              ))}
            </svg>
            <div className="anlyx-map-columns" aria-hidden="true">
              {map.columns.map((column) => (
                <div
                  className="anlyx-map-column-guide"
                  key={column.id}
                  style={{ left: column.x, width: column.width }}
                >
                  <strong>{column.label}</strong>
                  <span>{column.count}</span>
                </div>
              ))}
            </div>
            {map.nodes.map((node) => (
              <ProjectArchitectureMapNode
                focus={focus}
                key={node.id}
                node={node}
                onSelect={selectNode}
                selected={node.id === selectedNode?.id}
              />
            ))}
            <div className="anlyx-map-legend">
              <span>
                <i className="is-primary" /> Selected path
              </span>
              <span>
                <i className="is-shared" /> Shared dependency
              </span>
              <span>
                <i className="is-muted" /> Other / Unknown
              </span>
            </div>
          </div>
        </div>
        {inspectorOpen ? (
          <ProjectArchitectureInspector
            focus={focus}
            node={selectedNode}
            nodesById={map.nodesById}
            onClose={() => {
              setInspectorOpen(false);
              setSelectedNodeId(undefined);
            }}
          />
        ) : null}
      </div>
    </section>
  );
}

type ProjectArchitectureSourceNode = ProjectData["architecture"]["nodes"][number];
type ProjectArchitectureSourceEdge = ProjectData["architecture"]["edges"][number];
type ProjectArchitectureMapColumn = {
  id: string;
  label: string;
  kinds: ProjectArchitectureSourceNode["kind"][];
  x: number;
  width: number;
  count: number;
};
type ProjectArchitectureMapNode = ProjectArchitectureSourceNode & {
  columnId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  connectionCount: number;
  upstreamCount: number;
  downstreamCount: number;
  evidenceStatus: ProjectData["evidence"][number]["status"] | "unknown";
  evidenceLabel: string;
  subtitle: string;
};
type ProjectArchitectureMapEdge = ProjectArchitectureSourceEdge & {
  sourceNode: ProjectArchitectureMapNode;
  targetNode: ProjectArchitectureMapNode;
  routeX: number;
};
type ProjectArchitectureMapModel = {
  columns: ProjectArchitectureMapColumn[];
  columnCounts: Map<string, number>;
  nodes: ProjectArchitectureMapNode[];
  edges: ProjectArchitectureMapEdge[];
  logicalEdges: ProjectArchitectureMapEdge[];
  nodesById: Map<string, ProjectArchitectureMapNode>;
  width: number;
  height: number;
  nodeWidth: number;
  isCompact: boolean;
};
type ProjectArchitectureFocus = {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  upstreamIds: string[];
  downstreamIds: string[];
};

const projectArchitectureColumns: Array<Omit<ProjectArchitectureMapColumn, "x" | "width" | "count">> = [
  { id: "pages", label: "Pages / Features", kinds: ["frontend"] },
  { id: "requests", label: "Requests", kinds: ["request"] },
  { id: "api", label: "API", kinds: ["api"] },
  { id: "controllers", label: "Controllers", kinds: ["controller", "handler", "middleware"] },
  { id: "services", label: "Services", kinds: ["service", "cache", "queue", "job", "external"] },
  { id: "repository", label: "Repository / Mapper", kinds: ["repository", "mapper"] },
  { id: "policy", label: "Policy / Schema", kinds: ["policy"] },
  { id: "data", label: "Data / JSON", kinds: ["database"] },
  { id: "result", label: "Results", kinds: ["result", "unknown"] }
];

function buildProjectArchitectureMap(data: ProjectData): ProjectArchitectureMapModel {
  const nodeIds = new Set(data.architecture.nodes.map((node) => node.id));
  const validEdges = data.architecture.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );
  const evidenceById = new Map(data.evidence.map((evidence) => [evidence.id, evidence]));
  const connectionCounts = new Map<string, number>();
  const upstreamCounts = new Map<string, number>();
  const downstreamCounts = new Map<string, number>();

  validEdges.forEach((edge) => {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) ?? 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) ?? 0) + 1);
    downstreamCounts.set(edge.source, (downstreamCounts.get(edge.source) ?? 0) + 1);
    upstreamCounts.set(edge.target, (upstreamCounts.get(edge.target) ?? 0) + 1);
  });

  const columnIdByKind = new Map(
    projectArchitectureColumns.flatMap((column) => column.kinds.map((kind) => [kind, column.id]))
  );
  const isCompact = data.architecture.nodes.length <= 12;
  const filledColumnWidth = isCompact ? 176 : 196;
  const nodeHeight = isCompact ? 90 : 96;
  const columnGap = isCompact ? 28 : 34;
  const rowGap = isCompact ? 16 : 22;
  const top = isCompact ? 62 : 82;
  const left = 18;

  const grouped = new Map<string, ProjectArchitectureSourceNode[]>();
  for (const node of data.architecture.nodes) {
    const columnId = columnIdByKind.get(node.kind) ?? "result";
    const nodes = grouped.get(columnId) ?? [];
    nodes.push(node);
    grouped.set(columnId, nodes);
  }

  const columnCounts = new Map<string, number>();
  for (const column of projectArchitectureColumns) {
    columnCounts.set(column.id, grouped.get(column.id)?.length ?? 0);
  }

  let currentX = left;
  const columns: ProjectArchitectureMapColumn[] = projectArchitectureColumns
    .filter((column) => (columnCounts.get(column.id) ?? 0) > 0)
    .map((column) => {
      const count = columnCounts.get(column.id) ?? 0;
      const width = filledColumnWidth;
      const positionedColumn = {
        ...column,
        x: currentX,
        width,
        count
      };
      currentX += width + columnGap;
      return positionedColumn;
    });

  const mapNodes: ProjectArchitectureMapNode[] = [];
  for (const column of columns) {
    const nodes = grouped.get(column.id) ?? [];
    nodes
      .sort((a, b) => {
        const degreeDelta = (connectionCounts.get(b.id) ?? 0) - (connectionCounts.get(a.id) ?? 0);
        return degreeDelta || a.label.localeCompare(b.label);
      })
      .forEach((node, index) => {
        const evidenceStatus = projectArchitectureEvidenceStatus(node.evidenceIds, evidenceById);
        const source = formatProjectArchitectureSource(node.source);
        mapNodes.push({
          ...node,
          columnId: column.id,
          x: column.x,
          y: top + index * (nodeHeight + rowGap),
          width: column.width,
          height: nodeHeight,
          connectionCount: connectionCounts.get(node.id) ?? 0,
          upstreamCount: upstreamCounts.get(node.id) ?? 0,
          downstreamCount: downstreamCounts.get(node.id) ?? 0,
          evidenceStatus,
          evidenceLabel: node.evidenceIds.length > 0 ? evidenceStatusLabel(evidenceStatus) : "Unknown",
          subtitle: source ?? projectArchitectureNodeSubtitle(node)
        });
      });
  }

  const nodesById = new Map(mapNodes.map((node) => [node.id, node]));
  const logicalEdges = validEdges
    .map((edge): ProjectArchitectureMapEdge | undefined => {
      const sourceNode = nodesById.get(edge.source);
      const targetNode = nodesById.get(edge.target);
      if (!sourceNode || !targetNode) return undefined;
      return sourceNode && targetNode ? { ...edge, sourceNode, targetNode, routeX: 0 } : undefined;
    })
    .filter((edge): edge is ProjectArchitectureMapEdge => Boolean(edge));

  const mapEdgesWithoutLanes = logicalEdges.filter((edge) => {
    if (edge.sourceNode.columnId === edge.targetNode.columnId) return false;
    return edge.sourceNode.x + edge.sourceNode.width < edge.targetNode.x;
  });
  const gutterCounts = new Map<string, number>();
  const mapEdges = mapEdgesWithoutLanes.map((edge) => {
    const sourceRight = edge.sourceNode.x + edge.sourceNode.width;
    const gap = Math.max(1, edge.targetNode.x - sourceRight);
    const gutterKey = `${edge.sourceNode.columnId}->${edge.targetNode.columnId}`;
    const gutterIndex = gutterCounts.get(gutterKey) ?? 0;
    gutterCounts.set(gutterKey, gutterIndex + 1);
    const laneOffset = (gutterIndex - 1) * 6;
    const routeX = sourceRight + gap / 2 + laneOffset;
    return {
      ...edge,
      routeX: Math.max(sourceRight + 14, Math.min(edge.targetNode.x - 14, routeX))
    };
  });
  const maxColumnCount = Math.max(1, ...columns.map((column) => column.count));

  return {
    columns,
    columnCounts,
    nodes: mapNodes,
    edges: mapEdges,
    logicalEdges,
    nodesById,
    width: Math.max(0, currentX - columnGap + left),
    height: top + maxColumnCount * (nodeHeight + rowGap) + (isCompact ? 34 : 80),
    nodeWidth: filledColumnWidth,
    isCompact
  };
}

function buildProjectArchitectureFocus(
  map: ProjectArchitectureMapModel,
  selectedNodeId: string | undefined
): ProjectArchitectureFocus {
  if (!selectedNodeId) {
    return { nodeIds: new Set(), edgeIds: new Set(), upstreamIds: [], downstreamIds: [] };
  }

  const upstreamIds = collectArchitectureReachable(map.logicalEdges, selectedNodeId, "upstream");
  const downstreamIds = collectArchitectureReachable(map.logicalEdges, selectedNodeId, "downstream");
  const nodeIds = new Set([selectedNodeId, ...upstreamIds, ...downstreamIds]);
  const edgeIds = new Set(
    map.logicalEdges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => edge.id)
  );

  return { nodeIds, edgeIds, upstreamIds, downstreamIds };
}

function collectArchitectureReachable(
  edges: ProjectArchitectureMapEdge[],
  nodeId: string,
  direction: "upstream" | "downstream"
): string[] {
  const result: string[] = [];
  const visited = new Set<string>([nodeId]);
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift() ?? "";
    const nextEdges =
      direction === "downstream"
        ? edges.filter((edge) => edge.source === current)
        : edges.filter((edge) => edge.target === current);

    for (const edge of nextEdges) {
      const nextId = direction === "downstream" ? edge.target : edge.source;
      if (visited.has(nextId)) continue;
      visited.add(nextId);
      result.push(nextId);
      queue.push(nextId);
    }
  }

  return result;
}

function ProjectArchitectureMapStats({
  map,
  model
}: {
  map: ProjectArchitectureMapModel;
  model: ProjectWorkspaceViewModel;
}): JSX.Element {
  const stats = [
    { label: "Pages", value: model.totals.pages },
    { label: "Requests", value: map.columnCounts.get("requests") ?? 0 },
    { label: "API", value: map.columnCounts.get("api") ?? 0 },
    { label: "Controllers", value: map.columnCounts.get("controllers") ?? 0 },
    { label: "Services", value: map.columnCounts.get("services") ?? 0 },
    { label: "Mappers", value: map.columnCounts.get("repository") ?? 0 },
    { label: "Results", value: map.columnCounts.get("result") ?? 0 }
  ];

  return (
    <dl>
      {stats.map((stat) => (
        <div key={stat.label}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProjectArchitectureMapNode({
  focus,
  node,
  onSelect,
  selected
}: {
  focus: ProjectArchitectureFocus;
  node: ProjectArchitectureMapNode;
  onSelect: (nodeId: string) => void;
  selected: boolean;
}): JSX.Element {
  const Icon = projectArchitectureNodeIcon(node.kind);
  const muted = focus.nodeIds.size > 0 && !focus.nodeIds.has(node.id);
  const shared = node.upstreamCount > 1 || node.downstreamCount > 1;

  return (
    <button
      className={`anlyx-map-node${selected ? " is-selected" : ""}${muted ? " is-muted" : ""}`}
      onClick={() => onSelect(node.id)}
      style={{ left: node.x, top: node.y, width: node.width, minHeight: node.height }}
      title={`${node.label}${node.source?.filePath ? ` · ${node.source.filePath}` : ""}`}
      type="button"
    >
      <span className="anlyx-map-node__icon" aria-hidden="true">
        <Icon size={15} />
      </span>
      <span className="anlyx-map-node__body">
        <span className="anlyx-map-node__layer">{projectArchitectureKindLabel(node.kind)}</span>
        <strong>{node.displayLabel ?? node.label}</strong>
        <small>{node.subtitle}</small>
      </span>
      <span className={`anlyx-map-evidence anlyx-map-evidence--${node.evidenceStatus}`}>
        {node.evidenceLabel}
      </span>
      {shared ? <span className="anlyx-map-node__degree">{node.connectionCount}</span> : null}
    </button>
  );
}

function ProjectArchitectureMapEdge({
  edge,
  focus
}: {
  edge: ProjectArchitectureMapEdge;
  focus: ProjectArchitectureFocus;
}): JSX.Element {
  const selected = focus.edgeIds.has(edge.id);
  const muted = focus.edgeIds.size > 0 && !selected;
  const sourceX = edge.sourceNode.x + edge.sourceNode.width;
  const sourceY = edge.sourceNode.y + edge.sourceNode.height / 2;
  const targetX = edge.targetNode.x;
  const targetY = edge.targetNode.y + edge.targetNode.height / 2;
  const path = createProjectArchitectureOrthogonalPath(sourceX, sourceY, edge.routeX, targetX, targetY);
  const role = edge.role ?? "primary";
  const status = projectArchitectureEdgeStatus(edge);
  const visualRole =
    status === "not-proven" || status === "unknown"
      ? "unknown"
      : role === "shared" || edge.targetNode.upstreamCount > 1
        ? "shared"
        : "primary";

  return (
    <path
      className={`anlyx-map-edge anlyx-map-edge--${visualRole}${selected ? " is-selected" : ""}${
        muted ? " is-muted" : ""
      }`}
      d={path}
    />
  );
}

function createProjectArchitectureOrthogonalPath(
  sourceX: number,
  sourceY: number,
  routeX: number,
  targetX: number,
  targetY: number
): string {
  return `M ${sourceX} ${sourceY} H ${routeX} V ${targetY} H ${targetX}`;
}

function projectArchitectureEdgeStatus(
  edge: ProjectArchitectureMapEdge
): ProjectData["evidence"][number]["status"] | "unknown" {
  if (edge.confidence === "low") return "not-proven";
  if (edge.sourceNode.evidenceStatus === "not-proven" || edge.targetNode.evidenceStatus === "not-proven") {
    return "not-proven";
  }
  if (edge.sourceNode.evidenceStatus === "unknown" || edge.targetNode.evidenceStatus === "unknown") {
    return "unknown";
  }
  return edge.targetNode.evidenceStatus;
}

function ProjectArchitectureInspector({
  focus,
  node,
  nodesById,
  onClose
}: {
  focus: ProjectArchitectureFocus;
  node: ProjectArchitectureMapNode | undefined;
  nodesById: Map<string, ProjectArchitectureMapNode>;
  onClose: () => void;
}): JSX.Element {
  if (!node) {
    return (
      <aside className="anlyx-map-inspector" aria-label="Map inspector">
        <button className="anlyx-map-inspector__close" onClick={onClose} type="button">
          Close
        </button>
        <h2>No node selected</h2>
      </aside>
    );
  }

  const upstream = focus.upstreamIds.map((id) => nodesById.get(id)).filter(Boolean);
  const downstream = focus.downstreamIds.map((id) => nodesById.get(id)).filter(Boolean);
  const contract = projectArchitectureNodeContract(node);

  return (
    <aside className="anlyx-map-inspector" aria-label="Map inspector">
      <header>
        <div>
          <span>Selected</span>
          <h2>{node.displayLabel ?? node.label}</h2>
        </div>
        <button className="anlyx-map-inspector__close" onClick={onClose} type="button">
          Close
        </button>
      </header>
      <dl className="anlyx-map-inspector__meta">
        <div>
          <dt>Layer</dt>
          <dd>{projectArchitectureKindLabel(node.kind)}</dd>
        </div>
        <div>
          <dt>Title</dt>
          <dd>{node.label}</dd>
        </div>
        <div>
          <dt>Path</dt>
          <dd>{formatProjectArchitectureSource(node.source) ?? "Not authored"}</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd>{node.evidenceLabel}</dd>
        </div>
      </dl>
      <ProjectArchitectureContractSection contract={contract} />
      <section>
        <h3>Upstream</h3>
        <ProjectArchitectureInspectorList emptyLabel="No upstream nodes." nodes={upstream} />
      </section>
      <section>
        <h3>Downstream path</h3>
        <ProjectArchitectureInspectorList emptyLabel="No downstream nodes." nodes={downstream} ordered />
      </section>
    </aside>
  );
}

type ProjectArchitectureDataShape = Record<string, string>;
type ProjectArchitectureNodeContract = {
  endpoint: string | undefined;
  inputName: string | undefined;
  inputKind: string | undefined;
  inputShape: ProjectArchitectureDataShape | undefined;
  outputName: string | undefined;
  outputKind: string | undefined;
  outputShape: ProjectArchitectureDataShape | undefined;
  relatedModels: string[];
  transforms: string[];
  mapping: string | undefined;
};

function ProjectArchitectureContractSection({
  contract
}: {
  contract: ProjectArchitectureNodeContract;
}): JSX.Element {
  const hasContract =
    Boolean(contract.endpoint) ||
    Boolean(contract.inputName) ||
    Boolean(contract.outputName) ||
    contract.relatedModels.length > 0 ||
    contract.transforms.length > 0 ||
    Boolean(contract.mapping) ||
    Boolean(contract.inputShape) ||
    Boolean(contract.outputShape);

  return (
    <section className="anlyx-map-contract">
      <h3>Data Contract</h3>
      {hasContract ? (
        <div className="anlyx-map-contract__body">
          {contract.endpoint ? (
            <ProjectArchitectureContractField label="Endpoint" value={contract.endpoint} />
          ) : null}
          <ProjectArchitectureContractField
            label="Input"
            value={formatProjectArchitectureContractName(contract.inputName, contract.inputKind)}
          />
          <ProjectArchitectureContractField
            label="Output"
            value={formatProjectArchitectureContractName(contract.outputName, contract.outputKind)}
          />
          <ProjectArchitectureShapePreview shape={contract.outputShape ?? contract.inputShape} />
          {contract.mapping ? (
            <ProjectArchitectureContractField label="Mapping" value={contract.mapping} />
          ) : null}
          {contract.transforms.length > 0 ? (
            <div className="anlyx-map-contract__group">
              <span>Transforms</span>
              <ul>
                {contract.transforms.slice(0, 6).map((transform) => (
                  <li key={transform}>{transform}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {contract.relatedModels.length > 0 ? (
            <div className="anlyx-map-contract__group">
              <span>Models</span>
              <ul>
                {contract.relatedModels.slice(0, 8).map((model) => (
                  <li key={model}>{model}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="project-muted">No contract authored.</p>
      )}
    </section>
  );
}

function ProjectArchitectureContractField({
  label,
  value
}: {
  label: string;
  value: string | undefined;
}): JSX.Element {
  return (
    <div className="anlyx-map-contract__field">
      <span>{label}</span>
      <strong>{value ?? "No contract authored"}</strong>
    </div>
  );
}

function ProjectArchitectureShapePreview({
  shape
}: {
  shape: ProjectArchitectureDataShape | undefined;
}): JSX.Element | null {
  if (!shape) {
    return null;
  }

  const entries = Object.entries(shape).slice(0, 8);
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="anlyx-map-contract__shape">
      <span>Shape</span>
      <pre>
        {entries.map(([key, value]) => `${key}: ${value}`).join("\n")}
        {Object.keys(shape).length > entries.length ? "\n..." : ""}
      </pre>
    </div>
  );
}

function ProjectArchitectureInspectorList({
  emptyLabel,
  nodes,
  ordered = false
}: {
  emptyLabel: string;
  nodes: Array<ProjectArchitectureMapNode | undefined>;
  ordered?: boolean;
}): JSX.Element {
  const visibleNodes = nodes.filter((node): node is ProjectArchitectureMapNode => Boolean(node));

  if (visibleNodes.length === 0) {
    return <p className="project-muted">{emptyLabel}</p>;
  }

  return (
    <ol className={ordered ? "anlyx-map-path-list" : "anlyx-map-node-list"}>
      {visibleNodes.slice(0, 8).map((node) => (
        <li key={node.id}>
          <strong>{node.displayLabel ?? node.label}</strong>
          <span>{projectArchitectureKindLabel(node.kind)}</span>
        </li>
      ))}
    </ol>
  );
}

function projectArchitectureNodeContract(
  node: ProjectArchitectureMapNode
): ProjectArchitectureNodeContract {
  const metadata = recordFromUnknown(node.metadata);
  const contractRoot = recordFromUnknown(metadata?.["contracts"]) ?? metadata;
  const input = contractItemFromUnknown(contractRoot?.["input"]);
  const output = contractItemFromUnknown(contractRoot?.["output"]);

  return {
    endpoint: metadataString(contractRoot?.["endpoint"]),
    inputName: input.name,
    inputKind: input.kind,
    inputShape: input.shape,
    outputName: output.name,
    outputKind: output.kind,
    outputShape: output.shape,
    relatedModels:
      getStringList(contractRoot?.["relatedModels"]).length > 0
        ? getStringList(contractRoot?.["relatedModels"])
        : getStringList(contractRoot?.["models"]),
    transforms: getStringList(contractRoot?.["transforms"]),
    mapping: metadataString(contractRoot?.["mapping"])
  };
}

function contractItemFromUnknown(value: unknown): {
  name: string | undefined;
  kind: string | undefined;
  shape: ProjectArchitectureDataShape | undefined;
} {
  if (typeof value === "string") {
    return { name: value, kind: undefined, shape: undefined };
  }

  const record = recordFromUnknown(value);
  if (!record) {
    return { name: undefined, kind: undefined, shape: undefined };
  }

  return {
    name: metadataString(record["name"]),
    kind: metadataString(record["kind"]),
    shape: shapeFromUnknown(record["shape"])
  };
}

function shapeFromUnknown(value: unknown): ProjectArchitectureDataShape | undefined {
  const record = recordFromUnknown(value);
  if (!record) {
    return undefined;
  }

  const entries = Object.entries(record)
    .map(([key, item]) => [key, typeof item === "string" ? item : JSON.stringify(item)] as const)
    .filter((entry): entry is readonly [string, string] => typeof entry[1] === "string");

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function recordFromUnknown(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function formatProjectArchitectureContractName(name: string | undefined, kind: string | undefined): string | undefined {
  if (!name) {
    return undefined;
  }

  return kind ? `${name} (${kind})` : name;
}

function projectArchitectureEvidenceStatus(
  evidenceIds: string[],
  evidenceById: Map<string, ProjectData["evidence"][number]>
): ProjectData["evidence"][number]["status"] | "unknown" {
  const statuses = evidenceIds
    .map((id) => evidenceById.get(id)?.status)
    .filter((status): status is ProjectData["evidence"][number]["status"] => Boolean(status));

  if (statuses.includes("source-matched")) return "source-matched";
  if (statuses.includes("observed")) return "observed";
  if (statuses.includes("measured")) return "measured";
  if (statuses.includes("agent-inferred")) return "agent-inferred";
  if (statuses.includes("not-proven")) return "not-proven";
  return "unknown";
}

function projectArchitectureNodeSubtitle(node: ProjectArchitectureSourceNode): string {
  const module = metadataString(node.metadata?.["module"]);
  const path = metadataString(node.metadata?.["path"]);
  const detail = metadataString(node.metadata?.["detail"]);
  return module ?? path ?? detail ?? node.domain ?? node.id;
}

function formatProjectArchitectureSource(
  source: ProjectArchitectureSourceNode["source"] | undefined
): string | undefined {
  if (!source) return undefined;
  const line = source.lineStart ? `:${source.lineStart}` : "";
  const symbol = source.symbol ? ` ${source.symbol}` : "";
  return `${source.filePath}${line}${symbol}`;
}

function projectArchitectureKindLabel(kind: ProjectArchitectureSourceNode["kind"]): string {
  const labels: Record<ProjectArchitectureSourceNode["kind"], string> = {
    frontend: "Page",
    request: "HTTP",
    api: "API",
    controller: "CTRL",
    handler: "Handler",
    middleware: "Middleware",
    service: "SRV",
    policy: "Policy",
    mapper: "Map",
    repository: "Repo",
    database: "Data",
    cache: "Cache",
    queue: "Queue",
    job: "Job",
    external: "External",
    result: "UI",
    unknown: "Unknown"
  };

  return labels[kind] ?? titleCase(kind);
}

function projectArchitectureNodeIcon(kind: ProjectArchitectureSourceNode["kind"]): LucideIcon {
  if (kind === "database") {
    return Database;
  }

  if (kind === "repository") {
    return Box;
  }

  if (kind === "service" || kind === "policy" || kind === "mapper") {
    return Layers3;
  }

  if (kind === "controller" || kind === "handler" || kind === "middleware") {
    return FileCode2;
  }

  if (kind === "api" || kind === "request") {
    return Network;
  }

  if (kind === "result") {
    return Flag;
  }

  return Circle;
}

function ProjectJsonView({
  data,
  model,
  rawJson,
  validationReport
}: {
  data: ProjectData;
  model: ProjectWorkspaceViewModel;
  rawJson: string;
  validationReport?: ProjectValidationReport;
}): JSX.Element {
  const jsonFiles = useMemo(
    () => projectJsonFiles(data, model, rawJson, validationReport),
    [data, model, rawJson, validationReport]
  );
  const [selectedJsonFileId, setSelectedJsonFileId] = useState(jsonFiles[0]?.id ?? "project");
  const selectedJsonFile = jsonFiles.find((file) => file.id === selectedJsonFileId) ?? jsonFiles[0];
  const activeJson = selectedJsonFile?.content ?? rawJson;
  const lines = activeJson.split("\n");
  const inventory = useMemo(() => projectJsonInventoryItems(data, model), [data, model]);
  const EditorFileIcon = selectedJsonFile?.icon ?? Code2;
  const validationTone = validationReport
    ? validationReport.valid
      ? validationReport.issues.length > 0
        ? "amber"
        : "green"
      : "red"
    : "green";
  const validationLabel = validationReport
    ? validationReport.valid
      ? validationReport.issues.length > 0
        ? "Valid with warnings"
        : "Valid"
      : "Invalid"
    : "Valid";

  return (
    <section className="project-json-workspace" aria-label="Project JSON">
      <aside className="project-json-outline" aria-label="JSON files">
        <div className="project-panel-title">
          <h2>JSON Files</h2>
        </div>
        <span className="project-badge project-badge--green">AI-authored</span>
        <div className="project-json-file-list" role="list">
          {jsonFiles.map((file) => {
            const Icon = file.icon;

            return (
              <button
                key={file.id}
                className={file.id === selectedJsonFile?.id ? "is-selected" : ""}
                type="button"
                onClick={() => setSelectedJsonFileId(file.id)}
              >
                <Icon size={17} />
                <span>
                  <strong>{file.name}</strong>
                  <small>{file.description}</small>
                </span>
                <em>{file.countLabel}</em>
              </button>
            );
          })}
        </div>
      </aside>
      <article className="project-json-editor" aria-label="Raw project JSON">
        <header>
          <span className="project-json-file">
            <EditorFileIcon size={16} />
            {selectedJsonFile?.name ?? "anlyx.project.json"}
          </span>
          <div>
            <button type="button" onClick={() => void navigator.clipboard?.writeText(activeJson)}>
              <Copy size={15} />
              Copy JSON
            </button>
            <button
              type="button"
              onClick={() => downloadProjectJson(activeJson, selectedJsonFile?.name)}
            >
              <Download size={15} />
            </button>
          </div>
        </header>
        <pre>
          {lines.map((line, index) => (
            <span key={`${index}:${line}`}>
              <em>{index + 1}</em>
              <code>{line || " "}</code>
            </span>
          ))}
        </pre>
      </article>
      <aside className="project-json-details" aria-label="JSON details">
        <JsonDetailsCard title="Schema">
          <ProjectDetailRow label="Version" value={data.schemaVersion} />
          <ProjectDetailRow label="Validation" value={validationLabel} tone={validationTone} />
        </JsonDetailsCard>
        {validationReport ? (
          <JsonDetailsCard title="Trust checks">
            <ProjectDetailRow
              label="Source issues"
              value={String(validationReport.summary.sourceIssueCount)}
              tone={validationReport.summary.sourceIssueCount > 0 ? "amber" : "green"}
            />
            {validationReport.summary.sourceIssueBreakdown ? (
              <>
                <ProjectDetailRow
                  label="Missing files"
                  value={String(validationReport.summary.sourceIssueBreakdown.missingFiles)}
                  tone={
                    validationReport.summary.sourceIssueBreakdown.missingFiles > 0
                      ? "amber"
                      : "green"
                  }
                />
                <ProjectDetailRow
                  label="Line issues"
                  value={String(
                    validationReport.summary.sourceIssueBreakdown.placeholderLines +
                      validationReport.summary.sourceIssueBreakdown.outOfRangeLines
                  )}
                  tone={
                    validationReport.summary.sourceIssueBreakdown.placeholderLines +
                      validationReport.summary.sourceIssueBreakdown.outOfRangeLines >
                    0
                      ? "amber"
                      : "green"
                  }
                />
                <ProjectDetailRow
                  label="Symbol issues"
                  value={String(validationReport.summary.sourceIssueBreakdown.missingSymbols)}
                  tone={
                    validationReport.summary.sourceIssueBreakdown.missingSymbols > 0
                      ? "amber"
                      : "green"
                  }
                />
              </>
            ) : null}
            <ProjectDetailRow
              label="Coverage"
              value={validationReport.summary.coverageStatus}
              tone={validationReport.summary.coverageStatus === "partial" ? "amber" : "green"}
            />
            <ProjectDetailRow
              label="Issues"
              value={String(validationReport.issues.length)}
              tone={validationReport.issues.length > 0 ? "amber" : "green"}
            />
          </JsonDetailsCard>
        ) : null}
        {data.coverage || validationReport ? (
          <JsonDetailsCard title="Coverage">
            <ProjectDetailRow
              label="Pages"
              value={coverageValue(
                validationReport?.summary.modeled.pages ?? data.pages.length,
                validationReport?.summary.detected?.pages ?? data.coverage?.detected?.pages
              )}
            />
            <ProjectDetailRow
              label="Requests"
              value={coverageValue(
                validationReport?.summary.modeled.requests ?? data.requests.length,
                data.coverage?.detected?.requests ?? data.coverage?.detected?.backendEndpoints
              )}
            />
            <ProjectDetailRow
              label="Flows"
              value={coverageValue(
                validationReport?.summary.modeled.flows ?? data.flows.length,
                validationReport?.summary.detected?.flows ?? data.coverage?.detected?.flows
              )}
            />
          </JsonDetailsCard>
        ) : null}
        <JsonDetailsCard title="Project">
          <ProjectDetailRow label="Name" value={data.project.name} />
          <ProjectDetailRow label="ID" value={data.project.id} />
          <ProjectDetailRow label="Root" value={data.project.root ?? "not provided"} />
        </JsonDetailsCard>
        <JsonDetailsCard title="Counts">
          <div className="project-json-counts">
            {inventory.map((item) => (
              <JsonInventoryItem key={item.id} item={item} />
            ))}
          </div>
        </JsonDetailsCard>
      </aside>
    </section>
  );
}

function JsonInventoryItem({ item }: { item: ProjectJsonInventoryItem }): JSX.Element {
  const Icon = item.icon;

  return (
    <a className="project-json-count-item" href={`#json-${item.id}`}>
      <Icon size={16} />
      <span>{item.label}</span>
      <strong>{item.value}</strong>
    </a>
  );
}

function projectJsonFiles(
  data: ProjectData,
  model: ProjectWorkspaceViewModel,
  rawJson: string,
  validationReport?: ProjectValidationReport
): ProjectJsonFileView[] {
  const files: ProjectJsonFileView[] = [
    {
      id: "project",
      name: projectSourceFile(model),
      description: "Complete project document",
      countLabel: "full",
      content: rawJson,
      icon: Code2
    },
    {
      id: "index",
      name: ".anlyx/project/index.json",
      description: "Schema and project metadata",
      countLabel: data.schemaVersion,
      content: projectJsonString({ schemaVersion: data.schemaVersion, project: data.project }),
      icon: Folder
    },
    {
      id: "areas",
      name: ".anlyx/project/areas.json",
      description: "Project areas",
      countLabel: String(model.totals.areas),
      content: projectJsonString(data.areas),
      icon: BriefcaseBusiness
    },
    {
      id: "pages",
      name: ".anlyx/project/pages.json",
      description: "Page index and routes",
      countLabel: String(model.totals.pages),
      content: projectJsonString(data.pages),
      icon: BookOpen
    },
    {
      id: "features",
      name: ".anlyx/project/features.json",
      description: "Page capabilities",
      countLabel: String(model.totals.features),
      content: projectJsonString(data.features),
      icon: FileText
    },
    {
      id: "overview",
      name: ".anlyx/project/overview.json",
      description: "Human project summary",
      countLabel: data.overview.summary ? "authored" : "empty",
      content: projectJsonString(data.overview),
      icon: BookOpen
    },
    {
      id: "capabilities",
      name: ".anlyx/project/capabilities.json",
      description: "Readable product capabilities",
      countLabel: String(data.capabilities.length),
      content: projectJsonString(data.capabilities),
      icon: Workflow
    },
    {
      id: "requests",
      name: ".anlyx/project/requests.json",
      description: "Frontend and API requests",
      countLabel: String(model.totals.requests),
      content: projectJsonString(data.requests),
      icon: Network
    },
    {
      id: "flows",
      name: ".anlyx/project/flows.json",
      description: "Request-to-backend paths",
      countLabel: String(model.totals.flows),
      content: projectJsonString(data.flows),
      icon: Workflow
    },
    {
      id: "architecture",
      name: ".anlyx/project/architecture.json",
      description: "Architecture nodes and edges",
      countLabel: String(model.totals.architectureNodes),
      content: projectJsonString(data.architecture),
      icon: Layers3
    },
    {
      id: "evidence",
      name: ".anlyx/project/evidence.json",
      description: "Proof and confidence sources",
      countLabel: String(model.totals.evidence),
      content: projectJsonString(data.evidence),
      icon: ShieldCheck
    },
    {
      id: "data-lifecycles",
      name: ".anlyx/project/data-lifecycles.json",
      description: "Core data lifecycle maps",
      countLabel: String(data.dataLifecycles.length),
      content: projectJsonString(data.dataLifecycles),
      icon: Database
    },
    {
      id: "impact-maps",
      name: ".anlyx/project/impact-maps.json",
      description: "Product impact maps",
      countLabel: String(data.impactMaps.length),
      content: projectJsonString(data.impactMaps),
      icon: Network
    },
    {
      id: "coverage",
      name: ".anlyx/project/coverage.json",
      description: "Detected and modeled coverage",
      countLabel: data.coverage?.status ?? "unknown",
      content: projectJsonString(data.coverage ?? { status: "unknown" }),
      icon: Gauge
    },
    {
      id: "dictionary",
      name: ".anlyx/project/dictionary.json",
      description: "Language and term dictionary",
      countLabel: String(data.dictionary.terms.length),
      content: projectJsonString(data.dictionary),
      icon: Languages
    }
  ];

  if (data.measurements.length > 0) {
    files.push({
      id: "measurements",
      name: ".anlyx/project/measurements.json",
      description: "Optional runtime measurements",
      countLabel: String(model.totals.measurements),
      content: projectJsonString(data.measurements),
      icon: Clock3
    });
  }

  if (validationReport) {
    files.push({
      id: "validation-report",
      name: ".anlyx/validation-report.json",
      description: "Source and coverage validation",
      countLabel: `${validationReport.issues.length} issues`,
      content: projectJsonString(validationReport),
      icon: ShieldCheck
    });
  }

  return files;
}

function coverageValue(modeled: number, detected: number | undefined): string {
  return detected === undefined ? String(modeled) : `${modeled} / ${detected}`;
}

function formatSourceIssueDetails(
  breakdown: ProjectValidationReport["summary"]["sourceIssueBreakdown"] | undefined
): string {
  if (!breakdown) {
    return "";
  }

  const lineIssues = breakdown.placeholderLines + breakdown.outOfRangeLines;
  const parts = [
    breakdown.missingFiles > 0 ? `${breakdown.missingFiles} missing file` : "",
    breakdown.missingSymbols > 0 ? `${breakdown.missingSymbols} symbol` : "",
    lineIssues > 0 ? `${lineIssues} line` : ""
  ].filter(Boolean);

  return parts.join(" / ");
}

function projectJsonInventoryItems(
  data: ProjectData,
  model: ProjectWorkspaceViewModel
): ProjectJsonInventoryItem[] {
  return [
    { id: "schemaVersion", label: "schemaVersion", value: data.schemaVersion, icon: Braces },
    { id: "project", label: "project", value: data.project.name, icon: Folder },
    { id: "areas", label: "areas", value: String(model.totals.areas), icon: BriefcaseBusiness },
    { id: "pages", label: "pages", value: String(model.totals.pages), icon: BookOpen },
    { id: "features", label: "features", value: String(model.totals.features), icon: FileText },
    {
      id: "overview",
      label: "overview",
      value: data.overview.summary ? "authored" : "empty",
      icon: BookOpen
    },
    {
      id: "capabilities",
      label: "capabilities",
      value: String(data.capabilities.length),
      icon: Workflow
    },
    { id: "requests", label: "requests", value: String(model.totals.requests), icon: Network },
    { id: "flows", label: "flows", value: String(model.totals.flows), icon: Workflow },
    {
      id: "architecture",
      label: "architecture",
      value: String(model.totals.architectureNodes),
      icon: Layers3
    },
    { id: "evidence", label: "evidence", value: String(model.totals.evidence), icon: ShieldCheck },
    {
      id: "dataLifecycles",
      label: "dataLifecycles",
      value: String(data.dataLifecycles.length),
      icon: Database
    },
    {
      id: "impactMaps",
      label: "impactMaps",
      value: String(data.impactMaps.length),
      icon: Network
    },
    {
      id: "measurements",
      label: "measurements",
      value: String(model.totals.measurements),
      icon: Clock3
    },
    {
      id: "dictionary",
      label: "dictionary",
      value: String(data.dictionary.terms.length),
      icon: Languages
    }
  ];
}

function projectJsonString(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function JsonDetailsCard({ children, title }: { children: ReactNode; title: string }): JSX.Element {
  return (
    <section className="project-json-details-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ProjectDetailRow({
  label,
  tone,
  value
}: {
  label: string;
  tone?: "green" | "amber" | "red";
  value: string;
}): JSX.Element {
  return (
    <div className="project-detail-row">
      <dt>{label}</dt>
      <dd className={tone ? `is-${tone}` : ""}>{value}</dd>
    </div>
  );
}

function ProjectStatusBar({
  data,
  locale,
  model,
  validationReport
}: {
  data: ProjectData;
  locale: ProjectChromeLocale;
  model: ProjectWorkspaceViewModel;
  validationReport?: ProjectValidationReport;
}): JSX.Element {
  const sourceFile = projectSourceFile(model);
  const generatedBy = projectAgentName(model);
  const pageCoverage = projectPageCoverageSummary(data, validationReport);
  const coverageStatus = validationReport?.summary.coverageStatus ?? data.coverage?.status;
  const sourceIssueCount = validationReport?.summary.sourceIssueCount ?? 0;
  const hasTrustWarning = coverageStatus === "partial" || sourceIssueCount > 0;

  return (
    <div className="project-statusbar" aria-label="Project source status">
      <div className="project-statusbar__provenance">
        <span>
          <Code2 size={15} />
          {tp(locale, "source")}: <strong>{sourceFile}</strong>
        </span>
        <span>
          <Zap size={15} />
          {tp(locale, "agent")}: <strong>{generatedBy}</strong>
        </span>
      </div>
      <div className="project-statusbar__summary">
        <strong>{pageCoverage.label}</strong>
        {coverageStatus ? (
          <span className={`project-status ${hasTrustWarning ? "project-status--amber" : "project-status--green"}`}>
            <ShieldCheck size={15} />
            {coverageStatus === "partial" ? "Partial analysis" : "Coverage checked"}
          </span>
        ) : null}
        <span>
          <Clock3 size={15} />
          {tp(locale, "lastAnalysis")}: {formatDateTime(model.project.analyzedAt)}
        </span>
        <span className="project-status project-status--green">
          <Check size={15} />
          {tp(locale, "upToDate")}
        </span>
      </div>
    </div>
  );
}

function projectPageCoverageSummary(
  data: ProjectData,
  validationReport?: ProjectValidationReport
): { detected: number | undefined; label: string; modeled: number; value: string } {
  const modeled =
    validationReport?.summary.modeled.pages ?? data.coverage?.modeled?.pages ?? data.pages.length;
  const detected = validationReport?.summary.detected?.pages ?? data.coverage?.detected?.pages;
  const value = coverageValue(modeled, detected);

  return {
    detected,
    label: detected !== undefined ? `${value} pages modeled` : `${modeled} pages analyzed`,
    modeled,
    value
  };
}

function evidenceStatusLabel(status: ProjectFlowView["layers"][number]["status"]): string {
  if (status === "source-matched") return "Source-matched";
  if (status === "agent-inferred") return "Agent-inferred";
  if (status === "not-proven") return "Not-proven";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function downloadProjectJson(rawJson: string, fileName = "anlyx.project.json"): void {
  const blob = new Blob([rawJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeFileName = fileName.split("/").pop() ?? "anlyx.project.json";

  link.href = url;
  link.download = safeFileName;
  link.click();
  URL.revokeObjectURL(url);
}

function WorkspaceSidebar({
  activeView,
  locale,
  onLocaleChange,
  onViewChange
}: {
  activeView: WorkspaceView;
  locale: WorkspaceLocale;
  onLocaleChange(locale: WorkspaceLocale): void;
  onViewChange(view: WorkspaceView): void;
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
        <button
          className={activeView === "flows" ? "is-active" : ""}
          type="button"
          onClick={() => onViewChange("flows")}
        >
          <Workflow size={19} />
          <span>{t(locale, "flows")}</span>
        </button>
        <button
          className={activeView === "map" ? "is-active" : ""}
          type="button"
          onClick={() => onViewChange("map")}
        >
          <Network size={19} />
          <span>Map</span>
        </button>
        <button
          className={activeView === "json" ? "is-active" : ""}
          type="button"
          onClick={() => onViewChange("json")}
        >
          <FileCode2 size={19} />
          <span>JSON</span>
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
  data: ReportData;
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
            {t(locale, "lastScan")} {formatDateTime(data.generatedAt)}
          </span>
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

function JsonReaderView({ data }: { data: ReportData }): JSX.Element {
  const [activeTab, setActiveTab] = useState<JsonReaderTab>("overview");
  const locale = useWorkspaceLocale();
  const flows = data.flows;
  const endpointsById = useMemo(
    () => new Map(data.endpoints.map((endpoint) => [endpoint.id, endpoint])),
    [data.endpoints]
  );
  const rawJson = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const stats = useMemo(() => jsonStats(data), [data]);

  return (
    <div className="json-reader-layout" id="json">
      <header className="json-reader-hero">
        <div>
          <div className="breadcrumbs">
            <span>{t(locale, "flows")}</span>
            <ChevronRight size={13} />
            <strong>JSON</strong>
          </div>
          <div className="title-row">
            <h1>JSON workspace</h1>
            <span className="capture-dot is-live" aria-label="JSON loaded" />
          </div>
          <p>
            Inspect the imported snapshot exactly as Anlyx reads it: schema, flows, evidence,
            warnings, and raw data.
          </p>
        </div>
        <div className="json-reader-source">
          <span>loaded from</span>
          <strong>report-data.json</strong>
          <small>{formatDateTime(data.generatedAt)}</small>
        </div>
      </header>

      <section className="json-stat-grid" aria-label="JSON inventory">
        <JsonStatCard label="schema" value={data.schemaVersion} detail={data.projectName} />
        <JsonStatCard
          label="requests"
          value={String(stats.endpointCount)}
          detail={`${stats.flowCount} mapped flows`}
        />
        <JsonStatCard
          label="graph"
          value={`${stats.nodeCount} / ${stats.edgeCount}`}
          detail="nodes / edges"
        />
        <JsonStatCard
          label="evidence"
          value={String(stats.evidenceCount)}
          detail={`${stats.warningCount} warnings`}
        />
      </section>

      <section className="json-reader-panel">
        <div className="json-reader-tabs" role="tablist" aria-label="JSON reader views">
          {(["overview", "flows", "raw"] as const).map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "is-active" : ""}
              key={tab}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab)}
            >
              {jsonTabLabel(tab)}
            </button>
          ))}
        </div>

        {activeTab === "overview" ? (
          <JsonOverview data={data} stats={stats} />
        ) : activeTab === "flows" ? (
          <div className="json-flow-list">
            {flows.map((flow) => (
              <JsonFlowCard
                endpoint={endpointsById.get(flow.endpointId)}
                flow={flow}
                key={flow.endpointId}
              />
            ))}
          </div>
        ) : (
          <div className="json-raw-view">
            <div className="json-raw-view__header">
              <div>
                <strong>Raw imported JSON</strong>
                <span>Pretty printed, read-only</span>
              </div>
              <code>{formatBytes(rawJson.length)}</code>
            </div>
            <pre>{rawJson}</pre>
          </div>
        )}
      </section>
    </div>
  );
}

function JsonStatCard({
  detail,
  label,
  value
}: {
  detail: string;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <article className="json-stat-card">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function JsonOverview({
  data,
  stats
}: {
  data: ReportData;
  stats: ReturnType<typeof jsonStats>;
}): JSX.Element {
  const topMethods = methodCounts(data);
  const topWarnings = data.warnings.slice(0, 4);

  return (
    <div className="json-overview-grid">
      <article className="json-section-card">
        <h2>Document</h2>
        <dl className="json-kv-list">
          <div>
            <dt>projectName</dt>
            <dd>{data.projectName}</dd>
          </div>
          <div>
            <dt>schemaVersion</dt>
            <dd>{data.schemaVersion}</dd>
          </div>
          <div>
            <dt>generatedAt</dt>
            <dd>{formatDateTime(data.generatedAt)}</dd>
          </div>
          <div>
            <dt>pages</dt>
            <dd>{stats.pageCount}</dd>
          </div>
          <div>
            <dt>edges</dt>
            <dd>{stats.edgeCount}</dd>
          </div>
          <div>
            <dt>capture</dt>
            <dd>{data.capture ? "included" : "not included"}</dd>
          </div>
        </dl>
      </article>
      <article className="json-section-card">
        <h2>Requests</h2>
        <div className="json-method-bars">
          {topMethods.map(([method, count]) => (
            <div key={method}>
              <span>{method}</span>
              <i
                style={{
                  width: `${Math.max(12, (count / Math.max(stats.endpointCount, 1)) * 100)}%`
                }}
              />
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </article>
      <article className="json-section-card json-section-card--wide">
        <h2>Flow index</h2>
        <div className="json-path-preview">
          {data.flows.slice(0, 5).map((flow) => {
            const endpoint = data.endpoints.find((item) => item.id === flow.endpointId);
            return (
              <div key={flow.endpointId}>
                <span>{endpoint ? `${endpoint.method} ${endpoint.path}` : flow.endpointId}</span>
                <strong>
                  {flow.nodes.length} nodes · {flow.edges.length} edges
                </strong>
              </div>
            );
          })}
        </div>
      </article>
      <article className="json-section-card json-section-card--wide">
        <h2>Warnings</h2>
        <div className="json-warning-list">
          {topWarnings.length > 0 ? (
            topWarnings.map((warning, index) => (
              <div key={`${warning.code}-${index}`}>
                <code>{warning.code}</code>
                <span>{warning.message}</span>
              </div>
            ))
          ) : (
            <p>No warnings in the imported report data.</p>
          )}
        </div>
      </article>
    </div>
  );
}

function JsonFlowCard({
  endpoint,
  flow
}: {
  endpoint: ReportData["endpoints"][number] | undefined;
  flow: ReportData["flows"][number];
}): JSX.Element {
  const mainNodes = flow.mainPath
    .map((nodeId) => flow.nodes.find((node) => node.id === nodeId))
    .filter((node): node is ReportData["flows"][number]["nodes"][number] => Boolean(node));

  return (
    <article className="json-flow-card">
      <header>
        <span>{endpoint?.method ?? "FLOW"}</span>
        <div>
          <strong title={endpoint?.path ?? flow.endpointId}>
            {endpoint?.path ?? flow.endpointId}
          </strong>
          <small>
            {flow.nodes.length} nodes · {flow.edges.length} edges · {flow.subFlows.length} sub flows
          </small>
        </div>
      </header>
      <div className="json-node-rail">
        {(mainNodes.length > 0 ? mainNodes : flow.nodes.slice(0, 6)).map((node) => (
          <span key={node.id} title={node.label}>
            <i>{node.type}</i>
            <strong>{node.label}</strong>
            <small>{node.evidenceIds?.length ?? node.evidence?.length ?? 0} evidence</small>
          </span>
        ))}
      </div>
    </article>
  );
}

function jsonStats(data: ReportData): {
  edgeCount: number;
  endpointCount: number;
  evidenceCount: number;
  flowCount: number;
  nodeCount: number;
  pageCount: number;
  warningCount: number;
} {
  return {
    edgeCount: data.flows.reduce((sum, flow) => sum + flow.edges.length, 0),
    endpointCount: data.endpoints.length,
    evidenceCount: data.flows.reduce(
      (sum, flow) =>
        sum +
        flow.nodes.reduce(
          (nodeSum, node) => nodeSum + (node.evidence?.length ?? node.evidenceIds?.length ?? 0),
          0
        ),
      0
    ),
    flowCount: data.flows.length,
    nodeCount: data.flows.reduce((sum, flow) => sum + flow.nodes.length, 0),
    pageCount: data.pages.length,
    warningCount: data.warnings.length
  };
}

function methodCounts(data: ReportData): Array<[string, number]> {
  const counts = new Map<string, number>();

  for (const endpoint of data.endpoints) {
    counts.set(endpoint.method, (counts.get(endpoint.method) ?? 0) + 1);
  }

  return [...counts.entries()].sort((first, second) => second[1] - first[1]);
}

function jsonTabLabel(tab: JsonReaderTab): string {
  if (tab === "overview") return "Overview";
  if (tab === "flows") return "Flows";
  return "Raw JSON";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function RequestContextPanel({
  data,
  pageContext,
  record
}: {
  data: ReportData;
  pageContext: PageContextEvent | undefined;
  record: FlowRecord | undefined;
}): JSX.Element {
  const locale = useWorkspaceLocale();
  const layers = record ? diagramLayers(record) : [];
  const controller = findFirstLayer(layers, ["controller"]);
  const result = findFirstLayer(layers, ["result"]);
  const pageUrl = displayPageUrl(record, locale, pageContext);

  return (
    <section
      className="benefits-studio request-context-panel"
      aria-label={t(locale, "selectedRequestLabel")}
    >
      <div className="benefits-studio__main">
        <div className="benefits-studio__copy">
          <small>
            {t(locale, "currentPage")} · {data.projectName}
          </small>
          <h2 title={pageUrl}>{pageUrl}</h2>
          <p>
            {record
              ? requestContextDescription(record, locale)
              : t(locale, "noCurrentPageRequestsCopy")}
          </p>
        </div>
      </div>
      {record ? (
        <div className="request-context-actions" aria-label={t(locale, "requestEvidenceSummary")}>
          <span>
            <OutcomeIcon record={record} size={14} />
            {record.status ?? t(locale, "pending")} {outcomeStatusText(record, locale)}
          </span>
          <span>
            <Clock3 size={14} />
            {formatDuration(recordTotalDuration(record))}
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
      ) : null}
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
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [focusSlowest, setFocusSlowest] = useState(false);
  const rows = compactTimingLayers(record);
  const total = recordTotalDuration(record, rows);
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
      <div className="waterfall-grid" style={{ "--timeline-zoom": timelineZoom } as CSSProperties}>
        <div className="waterfall-axis">
          <span>{t(locale, "layer")}</span>
          <span>{t(locale, "node")}</span>
          <span>{t(locale, "duration")}</span>
          <div
            className="waterfall-axis__timeline"
            style={{ "--tick-count": ticks.length - 1 } as CSSProperties}
          >
            {ticks.map((tick) => (
              <strong key={tick} style={{ left: `${timelineX((tick / total) * 100)}%` }}>
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
            runtimeSource={record.runtimeSource}
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
  const breakdown = timingBreakdownSegments(rows, total);

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
      <div className="timing-overview__breakdown">
        <div className="timing-overview__scale" aria-hidden="true">
          <strong>0</strong>
          <strong>{Math.round(total)} ms</strong>
        </div>
        <div className="timing-breakdown-bar" aria-label={t(locale, "totalDurationOverview")}>
          {breakdown.map((segment) => (
            <span
              className={`timing-breakdown-segment timing-breakdown-segment--${segment.type} ${
                segment.durationMs <= 0 ? "is-empty" : ""
              }`}
              key={segment.type}
              style={{ width: `${segment.width}%` }}
              title={`${segment.label}: ${Math.round(segment.durationMs)} ms`}
            />
          ))}
        </div>
        <div className="timing-breakdown-legend">
          {breakdown.map((segment) => (
            <span
              className={segment.durationMs <= 0 ? "is-empty" : ""}
              key={segment.type}
              title={`${segment.label}: ${Math.round(segment.durationMs)} ms`}
            >
              <i className={`timing-breakdown-dot timing-breakdown-dot--${segment.type}`} />
              <b>{segment.label}</b>
              <strong>{Math.round(segment.durationMs)} ms</strong>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function WaterfallRow({
  layer,
  focused,
  runtimeSource,
  tickCount,
  total
}: {
  focused: boolean;
  layer: FlowLayer;
  runtimeSource: FlowRecord["runtimeSource"];
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
  const runtimeGroupCount = backendRuntimeGroupCount(layer);
  const left = layerOffset(layer, total);
  const width = muted
    ? 0
    : duration <= 0
      ? 0
      : Math.max(isResultMarker ? 0.8 : 1.8, Math.min(100 - left, (duration / total) * 100));
  const visualLeft = timelineX(left);
  const visualWidth = timelineWidth(left, width);

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
        <span>{layerSubtitle(layer, locale, runtimeSource)}</span>
      </div>
      <div className="waterfall-duration">
        {muted ? (
          <>
            <strong>-</strong>
            <small>{t(locale, "notProven")}</small>
          </>
        ) : (
          <>
            <strong>{durationValueLabel(layer, duration)}</strong>
            <small>
              {durationCaption(layer, duration, total, locale, runtimeSource, runtimeGroupCount)}
            </small>
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
          style={muted ? undefined : { left: `${visualLeft}%`, width: `${visualWidth}%` }}
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
            <SummaryPathRow
              index={index + 1}
              key={layer.id}
              layer={layer}
              runtimeSource={record.runtimeSource}
            />
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
                  runtimeSource={record.runtimeSource}
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

function SummaryPathRow({
  index,
  layer,
  runtimeSource
}: {
  index: number;
  layer: FlowLayer;
  runtimeSource: FlowRecord["runtimeSource"];
}): JSX.Element {
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
        <p>{layerSubtitle(layer, locale, runtimeSource)}</p>
      </div>
      <span className={`summary-status summary-status--${summaryStatusTone(layer)}`}>
        {summaryStatusLabel(layer, locale)}
      </span>
    </article>
  );
}

function DiagramFlowView({ record }: { record: FlowRecord }): JSX.Element {
  const locale = useWorkspaceLocale();
  const [zoom, setZoom] = useState(0.82);
  const nodeTypes = useMemo(() => ({ anlyxNode: LayeredFlowNode }), []);
  const edgeTypes = useMemo(() => ({ anlyxSmooth: LayeredSmoothEdge }), []);
  const model = useMemo(() => buildLayeredReactFlowDiagram(record, locale), [record, locale]);

  useEffect(() => {
    setZoom(0.82);
  }, [record.id]);

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
          <button type="button" onClick={() => setZoom(0.82)}>
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
              onClick={() => setZoom((value) => Math.max(0.72, value - 0.1))}
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
          {t(locale, "totalDuration")}: {recordDuration(record)} ms
        </strong>
      </div>
    </section>
  );
}

type DiagramLayerId = "browser" | "api" | "application" | "data" | "response";
type LayeredDiagramNodeStatus =
  | "observed"
  | "matched"
  | "source_matched"
  | "inferred"
  | "not_proven"
  | "success"
  | "blocked";
type LayeredDiagramEdgeKind = "executed" | "source_matched" | "inferred" | "not_proven" | "blocked";

type LayeredDiagramNode = {
  id: string;
  sourceLayer: FlowLayer;
  layer: DiagramLayerId;
  kind: FlowLayer["type"];
  title: string;
  subtitle: string;
  durationMs?: number;
  status: LayeredDiagramNodeStatus;
  edgeKind: LayeredDiagramEdgeKind;
  isMainPath: boolean;
  slot: number;
  x: number;
  y: number;
};

type LayeredDiagramEdge = {
  id: string;
  from: string;
  to: string;
  kind: LayeredDiagramEdgeKind;
};

type LayeredReactFlowNodeData = {
  node: LayeredDiagramNode;
};

type LayeredReactFlowEdgeData = {
  kind: LayeredDiagramEdgeKind;
};

type LayeredReactFlowNode = Node<LayeredReactFlowNodeData, "anlyxNode">;
type LayeredReactFlowEdge = Edge<LayeredReactFlowEdgeData, "anlyxSmooth">;

type LayeredReactFlowDiagramModel = {
  layers: DiagramLayerId[];
  nodes: LayeredReactFlowNode[];
  edges: LayeredReactFlowEdge[];
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

function LayeredFlowNode({ data }: NodeProps<LayeredReactFlowNode>): JSX.Element {
  return <LayeredNodeCard node={data.node} />;
}

function LayeredNodeCard({ node }: { node: LayeredDiagramNode }): JSX.Element {
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
        <em>{layeredDiagramNodeStatusLabel(node.status)}</em>
      </div>
    </article>
  );
}

function LayeredSmoothEdge({
  data,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY
}: EdgeProps<LayeredReactFlowEdge>): JSX.Element {
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

function buildLayeredReactFlowDiagram(
  record: FlowRecord,
  locale: WorkspaceLocale
): LayeredReactFlowDiagramModel {
  const diagramNodes = assignLayeredNodePositions(
    layeredDiagramLayersForRecord(record).map((layer) =>
      toLayeredDiagramNode(layer, record, locale)
    )
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

function layeredDiagramLayersForRecord(record: FlowRecord): FlowLayer[] {
  const layers = diagramLayers(record).filter((layer) => layer.type !== "page");
  const fallback = layers.length > 0 ? layers : timingLayers(record);
  const hasBlocked = hasBlockedOutcome(record);
  const order: FlowLayer["type"][] = hasBlocked
    ? [
        "action",
        "api",
        "controller",
        "auth",
        "decision",
        "result",
        "service",
        "repository",
        "database"
      ]
    : [
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

  return order
    .map((type) => fallback.find((layer) => layer.type === type))
    .filter((layer): layer is FlowLayer => Boolean(layer));
}

function diagramCanvasHeight(nodes: LayeredDiagramNode[]): number {
  return Math.max(
    layeredLayout.canvasHeight,
    ...nodes.map((node) => node.y + layeredLayout.nodeHeight + 110)
  );
}

function assignLayeredNodePositions(nodes: LayeredDiagramNode[]): LayeredDiagramNode[] {
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
  layer: FlowLayer,
  record: FlowRecord,
  locale: WorkspaceLocale
): LayeredDiagramNode {
  const status = layeredDiagramNodeStatus(layer, record);

  return {
    id: layer.id,
    sourceLayer: layer,
    layer: diagramLayerForFlowLayer(layer.type),
    kind: layer.type,
    title: layeredDiagramTitle(layer, record, locale),
    subtitle: layeredDiagramSubtitle(layer, record),
    status,
    edgeKind: edgeKindForLayer(layer, status),
    isMainPath: !isUnprovenLayer(layer),
    slot: 0,
    x: 0,
    y: 0,
    ...(layer.durationMs !== undefined ? { durationMs: Math.round(layer.durationMs) } : {})
  };
}

function buildLayeredDiagramEdges(nodes: LayeredDiagramNode[]): LayeredDiagramEdge[] {
  const mainNodes = nodes.filter((node) => node.isMainPath).sort(compareLayeredNodes);
  const secondaryNodes = nodes.filter((node) => !node.isMainPath).sort(compareLayeredNodes);
  const edges: LayeredDiagramEdge[] = [];

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

function compareLayeredNodes(first: LayeredDiagramNode, second: LayeredDiagramNode): number {
  const layerDelta =
    layeredDiagramLayers.indexOf(first.layer) - layeredDiagramLayers.indexOf(second.layer);
  if (layerDelta !== 0) return layerDelta;

  return layerOrderIndex(first.kind) - layerOrderIndex(second.kind);
}

function reactFlowHandlesForEdge(
  from: LayeredDiagramNode,
  to: LayeredDiagramNode
): Pick<LayeredReactFlowEdge, "sourceHandle" | "targetHandle"> {
  if (from.layer === to.layer) {
    return to.y > from.y
      ? { sourceHandle: "bottom", targetHandle: "top" }
      : { sourceHandle: "top", targetHandle: "bottom" };
  }

  return { sourceHandle: "right", targetHandle: "left" };
}

function edgeKindBetween(from: LayeredDiagramNode, to: LayeredDiagramNode): LayeredDiagramEdgeKind {
  if (from.status === "blocked" || to.status === "blocked") return "blocked";
  if (from.status === "inferred" || to.status === "inferred") return "inferred";
  if (from.status === "source_matched" || to.status === "source_matched") return "source_matched";
  return "executed";
}

function edgeKindForLayer(
  layer: FlowLayer,
  status: LayeredDiagramNodeStatus
): LayeredDiagramEdgeKind {
  if (status === "blocked") return "blocked";
  if (status === "inferred") return "inferred";
  if (isUnprovenLayer(layer) || status === "not_proven") return "not_proven";
  if (layer.type !== "action" && layer.type !== "api" && layer.type !== "result") {
    return "source_matched";
  }
  return "executed";
}

function diagramLayerForFlowLayer(layer: FlowLayer["type"]): DiagramLayerId {
  if (layer === "action") return "browser";
  if (layer === "api") return "api";
  if (layer === "repository" || layer === "database") return "data";
  if (layer === "result") return "response";
  return "application";
}

function layeredDiagramNodeStatus(layer: FlowLayer, record: FlowRecord): LayeredDiagramNodeStatus {
  if (isUnprovenLayer(layer)) return "not_proven";
  if (layer.execution === "blocked") return "blocked";
  if (layer.execution === "inferred" || layer.evidenceLevel === "inferred") return "inferred";
  if (layer.type === "result" && outcomeTone(record) === "success") return "success";
  if (layer.type === "action" || layer.type === "api") return "observed";
  if (layer.type !== "result") return "source_matched";
  return "matched";
}

function layeredDiagramTitle(
  layer: FlowLayer,
  record: FlowRecord,
  locale: WorkspaceLocale
): string {
  if (layer.type === "action") return locale === "ko" ? "사용자 액션" : "User Action";
  if (layer.type === "api") return locale === "ko" ? "HTTP 요청" : "HTTP Request";
  if (layer.type === "result")
    return outcomeTone(record) === "success" ? "OK" : outcomeLabel(record, locale);
  return layerLabel(layer, locale);
}

function layeredDiagramSubtitle(layer: FlowLayer, record: FlowRecord): string {
  if (layer.type === "action") return record.action?.label ?? layer.label;
  if (layer.type === "api") return `${record.method} ${record.path}`;
  if (layer.type === "result") return layer.label;
  return layer.label;
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

function layeredNodeIcon(node: LayeredDiagramNode): LucideIcon {
  if (node.kind === "action") return MousePointerClick;
  if (node.kind === "api") return Network;
  if (node.kind === "auth" || node.kind === "decision") return Lock;
  if (node.kind === "service") return Layers3;
  if (node.kind === "repository") return Box;
  if (node.kind === "database") return Database;
  if (node.kind === "result") return Flag;
  if (node.kind === "controller") return FileCode2;
  return Circle;
}

function layeredDiagramNodeStatusLabel(status: LayeredDiagramNodeStatus): string {
  if (status === "observed") return "observed";
  if (status === "source_matched") return "source matched";
  if (status === "inferred") return "inferred";
  if (status === "not_proven") return "not proven";
  if (status === "success") return "success";
  if (status === "blocked") return "blocked";
  return "matched";
}

function recordTotalDuration(record: FlowRecord, rows?: FlowLayer[]): number {
  const baseDuration = record.durationMs ?? record.duration ?? 0;
  const layerEnd = Math.max(
    0,
    ...(rows ?? timingLayers(record)).map(
      (layer) => (layer.startOffsetMs ?? 0) + Math.max(1, layer.durationMs ?? 0)
    )
  );

  return Math.max(1, Math.round(Math.max(baseDuration, layerEnd)));
}

function recordDuration(record: FlowRecord): number {
  return Math.round(recordTotalDuration(record));
}

function FlowInspector({
  onSelect,
  pageContext,
  record,
  records,
  selectedId
}: {
  onSelect(id: string): void;
  pageContext: PageContextEvent | undefined;
  record: FlowRecord | undefined;
  records: FlowRecord[];
  selectedId: string | undefined;
}): JSX.Element {
  const locale = useWorkspaceLocale();
  const evidence = useMemo(() => record?.evidence ?? [], [record]);
  const recentRecords = useMemo(
    () => mergeRecentRecords(records, selectedId),
    [records, selectedId]
  );
  const coverage = record
    ? evidenceCoverage(record)
    : { browser: 0, backend: 0, source: 0, notProven: 0 };

  return (
    <aside className="flow-inspector" aria-label={t(locale, "evidenceInspector")}>
      <div className="inspector-title">
        <h2>{t(locale, "anlyxFlow")}</h2>
      </div>
      <InspectorSection title={t(locale, "recentRequests")} count={String(recentRecords.length)}>
        <RecentEventsList records={recentRecords} selectedId={selectedId} onSelect={onSelect} />
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
              <strong>{formatDuration(recordTotalDuration(record))}</strong>
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
          <p className="events-empty">
            {pageContext ? t(locale, "noCurrentPageRequestsCopy") : t(locale, "keepWorkspaceOpen")}
          </p>
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
  const primaryRecords = records.filter(isPrimaryRecord).slice(0, 5);
  const backgroundRecords = records.filter((record) => !isPrimaryRecord(record)).slice(0, 4);

  if (records.length === 0) {
    return <p className="events-empty">{t(locale, "noCurrentPageRequestsCopy")}</p>;
  }

  return (
    <div className="recent-events" aria-label="Recent events">
      <p className="recent-events-scope">{t(locale, "currentRequestWindow")}</p>
      {primaryRecords.map((record) => (
        <RecentEventButton
          key={record.id}
          onSelect={onSelect}
          record={record}
          selectedId={selectedId}
        />
      ))}
      {backgroundRecords.length > 0 ? (
        <div className="recent-events-background">
          <p>{t(locale, "background")}</p>
          {backgroundRecords.map((record) => (
            <RecentEventButton
              background
              key={record.id}
              onSelect={onSelect}
              record={record}
              selectedId={selectedId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RecentEventButton({
  background = false,
  onSelect,
  record,
  selectedId
}: {
  background?: boolean;
  onSelect(id: string): void;
  record: FlowRecord;
  selectedId: string | undefined;
}): JSX.Element {
  return (
    <button
      className={`${record.id === selectedId ? "is-selected" : ""} ${
        background ? "is-background" : ""
      }`}
      type="button"
      onClick={() => onSelect(record.id)}
    >
      <span>{record.method}</span>
      <strong>{shortPath(record.path)}</strong>
      <small>
        {record.status ?? "pending"} · {recordTotalDuration(record)} ms
        {record.occurrenceCount && record.occurrenceCount > 1
          ? ` · ${record.occurrenceCount}x`
          : ""}
      </small>
    </button>
  );
}

function EmptyWorkspace({
  pageContext
}: {
  pageContext: PageContextEvent | undefined;
}): JSX.Element {
  const locale = useWorkspaceLocale();
  const pageUrl = pageContext ? normalizeDisplayUrl(pageContext.pageUrl) : undefined;

  return (
    <section
      className="waterfall-card empty-workspace-card"
      aria-label={t(locale, "waitingForBrowserRequests")}
    >
      <span>{pageContext ? t(locale, "currentPage") : t(locale, "liveCaptureReady")}</span>
      <h2>{pageContext ? t(locale, "noCurrentPageRequests") : t(locale, "noRequestSelected")}</h2>
      <p>
        {pageContext
          ? `${pageUrl}: ${t(locale, "noCurrentPageRequestsCopy")}`
          : t(locale, "emptyWorkspaceCopy")}
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
      (parsed.pageUrl === undefined || typeof parsed.pageUrl === "string") &&
      Array.isArray(parsed.layers)
    ) {
      return {
        ...parsed,
        trigger: parsed.trigger === "user_action" ? "user_action" : "background",
        priority: parsed.priority === "background" ? "background" : "primary",
        runtimeSource:
          parsed.runtimeSource === "server" || parsed.runtimeSource === "browser"
            ? parsed.runtimeSource
            : "unknown"
      } as FlowRecord;
    }
  } catch {
    return null;
  }

  return null;
}

function parsePageContextEvent(value: string): PageContextEvent | null {
  try {
    const parsed = JSON.parse(value) as Partial<PageContextEvent>;

    if (
      parsed.type === "page_context" &&
      typeof parsed.pageUrl === "string" &&
      typeof parsed.contextId === "string" &&
      typeof parsed.observedAt === "string"
    ) {
      return {
        type: "page_context",
        pageUrl: parsed.pageUrl,
        contextId: parsed.contextId,
        observedAt: parsed.observedAt
      };
    }
  } catch {
    return null;
  }

  return null;
}

function recordsForPageContext(
  records: FlowRecord[],
  pageContext: PageContextEvent | undefined
): FlowRecord[] {
  if (!pageContext) {
    return records;
  }

  return records.filter((record) => recordBelongsToPageContext(record, pageContext));
}

function recordBelongsToPageContext(record: FlowRecord, pageContext: PageContextEvent): boolean {
  if (record.contextId && record.contextId === pageContext.contextId) {
    return true;
  }

  if (record.pageUrl) {
    return normalizeDisplayUrl(record.pageUrl) === normalizeDisplayUrl(pageContext.pageUrl);
  }

  return false;
}

function scopedRecentRecords(
  records: FlowRecord[],
  selectedRecord: FlowRecord | undefined
): FlowRecord[] {
  if (!selectedRecord) {
    return records;
  }

  const selectedAt = recordTime(selectedRecord);
  const windowStart = selectedAt - 1_500;
  const windowEnd = Math.max(Date.now(), selectedAt + 12_000);
  const selectedContext = selectedRecord.contextId;
  const scoped = records.filter((record) => {
    if (record.id === selectedRecord.id) {
      return true;
    }

    const time = recordTime(record);

    if (time < windowStart || time > windowEnd) {
      return false;
    }

    if (!selectedContext || !record.contextId) {
      return true;
    }

    return record.contextId === selectedContext;
  });

  return scoped.length > 0 ? scoped : [selectedRecord];
}

function mergeRecentRecords(records: FlowRecord[], selectedId: string | undefined): FlowRecord[] {
  const grouped = new Map<string, FlowRecord[]>();

  for (const record of records) {
    const key = [
      record.contextId ?? "",
      record.priority,
      record.method,
      normalizeComparablePath(record.path),
      record.status ?? "",
      record.matchState
    ].join("|");
    grouped.set(key, [...(grouped.get(key) ?? []), record]);
  }

  return [...grouped.values()]
    .map((group) => {
      const selectedRecord = selectedId
        ? group.find((record) => record.id === selectedId)
        : undefined;
      const latestRecord = group.reduce((latest, record) =>
        recordTime(record) > recordTime(latest) ? record : latest
      );

      return {
        ...(selectedRecord ?? latestRecord),
        occurrenceCount: group.length
      };
    })
    .sort((left, right) => recordTime(right) - recordTime(left));
}

function normalizeComparablePath(path: string): string {
  try {
    const parsed = new URL(path, "http://anlyx.local");
    parsed.searchParams.sort();
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return path;
  }
}

function displayPageUrl(
  record: FlowRecord | undefined,
  locale: WorkspaceLocale,
  pageContext?: PageContextEvent
): string {
  if (pageContext?.pageUrl && (!record || isPageContextCurrentForRecord(pageContext, record))) {
    return normalizeDisplayUrl(pageContext.pageUrl);
  }

  if (record?.pageUrl) {
    return normalizeDisplayUrl(record.pageUrl);
  }

  if (record?.contextId?.startsWith("page:")) {
    const path = record.contextId.slice("page:".length) || "/";
    return normalizeDisplayUrl(path);
  }

  return t(locale, "pageUrlNotCaptured");
}

function isPageContextCurrentForRecord(pageContext: PageContextEvent, record: FlowRecord): boolean {
  if (!record.pageUrl && !record.contextId) {
    return true;
  }

  const pageObservedAt = Date.parse(pageContext.observedAt);
  const recordCreatedAt = Date.parse(record.createdAt);

  if (!Number.isFinite(pageObservedAt) || !Number.isFinite(recordCreatedAt)) {
    return pageContext.contextId !== record.contextId;
  }

  return pageObservedAt >= recordCreatedAt || pageContext.contextId !== record.contextId;
}

function normalizeDisplayUrl(urlOrPath: string): string {
  try {
    const parsed = new URL(urlOrPath);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return `${parsed.pathname}${parsed.search}` || "/";
    }

    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return urlOrPath || "/";
  }
}

function isPrimaryRecord(record: FlowRecord): boolean {
  if (record.priority === "background") {
    return false;
  }

  if (record.trigger === "user_action") {
    return true;
  }

  return !isPassiveImplementationRequest(record);
}

function isPassiveImplementationRequest(record: Pick<FlowRecord, "method" | "path">): boolean {
  const method = record.method.toUpperCase();
  const segments = record.path.split("?")[0]?.toLowerCase().split("/").filter(Boolean) ?? [];
  const last = segments[segments.length - 1] ?? "";

  if (
    segments.some((segment) =>
      [
        "health",
        "healthz",
        "ready",
        "readyz",
        "live",
        "livez",
        "ping",
        "metrics",
        "poll",
        "polling"
      ].includes(segment)
    )
  ) {
    return true;
  }

  if (
    segments.some((segment) =>
      ["page-views", "analytics", "telemetry", "events", "metrics"].includes(segment)
    )
  ) {
    return true;
  }

  if (method === "GET" && ["me", "session", "profile", "current-user"].includes(last)) {
    return true;
  }

  if (segments.includes("csrf") || segments.includes("xsrf")) {
    return true;
  }

  if (
    segments.includes("auth") &&
    ["session", "refresh", "token", "csrf", "status"].includes(last)
  ) {
    return true;
  }

  return (
    method === "GET" &&
    ["saved-benefits", "saved-items", "bookmarks", "favorites"].some((segment) =>
      segments.includes(segment)
    )
  );
}

function recordTime(record: Pick<FlowRecord, "createdAt">): number {
  const time = Date.parse(record.createdAt);
  return Number.isFinite(time) ? time : Date.now();
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

  layers.push(
    ...[...record.backendSpans]
      .filter((span) => span.type !== "api")
      .sort(compareBackendSpans)
      .map(backendSpanToLayer)
  );

  if (result) {
    layers.push({
      ...result,
      startOffsetMs: Math.max(0, total - Math.max(1, result.durationMs ?? 1)),
      durationMs: Math.max(1, result.durationMs ?? 1)
    });
  }

  return layers;
}

function compactTimingLayers(record: FlowRecord): FlowLayer[] {
  if (!record.backendSpans?.length) {
    return timingLayers(record);
  }

  const rawRows = timingLayers(record);
  const action = rawRows.find((layer) => layer.type === "action");
  const api = rawRows.find((layer) => layer.type === "api");
  const result = rawRows.find((layer) => layer.type === "result");
  const observedRows = summarizeBackendObservedSpans(record.backendSpans);
  const requestOverhead = requestOverheadLayer(record, api, result);
  const sourceRows = orderedLayers(record).filter((layer) => layer.type !== "page");
  const observedTypes = new Set(observedRows.map((layer) => layer.type));
  const unprovenRows = sourceRows.filter(
    (layer) =>
      isUnprovenLayer(layer) &&
      !observedTypes.has(layer.type) &&
      layer.type !== "action" &&
      layer.type !== "api" &&
      layer.type !== "result"
  );

  return [action, requestOverhead, ...observedRows, result, ...unprovenRows].filter(
    (layer): layer is FlowLayer => Boolean(layer)
  );
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
  const requestOverhead = requestOverheadLayer(record, api, result);
  const observedTypes = new Set(observedRows.map((layer) => layer.type));
  const unprovenRows = sourceRows.filter(
    (layer) =>
      isUnprovenLayer(layer) &&
      !observedTypes.has(layer.type) &&
      layer.type !== "action" &&
      layer.type !== "api" &&
      layer.type !== "result"
  );

  return [action, requestOverhead, ...observedRows, result, ...unprovenRows].filter(
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

function requestOverheadLayer(
  record: FlowRecord,
  api: FlowLayer | undefined,
  result: FlowLayer | undefined
): FlowLayer | undefined {
  if (!api || !record.backendSpans?.length) {
    return api;
  }

  const backendSpans = record.backendSpans.filter((span) => span.type !== "api");
  const total = Math.max(1, record.durationMs ?? record.duration ?? api.durationMs ?? 1);
  const backendCoveredDuration = coveredDurationMs(backendSpans);
  const resultDuration = Math.max(0, result?.durationMs ?? 0);
  const durationMs = Math.max(0, total - backendCoveredDuration - resultDuration);

  return {
    ...api,
    label: `${record.method} ${record.path}`,
    startOffsetMs: 0,
    durationMs
  };
}

function summarizeBackendObservedSpans(spans: BackendObservedSpan[]): FlowLayer[] {
  const groupedSpans = new Map<string, BackendObservedSpan[]>();
  const databaseSpans: BackendObservedSpan[] = [];
  const untrackedControllerSpans: BackendObservedSpan[] = [];
  const selfDurations = backendSelfDurationBySpanId(spans);

  for (const span of [...spans].sort(compareBackendSpans)) {
    if (span.type === "api") {
      continue;
    }

    if (span.type === "controller") {
      untrackedControllerSpans.push(span);
      continue;
    }

    if (span.type === "database") {
      databaseSpans.push(span);
      continue;
    }

    const key = `${span.type}:${span.label}`;
    groupedSpans.set(key, [...(groupedSpans.get(key) ?? []), span]);
  }

  const rows = [...groupedSpans.values()].map((group) =>
    groupedBackendSpansToLayer(group, selfDurations)
  );

  if (databaseSpans.length > 0) {
    rows.push(databaseSpansToSummaryLayer(databaseSpans, selfDurations));
  }

  if (untrackedControllerSpans.length > 0) {
    rows.push(untrackedControllerSpansToLayer(untrackedControllerSpans, selfDurations));
  }

  return rows.sort(compareFlowLayersByTiming);
}

function groupedBackendSpansToLayer(
  spans: BackendObservedSpan[],
  selfDurations: Map<string, number>
): FlowLayer {
  if (spans.length === 1) {
    const span = spans[0]!;
    return backendSpanToLayer({
      ...span,
      durationMs: Math.max(0, Math.round(selfDurations.get(span.id) ?? span.durationMs))
    });
  }

  const first = spans[0]!;
  const startOffsetMs = Math.min(...spans.map((span) => span.startOffsetMs));
  const evidence = spans.flatMap((span) => span.evidence ?? []);
  const selfDurationMs = spans.reduce(
    (sum, span) => sum + Math.max(0, selfDurations.get(span.id) ?? span.durationMs),
    0
  );

  return {
    id: `backend:group:${first.type}:${first.label}`,
    type: first.type,
    label: `${first.label} ×${spans.length}`,
    execution: "observed",
    evidenceLevel: "backend_observed",
    evidence: [
      `backend_observed: ${spans.length} runtime ${first.type} span${spans.length === 1 ? "" : "s"} grouped by label`,
      ...evidence.slice(0, 2)
    ],
    startOffsetMs,
    durationMs: Math.max(0, Math.round(selfDurationMs))
  };
}

function databaseSpansToSummaryLayer(
  spans: BackendObservedSpan[],
  selfDurations: Map<string, number>
): FlowLayer {
  const startOffsetMs = Math.min(...spans.map((span) => span.startOffsetMs));
  const firstEvidence = spans.flatMap((span) => span.evidence ?? [])[0];
  const selfDurationMs = spans.reduce(
    (sum, span) => sum + Math.max(0, selfDurations.get(span.id) ?? span.durationMs),
    0
  );

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
    durationMs: Math.max(0, Math.round(selfDurationMs))
  };
}

function untrackedControllerSpansToLayer(
  spans: BackendObservedSpan[],
  selfDurations: Map<string, number>
): FlowLayer {
  const startOffsetMs = Math.min(...spans.map((span) => span.startOffsetMs));
  const selfDurationMs = spans.reduce(
    (sum, span) => sum + Math.max(0, selfDurations.get(span.id) ?? 0),
    0
  );

  return {
    id: "backend:untracked-app",
    type: "unknown",
    label: "Untracked application time",
    execution: "observed",
    evidenceLevel: "backend_observed",
    evidence: [
      "backend_observed: controller runtime remained after measured child spans were removed"
    ],
    startOffsetMs,
    durationMs: Math.max(0, Math.round(selfDurationMs))
  };
}

function backendSelfDurationBySpanId(spans: BackendObservedSpan[]): Map<string, number> {
  const childrenByParent = new Map<string, BackendObservedSpan[]>();

  for (const span of spans) {
    if (!span.parentId) {
      continue;
    }

    childrenByParent.set(span.parentId, [...(childrenByParent.get(span.parentId) ?? []), span]);
  }

  return new Map(
    spans.map((span) => {
      const childDuration = coveredDurationMs(childrenByParent.get(span.id) ?? []);
      return [span.id, Math.max(0, span.durationMs - childDuration)];
    })
  );
}

function coveredDurationMs(spans: BackendObservedSpan[]): number {
  const intervals = spans
    .filter((span) => span.durationMs > 0)
    .map((span) => ({
      start: span.startOffsetMs,
      end: span.startOffsetMs + span.durationMs
    }))
    .sort((left, right) => left.start - right.start);

  let covered = 0;
  let currentStart: number | undefined;
  let currentEnd: number | undefined;

  for (const interval of intervals) {
    if (currentStart === undefined || currentEnd === undefined) {
      currentStart = interval.start;
      currentEnd = interval.end;
      continue;
    }

    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
      continue;
    }

    covered += currentEnd - currentStart;
    currentStart = interval.start;
    currentEnd = interval.end;
  }

  if (currentStart !== undefined && currentEnd !== undefined) {
    covered += currentEnd - currentStart;
  }

  return Math.max(0, covered);
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

function isUntrackedAppLayer(layer: FlowLayer): boolean {
  return layer.id === "backend:untracked-app";
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
):
  | "action"
  | "api"
  | "controller"
  | "auth"
  | "result"
  | "service"
  | "repository"
  | "database"
  | "untracked" {
  if (isUntrackedAppLayer(layer)) return "untracked";
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
  if (isUntrackedAppLayer(layer)) return t(locale, "untrackedApp");
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

function timelineTicks(total: number): number[] {
  const steps = 4;

  return Array.from({ length: steps + 1 }, (_, index) => (total / steps) * index);
}

function timingBreakdownSegments(
  rows: FlowLayer[],
  total: number
): Array<{ durationMs: number; label: string; type: TimingBreakdownType; width: number }> {
  const types: TimingBreakdownType[] = [
    "api",
    "controller",
    "service",
    "repository",
    "database",
    "untracked",
    "result"
  ];
  const labels: Record<TimingBreakdownType, string> = {
    api: "API",
    controller: "Controller",
    service: "Service",
    repository: "Repository",
    database: "Database",
    untracked: "Untracked",
    result: "Result"
  };
  const durations = new Map<TimingBreakdownType, number>(types.map((type) => [type, 0]));

  for (const row of rows) {
    if (isUnprovenLayer(row)) {
      continue;
    }

    const type = isUntrackedAppLayer(row) ? "untracked" : (row.type as TimingBreakdownType);
    if (!types.includes(type)) {
      continue;
    }

    durations.set(type, (durations.get(type) ?? 0) + Math.max(0, row.durationMs ?? 0));
  }

  const rawNonApiDuration = types
    .filter((type) => type !== "api")
    .reduce((sum, type) => sum + (durations.get(type) ?? 0), 0);
  const nonApiScale = rawNonApiDuration > total ? total / rawNonApiDuration : 1;

  if (nonApiScale < 1) {
    for (const type of types) {
      if (type !== "api") {
        durations.set(type, (durations.get(type) ?? 0) * nonApiScale);
      }
    }
  }

  const nonApiDuration = types
    .filter((type) => type !== "api")
    .reduce((sum, type) => sum + (durations.get(type) ?? 0), 0);
  durations.set("api", Math.max(0, total - nonApiDuration));

  const measuredTotal = Math.max(total, 1);

  return types.map((type) => {
    const durationMs = durations.get(type) ?? 0;

    return {
      durationMs,
      label: labels[type],
      type,
      width: durationMs <= 0 ? 0 : (durationMs / measuredTotal) * 100
    };
  });
}

function timelineX(percent: number): number {
  const clamped = Math.min(100, Math.max(0, percent));

  return TIMELINE_START_INSET_PERCENT + (clamped / 100) * (100 - TIMELINE_START_INSET_PERCENT);
}

function timelineWidth(left: number, width: number): number {
  const visualLeft = timelineX(left);
  const visualRight = timelineX(Math.min(100, left + width));

  return Math.max(0, visualRight - visualLeft);
}

function hasBlockedOutcome(record: FlowRecord): boolean {
  return record.status !== undefined && [401, 403, 409].includes(record.status);
}

function OutcomeIcon({ record, size }: { record: FlowRecord; size: number }): JSX.Element {
  if (hasBlockedOutcome(record)) {
    return <Lock size={size} />;
  }

  if (record.status !== undefined && record.status >= 500) {
    return <Flag size={size} />;
  }

  return <Check size={size} />;
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
    if (record.matchState !== "matched") {
      if (record.backendSpans?.length) {
        return locale === "ko"
          ? "요청이 완료되었고 개발 런타임 span이 관찰되었습니다. 가져온 Flow JSON과는 아직 매칭되지 않았습니다."
          : "Request completed with development runtime spans observed. It is not matched to imported Flow JSON yet.";
      }

      return locale === "ko"
        ? "요청이 완료되었지만 가져온 Flow JSON과는 아직 매칭되지 않았습니다."
        : "Request completed, but it is not matched to imported Flow JSON yet.";
    }

    return locale === "ko"
      ? "요청이 완료되었고 가져온 백엔드 흐름과 매칭되었습니다."
      : "Request completed and matched imported backend flow.";
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

function requestContextDescription(record: FlowRecord, locale: WorkspaceLocale): string {
  const hasRuntimeSpans = Boolean(record.backendSpans?.length);

  if (record.matchState === "matched" && hasRuntimeSpans) {
    return t(locale, "mappedEvidenceWithRuntime");
  }

  if (record.matchState === "matched") {
    return t(locale, "mappedEvidence");
  }

  if (hasRuntimeSpans) {
    return locale === "ko"
      ? "브라우저에서 관찰된 요청에 개발 런타임 span이 연결되었습니다. 가져온 Flow JSON 매칭은 아직 없습니다."
      : "Browser-observed request with development runtime spans. No imported Flow JSON match yet.";
  }

  return locale === "ko"
    ? "브라우저에서 관찰된 요청입니다. 가져온 Flow JSON 매칭은 아직 없습니다."
    : "Browser-observed request. No imported Flow JSON match yet.";
}

function flowNote(record: FlowRecord, locale: WorkspaceLocale): string {
  if (record.backendSpans?.length) {
    return locale === "ko"
      ? "관찰됨으로 표시된 백엔드 행은 이 요청에 대한 개발 전용 백엔드 브리지에서 왔습니다. 소스 행은 가져온 근거를 기반으로 합니다."
      : "Backend rows marked observed came from a development-only backend bridge for this request. Source rows still come from imported evidence.";
  }

  const hasUnprovenDownstream = record.layers.some(
    (layer) =>
      (layer.type === "service" || layer.type === "repository" || layer.type === "database") &&
      isUnprovenLayer(layer)
  );

  if (hasUnprovenDownstream) {
    return locale === "ko"
      ? "흐리게 표시된 레이어는 소스 근거로만 알려진 경로이며 실제 실행은 확인되지 않았습니다."
      : "Muted layers are known by source evidence only and were not proven executed.";
  }

  return locale === "ko"
    ? "브라우저 행은 페이지에서 관찰된 내용입니다. 소스 행은 가져온 백엔드 근거이며 운영 런타임 트레이스가 아닙니다."
    : "Browser rows are observed in the page. Source rows come from imported backend evidence and are not a production runtime trace.";
}

function confidenceDescription(record: FlowRecord, locale: WorkspaceLocale): string {
  if (record.confidence === "high") {
    return locale === "ko"
      ? "브라우저 요청, 엔드포인트, 컨트롤러, 소스 근거가 모두 매칭되었습니다."
      : "Browser request, endpoint, controller, and source evidence all matched.";
  }

  if (record.confidence === "medium") {
    return locale === "ko"
      ? "브라우저 요청은 소스 근거와 매칭되었지만 일부 백엔드 세부 정보는 추론입니다."
      : "The browser request matched source evidence, but some backend details are inferred.";
  }

  return locale === "ko"
    ? "Anlyx가 브라우저 요청을 관찰했지만 백엔드 소스 근거가 충분하지 않습니다."
    : "Anlyx observed the browser request, but backend source evidence is incomplete.";
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

function layerSubtitle(
  layer: FlowLayer,
  locale: WorkspaceLocale,
  runtimeSource: FlowRecord["runtimeSource"] = "browser"
): string {
  if (layer.type === "action")
    return locale === "ko" ? "사용자 클릭 캡처됨" : "user click captured";
  if (layer.type === "api") {
    return runtimeSource === "server" ? t(locale, "serverRequestSpan") : t(locale, "browserSpan");
  }
  if (isUnprovenLayer(layer)) return t(locale, "knownBySourceOnly");
  if (layer.evidenceLevel === "browser_observed") return t(locale, "browserObserved");
  if (layer.evidenceLevel === "backend_observed") return t(locale, "devRuntimeSpan");
  if (isSourceMatchedLayer(layer) || layer.evidenceLevel === "inferred") {
    return t(locale, "sourceDerivedEstimate");
  }
  return executionLabel(layer.execution, locale);
}

function backendRuntimeGroupCount(layer: FlowLayer): number | undefined {
  if (layer.evidenceLevel !== "backend_observed") {
    return undefined;
  }

  const jdbcMatch = /^(\d+)\s+JDBC statement/.exec(layer.label);

  if (jdbcMatch?.[1]) {
    return Number(jdbcMatch[1]);
  }

  const groupedMatch = /×(\d+)$/.exec(layer.label);

  if (groupedMatch?.[1]) {
    return Number(groupedMatch[1]);
  }

  return undefined;
}

function durationValueLabel(_layer: FlowLayer, duration: number): string {
  return `${Math.round(duration)} ms`;
}

function durationCaption(
  layer: FlowLayer,
  duration: number,
  total: number,
  locale: WorkspaceLocale,
  runtimeSource: FlowRecord["runtimeSource"] = "browser",
  runtimeGroupCount?: number
): string {
  if (isUntrackedAppLayer(layer)) return t(locale, "untrackedRuntime");
  if (layer.type === "result") return t(locale, "responseMarker");
  if (layer.type === "action" || layer.type === "api") {
    return runtimeSource === "server" ? t(locale, "serverRequestSpan") : t(locale, "browserSpan");
  }
  if (layer.evidenceLevel === "backend_observed") {
    if (runtimeGroupCount) {
      return `${runtimeGroupCount} ${t(locale, "callCount")}`;
    }

    return t(locale, "measuredRuntime");
  }

  return `${t(locale, "estimate")} · ${Math.round((duration / Math.max(total, 1)) * 100)}%`;
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
  if (execution === "scanned") return locale === "ko" ? "소스 매칭" : "source matched";
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
    return "가져온 엔드포인트와 매칭되었습니다";
  }
  if (normalized.includes("controller")) {
    return "컨트롤러 근거가 매칭되었습니다";
  }
  if (normalized.includes("backend_observed") || normalized.includes("runtime")) {
    return "개발용 백엔드 브리지에서 런타임 span을 받았습니다";
  }
  if (normalized.includes("source-derived") || normalized.includes("source")) {
    return "소스 근거 기반 백엔드 매칭입니다";
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
