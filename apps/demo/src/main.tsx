import "./demo-page.css";

import { DemoWorkspacePage } from "./LiveWorkspace";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clipboard,
  Code2,
  ExternalLink,
  FileText,
  GitBranch,
  Layers3,
  Rocket,
  Scale,
  ShieldCheck
} from "lucide-react";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import logoSrc from "../../../docs/assets/brand/anlyx-logo-transparent.png";

type Language = "en" | "ko";

const landingCopy = {
  en: {
    navOverview: "Overview",
    navDemo: "Demo",
    navDocs: "Docs",
    langToggle: "KO",
    heroEyebrow: "Flow JSON workspace",
    heroTitle: "Import Flow JSON. See the system path.",
    heroBody:
      "Anlyx validates agent-written, manual, runtime, and future adapter Flow JSON, then renders it in the local 4777 workspace with evidence and uncertainty kept visible.",
    heroPrimary: "Open live workspace demo",
    heroSecondary: "Read quick start",
    previewCaptured: "Flow JSON imported",
    previewTitle: "Claim to evidence path",
    previewBody:
      "A selected flow becomes Summary, Timing, Diagram, Inspector, and a JSON Reader for the original imported data.",
    previewButton: "Inspect flow",
    proofPage: "Flow source",
    proofApi: "API request",
    proofFlow: "System path",
    proofEvidence: "Evidence labels",
    whyEyebrow: "Why it exists",
    whyTitle: "Agents can explain a codebase. Anlyx gives their claims a checked visual form.",
    featureAction: "Start from Flow JSON",
    featureActionBody:
      "Use a common JSON file from an agent, human, runtime capture, telemetry import, or future adapter.",
    featureBackend: "Map system paths",
    featureBackendBody:
      "API, Controller, Service, Repository, database, external system, and result nodes stay readable.",
    featureUncertainty: "Show uncertainty",
    featureUncertaintyBody:
      "Observed, measured, source-matched, agent-inferred, not-proven, and unknown states remain distinct.",
    workflowEyebrow: "How it runs",
    workflowTitle: "Validate a flow file, import it, then open the local viewer.",
    workflowBody:
      "The primary product path is no longer scanner-first. Flow JSON is validated, snapshotted, normalized, and opened in the existing 4777 workspace.",
    stepInstall: "Install Anlyx in the project that will own the local flow snapshots.",
    stepInit: "Validate schema, evidence references, node and edge links, and timing rules.",
    stepDev: "Import the original JSON as a snapshot and start the 4777 viewer.",
    workflowNoteTitle: "Same final workspace design",
    workflowNoteBody:
      "The 4777 viewer keeps the locked Live Workspace design: Summary, Timing, Diagram, Inspector, and JSON Reader.",
    techEyebrow: "Tech and architecture",
    techTitle: "A local-first viewer for evidence-aware Flow JSON.",
    techBody:
      "Anlyx keeps snapshots and report data on your machine. Framework scanners are legacy or future producer work; the centerline is one validated Flow JSON model.",
    techStackTitle: "Stack",
    techFlowTitle: "Request flow",
    techStackCli: "TypeScript CLI",
    techStackNext: "Flow JSON validator",
    techStackSpring: "Snapshot importer",
    techStackWorkspace: "4777 Live Workspace",
    techStackFlow: "React Flow diagrams",
    techStackLocal: "JSON Reader",
    techFlowBrowser: "anlyx.flow.json",
    techFlowAnalyzer: "Validate and import",
    techFlowEvidence: "Snapshot and report data",
    techFlowWorkspace: "Flows, JSON, Diagram",
    communityEyebrow: "Open-source ready",
    communityTitle: "Built for fast adoption and careful contribution.",
    communityBody:
      "The repository includes the core docs a new user expects: README, getting started, usage guide, security notes, contribution rules, and MIT license.",
    communityDocs: "Docs first",
    communityDocsBody:
      "Quick start, Flow JSON rules, evidence labels, security, and AI setup prompts live in one docs page.",
    communityContribute: "Contribution path",
    communityContributeBody:
      "Issues and pull requests should preserve evidence semantics and avoid restoring scanner-first assumptions as the primary path.",
    communityLicense: "MIT licensed",
    communityLicenseBody:
      "The license is explicit so developers can evaluate usage, redistribution, and contribution boundaries.",
    agentEyebrow: "For AI agents",
    agentTitle: "Give your coding agent a copy-ready setup prompt.",
    agentBody:
      "Paste one of these prompts into Codex, Claude Code, Cursor, or another coding agent. It tells the agent to write safe Flow JSON, validate it, import it, and keep evidence levels separate.",
    agentNextTitle: "Flow JSON authoring",
    agentNextBody: "Best for the v0.1.5 product path.",
    agentReactTitle: "Runtime or legacy producer",
    agentReactBody: "Use only when a tool will produce Flow JSON for Anlyx.",
    copyPrompt: "Copy prompt",
    copiedPrompt: "Copied",
    demoEyebrow: "Interactive walkthrough",
    demoTitle: "Open the final Anlyx Workspace design with imported flow data.",
    demoBody:
      "The demo shows the locked 4777 workspace experience: Summary, Timing, Diagram, Recent requests, Inspector, and the same design used by the local viewer.",
    demoButton: "Open demo",
    docsEyebrow: "Open-source docs",
    docsTitle: "Write Flow JSON, validate it locally, and understand every evidence label.",
    docsBody:
      "This page collects the current v0.1.5 docs a new user or contributor needs first: Flow JSON workflow, usage, security, contribution rules, and license.",
    docsQuickStart: "Quick start",
    docsCopyCommand: "Copy command",
    docsCopied: "Copied",
    docsCopyFailed: "Copy failed",
    docsPrepublish:
      "Use Flow JSON as the primary input path. Scanner-first Spring Boot + Next.js behavior is legacy/internal, not the current product centerline.",
    docsDevOnly:
      "Local development only. Do not expose port 4777 or put secrets, production records, or raw personal data into Flow JSON.",
    docsConfigChecklist:
      "Before import, check schemaVersion, node and edge IDs, evidence IDs, source references, and timing evidence.",
    docsAgentPrompt: "Copy AI setup prompt",
    docsOpenDemo: "Open live demo",
    docsGithub: "GitHub repository",
    docsReadmeTitle: "README overview",
    docsReadmeBody:
      "Anlyx is a local Flow JSON viewer that shows how user actions, API requests, backend paths, external systems, and results connect.",
    docsInstallTitle: "Getting started",
    docsInstallBody:
      "Install Anlyx, validate anlyx.flow.json, import it as a local snapshot, then open the 4777 workspace.",
    docsUsageTitle: "Usage guide",
    docsUsageBody:
      "Open Summary for the readable path, Timing for measured or estimated durations, Diagram for the flow map, and JSON for the imported data.",
    docsSecurityTitle: "Security and privacy",
    docsSecurityBody:
      "Anlyx stores imported snapshots and report data locally. Keep secrets and production payloads out of Flow JSON and do not expose port 4777.",
    docsContributingTitle: "Contributing",
    docsContributingBody:
      "Keep changes scoped, run tests before PRs, preserve evidence semantics, and avoid claiming source-derived rows are runtime traces.",
    docsLicenseTitle: "License",
    docsLicenseBody:
      "Anlyx is distributed under the MIT License. Check package metadata and LICENSE before redistribution.",
    docsSupportTitle: "Framework support",
    docsSupportBody:
      "Flow JSON is the v0.1.5 primary path. OpenAPI remains Basic Support, and framework scanners should be treated as future Flow JSON producers.",
    docsPrinciplesTitle: "Evidence principles",
    docsPrinciplesBody:
      "Observed data, source-derived evidence, inferred branches, and not-proven paths must stay visually distinct.",
    docsSectionsTitle: "Docs structure",
    docsCommandsTitle: "Commands",
    docsPromptTitle: "Agent-ready setup prompt"
  },
  ko: {
    navOverview: "소개",
    navDemo: "시연",
    navDocs: "문서",
    langToggle: "EN",
    heroEyebrow: "Flow JSON 워크스페이스",
    heroTitle: "Flow JSON을 가져와 시스템 흐름을 봅니다.",
    heroBody:
      "Anlyx는 agent, manual, runtime, future adapter가 만든 Flow JSON을 검증하고 로컬 4777 workspace에서 evidence와 uncertainty를 분리해 보여줍니다.",
    heroPrimary: "Live Workspace 시연 열기",
    heroSecondary: "빠른 시작 읽기",
    previewCaptured: "Flow JSON import 완료",
    previewTitle: "주장에서 근거 경로까지",
    previewBody:
      "선택된 flow가 Summary, Timing, Diagram, Inspector, 원본 데이터를 보는 JSON Reader로 이어집니다.",
    previewButton: "흐름 확인",
    proofPage: "Flow 출처",
    proofApi: "API 요청",
    proofFlow: "시스템 경로",
    proofEvidence: "근거 라벨",
    whyEyebrow: "왜 필요한가",
    whyTitle:
      "에이전트는 코드베이스를 설명할 수 있습니다. Anlyx는 그 주장을 검증 가능한 시각 형태로 만듭니다.",
    featureAction: "Flow JSON에서 시작",
    featureActionBody:
      "agent, human, runtime capture, telemetry import, future adapter가 공통 JSON 파일을 만들 수 있습니다.",
    featureBackend: "시스템 경로 연결",
    featureBackendBody:
      "API, Controller, Service, Repository, Database, 외부 시스템, Result 노드를 읽기 쉬운 그래프로 보여줍니다.",
    featureUncertainty: "불확실성 표시",
    featureUncertaintyBody:
      "observed, measured, source-matched, agent-inferred, not-proven, unknown을 섞지 않고 보여줍니다.",
    workflowEyebrow: "실행 방식",
    workflowTitle: "Flow 파일을 검증하고, import한 뒤 로컬 viewer를 엽니다.",
    workflowBody:
      "이제 기본 제품 경로는 scanner-first가 아닙니다. Flow JSON을 검증하고 snapshot으로 보존한 뒤 기존 4777 workspace에서 엽니다.",
    stepInstall: "로컬 flow snapshot을 관리할 프로젝트에 Anlyx를 설치합니다.",
    stepInit: "schema, evidence reference, node/edge link, timing rule을 검증합니다.",
    stepDev: "원본 JSON을 snapshot으로 import하고 4777 viewer를 시작합니다.",
    workflowNoteTitle: "최종 workspace 디자인 유지",
    workflowNoteBody:
      "4777 viewer는 잠근 Live Workspace 디자인을 유지합니다. Summary, Timing, Diagram, Inspector, JSON Reader를 함께 봅니다.",
    techEyebrow: "기술과 구조",
    techTitle: "evidence-aware Flow JSON을 위한 로컬 우선 viewer입니다.",
    techBody:
      "Anlyx는 snapshot과 report data를 내 머신에 보관합니다. framework scanner는 legacy 또는 future producer이며, 중심은 하나의 검증된 Flow JSON 모델입니다.",
    techStackTitle: "기술 스택",
    techFlowTitle: "요청 흐름",
    techStackCli: "TypeScript CLI",
    techStackNext: "Flow JSON validator",
    techStackSpring: "Snapshot importer",
    techStackWorkspace: "4777 Live Workspace",
    techStackFlow: "React Flow 다이어그램",
    techStackLocal: "JSON Reader",
    techFlowBrowser: "anlyx.flow.json",
    techFlowAnalyzer: "Validate and import",
    techFlowEvidence: "Snapshot and report data",
    techFlowWorkspace: "Flows, JSON, Diagram",
    communityEyebrow: "오픈소스 준비",
    communityTitle: "빠르게 써보고, 조심스럽게 기여할 수 있게 정리했습니다.",
    communityBody:
      "저장소에는 새 사용자가 기대하는 핵심 문서가 포함됩니다. README, 시작 가이드, 사용법, 보안 안내, 기여 규칙, MIT 라이선스를 확인할 수 있습니다.",
    communityDocs: "문서 우선",
    communityDocsBody:
      "빠른 시작, Flow JSON 규칙, 근거 라벨, 보안, AI 세팅 프롬프트를 한 문서 페이지에 모았습니다.",
    communityContribute: "기여 경로",
    communityContributeBody:
      "이슈와 PR은 근거 표현 원칙을 지키고, scanner-first 가정을 기본 경로로 되살리지 않아야 합니다.",
    communityLicense: "MIT 라이선스",
    communityLicenseBody:
      "라이선스를 명확히 두어 사용, 재배포, 기여 범위를 개발자가 빠르게 판단할 수 있게 했습니다.",
    agentEyebrow: "AI 에이전트용",
    agentTitle: "설치와 세팅을 에이전트에게 바로 맡길 수 있게 준비했습니다.",
    agentBody:
      "Codex, Claude Code, Cursor 같은 코딩 에이전트에 그대로 붙여넣을 수 있는 프롬프트입니다. 안전한 Flow JSON을 작성하고, validate/import하고, evidence level을 분리하도록 지시합니다.",
    agentNextTitle: "Flow JSON 작성",
    agentNextBody: "v0.1.5 제품 경로에 가장 적합합니다.",
    agentReactTitle: "Runtime 또는 legacy producer",
    agentReactBody: "도구가 Anlyx Flow JSON을 생성할 때만 사용합니다.",
    copyPrompt: "프롬프트 복사",
    copiedPrompt: "복사됨",
    demoEyebrow: "인터랙티브 시연",
    demoTitle: "최종 Anlyx Workspace 디자인에서 imported flow data를 확인하세요.",
    demoBody:
      "시연은 잠근 4777 workspace 경험을 보여줍니다. Summary, Timing, Diagram, Recent requests, Inspector가 로컬 viewer와 같은 디자인으로 동작합니다.",
    demoButton: "시연 열기",
    docsEyebrow: "오픈소스 문서",
    docsTitle: "Flow JSON 작성, 로컬 검증, 근거 라벨까지 한 번에 파악하세요.",
    docsBody:
      "처음 쓰는 사용자와 기여자가 가장 먼저 필요한 v0.1.5 문서를 한곳에 모았습니다. Flow JSON workflow, 사용법, 보안, 기여 규칙, 라이선스를 빠르게 확인할 수 있습니다.",
    docsQuickStart: "빠른 시작",
    docsCopyCommand: "명령어 복사",
    docsCopied: "복사됨",
    docsCopyFailed: "복사 실패",
    docsPrepublish:
      "Flow JSON을 기본 입력 경로로 사용합니다. Spring Boot + Next.js scanner-first 동작은 legacy/internal이며 현재 제품 중심이 아닙니다.",
    docsDevOnly:
      "로컬 개발 전용입니다. 4777 포트를 외부에 노출하지 말고, secret, production record, 실제 개인정보 payload를 Flow JSON에 넣지 마세요.",
    docsConfigChecklist:
      "import 전 schemaVersion, node/edge ID, evidence ID, source reference, timing evidence를 확인하세요.",
    docsAgentPrompt: "AI 세팅 프롬프트 복사",
    docsOpenDemo: "라이브 시연 열기",
    docsGithub: "GitHub 저장소",
    docsReadmeTitle: "README 개요",
    docsReadmeBody:
      "Anlyx는 user action, API request, backend path, external system, result가 어떻게 연결되는지 보여주는 로컬 Flow JSON viewer입니다.",
    docsInstallTitle: "설치 및 시작",
    docsInstallBody:
      "Anlyx를 설치하고 anlyx.flow.json을 validate/import한 뒤 4777 workspace를 열면 됩니다.",
    docsUsageTitle: "사용법",
    docsUsageBody:
      "Summary는 읽기 쉬운 경로, Timing은 measured/estimated duration, Diagram은 flow map, JSON은 imported data를 보여줍니다.",
    docsSecurityTitle: "보안과 개인정보",
    docsSecurityBody:
      "Anlyx는 imported snapshot과 report data를 로컬에 저장합니다. secret과 production payload를 Flow JSON에 넣지 말고 4777 포트를 외부에 노출하지 마세요.",
    docsContributingTitle: "기여 방법",
    docsContributingBody:
      "변경 범위를 작게 유지하고, PR 전 테스트를 실행하며, source-derived row를 runtime trace처럼 표현하지 않는 원칙을 지켜주세요.",
    docsLicenseTitle: "라이선스",
    docsLicenseBody:
      "Anlyx는 MIT License로 배포됩니다. 재배포 전 패키지 메타데이터와 LICENSE를 확인하세요.",
    docsSupportTitle: "지원 프레임워크",
    docsSupportBody:
      "Flow JSON이 v0.1.5 primary path입니다. OpenAPI는 Basic Support이며 framework scanner는 future Flow JSON producer로 다룹니다.",
    docsPrinciplesTitle: "근거 표현 원칙",
    docsPrinciplesBody:
      "Observed, measured, source-matched, agent-inferred, manual, not-proven, unknown은 UI와 JSON에서 명확히 구분되어야 합니다.",
    docsSectionsTitle: "문서 구조",
    docsCommandsTitle: "명령어",
    docsPromptTitle: "에이전트용 세팅 프롬프트"
  }
} satisfies Record<Language, Record<string, string>>;

