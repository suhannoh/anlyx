import "./demo-page.css";

import { ProjectWorkspaceDemo } from "./ProjectWorkspaceDemo";
import {
  ArrowRight,
  BookOpen,
  Clipboard,
  Code2,
  ExternalLink,
  FileText,
  GitBranch,
  Layers3,
  RefreshCw,
  Rocket,
  Scale,
  ShieldCheck
} from "lucide-react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type Language = "en" | "ko";
type SiteRoute = "landing" | "demo" | "docs";

const landingCopy = {
  en: {
    navOverview: "Overview",
    navDemo: "Demo",
    navDocs: "Docs",
    langToggle: "KO",
    heroEyebrow: "Project JSON workspace",
    heroTitle: "Turn AI codebase analysis into something you can review.",
    heroBody:
      "Anlyx takes an AI agent-authored project model and shows the pages, API requests, architecture paths, and evidence a human can inspect before trusting the explanation.",
    heroPrimary: "Open live workspace demo",
    heroSecondary: "Read docs",
    previewCaptured: "Project JSON loaded",
    previewTitle: "Project facts to readable views",
    previewBody:
      "A selected project file becomes page understanding, architecture mapping, capability verification, and raw JSON inspection.",
    previewButton: "Inspect workspace",
    proofPage: "Pages",
    proofApi: "Requests",
    proofFlow: "Architecture map",
    proofEvidence: "Evidence labels",
    whyEyebrow: "Why it exists",
    whyTitle: "AI can describe a codebase. Anlyx makes that description reviewable.",
    featureAction: "AI explanations are hard to verify",
    featureActionBody:
      "A long answer from an agent is useful, but it is hard to see which claims came from source, which were inferred, and what is still unknown.",
    featureBackend: "Anlyx structures the claims",
    featureBackendBody:
      "The agent writes Project JSON: pages, requests, flows, architecture nodes, evidence, and uncertainty in one inspectable model.",
    featureUncertainty: "The viewer keeps humans in the loop",
    featureUncertaintyBody:
      "Pages, Map, Overview, Capabilities, and JSON help you check what the app does, how it connects, and why Anlyx believes it.",
    trustEyebrow: "Trust model",
    trustTitle: "Built for local review, not black-box confidence.",
    trustLocalTitle: "Local-first",
    trustLocalBody: "Project snapshots stay on your machine, and the normal viewer runs on localhost:4777.",
    trustEvidenceTitle: "Evidence-aware",
    trustEvidenceBody:
      "Source-matched, observed, measured, agent-inferred, not-proven, and unknown states remain separate.",
    trustSecurityTitle: "No secret ingestion",
    trustSecurityBody:
      "Anlyx expects safe Project JSON. Secrets, production records, and raw personal data should stay out.",
    workflowEyebrow: "How it runs",
    workflowTitle: "Validate Project JSON, import it, then open the local viewer.",
    workflowBody:
      "The primary product path is AI Agent-authored Project JSON. Anlyx validates, imports, and opens that file in the local 4777 viewer.",
    stepInstall: "Install Anlyx in the project where the agent will author Project JSON.",
    stepInit: "Validate schema, page/request/flow links, architecture edges, and evidence references.",
    stepDev: "Import the project file and start the 4777 viewer.",
    workflowNoteTitle: "Current viewer surfaces",
    workflowNoteBody:
      "The 4777 viewer centers Pages and Map, with Overview, Capabilities, and JSON as supporting surfaces.",
    techEyebrow: "Tech and architecture",
    techTitle: "A local-first viewer for evidence-aware Project JSON.",
    techBody:
      "Anlyx keeps authored project facts and snapshots on your machine. The recommended path is one validated Project JSON model, with framework-specific automation left as an extension.",
    techStackTitle: "Stack",
    techFlowTitle: "Request flow",
    techStackCli: "TypeScript CLI",
    techStackNext: "Project JSON validator",
    techStackSpring: "Snapshot importer",
    techStackWorkspace: "4777 Live Workspace",
    techStackFlow: "Layered architecture map",
    techStackLocal: "JSON Reader",
    techFlowBrowser: "anlyx.project.json",
    techFlowAnalyzer: "Validate and import",
    techFlowEvidence: "Snapshot and report data",
    techFlowWorkspace: "Pages, Map, JSON",
    communityEyebrow: "Open-source ready",
    communityTitle: "Built for fast adoption and careful contribution.",
    communityBody:
      "The repository includes the core docs a new user expects: README, getting started, usage guide, security notes, contribution rules, and MIT license.",
    communityDocs: "Docs first",
    communityDocsBody:
      "Quick start, Project JSON rules, evidence labels, security, and AI setup prompts live in one docs page.",
    communityContribute: "Contribution path",
    communityContributeBody:
      "Issues and pull requests should keep changes focused and preserve the testing and evidence rules.",
    communityLicense: "MIT licensed",
    communityLicenseBody:
      "The license is explicit so developers can evaluate usage, redistribution, and contribution boundaries.",
    agentEyebrow: "For AI agents",
    agentTitle: "Give your coding agent a copy-ready setup prompt.",
    agentBody:
      "Paste one of these prompts into Codex, Claude Code, Cursor, or another coding agent. It tells the agent to write safe Project JSON, validate it, import it, and keep evidence levels separate.",
    agentNextTitle: "Project JSON authoring",
    agentNextBody: "Best for the current v0.3.0 product path.",
    agentReactTitle: "Runtime or legacy producer",
    agentReactBody: "Use only when a tool will produce Project JSON for Anlyx.",
    copyPrompt: "Copy prompt",
    copiedPrompt: "Copied",
    demoEyebrow: "Interactive preview",
    demoTitle: "Preview the Anlyx Workspace.",
    demoBody:
      "A hosted preview of the local Anlyx viewer. Explore Pages, Map, Overview, Capabilities, and JSON with sample Project JSON data.",
    demoCtaTitle: "Explore the workspace with sample project data.",
    demoCtaBody:
      "Open the demo to see how Pages, Map, JSON, and evidence states work together in the Anlyx viewer.",
    demoButton: "Open demo",
    demoGuidePages: "Start with Pages",
    demoGuidePagesBody: "Read what each page does, which request it sends, and what evidence supports it.",
    demoGuideMap: "Switch to Map",
    demoGuideMapBody: "See how project surfaces connect through API, service, schema, and result layers.",
    demoGuideJson: "Check JSON",
    demoGuideJsonBody: "Open the authored Project JSON when you want the source of truth.",
    docsEyebrow: "Agent setup guide",
    docsTitle: "Let your AI coding agent set up Anlyx.",
    docsBody:
      "Paste the setup prompt into Codex, Claude Code, Cursor, or another coding agent to inspect your repository, create Project JSON, validate it, and open the local viewer.",
    docsPromptCardTitle: "AI setup prompt",
    docsPromptCardBody:
      "Paste this into your coding agent. It installs the npm package, uses the public GitHub repo as reference, and starts the local viewer.",
    docsPromptStepInstall: "Install npm package: npm install -D anlyx@latest",
    docsPromptStepRepo: "Review the GitHub docs",
    docsPromptStepAnalyze: "Analyze repository structure",
    docsPromptStepAuthor: "Author anlyx.project.json",
    docsPromptStepValidate: "Validate schema and links",
    docsPromptStepRun: "Run the local viewer",
    docsPromptStepReport: "Separate confirmed and inferred details",
    docsDirectInstall: "Prefer manual setup? See quick start",
    docsQuickStart: "Quick start",
    docsCopyCommand: "Copy command",
    docsCopied: "Copied",
    docsCopyFailed: "Copy failed",
    docsPrepublish:
      "The recommended flow is to create Project JSON, validate it, and review it in the local viewer.",
    docsDevOnly:
      "Use Anlyx locally. Do not expose port 4777, and keep secrets, production data, and personal data out of Project JSON.",
    docsConfigChecklist:
      "Validation checks that pages, requests, flows, architecture, and evidence references are connected correctly.",
    docsAgentPrompt: "Copy AI setup prompt",
    docsRefreshPrompt: "Copy refresh prompt",
    docsOpenDemo: "Open live demo",
    docsGithub: "GitHub repository",
    docsReadmeTitle: "Getting started",
    docsReadmeBody:
      "Install Anlyx, create Project JSON, validate it, import it, and open the local viewer.",
    docsInstallTitle: "Project JSON schema",
    docsInstallBody:
      "Understand the authored data contract for pages, requests, flows, architecture, evidence, and metadata.",
    docsUsageTitle: "Viewer guide",
    docsUsageBody:
      "Open Pages for page understanding, Map for architecture, Overview and Capabilities for supporting insights, and JSON for authored data.",
    docsSecurityTitle: "Evidence labels",
    docsSecurityBody:
      "Learn how source-matched, observed, measured, inferred, not-proven, and unknown evidence should be read.",
    docsContributingTitle: "Contributing",
    docsContributingBody:
      "Keep changes scoped and follow the testing and evidence-labeling rules before opening a PR.",
    docsLicenseTitle: "Security & privacy",
    docsLicenseBody:
      "Review how to keep secrets, production data, and personal data out of Project JSON.",
    docsSectionsTitle: "Docs to read",
    docsCommandsTitle: "Commands",
    docsPromptTitle: "Agent-ready setup prompt",
    docsPromptIntro:
      "The full prompt stays collapsed until you need to inspect or edit it.",
    docsShowPrompt: "Show prompt",
    docsHidePrompt: "Hide prompt"
  },
  ko: {
    navOverview: "소개",
    navDemo: "시연",
    navDocs: "문서",
    langToggle: "EN",
    heroEyebrow: "Project JSON 워크스페이스",
    heroTitle: "AI가 분석한 코드베이스를 사람이 검토할 수 있게 만듭니다.",
    heroBody:
      "Anlyx는 AI 에이전트가 정리한 프로젝트 모델을 페이지, API 요청, 아키텍처 흐름, 근거로 나눠 보여줍니다. 설명을 그대로 믿기 전에 사람이 직접 확인할 수 있게 만드는 도구입니다.",
    heroPrimary: "워크스페이스 데모 보기",
    heroSecondary: "문서 보기",
    previewCaptured: "Project JSON 로드 완료",
    previewTitle: "프로젝트 정보를 읽기 쉬운 화면으로",
    previewBody:
      "하나의 프로젝트 파일에서 페이지 설명, 아키텍처 맵, 기능 요약, 원본 JSON 확인 화면까지 이어집니다.",
    previewButton: "워크스페이스 확인",
    proofPage: "Pages",
    proofApi: "API 요청",
    proofFlow: "아키텍처 맵",
    proofEvidence: "근거 라벨",
    whyEyebrow: "왜 필요한가",
    whyTitle:
      "AI는 코드베이스를 설명할 수 있습니다. Anlyx는 그 설명을 검토 가능한 구조로 바꿉니다.",
    featureAction: "AI 설명은 검증하기 어렵습니다",
    featureActionBody:
      "긴 답변만으로는 어떤 내용이 소스에서 확인됐고, 어디가 추정이며, 무엇이 아직 불확실한지 파악하기 어렵습니다.",
    featureBackend: "Anlyx는 설명을 구조화합니다",
    featureBackendBody:
      "AI 에이전트가 Project JSON에 페이지, 요청, 흐름, 아키텍처 노드, 근거, 불확실성을 함께 남깁니다.",
    featureUncertainty: "viewer에서 사람이 확인합니다",
    featureUncertaintyBody:
      "Pages, Map, Overview, Capabilities, JSON을 통해 앱이 무엇을 하고 어떻게 연결되는지 근거와 함께 검토합니다.",
    trustEyebrow: "신뢰 기준",
    trustTitle: "검토 가능한 로컬 도구로 설계했습니다.",
    trustLocalTitle: "로컬 우선",
    trustLocalBody: "프로젝트 snapshot은 내 컴퓨터에 남고, 기본 viewer는 localhost:4777에서 실행됩니다.",
    trustEvidenceTitle: "근거 중심",
    trustEvidenceBody:
      "source-matched, observed, measured, agent-inferred, not-proven, unknown을 섞지 않고 분리해 보여줍니다.",
    trustSecurityTitle: "민감정보 제외",
    trustSecurityBody:
      "Anlyx는 안전한 Project JSON을 전제로 합니다. 비밀값, 운영 데이터, 실제 개인정보는 넣지 않는 것이 원칙입니다.",
    workflowEyebrow: "실행 방식",
    workflowTitle: "Project JSON을 검증하고 로컬 viewer에서 엽니다.",
    workflowBody:
      "Anlyx의 기본 흐름은 AI Agent가 작성한 Project JSON에서 시작합니다. 파일을 검증하고 가져온 다음, 4777 viewer에서 바로 확인합니다.",
    stepInstall: "Project JSON을 만들 프로젝트에 Anlyx를 설치합니다.",
    stepInit: "schema, page/request/flow link, architecture edge, evidence reference가 맞는지 확인합니다.",
    stepDev: "프로젝트 파일을 가져오고 4777 viewer를 시작합니다.",
    workflowNoteTitle: "현재 viewer 구성",
    workflowNoteBody:
      "4777 viewer는 Pages와 Map을 중심으로 보고, Overview, Capabilities, JSON은 보조 화면으로 확인합니다.",
    techEyebrow: "기술과 구조",
    techTitle: "근거가 남는 Project JSON 로컬 viewer입니다.",
    techBody:
      "Anlyx는 프로젝트 정보와 snapshot을 내 컴퓨터에 보관합니다. 특정 프레임워크 분석기에 의존하지 않고, 검증된 Project JSON 하나를 기준으로 화면을 구성합니다.",
    techStackTitle: "기술 스택",
    techFlowTitle: "요청 흐름",
    techStackCli: "TypeScript CLI",
    techStackNext: "Project JSON validator",
    techStackSpring: "Snapshot importer",
    techStackWorkspace: "4777 Live Workspace",
    techStackFlow: "Layered architecture map",
    techStackLocal: "JSON Reader",
    techFlowBrowser: "anlyx.project.json",
    techFlowAnalyzer: "Validate and import",
    techFlowEvidence: "Snapshot and report data",
    techFlowWorkspace: "Pages, Map, JSON",
    communityEyebrow: "오픈소스 준비",
    communityTitle: "바로 써보고, 안전하게 기여할 수 있게 정리했습니다.",
    communityBody:
      "처음 보는 사람도 흐름을 따라갈 수 있도록 README, 시작 가이드, 사용법, 보안 안내, 기여 규칙, MIT 라이선스를 정리했습니다.",
    communityDocs: "문서 우선",
    communityDocsBody:
      "빠른 시작, Project JSON 규칙, 근거 라벨, 보안, AI 세팅 프롬프트를 한곳에 모았습니다.",
    communityContribute: "기여 경로",
    communityContributeBody:
      "이슈와 PR에서는 변경 범위를 작게 유지하고, 테스트와 근거 표현 원칙을 지키는 것을 중요하게 봅니다.",
    communityLicense: "MIT 라이선스",
    communityLicenseBody:
      "사용, 재배포, 기여 범위를 판단할 수 있도록 라이선스를 명확히 적어 두었습니다.",
    agentEyebrow: "AI 에이전트용",
    agentTitle: "에이전트에게 바로 붙여넣을 수 있는 세팅 프롬프트입니다.",
    agentBody:
      "Codex, Claude Code, Cursor 같은 코딩 에이전트에 그대로 붙여넣으면 됩니다. 안전한 Project JSON을 만들고, 검증하고, evidence level을 구분하도록 안내합니다.",
    agentNextTitle: "Project JSON 작성",
    agentNextBody: "현재 v0.3.0 흐름에 가장 잘 맞습니다.",
    agentReactTitle: "Runtime 또는 legacy producer",
    agentReactBody: "도구가 Anlyx Project JSON을 만들어야 할 때만 사용합니다.",
    copyPrompt: "프롬프트 복사",
    copiedPrompt: "복사됨",
    demoEyebrow: "미리보기",
    demoTitle: "Anlyx Workspace 미리보기",
    demoBody:
      "로컬 Anlyx viewer를 웹에서 미리 볼 수 있는 화면입니다. 샘플 Project JSON으로 Pages, Map, Overview, Capabilities, JSON이 어떻게 보이는지 확인해 보세요.",
    demoCtaTitle: "실제 데모에서 확인해 보세요.",
    demoCtaBody:
      "샘플 Project JSON이 Pages, Map, JSON, evidence state로 어떻게 보이는지 바로 열어볼 수 있습니다.",
    demoButton: "데모 열기",
    demoGuidePages: "먼저 Pages를 봅니다",
    demoGuidePagesBody: "각 화면이 무슨 일을 하는지, 어떤 요청을 보내는지, 어떤 근거가 있는지 확인합니다.",
    demoGuideMap: "다음은 Map입니다",
    demoGuideMapBody: "화면과 API, 서비스, 스키마, 결과 UI가 어떻게 연결되는지 구조로 봅니다.",
    demoGuideJson: "마지막은 JSON입니다",
    demoGuideJsonBody: "화면에 나온 정보의 원본이 궁금할 때 작성된 Project JSON을 확인합니다.",
    docsEyebrow: "에이전트 세팅 가이드",
    docsTitle: "AI 에이전트에게 Anlyx 세팅을 맡기세요.",
    docsBody:
      "프롬프트를 코딩 에이전트에 붙여넣으면 저장소 분석부터 Project JSON 작성, 검증, 로컬 viewer 실행까지 한 번에 진행할 수 있습니다.",
    docsPromptCardTitle: "AI 세팅 프롬프트",
    docsPromptCardBody:
      "분석할 저장소에서 코딩 에이전트에게 그대로 붙여넣으세요. npm 패키지를 설치하고, 공개 GitHub 문서를 기준으로 로컬 viewer까지 실행하게 합니다.",
    docsPromptStepInstall: "npm 패키지 설치: npm install -D anlyx@latest",
    docsPromptStepRepo: "GitHub 문서 확인",
    docsPromptStepAnalyze: "저장소 구조 분석",
    docsPromptStepAuthor: "anlyx.project.json 작성",
    docsPromptStepValidate: "스키마와 참조 관계 검증",
    docsPromptStepRun: "로컬 viewer 실행",
    docsPromptStepReport: "확실한 내용과 추정한 내용 구분",
    docsDirectInstall: "직접 실행하려면 빠른 시작 보기",
    docsQuickStart: "빠른 시작",
    docsCopyCommand: "명령어 복사",
    docsCopied: "복사됨",
    docsCopyFailed: "복사 실패",
    docsPrepublish:
      "현재 권장 방식은 Project JSON을 작성한 뒤 검증하고 로컬 viewer에서 확인하는 흐름입니다.",
    docsDevOnly:
      "로컬 개발용으로 사용하세요. 4777 포트를 외부에 열지 말고, 비밀값, 운영 데이터, 개인정보는 Project JSON에 넣지 마세요.",
    docsConfigChecklist:
      "검증 단계에서 페이지, 요청, 흐름, 아키텍처, 근거 참조가 올바르게 연결되어 있는지 확인합니다.",
    docsAgentPrompt: "AI 세팅 프롬프트 복사",
    docsRefreshPrompt: "업데이트 프롬프트 복사",
    docsOpenDemo: "라이브 시연 열기",
    docsGithub: "GitHub 저장소",
    docsReadmeTitle: "설치와 시작",
    docsReadmeBody:
      "Anlyx를 설치하고 Project JSON을 만든 뒤 검증과 로컬 viewer 실행까지 진행합니다.",
    docsInstallTitle: "Project JSON 스키마",
    docsInstallBody:
      "페이지, 요청, 흐름, 아키텍처, 근거, 메타데이터가 어떤 구조로 작성되는지 확인합니다.",
    docsUsageTitle: "viewer 사용법",
    docsUsageBody:
      "Pages에서는 페이지를 이해하고, Map에서는 아키텍처를 봅니다. Overview와 Capabilities는 보조 해석을, JSON은 작성된 원본 데이터를 보여줍니다.",
    docsSecurityTitle: "근거 라벨",
    docsSecurityBody:
      "source-matched, observed, measured, inferred, not-proven, unknown을 어떻게 읽어야 하는지 정리합니다.",
    docsContributingTitle: "기여 방법",
    docsContributingBody:
      "변경 범위를 작게 유지하고, 테스트와 근거 표현 원칙을 지키는 방법을 안내합니다.",
    docsLicenseTitle: "보안과 개인정보",
    docsLicenseBody:
      "비밀값, 운영 데이터, 개인정보를 Project JSON에 넣지 않기 위한 기준을 확인합니다.",
    docsSectionsTitle: "읽어야 할 문서",
    docsCommandsTitle: "명령어",
    docsPromptTitle: "에이전트용 세팅 프롬프트",
    docsPromptIntro:
      "전체 원문은 필요할 때만 펼쳐 확인하거나 수정할 수 있습니다.",
    docsShowPrompt: "프롬프트 펼치기",
    docsHidePrompt: "프롬프트 접기"
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
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const toggleLanguage = () =>
    setLanguage((current) => {
      const nextLanguage = current === "en" ? "ko" : "en";
      persistLanguage(nextLanguage);
      return nextLanguage;
    });

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (route === "demo") {
    return <DemoPage language={language} onToggleLanguage={toggleLanguage} />;
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
      <SiteNav language={language} onToggleLanguage={onToggleLanguage} activeRoute="landing" />
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

        <LandingViewerPreview language={language} />
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

      <section className="landing-v2-section landing-v2-section--trust" id="trust">
        <div className="landing-v2-section__head">
          <p className="landing-v2-eyebrow">{t.trustEyebrow}</p>
          <h2>{t.trustTitle}</h2>
        </div>
        <div className="landing-v2-trust">
          <article>
            <ShieldCheck size={18} />
            <strong>{t.trustLocalTitle}</strong>
            <p>{t.trustLocalBody}</p>
          </article>
          <article>
            <FileText size={18} />
            <strong>{t.trustEvidenceTitle}</strong>
            <p>{t.trustEvidenceBody}</p>
          </article>
          <article>
            <Code2 size={18} />
            <strong>{t.trustSecurityTitle}</strong>
            <p>{t.trustSecurityBody}</p>
          </article>
        </div>
      </section>

      <section className="landing-v2-cta">
        <div>
          <p className="landing-v2-eyebrow">{t.demoEyebrow}</p>
          <h2>{t.demoCtaTitle}</h2>
          <p>{t.demoCtaBody}</p>
        </div>
        <a className="primary-link" href={routeHref("/demo")}>
          {t.demoButton}
          <ExternalLink size={17} />
        </a>
      </section>
    </main>
  );
}

function DemoPage({
  language,
  onToggleLanguage
}: {
  language: Language;
  onToggleLanguage: () => void;
}): JSX.Element {
  const t = landingCopy[language];

  return (
    <main className={`site-page site-page--demo landing-v2 site-page--${language}`} lang={language}>
      <SiteNav language={language} onToggleLanguage={onToggleLanguage} activeRoute="demo" />
      <section className="public-demo-hero">
        <p className="landing-v2-eyebrow">{t.demoEyebrow}</p>
        <h1>{t.demoTitle}</h1>
        <p>{t.demoBody}</p>
        <div className="public-demo-facts" aria-label="Demo facts">
          <span>
            <strong>Input</strong>
            anlyx.project.json
          </span>
          <span>
            <strong>Viewer</strong>
            Pages / Map / Overview / Capabilities / JSON
          </span>
          <span>
            <strong>Mode</strong>
            local Project JSON preview
          </span>
        </div>
      </section>
      <section className="public-demo-stage" aria-label="Anlyx workspace demo">
        <ProjectWorkspaceDemo />
      </section>
    </main>
  );
}

function LandingViewerPreview({ language }: { language: Language }): JSX.Element {
  const labels =
    language === "ko"
      ? {
          viewer: "Project JSON viewer",
          host: "localhost:4777",
          selected: "선택된 페이지",
          page: "Projects",
          understanding: "페이지 이해",
          does: "이 페이지가 하는 일",
          body: "프로젝트 목록을 보여주고, 검색을 지원하며, 상세 흐름으로 이동합니다.",
          source: "소스 확인",
          inferred: "추정",
          unknown: "불확실성 표시"
        }
      : {
          viewer: "Project JSON viewer",
          host: "localhost:4777",
          selected: "Selected page",
          page: "Projects",
          understanding: "Page understanding",
          does: "What this page does",
          body: "Lists projects, supports search, and opens project detail flows.",
          source: "source-matched",
          inferred: "Agent-inferred",
          unknown: "Unknown kept visible"
        };

  return (
    <div className="landing-v2-preview" aria-label="Anlyx viewer preview">
      <div className="landing-v2-preview__top">
        <div>
          <DemoBrandMark compact />
          <span>{labels.viewer}</span>
        </div>
        <code>{labels.host}</code>
      </div>
      <div className="landing-v2-preview__body">
        <aside>
          <strong>Pages</strong>
          <span>Map</span>
          <span>Evidence</span>
          <span>JSON</span>
        </aside>
        <div className="landing-v2-preview__main">
          <div className="landing-v2-preview__tabs">
            <span className="is-active">Pages</span>
            <span>Map</span>
            <span>JSON</span>
          </div>
          <div className="landing-v2-preview__summary">
            <span>{labels.selected}</span>
            <strong>{labels.page}</strong>
            <em>GET /api/projects → ProjectService → ProjectRepository</em>
          </div>
          <div className="landing-v2-preview__workspace">
            <div className="landing-v2-preview__panel">
              <span>{labels.understanding}</span>
              <strong>{labels.does}</strong>
              <p>{labels.body}</p>
            </div>
            <div className="landing-v2-preview__trace">
              {["Page", "Request", "API", "Service", "Repo", "Result"].map((node) => (
                <div key={node}>
                  <strong>{node}</strong>
                  <span>{node === "Result" ? "200 OK" : labels.source}</span>
                </div>
              ))}
            </div>
            <div className="landing-v2-preview__evidence">
              <span>{labels.source}</span>
              <span>{labels.inferred}</span>
              <span>{labels.unknown}</span>
            </div>
          </div>
        </div>
      </div>
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
  onToggleLanguage,
  activeRoute
}: {
  language: Language;
  onToggleLanguage: () => void;
  activeRoute: SiteRoute;
}): JSX.Element {
  const t = landingCopy[language];

  return (
    <header className="site-nav">
      <a className="site-brand" href={routeHref("/")}>
        <DemoBrandMark />
      </a>
      <div className="site-nav-actions">
        <nav aria-label="Anlyx">
          <a className={activeRoute === "landing" ? "is-active" : undefined} href={routeHref("/")}>
            {t.navOverview}
          </a>
          <a className={activeRoute === "demo" ? "is-active" : undefined} href={routeHref("/demo")}>
            {t.navDemo}
          </a>
          <a className={activeRoute === "docs" ? "is-active" : undefined} href={routeHref("/docs")}>
            {t.navDocs}
          </a>
          <a href="https://github.com/suhannoh/anlyx" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <button
          className="language-toggle language-switcher"
          type="button"
          onClick={onToggleLanguage}
          aria-label={language === "en" ? "Switch to Korean" : "Switch to English"}
        >
          <span className={language === "ko" ? "is-active" : undefined}>KO</span>
          <span className={language === "en" ? "is-active" : undefined}>EN</span>
        </button>
      </div>
    </header>
  );
}

function DemoBrandMark({ compact = false }: { compact?: boolean }): JSX.Element {
  return (
    <span className={compact ? "demo-brand demo-brand--compact" : "demo-brand"} aria-label="Anlyx">
      <img alt="" src={assetHref("/workspace/anlyx-logo-transparent.png")} />
    </span>
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
  const [copyState, setCopyState] = useState<"quick" | "agent" | "refresh" | "failed" | null>(
    null
  );
  const [isAgentPromptOpen, setIsAgentPromptOpen] = useState(false);
  const prompts = getAgentPrompts(language);
  const quickCommand =
    "npm install -D anlyx@latest\nnpx anlyx prompt init\nnpx anlyx validate anlyx.project.json\nnpx anlyx import anlyx.project.json\nnpx anlyx dev";
  const agentPrompt = prompts.find((prompt) => prompt.id === "next-spring")?.prompt ?? "";
  const refreshPrompt = prompts.find((prompt) => prompt.id === "refresh")?.prompt ?? "";
  const promptSteps = [
    t.docsPromptStepInstall,
    t.docsPromptStepRepo,
    t.docsPromptStepAnalyze,
    t.docsPromptStepAuthor,
    t.docsPromptStepValidate,
    t.docsPromptStepRun,
    t.docsPromptStepReport
  ];
  const copyText = async (kind: "quick" | "agent" | "refresh", value: string) => {
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
      href: "https://github.com/suhannoh/anlyx#getting-started"
    },
    {
      icon: <Rocket size={19} />,
      title: t.docsInstallTitle,
      body: t.docsInstallBody,
      href: "https://github.com/suhannoh/anlyx/blob/main/docs/contracts/data-contract.md"
    },
    {
      icon: <Layers3 size={19} />,
      title: t.docsUsageTitle,
      body: t.docsUsageBody,
      href: "https://github.com/suhannoh/anlyx/blob/main/docs/design/screens.md"
    },
    {
      icon: <ShieldCheck size={19} />,
      title: t.docsSecurityTitle,
      body: t.docsSecurityBody,
      href: "https://github.com/suhannoh/anlyx/blob/main/docs/contracts/data-contract.md#evidence"
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
      href: "https://github.com/suhannoh/anlyx/blob/main/SECURITY.md"
    }
  ];

  return (
    <main className={`site-page site-page--docs landing-v2 site-page--${language}`} lang={language}>
      <SiteNav language={language} onToggleLanguage={onToggleLanguage} activeRoute="docs" />
      <section className="docs-hero">
        <div className="docs-hero__copy">
          <p className="eyebrow">
            <span />
            {t.docsEyebrow}
          </p>
          <h1>{t.docsTitle}</h1>
          <p>{t.docsBody}</p>
          <div className="docs-actions">
            <button
              className="primary-link"
              type="button"
              onClick={() => void copyText("agent", agentPrompt)}
            >
              <Clipboard size={17} />
              {copyState === "agent"
                ? t.docsCopied
                : copyState === "failed"
                  ? t.docsCopyFailed
                  : t.docsAgentPrompt}
            </button>
            <button
              className="secondary-link"
              type="button"
              onClick={() => void copyText("refresh", refreshPrompt)}
            >
              <RefreshCw size={17} />
              {copyState === "refresh"
                ? t.docsCopied
                : copyState === "failed"
                  ? t.docsCopyFailed
                  : t.docsRefreshPrompt}
            </button>
            <button
              className="secondary-link"
              type="button"
              onClick={() => setIsAgentPromptOpen((current) => !current)}
            >
              <FileText size={17} />
              {isAgentPromptOpen ? t.docsHidePrompt : t.docsShowPrompt}
            </button>
            <a className="docs-tertiary-link" href="#quick-start">
              <Code2 size={17} />
              {t.docsDirectInstall}
            </a>
          </div>
        </div>
        <aside className="docs-agent-box docs-agent-box--hero" aria-label={t.docsPromptTitle}>
          <div className="docs-agent-box__head">
            <div>
              <p className="eyebrow">{t.docsPromptTitle}</p>
              <h2>{t.docsPromptCardTitle}</h2>
              <p>{t.docsPromptCardBody}</p>
            </div>
          </div>
          <ul className="docs-prompt-summary">
            {promptSteps.map((step) => (
              <li key={step}>
                <span>✓</span>
                {step}
              </li>
            ))}
          </ul>
          {isAgentPromptOpen ? (
            <pre>
              <code>{agentPrompt}</code>
            </pre>
          ) : null}
        </aside>
      </section>

      <section className="docs-command-panel docs-command-panel--quick" id="quick-start">
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
      </section>

      <section className="docs-list" aria-label={t.docsSectionsTitle}>
        <div className="docs-list__head">
          <p className="eyebrow">{t.docsSectionsTitle}</p>
          <h2>{t.docsSectionsTitle}</h2>
        </div>
        {docsCards.map((card) => (
          <a
            className="docs-list-item"
            href={card.href}
            key={card.title}
            target="_blank"
            rel="noreferrer"
          >
            <div>{card.icon}</div>
            <span>
              <strong>{card.title}</strong>
              <p>{card.body}</p>
            </span>
            <ExternalLink size={15} />
          </a>
        ))}
      </section>

    </main>
  );
}

type AgentPromptId = "next-spring" | "react-manual" | "refresh";

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
      prompt: `You are working inside my local repository. Create a safe Anlyx Project JSON file and verify it locally.

Anlyx install and reference:
- npm package: anlyx
- install or upgrade command: npm install -D anlyx@latest
- public repository and docs: https://github.com/suhannoh/anlyx
- agent guide: https://github.com/suhannoh/anlyx/blob/main/docs/agent/anlyx-project-json-agent-guide.md
- local viewer URL after running dev: http://localhost:4777

Goal:
- Produce anlyx.project.json as the primary Anlyx input.
- Explain what pages exist, what they do, which requests they trigger, how architecture nodes connect, and what evidence supports each claim.
- Clearly separate observed, measured, source-matched, agent-inferred, manual, not-proven, and unknown evidence.
- Use source-matched only when the file exists, the symbol or endpoint is present, and lineStart points to the real source line.
- Do not use lineStart: 1 as a placeholder. If the exact source location is not verified, downgrade the claim.
- Count detected pages/routes, frontend API usages, and backend endpoints before choosing the modeled scope.
- Add coverage with detected, modeled, and unmodeled counts. Mark representative or incomplete analysis as partial.
- Write authored explanations in the user's language and product UI language. Keep API paths, file paths, symbols, DTOs, and enum values unchanged.
- Do not invent measured timing.
- Do not include secrets, production records, or raw personal data.

Steps:
1. Read the public Anlyx docs if you need the contract: https://github.com/suhannoh/anlyx
2. Install or upgrade Anlyx in this project: npm install -D anlyx@latest
3. Check the installed package: npm ls anlyx @anlyx/core @anlyx/ui
4. Inspect the repository and identify detected counts, pages, requests, flows, architecture nodes, evidence, overview, and capabilities.
5. Write anlyx.project.json with schemaVersion "0.3.0".
6. Add pages, features, capabilities, requests, flows, architecture, evidence, dictionary, and generatedBy metadata.
7. Mark uncertain relationships as agent-inferred, not-proven, or unknown instead of overclaiming.
8. Validate the file: npx anlyx validate anlyx.project.json
9. If validate reports "Invalid Flow JSON" or expects schemaVersion "0.1.5", the installed Anlyx package is stale. Upgrade Anlyx and rerun validate.
10. Import it: npx anlyx import anlyx.project.json
11. Start the viewer: npx anlyx dev
12. If port 4777 is already in use, start Anlyx on another local port and report the actual URL.
13. Open http://localhost:4777, or the actual local URL you started, and check Pages, Map, Overview, Capabilities, and JSON.

Shortcut for later:
- When I later type "anlyx refresh", update the existing anlyx.project.json instead of starting from scratch.
- Preserve stable ids where possible.
- Re-run validate, import, and dev after the refresh.

Before finishing, report:
- The authored pages, primary requests, and architecture layers.
- Which claims are observed, measured, source-matched, agent-inferred, manual, not-proven, or unknown.
- Any invalid schema or evidence issue found by validate.
- The coverage status and any source issues in .anlyx/validation-report.json.
- What remains uncertain.`
    },
    {
      id: "react-manual",
      title: t.agentReactTitle,
      body: t.agentReactBody,
      prompt: `You are working inside my local repository. Convert runtime, scanner, OpenAPI, or manual findings into Anlyx Project JSON.

Anlyx install and reference:
- npm package: anlyx
- install or upgrade command: npm install -D anlyx@latest
- public repository and docs: https://github.com/suhannoh/anlyx
- agent guide: https://github.com/suhannoh/anlyx/blob/main/docs/agent/anlyx-project-json-agent-guide.md
- local viewer URL after running dev: http://localhost:4777

Goal:
- Treat any runtime capture, legacy scanner output, OpenAPI data, or manual notes as producer data only.
- Normalize the result into anlyx.project.json.
- Keep runtime observations, source matches, and inferred links visually distinct.
- Preserve unknown and not-proven states.
- Add coverage when the authored model covers only part of the detected project.
- Do not enable production tracing.

Steps:
1. Read the public Anlyx docs if you need the contract: https://github.com/suhannoh/anlyx
2. Install or upgrade Anlyx in this project: npm install -D anlyx@latest
3. Check the installed package: npm ls anlyx @anlyx/core @anlyx/ui
4. Collect only local, non-secret evidence.
5. Create anlyx.project.json with schemaVersion "0.3.0".
6. Use source-matched only when the file exists, the symbol or endpoint is present, and lineStart points to the real source line.
7. Use measured timing only when runtime or telemetry timing evidence exists.
8. Run npx anlyx validate anlyx.project.json.
9. If validate reports "Invalid Flow JSON" or expects schemaVersion "0.1.5", the installed Anlyx package is stale. Upgrade Anlyx and rerun validate.
10. Run npx anlyx import anlyx.project.json.
11. Run npx anlyx dev. If port 4777 is already in use, start Anlyx on another local port and report the actual URL.
12. Open http://localhost:4777, or the actual local URL you started.
13. Verify Pages, Map, Overview, Capabilities, and JSON render from authored data.

Shortcut for later:
- When I later type "anlyx refresh", update the existing anlyx.project.json instead of starting from scratch.
- Preserve stable ids where possible.
- Re-run validate, import, and dev after the refresh.

Before finishing, report:
- The producer source used.
- What was preserved as observed or measured.
- What was downgraded to source-matched, agent-inferred, not-proven, or unknown.
- Coverage status and validation-report source issues.
- Any redactions made for safety.`
    },
    {
      id: "refresh",
      title: t.docsRefreshPrompt,
      body:
        language === "ko"
          ? "기존 anlyx.project.json을 유지하면서 변경된 내용만 다시 반영합니다."
          : "Update only the changed project facts in an existing anlyx.project.json.",
      prompt: `anlyx refresh

You are working inside my local repository. Refresh the existing Anlyx Project JSON instead of starting from scratch.

Anlyx reference:
- npm package: anlyx
- upgrade command if needed: npm install -D anlyx@latest
- public repository and docs: https://github.com/suhannoh/anlyx
- agent guide: https://github.com/suhannoh/anlyx/blob/main/docs/agent/anlyx-project-json-agent-guide.md
- local viewer URL after running dev: http://localhost:4777

Goal:
- Update anlyx.project.json to match the current repository state.
- Preserve stable ids for pages, requests, flows, architecture nodes, evidence, and capabilities where possible.
- Update only affected sections unless the existing file is invalid or clearly obsolete.
- Clearly separate observed, measured, source-matched, agent-inferred, manual, not-proven, and unknown evidence.
- Use source-matched only when the file exists, the symbol or endpoint is present, and lineStart points to the real source line.
- Update coverage when detected pages, API usages, endpoints, or modeled scope changed.
- Do not invent measured timing.
- Do not include secrets, production records, or raw personal data.

Steps:
1. Read the existing anlyx.project.json and understand its current model.
2. Inspect recent repository changes with git status, git diff, and recent commits when useful.
3. Update changed pages, requests, flows, architecture nodes, evidence, overview, and capabilities.
4. Preserve stable ids unless the represented object was renamed or removed.
5. Mark uncertain relationships as agent-inferred, not-proven, or unknown instead of overclaiming.
6. Update coverage when the modeled scope changed.
7. Validate the file: npx anlyx validate anlyx.project.json
8. If validate reports "Invalid Flow JSON" or expects schemaVersion "0.1.5", the installed Anlyx package is stale. Upgrade Anlyx and rerun validate.
9. Import it: npx anlyx import anlyx.project.json
10. Start the viewer: npx anlyx dev
11. If port 4777 is already in use, start Anlyx on another local port and report the actual URL.
12. Open http://localhost:4777, or the actual local URL you started, and check Pages, Map, Overview, Capabilities, and JSON.

Before finishing, report:
- What changed in anlyx.project.json.
- Which ids were preserved, added, renamed, or removed.
- Which claims remain observed, measured, source-matched, agent-inferred, manual, not-proven, or unknown.
- Any invalid schema or evidence issue found by validate.
- Coverage status and validation-report source issues.
- What remains uncertain.`
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

const languageStorageKey = "anlyx-demo-language";

function getInitialLanguage(): Language {
  try {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);
    return isLanguage(storedLanguage) ? storedLanguage : "en";
  } catch {
    return "en";
  }
}

function persistLanguage(language: Language): void {
  try {
    window.localStorage.setItem(languageStorageKey, language);
  } catch {
    // Storage can be unavailable in restricted browsing contexts.
  }
}

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "ko";
}

function routeHref(path: "/" | "/demo" | "/docs"): string {
  const base = getSiteBase();
  if (path === "/") {
    return `${base || "/"}`;
  }
  return `${base}${path}`;
}

function assetHref(path: `/workspace/${string}`): string {
  return `${getSiteBase()}${path}`;
}

function getSiteBase(): string {
  const pathname = window.location.pathname;
  if (pathname === "/anlyx" || pathname.startsWith("/anlyx/")) {
    return "/anlyx";
  }

  return "";
}
