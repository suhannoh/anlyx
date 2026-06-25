import "./demo-page.css";

import { DemoWorkspacePage } from "./LiveWorkspace";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Clipboard,
  Code2,
  ExternalLink,
  FileText,
  GitBranch,
  Globe2,
  Layers3,
  MousePointerClick,
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
    heroEyebrow: "Live workspace for local apps",
    heroTitle: "See the backend path behind each frontend click.",
    heroBody:
      "Anlyx captures local browser and server requests, then maps them to API, Controller, Service, Repository, and DB evidence without leaving your machine.",
    heroPrimary: "Try 30-sec live demo",
    heroSecondary: "Read quick start",
    previewCaptured: "Workspace listening",
    previewTitle: "Click to code path",
    previewBody:
      "A product action becomes a selected request, then Anlyx shows which backend evidence matched it.",
    previewButton: "Inspect flow",
    proofPage: "Request source",
    proofApi: "API mapping",
    proofFlow: "Backend path",
    proofEvidence: "Evidence labels",
    whyEyebrow: "Why it exists",
    whyTitle: "Swagger tells you what exists. Anlyx shows what this click used.",
    featureAction: "Start from user action",
    featureActionBody:
      "Anlyx keeps the user's click as the primary context, so background probes do not steal the main flow.",
    featureBackend: "Map scanned backend paths",
    featureBackendBody:
      "Spring Controller, Service, Repository, and database evidence are shown as a readable graph.",
    featureUncertainty: "Show uncertainty",
    featureUncertaintyBody:
      "Unknown, pending, failed, and inferred states stay visible instead of becoming fake certainty.",
    workflowEyebrow: "How it runs",
    workflowTitle: "Install Anlyx into your project, then keep using the app you already know.",
    workflowBody:
      "The site stays yours. Anlyx runs beside it, captures browser, Next server, and optional backend spans, then connects them to scanned source evidence.",
    stepInstall: "Install repository dependencies with the pinned workspace toolchain.",
    stepInit: "Build the CLI, UI, and demo packages before local validation.",
    stepDev: "Create the local package artifact used for v0.1 installation checks.",
    workflowNoteTitle: "Separate live workspace",
    workflowNoteBody:
      "Your app keeps its own UI. Anlyx uses browser capture and streams meaningful requests into the separate Workspace.",
    techEyebrow: "Tech and architecture",
    techTitle: "A local-first request map for Next.js, Spring Boot, and browser apps.",
    techBody:
      "Anlyx keeps source scanning, runtime capture, and the Live Workspace on your machine. The first deep-support path is Next.js App Router plus Spring Boot, with browser capture available for React/manual apps.",
    techStackTitle: "Stack",
    techFlowTitle: "Request flow",
    techStackCli: "TypeScript CLI",
    techStackNext: "Next.js App Router bridge",
    techStackSpring: "Spring Boot source scanner",
    techStackWorkspace: "React Live Workspace",
    techStackFlow: "React Flow diagrams",
    techStackLocal: "Local SSE runtime",
    techFlowBrowser: "Browser or Next server request",
    techFlowAnalyzer: "Local Anlyx runtime",
    techFlowEvidence: "Source and backend evidence",
    techFlowWorkspace: "Summary, Timing, Diagram",
    communityEyebrow: "Open-source ready",
    communityTitle: "Built for fast adoption and careful contribution.",
    communityBody:
      "The repository includes the core docs a new user expects: README, getting started, usage guide, security notes, contribution rules, and MIT license.",
    communityDocs: "Docs first",
    communityDocsBody:
      "Quick start, usage, evidence labels, security, and AI setup prompts live in one docs page.",
    communityContribute: "Contribution path",
    communityContributeBody:
      "Issues and pull requests should preserve evidence semantics and avoid treating source-derived rows as runtime traces.",
    communityLicense: "MIT licensed",
    communityLicenseBody:
      "The license is explicit so developers can evaluate usage, redistribution, and contribution boundaries.",
    agentEyebrow: "For AI agents",
    agentTitle: "Give your coding agent a copy-ready setup prompt.",
    agentBody:
      "Paste one of these prompts into Codex, Claude Code, Cursor, or another coding agent. It tells the agent to install Anlyx, keep the app local, and verify observed data separately from source-matched evidence.",
    agentNextTitle: "Next.js + Spring Boot",
    agentNextBody: "Best for the v0.1 deep-support path.",
    agentReactTitle: "React or manual frontend",
    agentReactBody: "Use when the frontend is not Next.js App Router yet.",
    copyPrompt: "Copy prompt",
    copiedPrompt: "Copied",
    demoEyebrow: "Interactive walkthrough",
    demoTitle: "Open a small product site and watch Anlyx Workspace update from real requests.",
    demoBody:
      "Search, open detail, save a perk, redeem, or try an admin sync. Each action sends a real request that appears in Recent events, Summary, Timing, Diagram, and the inspector.",
    demoButton: "Open demo",
    docsEyebrow: "Open-source docs",
    docsTitle: "Install Anlyx, verify it locally, and understand every evidence label.",
    docsBody:
      "This page collects the docs a new user or contributor needs first: overview, setup, usage, security, contribution rules, and license.",
    docsQuickStart: "Quick start",
    docsCopyCommand: "Copy command",
    docsCopied: "Copied",
    docsCopyFailed: "Copy failed",
    docsPrepublish:
      "Pre-publish note: npm release is paused during v0.1 validation. Use the repository workflow first; npm install is the intended post-release path.",
    docsDevOnly:
      "Local development only. Do not ship /_anlyx/capture.js, the Next server bridge, or the Spring dev bridge to production.",
    docsConfigChecklist:
      "Before dev, check backend.sourceDir, frontend.sourceDir, frontend.baseUrl, and dev.command.",
    docsAgentPrompt: "Copy AI setup prompt",
    docsOpenDemo: "Open live demo",
    docsGithub: "GitHub repository",
    docsReadmeTitle: "README overview",
    docsReadmeBody:
      "Anlyx is a local developer tool that maps real browser and Next.js server requests to scanned backend evidence in a separate Live Workspace.",
    docsInstallTitle: "Getting started",
    docsInstallBody:
      "Use Node 22+, initialize config, review the required paths, run scan, then open the local workspace beside your app.",
    docsUsageTitle: "Usage guide",
    docsUsageBody:
      "Open Summary for the readable path, Timing for observed spans, and Diagram for the layered request flow. Labels distinguish observed, source matched, and not proven rows.",
    docsSecurityTitle: "Security and privacy",
    docsSecurityBody:
      "Anlyx scans local source and captures request paths, status, duration, and optional action/page context into local artifacts. Do not expose port 4777 or deploy dev bridges.",
    docsContributingTitle: "Contributing",
    docsContributingBody:
      "Keep changes scoped, run tests before PRs, preserve evidence semantics, and avoid claiming source-derived rows are runtime traces.",
    docsLicenseTitle: "License",
    docsLicenseBody:
      "Anlyx is distributed under the MIT License. Check package metadata and LICENSE before redistribution.",
    docsSupportTitle: "Framework support",
    docsSupportBody:
      "Deep Support is Next.js App Router + Spring Boot. OpenAPI is Basic Support only; React/manual capture records browser requests without React Router deep support.",
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
    heroEyebrow: "로컬 앱을 위한 라이브 워크스페이스",
    heroTitle: "프론트 클릭이 실제로 탄 백엔드 경로를 보여줍니다.",
    heroBody:
      "Anlyx는 로컬 브라우저와 서버 요청을 캡처하고 API, Controller, Service, Repository, DB 근거와 연결합니다. 코드는 내 머신 밖으로 나가지 않습니다.",
    heroPrimary: "30초 시연 보기",
    heroSecondary: "빠른 시작 읽기",
    previewCaptured: "Workspace 수신 중",
    previewTitle: "클릭에서 코드 경로까지",
    previewBody:
      "제품 액션이 선택된 요청이 되고, Anlyx는 어떤 백엔드 근거가 매칭됐는지 보여줍니다.",
    previewButton: "흐름 확인",
    proofPage: "요청 출처",
    proofApi: "API 매핑",
    proofFlow: "백엔드 경로",
    proofEvidence: "근거 라벨",
    whyEyebrow: "왜 필요한가",
    whyTitle: "Swagger가 API 목록을 보여준다면, Anlyx는 이 클릭이 사용한 흐름을 보여줍니다.",
    featureAction: "사용자 액션에서 시작",
    featureActionBody:
      "Anlyx는 사용자의 클릭을 중심 맥락으로 유지해서, 백그라운드 요청이 메인 플로우를 빼앗지 않게 합니다.",
    featureBackend: "스캔된 백엔드 경로 연결",
    featureBackendBody:
      "Spring Controller, Service, Repository, Database 근거를 읽기 쉬운 그래프로 보여줍니다.",
    featureUncertainty: "불확실성 표시",
    featureUncertaintyBody:
      "unknown, pending, failed, inferred 상태를 숨기지 않고 그대로 보여줍니다.",
    workflowEyebrow: "실행 방식",
    workflowTitle: "프로젝트에 Anlyx를 설치하고, 이미 쓰던 앱을 그대로 사용하세요.",
    workflowBody:
      "앱은 기존 방식대로 렌더링됩니다. Anlyx는 옆에서 브라우저, Next 서버, 선택적 백엔드 span을 관찰하고, 스캔한 소스 근거와 연결합니다.",
    stepInstall: "저장소 의존성을 고정된 workspace 도구 체인으로 설치합니다.",
    stepInit: "로컬 검증 전에 CLI, UI, demo 패키지를 빌드합니다.",
    stepDev: "v0.1 설치 검증에 사용할 로컬 패키지 artifact를 만듭니다.",
    workflowNoteTitle: "별도 라이브 Workspace로 봅니다",
    workflowNoteBody:
      "앱 UI는 그대로 유지됩니다. Anlyx는 브라우저 요청을 캡처해서 별도 Workspace로 의미 있는 흐름만 보냅니다.",
    techEyebrow: "기술과 구조",
    techTitle: "Next.js, Spring Boot, 브라우저 앱을 위한 로컬 우선 요청 지도입니다.",
    techBody:
      "Anlyx는 소스 스캔, 런타임 캡처, Live Workspace를 모두 로컬에서 실행합니다. 첫 deep-support 경로는 Next.js App Router와 Spring Boot이고, React/manual 앱은 브라우저 캡처부터 사용할 수 있습니다.",
    techStackTitle: "기술 스택",
    techFlowTitle: "요청 흐름",
    techStackCli: "TypeScript CLI",
    techStackNext: "Next.js App Router 브리지",
    techStackSpring: "Spring Boot 소스 스캐너",
    techStackWorkspace: "React Live Workspace",
    techStackFlow: "React Flow 다이어그램",
    techStackLocal: "로컬 SSE 런타임",
    techFlowBrowser: "브라우저 또는 Next 서버 요청",
    techFlowAnalyzer: "로컬 Anlyx 런타임",
    techFlowEvidence: "소스와 백엔드 근거",
    techFlowWorkspace: "Summary, Timing, Diagram",
    communityEyebrow: "오픈소스 준비",
    communityTitle: "빠르게 써보고, 조심스럽게 기여할 수 있게 정리했습니다.",
    communityBody:
      "저장소에는 새 사용자가 기대하는 핵심 문서가 포함됩니다. README, 시작 가이드, 사용법, 보안 안내, 기여 규칙, MIT 라이선스를 확인할 수 있습니다.",
    communityDocs: "문서 우선",
    communityDocsBody:
      "빠른 시작, 사용법, 근거 라벨, 보안, AI 세팅 프롬프트를 한 문서 페이지에 모았습니다.",
    communityContribute: "기여 경로",
    communityContributeBody:
      "이슈와 PR은 근거 표현 원칙을 지키고, source-derived row를 runtime trace처럼 표현하지 않아야 합니다.",
    communityLicense: "MIT 라이선스",
    communityLicenseBody:
      "라이선스를 명확히 두어 사용, 재배포, 기여 범위를 개발자가 빠르게 판단할 수 있게 했습니다.",
    agentEyebrow: "AI 에이전트용",
    agentTitle: "설치와 세팅을 에이전트에게 바로 맡길 수 있게 준비했습니다.",
    agentBody:
      "Codex, Claude Code, Cursor 같은 코딩 에이전트에 그대로 붙여넣을 수 있는 프롬프트입니다. Anlyx를 설치하고, 앱은 로컬에서 유지하며, 관측 데이터와 소스 매칭 근거를 구분해서 검증하도록 지시합니다.",
    agentNextTitle: "Next.js + Spring Boot",
    agentNextBody: "v0.1 deep support 경로에 가장 적합합니다.",
    agentReactTitle: "React 또는 수동 프론트엔드",
    agentReactBody: "Next.js App Router가 아닌 프론트엔드에서 시작할 때 사용합니다.",
    copyPrompt: "프롬프트 복사",
    copiedPrompt: "복사됨",
    demoEyebrow: "인터랙티브 시연",
    demoTitle: "작은 제품 사이트에서 실제 요청을 보내고 Anlyx Workspace가 갱신되는 걸 확인하세요.",
    demoBody:
      "검색, 상세 보기, 저장, 교환, 관리자 동기화를 눌러보세요. 각 액션이 실제 요청을 만들고 Recent events, Summary, Timing, Diagram, Inspector를 갱신합니다.",
    demoButton: "시연 열기",
    docsEyebrow: "오픈소스 문서",
    docsTitle: "Anlyx 설치, 로컬 검증, 근거 라벨까지 한 번에 파악하세요.",
    docsBody:
      "처음 쓰는 사용자와 기여자가 가장 먼저 필요한 문서를 한곳에 모았습니다. 개요, 시작 방법, 사용법, 보안, 기여 규칙, 라이선스를 빠르게 확인할 수 있습니다.",
    docsQuickStart: "빠른 시작",
    docsCopyCommand: "명령어 복사",
    docsCopied: "복사됨",
    docsCopyFailed: "복사 실패",
    docsPrepublish:
      "배포 전 안내: v0.1 검증 중이라 npm release는 멈춰둔 상태입니다. 지금은 저장소 검증 흐름을 먼저 사용하고, npm install은 첫 배포 이후 경로로 봐주세요.",
    docsDevOnly:
      "로컬 개발 전용입니다. /_anlyx/capture.js, Next server bridge, Spring dev bridge를 production에 배포하지 마세요.",
    docsConfigChecklist:
      "dev 실행 전 backend.sourceDir, frontend.sourceDir, frontend.baseUrl, dev.command를 확인하세요.",
    docsAgentPrompt: "AI 세팅 프롬프트 복사",
    docsOpenDemo: "라이브 시연 열기",
    docsGithub: "GitHub 저장소",
    docsReadmeTitle: "README 개요",
    docsReadmeBody:
      "Anlyx는 실제 브라우저와 Next.js 서버 요청을 스캔된 백엔드 근거와 연결해 별도 Live Workspace에서 보여주는 로컬 개발 도구입니다.",
    docsInstallTitle: "설치 및 시작",
    docsInstallBody:
      "Node 22 이상에서 config를 만들고, 필요한 경로를 확인한 뒤 scan을 실행하고, 기존 앱 옆에 Anlyx Workspace를 띄우면 됩니다.",
    docsUsageTitle: "사용법",
    docsUsageBody:
      "Summary는 읽기 쉬운 경로, Timing은 관측된 시간, Diagram은 레이어형 흐름을 보여줍니다. observed, source matched, not proven 라벨은 분리해서 읽어야 합니다.",
    docsSecurityTitle: "보안과 개인정보",
    docsSecurityBody:
      "Anlyx는 로컬 소스를 스캔하고 request path, status, duration, 선택적 action/page context를 로컬 artifact로 저장합니다. 4777 포트와 dev bridge를 외부에 노출하지 마세요.",
    docsContributingTitle: "기여 방법",
    docsContributingBody:
      "변경 범위를 작게 유지하고, PR 전 테스트를 실행하며, source-derived row를 runtime trace처럼 표현하지 않는 원칙을 지켜주세요.",
    docsLicenseTitle: "라이선스",
    docsLicenseBody:
      "Anlyx는 MIT License로 배포됩니다. 재배포 전 패키지 메타데이터와 LICENSE를 확인하세요.",
    docsSupportTitle: "지원 프레임워크",
    docsSupportBody:
      "Deep Support는 Next.js App Router + Spring Boot입니다. OpenAPI는 Basic Support이고, React/manual capture는 브라우저 요청만 기록하며 React Router deep support는 v0.1 범위가 아닙니다.",
    docsPrinciplesTitle: "근거 표현 원칙",
    docsPrinciplesBody:
      "관측 데이터, 소스 기반 근거, 추론된 분기, not-proven 경로는 UI에서 명확하게 구분되어야 합니다.",
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
    <main className={`site-page site-page--${language}`} lang={language}>
      <SiteNav language={language} onToggleLanguage={onToggleLanguage} />
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            {t.heroEyebrow}
          </p>
          <h1>{t.heroTitle}</h1>
          <p className="hero-lede">{t.heroBody}</p>
          <div className="hero-actions">
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

        <div className="hero-product" aria-label="Anlyx product preview">
          <div className="preview-browser">
            <div className="preview-browser__bar">
              <span />
              <span />
              <span />
              <strong>localhost:3000/benefits</strong>
            </div>
            <div className="preview-app">
              <div className="preview-app__content">
                <div className="preview-stat">
                  <BadgeCheck size={18} />
                  <span>{t.previewCaptured}</span>
                </div>
                <h2>{t.previewTitle}</h2>
                <p>{t.previewBody}</p>
                <button type="button">
                  {t.previewButton}
                  <MousePointerClick size={16} />
                </button>
                <div className="preview-capture-badge">
                  <span />
                  Anlyx capturing · Open workspace
                </div>
              </div>
              <div className="preview-workspace">
                <div className="preview-workspace__head">
                  <img alt="" src={logoSrc} />
                  <div>
                    <strong>Anlyx Workspace</strong>
                    <span>GET /api/public/benefits/43</span>
                  </div>
                </div>
                <HeroFlowPreview />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-grid" id="why">
        <div className="section-heading">
          <p className="eyebrow">{t.whyEyebrow}</p>
          <h2>{t.whyTitle}</h2>
        </div>
        <div className="feature-grid">
          <FeatureCard
            icon={<MousePointerClick />}
            title={t.featureAction}
            body={t.featureActionBody}
            variant="action"
          />
          <FeatureCard
            icon={<Layers3 />}
            title={t.featureBackend}
            body={t.featureBackendBody}
            variant="flow"
          />
          <FeatureCard
            icon={<ShieldCheck />}
            title={t.featureUncertainty}
            body={t.featureUncertaintyBody}
            variant="confidence"
          />
        </div>
      </section>

      <section className="proof-band" aria-label="What Anlyx connects">
        <ProofItem icon={<Globe2 size={18} />} label={t.proofPage} value="Browser / Server" />
        <ProofItem icon={<Code2 size={18} />} label={t.proofApi} value="GET /api/..." />
        <ProofItem icon={<GitBranch size={18} />} label={t.proofFlow} value="Controller to DB" />
        <ProofItem
          icon={<Activity size={18} />}
          label={t.proofEvidence}
          value="Observed vs source"
        />
      </section>

      <section className="how-section" id="how">
        <div className="workflow-copy">
          <p className="eyebrow">{t.workflowEyebrow}</p>
          <h2>{t.workflowTitle}</h2>
          <p>{t.workflowBody}</p>
          <div className="workflow-note">
            <CheckCircle2 size={18} />
            <div>
              <strong>{t.workflowNoteTitle}</strong>
              <span>{t.workflowNoteBody}</span>
            </div>
          </div>
        </div>
        <ol className="steps">
          <li>
            <code>corepack pnpm install</code>
            <span>{t.stepInstall}</span>
          </li>
          <li>
            <code>corepack pnpm build</code>
            <span>{t.stepInit}</span>
          </li>
          <li>
            <code>corepack pnpm pack:local</code>
            <span>{t.stepDev}</span>
          </li>
        </ol>
      </section>

      <TechArchitectureSection t={t} />
      <OpenSourceSection t={t} />

      <section className="demo-cta">
        <div>
          <p className="eyebrow">{t.demoEyebrow}</p>
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
  const quickCommand = "corepack pnpm install\ncorepack pnpm build\ncorepack pnpm pack:local";
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
              Open <code>http://localhost:4777/_anlyx/viewer</code>
            </li>
          </ol>
        </aside>
      </section>

      <section className="docs-grid" aria-label={t.docsSectionsTitle}>
        {docsCards.map((card) => (
          <a className="docs-card" href={card.href} key={card.title} target="_blank" rel="noreferrer">
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
      prompt: `You are working inside my local web app repository. Install and configure Anlyx for local development.

Goal:
- Use Anlyx as a separate full-page Live Workspace, not as an overlay, modal, or drawer.
- Keep my app running on its normal localhost port.
- Configure Anlyx for a Next.js App Router frontend and Spring Boot backend when those folders exist.
- Clearly separate Browser observed, Next server observed, Backend observed, Source matched, and Not proven evidence.
- Do not add production tracing or send source code outside my machine.

Steps:
1. Install Anlyx as a dev dependency: npm install -D anlyx
2. Initialize config: npx anlyx init
3. Inspect this repo and update anlyx.config.ts with:
   - projectName
   - frontend.type = "next"
   - frontend.sourceDir and frontend.baseUrl
   - backend.type = "spring"
   - backend.sourceDir
   - server.port = 4777
   - dev.command for my local app
4. Run Anlyx locally: npx anlyx dev
5. Open my app and http://localhost:4777/_anlyx/viewer side by side.
6. Trigger real app actions and verify Summary, Timing, and Diagram use observed runtime data where available and mark source-only rows as Source matched or Not proven.

Before finishing, report:
- The exact config you created.
- Which requests were Browser observed, Next server observed, Backend observed, Source matched, or Not proven.
- Any route or backend layer Anlyx could not prove at runtime.`
    },
    {
      id: "react-manual",
      title: t.agentReactTitle,
      body: t.agentReactBody,
      prompt: `You are working inside my local web app repository. Add Anlyx for local request-flow inspection with the smallest safe setup.

Goal:
- Keep the app UI unchanged and use the separate Anlyx Live Workspace at http://localhost:4777/_anlyx/viewer.
- If this is not a Next.js App Router project, use Anlyx manual frontend capture and source/backend evidence where supported.
- Capture real browser fetch/XHR requests from local development.
- Do not claim source-derived rows are runtime traces.
- Do not enable Anlyx in production.

Steps:
1. Install Anlyx as a dev dependency: npm install -D anlyx
2. Initialize config: npx anlyx init
3. Inspect the repo and configure anlyx.config.ts with the correct projectName, app baseUrl, server.port = 4777, and any Spring/OpenAPI backend source available.
4. Start my app normally.
5. Run Anlyx: npx anlyx dev
6. If automatic injection is not available, add this development-only fallback script to the local app shell:
   <script src="http://localhost:4777/_anlyx/capture.js" defer></script>
7. Open http://localhost:4777/_anlyx/viewer, use the real app, and verify requests appear in Recent requests with correct evidence labels.

Before finishing, report:
- What Anlyx could observe directly.
- What was only source-matched.
- What remains not proven or unsupported for this framework.`
    }
  ];
}