const root = document.getElementById("root");

if (!root) {
  throw new Error("Anlyx demo root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

function App(): JSX.Element {
  const route = getRoute();
  const [language, setLanguage] = useState<Language>("en");
  const toggleLanguage = () => setLanguage((current) => (current === "en" ? "ko" : "en"));

  if (route === "demo") {
    return <DemoWorkspacePage />;
  }

  if (route === "docs") {
    return <DocsPage language={language} onToggleLanguage={toggleLanguage} />;
  }

  return <LandingPage language={language} onToggleLanguage={toggleLanguage} />;
}

function LandingPage({
  language,
  onToggleLanguage
}: {
  language: Language;
  onToggleLanguage: () => void;
}): JSX.Element {
  const t = landingCopy[language];

  return (
    <main
      className={`site-page site-page--landing landing-v2 site-page--${language}`}
      lang={language}
    >
      <SiteNav language={language} onToggleLanguage={onToggleLanguage} />
      <section className="landing-v2-hero">
        <div className="landing-v2-hero__copy">
          <p className="landing-v2-eyebrow">{t.heroEyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroBody}</p>
          <div className="landing-v2-actions">
            <a className="primary-link" href={routeHref("/demo")}>
              {t.heroPrimary}
              <ArrowRight size={17} />
            </a>
            <a className="secondary-link" href={routeHref("/docs")}>
              <BookOpen size={17} />
              {t.heroSecondary}
            </a>
          </div>
        </div>

        <LandingCommand />
        <LandingViewerPreview />
      </section>

      <section className="landing-v2-band" aria-label="Anlyx workflow summary">
        <LandingStat label="Primary input" value="anlyx.flow.json" />
        <LandingStat label="Local surface" value="localhost:4777" />
        <LandingStat label="Evidence model" value="Observed / source / unknown" />
      </section>

      <section className="landing-v2-section" id="why">
        <div className="landing-v2-section__head">
          <p className="landing-v2-eyebrow">{t.whyEyebrow}</p>
          <h2>{t.whyTitle}</h2>
        </div>
        <div className="landing-v2-features">
          <LandingFeature
            icon={<FileText size={19} />}
            title={t.featureAction}
            body={t.featureActionBody}
          />
          <LandingFeature
            icon={<GitBranch size={19} />}
            title={t.featureBackend}
            body={t.featureBackendBody}
          />
          <LandingFeature
            icon={<ShieldCheck size={19} />}
            title={t.featureUncertainty}
            body={t.featureUncertaintyBody}
          />
        </div>
      </section>

      <section className="landing-v2-section landing-v2-section--split" id="how">
        <div className="landing-v2-section__head">
          <p className="landing-v2-eyebrow">{t.workflowEyebrow}</p>
          <h2>{t.workflowTitle}</h2>
          <p>{t.workflowBody}</p>
          <div className="landing-v2-note">
            <CheckCircle2 size={18} />
            <div>
              <strong>{t.workflowNoteTitle}</strong>
              <span>{t.workflowNoteBody}</span>
            </div>
          </div>
        </div>
        <ol className="landing-v2-steps">
          <li>
            <code>npm install -D anlyx</code>
            <span>{t.stepInstall}</span>
          </li>
          <li>
            <code>npx anlyx validate anlyx.flow.json</code>
            <span>{t.stepInit}</span>
          </li>
          <li>
            <code>npx anlyx import anlyx.flow.json && npx anlyx dev</code>
            <span>{t.stepDev}</span>
          </li>
        </ol>
      </section>

      <section className="landing-v2-cta">
        <div>
          <p className="landing-v2-eyebrow">{t.demoEyebrow}</p>
          <h2>{t.demoTitle}</h2>
          <p>{t.demoBody}</p>
        </div>
        <a className="primary-link" href={routeHref("/demo")}>
          {t.demoButton}
          <ExternalLink size={17} />
        </a>
      </section>
    </main>
  );
}

function LandingCommand(): JSX.Element {
  return (
    <div className="landing-v2-command" aria-label="Anlyx quick start command">
      <div>
        <span />
        <span />
        <span />
      </div>
      <code>npx anlyx import anlyx.flow.json && npx anlyx dev</code>
    </div>
  );
}

function LandingViewerPreview(): JSX.Element {
  return (
    <div className="landing-v2-preview" aria-label="Anlyx viewer preview">
      <div className="landing-v2-preview__top">
        <img alt="" src={logoSrc} />
        <span>localhost:4777</span>
      </div>
      <div className="landing-v2-preview__body">
        <aside>
          <strong>Flows</strong>
          <span>JSON</span>
        </aside>
        <div className="landing-v2-preview__main">
          <div className="landing-v2-preview__summary">
            <span>Flow imported</span>
            <strong>AccountController.deleteSavedBenefit</strong>
            <em>{"DELETE /api/account/saved-benefits/{benefitId}"}</em>
          </div>
          <div className="landing-v2-preview__nodes">
            {["API", "Controller", "Service", "Repository", "Database", "Result"].map((node) => (
              <div key={node}>
                <span />
                <strong>{node}</strong>
                <em>{node === "Result" ? "204 OK" : "source matched"}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingStat({ value, label }: { value: string; label: string }): JSX.Element {
  return (
    <div className="landing-v2-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LandingFeature({
  icon,
  title,
  body
}: {
  icon: JSX.Element;
  title: string;
  body: string;
}): JSX.Element {
  return (
    <article className="landing-v2-feature">
      <div>{icon}</div>
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  );
}

function SiteNav({
  language,
  onToggleLanguage
}: {
  language: Language;
  onToggleLanguage: () => void;
}): JSX.Element {
  const t = landingCopy[language];

  return (
    <header className="site-nav">
      <a className="site-brand" href={routeHref("/")}>
        <img alt="Anlyx" src={logoSrc} />
      </a>
      <div className="site-nav-actions">
        <nav aria-label="Anlyx">
          <a href={routeHref("/")}>{t.navOverview}</a>
          <a href={routeHref("/demo")}>{t.navDemo}</a>
          <a href={routeHref("/docs")}>{t.navDocs}</a>
          <a href="https://github.com/suhannoh/anlyx" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <button
          className="language-toggle"
          type="button"
          onClick={onToggleLanguage}
          aria-label={language === "en" ? "Switch to Korean" : "Switch to English"}
        >
          {t.langToggle}
        </button>
      </div>
    </header>
  );
}

function DocsPage({
  language,
  onToggleLanguage
}: {
  language: Language;
  onToggleLanguage: () => void;
}): JSX.Element {
  const t = landingCopy[language];
  const [copyState, setCopyState] = useState<"quick" | "agent" | "failed" | null>(null);
  const quickCommand =
    "npm install -D anlyx\nnpx anlyx validate anlyx.flow.json\nnpx anlyx import anlyx.flow.json\nnpx anlyx dev";
  const agentPrompt = getAgentPrompts(language)[0]?.prompt ?? "";
  const copyText = async (kind: "quick" | "agent", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(kind);
      window.setTimeout(() => setCopyState((current) => (current === kind ? null : current)), 1600);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState(null), 1600);
    }
  };
  const docsCards = [
    {
      icon: <FileText size={19} />,
      title: t.docsReadmeTitle,
      body: t.docsReadmeBody,
      href: "https://github.com/suhannoh/anlyx#readme"
    },
    {
      icon: <Rocket size={19} />,
      title: t.docsInstallTitle,
      body: t.docsInstallBody,
      href: "https://github.com/suhannoh/anlyx#getting-started"
    },
    {
      icon: <Layers3 size={19} />,
      title: t.docsUsageTitle,
      body: t.docsUsageBody,
      href: "https://github.com/suhannoh/anlyx#usage"
    },
    {
      icon: <ShieldCheck size={19} />,
      title: t.docsSecurityTitle,
      body: t.docsSecurityBody,
      href: "https://github.com/suhannoh/anlyx/blob/main/SECURITY.md"
    },
    {
      icon: <GitBranch size={19} />,
      title: t.docsContributingTitle,
      body: t.docsContributingBody,
      href: "https://github.com/suhannoh/anlyx/blob/main/CONTRIBUTING.md"
    },
    {
      icon: <Scale size={19} />,
      title: t.docsLicenseTitle,
      body: t.docsLicenseBody,
      href: "https://github.com/suhannoh/anlyx/blob/main/LICENSE"
    }
  ];

  return (
    <main className={`site-page site-page--docs site-page--${language}`} lang={language}>
      <SiteNav language={language} onToggleLanguage={onToggleLanguage} />
      <section className="docs-hero">
        <div className="docs-hero__copy">
          <p className="eyebrow">
            <span />
            {t.docsEyebrow}
          </p>
          <h1>{t.docsTitle}</h1>
          <p>{t.docsBody}</p>
          <div className="docs-actions">
            <a className="primary-link" href={routeHref("/demo")}>
              {t.docsOpenDemo}
              <ExternalLink size={17} />
            </a>
            <a
              className="secondary-link"
              href="https://github.com/suhannoh/anlyx"
              target="_blank"
              rel="noreferrer"
            >
              <Code2 size={17} />
              {t.docsGithub}
            </a>
          </div>
        </div>
        <aside className="docs-command-panel" aria-label={t.docsQuickStart}>
          <div className="docs-command-panel__head">
            <strong>{t.docsQuickStart}</strong>
            <button type="button" onClick={() => void copyText("quick", quickCommand)}>
              <Clipboard size={15} />
              {copyState === "quick"
                ? t.docsCopied
                : copyState === "failed"
                  ? t.docsCopyFailed
                  : t.docsCopyCommand}
            </button>
          </div>
          <pre>
            <code>{quickCommand}</code>
          </pre>
          <ol>
            <li>{t.docsPrepublish}</li>
            <li>{t.docsConfigChecklist}</li>
            <li>{t.docsDevOnly}</li>
            <li>
              Open <code>http://localhost:4777</code>
            </li>
          </ol>
        </aside>
      </section>

      <section className="docs-grid" aria-label={t.docsSectionsTitle}>
        {docsCards.map((card) => (
          <a
            className="docs-card"
            href={card.href}
            key={card.title}
            target="_blank"
            rel="noreferrer"
          >
            <div>{card.icon}</div>
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </a>
        ))}
      </section>

      <section className="docs-split">
        <div className="docs-support">
          <article>
            <strong>{t.docsSupportTitle}</strong>
            <p>{t.docsSupportBody}</p>
          </article>
          <article>
            <strong>{t.docsPrinciplesTitle}</strong>
            <p>{t.docsPrinciplesBody}</p>
          </article>
        </div>
        <article className="docs-agent-box">
          <div className="docs-agent-box__head">
            <div>
              <p className="eyebrow">{t.docsPromptTitle}</p>
              <h2>{t.agentNextTitle}</h2>
            </div>
            <button type="button" onClick={() => void copyText("agent", agentPrompt)}>
              <Clipboard size={15} />
              {copyState === "agent"
                ? t.docsCopied
                : copyState === "failed"
                  ? t.docsCopyFailed
                  : t.docsAgentPrompt}
            </button>
          </div>
          <pre>
            <code>{agentPrompt}</code>
          </pre>
        </article>
      </section>
    </main>
  );
}

type AgentPromptId = "next-spring" | "react-manual";

function getAgentPrompts(language: Language): Array<{
  id: AgentPromptId;
  title: string;
  body: string;
  prompt: string;
}> {
  const t = landingCopy[language];

  return [
    {
      id: "next-spring",
      title: t.agentNextTitle,
      body: t.agentNextBody,
      prompt: `You are working inside my local repository. Create a safe Anlyx Flow JSON file and verify it locally.

Goal:
- Produce anlyx.flow.json as the primary Anlyx input.
- Explain how user actions, API requests, backend code paths, external systems, and results connect.
- Clearly separate observed, measured, source-matched, agent-inferred, manual, not-proven, and unknown evidence.
- Do not invent measured timing.
- Do not include secrets, production records, or raw personal data.

Steps:
1. Inspect the repository and identify one meaningful product flow.
2. Write anlyx.flow.json with schemaVersion "0.1.5".
3. Add nodes, edges, evidence, request shape, response shape, and generatedBy metadata.
4. Mark uncertain relationships as agent-inferred, not-proven, or unknown instead of overclaiming.
5. Install Anlyx if needed: npm install -D anlyx
6. Validate the file: npx anlyx validate anlyx.flow.json
7. Import it: npx anlyx import anlyx.flow.json
8. Start the viewer: npx anlyx dev
9. Open http://localhost:4777 and check Flows, Diagram, Timing, Inspector, and JSON.

Before finishing, report:
- The flow title and entry request.
- Which claims are observed, measured, source-matched, agent-inferred, manual, not-proven, or unknown.
- Any invalid schema or evidence issue found by validate.
- What remains uncertain.`
    },
    {
      id: "react-manual",
      title: t.agentReactTitle,
      body: t.agentReactBody,
      prompt: `You are working inside my local repository. Convert runtime, scanner, OpenAPI, or manual findings into Anlyx Flow JSON.

Goal:
- Treat any runtime capture, legacy scanner output, OpenAPI data, or manual notes as producer data only.
- Normalize the result into anlyx.flow.json.
- Keep runtime observations, source matches, and inferred links visually distinct.
- Preserve unknown and not-proven states.
- Do not enable production tracing.

Steps:
1. Collect only local, non-secret evidence.
2. Create anlyx.flow.json with schemaVersion "0.1.5".
3. Use source-matched only when file, symbol, line, or schema evidence exists.
4. Use measured timing only when runtime or telemetry timing evidence exists.
5. Run npx anlyx validate anlyx.flow.json.
6. Run npx anlyx import anlyx.flow.json.
7. Run npx anlyx dev and open http://localhost:4777.
8. Verify the JSON Reader still shows the original imported structure clearly.

Before finishing, report:
- The producer source used.
- What was preserved as observed or measured.
- What was downgraded to source-matched, agent-inferred, not-proven, or unknown.
- Any redactions made for safety.`
    }
  ];
}

function getRoute(): "landing" | "demo" | "docs" {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  if (pathname.endsWith("/demo")) {
    return "demo";
  }
  return pathname.endsWith("/docs") ? "docs" : "landing";
}

function routeHref(path: "/" | "/demo" | "/docs"): string {
  const base = getSiteBase();
  if (path === "/") {
    return `${base || "/"}`;
  }
  return `${base}${path}`;
}

function getSiteBase(): string {
  const pathname = window.location.pathname;
  if (pathname === "/anlyx" || pathname.startsWith("/anlyx/")) {
    return "/anlyx";
  }

  return "";
}
