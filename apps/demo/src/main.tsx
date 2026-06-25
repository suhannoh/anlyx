import "./demo-page.css";

import { DemoWorkspacePage } from "./LiveWorkspace";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clipboard,
  Code2,
  ExternalLink,
  GitBranch,
  Globe2,
  Layers3,
  MousePointerClick,
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
    navAgent: "Agent prompt",
    langToggle: "한글",
    heroEyebrow: "Live workspace for local apps",
    heroTitle: "Use your app normally. Watch the backend flow live.",
    heroBody:
      "Open your local app on one screen and Anlyx Workspace on another. Browser-observed requests stream into a source-backed API, Controller, Service, Repository, and Database flow.",
    heroPrimary: "Try the live demo",
    heroSecondary: "View GitHub",
    installLabel: "Install locally",
    previewCaptured: "Workspace listening",
    previewTitle: "Selected request",
    previewBody:
      "A real browser or server request is selected, then Summary, Timing, and Diagram explain what Anlyx observed and what came from source evidence.",
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
    stepInstall: "Add the local development tool to the project.",
    stepInit: "Create a config for Spring Boot and Next.js App Router sources.",
    stepDev: "Start the Anlyx runtime and keep using the real frontend.",
    workflowNoteTitle: "Separate live workspace",
    workflowNoteBody:
      "Your app keeps its own UI. Anlyx uses browser capture and streams meaningful requests into the separate Workspace.",
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
    demoButton: "Open demo"
  },
  ko: {
    navOverview: "소개",
    navDemo: "시연",
    navAgent: "Agent 프롬프트",
    langToggle: "EN",
    heroEyebrow: "로컬 앱을 위한 라이브 워크스페이스",
    heroTitle: "앱은 그대로 쓰고, 백엔드 흐름은 Workspace에서 봅니다.",
    heroBody:
      "한쪽에는 실제 로컬 앱을 열고, 다른 쪽에는 Anlyx Workspace를 열어두세요. 브라우저에서 관찰한 요청이 API, Controller, Service, Repository, Database 흐름으로 실시간 연결됩니다.",
    heroPrimary: "시연 보기",
    heroSecondary: "GitHub 보기",
    installLabel: "로컬 설치",
    previewCaptured: "Workspace 수신 중",
    previewTitle: "선택된 요청",
    previewBody:
      "실제 브라우저 또는 서버 요청을 선택하면 Summary, Timing, Diagram에서 관측된 데이터와 소스 근거를 구분해 보여줍니다.",
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
    stepInstall: "프로젝트에 로컬 개발 도구를 추가합니다.",
    stepInit: "Spring Boot와 Next.js App Router 소스 위치를 설정합니다.",
    stepDev: "Anlyx 런타임을 켜고 실제 프론트 앱을 그대로 사용합니다.",
    workflowNoteTitle: "별도 라이브 Workspace로 봅니다",
    workflowNoteBody:
      "앱 UI는 그대로 유지됩니다. Anlyx는 브라우저 요청을 캡처해서 별도 Workspace로 의미 있는 흐름만 보냅니다.",
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
    demoButton: "시연 열기"
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
  const [copiedPrompt, setCopiedPrompt] = useState<AgentPromptId | null>(null);
  const agentPrompts = getAgentPrompts(language);
  const copyAgentPrompt = async (id: AgentPromptId, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(id);
      window.setTimeout(
        () => setCopiedPrompt((current) => (current === id ? null : current)),
        1600
      );
    } catch {
      setCopiedPrompt(null);
    }
  };

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
            <a className="hero-text-link" href="https://github.com/suhannoh/anlyx">
              <Code2 size={17} />
              {t.heroSecondary}
            </a>
          </div>
          <div className="install-strip" aria-label="Install command">
            <span>{t.installLabel}</span>
            <code>npm i -D anlyx</code>
            <code>npx anlyx dev</code>
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
              </div>
              <span className="preview-request-line" aria-hidden="true" />
              <div className="preview-capture-badge">
                <span />
                Anlyx capturing · Open workspace
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
            <code>npm i -D anlyx</code>
            <span>{t.stepInstall}</span>
          </li>
          <li>
            <code>npx anlyx init</code>
            <span>{t.stepInit}</span>
          </li>
          <li>
            <code>npx anlyx dev</code>
            <span>{t.stepDev}</span>
          </li>
        </ol>
      </section>

      <section className="agent-section" id="agent">
        <div className="section-heading">
          <p className="eyebrow">{t.agentEyebrow}</p>
          <h2>{t.agentTitle}</h2>
          <p>{t.agentBody}</p>
        </div>
        <div className="agent-prompt-grid">
          {agentPrompts.map((prompt) => (
            <article className="agent-prompt-card" key={prompt.id}>
              <div className="agent-prompt-card__head">
                <div>
                  <strong>{prompt.title}</strong>
                  <span>{prompt.body}</span>
                </div>
                <button
                  type="button"
                  onClick={() => void copyAgentPrompt(prompt.id, prompt.prompt)}
                  aria-label={`${t.copyPrompt}: ${prompt.title}`}
                >
                  <Clipboard size={15} />
                  {copiedPrompt === prompt.id ? t.copiedPrompt : t.copyPrompt}
                </button>
              </div>
              <pre>
                <code>{prompt.prompt}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>

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
          <a href="#agent">{t.navAgent}</a>
          <a href="https://github.com/suhannoh/anlyx">GitHub</a>
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
    label: "Source",
    value: "Browser or Next server observed",
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
    label: "Service",
    value: "Service / Repository / JDBC spans",
    badge: "runtime",
    tone: "emerald"
  },
  {
    step: "05",
    label: "Evidence",
    value: "Observed, source matched, not proven",
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

function getRoute(): "landing" | "demo" {
  const pathname = window.location.pathname.replace(/\/+$/, "");
  return pathname.endsWith("/demo") ? "demo" : "landing";
}

function routeHref(path: "/" | "/demo"): string {
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

  const basePath = new URL(document.baseURI).pathname.replace(/\/+$/, "");
  return basePath === "/" ? "" : basePath;
}