const heroFlowRows = [
  {
    step: "01",
    label: "Click",
    value: "Open product detail",
    badge: "observed",
    tone: "blue"
  },
  {
    step: "02",
    label: "API",
    value: "GET /api/public/benefits/43",
    badge: "200 OK",
    tone: "blue"
  },
  {
    step: "03",
    label: "Controller",
    value: "PublicViewController.benefit()",
    badge: "matched",
    tone: "violet"
  },
  {
    step: "04",
    label: "Backend",
    value: "Service / Repository evidence",
    badge: "source",
    tone: "emerald"
  },
  {
    step: "05",
    label: "Evidence",
    value: "Observed vs source matched",
    badge: "clear",
    tone: "emerald"
  }
] as const;

function HeroFlowPreview(): JSX.Element {
  return (
    <div className="hero-flow-preview" aria-hidden="true">
      {heroFlowRows.map((item) => (
        <div className={`hero-flow-row hero-flow-row--${item.tone}`} key={item.step}>
          <span className="hero-flow-row__step">{item.step}</span>
          <div>
            <strong>{item.label}</strong>
            <code>{item.value}</code>
          </div>
          <span className="hero-flow-row__badge">{item.badge}</span>
        </div>
      ))}
    </div>
  );
}

function ProofItem({
  icon,
  label,
  value
}: {
  icon: JSX.Element;
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="proof-item">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  variant
}: {
  icon: JSX.Element;
  title: string;
  body: string;
  variant: "action" | "flow" | "confidence";
}): JSX.Element {
  return (
    <article className="feature-card">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      <FeatureMini variant={variant} />
    </article>
  );
}

function FeatureMini({ variant }: { variant: "action" | "flow" | "confidence" }): JSX.Element {
  if (variant === "action") {
    return (
      <div className="feature-mini feature-mini--action" aria-hidden="true">
        <span className="feature-mini__cursor">
          <MousePointerClick size={14} />
          click
        </span>
        <span>GET /benefits/123</span>
      </div>
    );
  }

  if (variant === "flow") {
    return (
      <div className="feature-mini feature-mini--flow" aria-hidden="true">
        {["Page", "API", "Controller", "DB"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    );
  }

  return (
    <div className="feature-mini feature-mini--confidence" aria-hidden="true">
      <span>matched</span>
      <span>inferred</span>
      <span>unknown</span>
    </div>
  );
}

function TechArchitectureSection({ t }: { t: Record<string, string> }): JSX.Element {
  const stack = [
    t.techStackCli,
    t.techStackNext,
    t.techStackSpring,
    t.techStackWorkspace,
    t.techStackFlow,
    t.techStackLocal
  ];
  const flow = [
    t.techFlowBrowser,
    t.techFlowAnalyzer,
    t.techFlowEvidence,
    t.techFlowWorkspace
  ];

  return (
    <section className="tech-section" id="architecture">
      <div className="section-heading">
        <p className="eyebrow">{t.techEyebrow}</p>
        <h2>{t.techTitle}</h2>
        <p>{t.techBody}</p>
      </div>
      <div className="tech-panels">
        <article className="tech-panel">
          <div className="tech-panel__head">
            <Code2 size={18} />
            <strong>{t.techStackTitle}</strong>
          </div>
          <div className="tech-stack-list">
            {stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
        <article className="tech-panel tech-panel--flow">
          <div className="tech-panel__head">
            <GitBranch size={18} />
            <strong>{t.techFlowTitle}</strong>
          </div>
          <div className="architecture-flow">
            {flow.map((item, index) => (
              <div className="architecture-step" key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function OpenSourceSection({ t }: { t: Record<string, string> }): JSX.Element {
  const items = [
    {
      icon: <BookOpen size={18} />,
      title: t.communityDocs,
      body: t.communityDocsBody,
      href: routeHref("/docs")
    },
    {
      icon: <GitBranch size={18} />,
      title: t.communityContribute,
      body: t.communityContributeBody,
      href: "https://github.com/suhannoh/anlyx/blob/main/CONTRIBUTING.md"
    },
    {
      icon: <Scale size={18} />,
      title: t.communityLicense,
      body: t.communityLicenseBody,
      href: "https://github.com/suhannoh/anlyx/blob/main/LICENSE"
    }
  ];

  return (
    <section className="oss-section" id="community">
      <div className="section-heading">
        <p className="eyebrow">{t.communityEyebrow}</p>
        <h2>{t.communityTitle}</h2>
        <p>{t.communityBody}</p>
      </div>
      <div className="oss-grid">
        {items.map((item) => {
          const isExternal = item.href.startsWith("https://");
          return (
            <a
              className="oss-card"
              href={item.href}
              key={item.title}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noreferrer" : undefined}
            >
              <div>{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </a>
          );
        })}
      </div>
    </section>
  );
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
