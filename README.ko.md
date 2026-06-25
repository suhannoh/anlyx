<p align="center">
  <img src="./docs/assets/brand/anlyx-logo-card.png" alt="Anlyx" width="460" />
</p>

<h3 align="center">실제 앱을 클릭하고, 그 요청이 백엔드 어디까지 가는지 봅니다.</h3>

<p align="center">
  브라우저, Next.js 서버, Spring Boot 개발용 근거를 연결하는 action-first flow map.
</p>

<p align="center">
  <a href="https://suhannoh.github.io/anlyx/"><strong>Live Demo</strong></a>
  ·
  <a href="#빠른-시작">빠른 시작</a>
  ·
  <a href="#동작-방식">동작 방식</a>
  ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/github/license/suhannoh/anlyx?color=0f172a"></a>
  <a href="https://github.com/suhannoh/anlyx/actions/workflows/ci.yml"><img alt="ci" src="https://img.shields.io/github/actions/workflow/status/suhannoh/anlyx/ci.yml?branch=main&label=ci"></a>
  <a href="https://suhannoh.github.io/anlyx/"><img alt="demo" src="https://img.shields.io/badge/demo-GitHub%20Pages-16a34a"></a>
</p>

<p align="center">
  <img src="./docs/assets/readme/anlyx-demo.png" alt="사용자 액션이 백엔드 흐름 다이어그램으로 매핑되는 Anlyx 데모" />
</p>

## 무엇을 하나요?

Anlyx는 브라우저 DevTools, Swagger, 백엔드 코드, DB 모델을 오가며 확인하던 질문을 바로 보여줍니다.

```txt
방금 이 버튼을 눌렀는데, 어떤 API가 호출됐고 백엔드 어디까지 갔지?
```

실제 로컬 앱은 자기 포트에서 그대로 실행됩니다. Anlyx는 로컬 API 활동을 관찰하고, 각 요청을 스캔된 백엔드 경로와 연결합니다.

```txt
User action or page load -> API -> Controller -> Service -> Repository -> Database -> Result
```

Anlyx는 근거를 구분합니다.

- **Browser observed**: 로컬 브라우저에서 발생한 `fetch`/XHR 요청입니다.
- **Next server observed**: 브라우저에서는 보이지 않는 Next.js 서버 런타임의 `fetch` 요청입니다.
- **Backend observed**: 개발 전용 Spring Boot bridge가 보고한 Controller, Service, Repository, JDBC span입니다.
- **Source matched**: 스캔된 코드 근거입니다. 같은 요청의 dev bridge span이 없으면 runtime trace가 아닙니다.

## 왜 쓰나요?

| 기존에는...                                              | Anlyx는...                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| DevTools network row를 뒤져야 했습니다                   | 방금 클릭한 액션의 요청을 메인 플로우로 보여줍니다            |
| route, Swagger, service, repository를 따로 봐야 했습니다 | 하나의 시각 경로로 프론트 액션부터 백엔드 흐름까지 보여줍니다 |
| health check, polling, auth check가 섞였습니다           | 백그라운드 트래픽은 조용히 분리합니다                         |
| 왜 이 node가 나왔는지 알기 어려웠습니다                  | confidence와 evidence를 함께 보여줍니다                       |
| 프로젝트 설명을 말로 해야 했습니다                       | 별도 Live Workspace로 온보딩을 시각화합니다                   |

## 빠른 시작

> 배포 전 안내: v0.1은 실제 프로젝트 검증 중이라 npm publish를 의도적으로 멈춰둔 상태입니다. 지금은 이 저장소에서 로컬 빌드/패키징 경로로 검증하세요. `npm install -D anlyx`는 첫 npm 배포 이후의 사용 명령입니다.

이 저장소에서 검증할 때:

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm pack:local
```

npm 배포 이후:

```bash
npm install -D anlyx
npx anlyx init
npx anlyx dev
```

`npx anlyx dev`를 실행하기 전에 생성된 `anlyx.config.ts`에서 `backend.sourceDir`, `frontend.sourceDir`, `frontend.baseUrl`, `frontend.router`, `dev.command`가 실제 프로젝트와 맞는지 확인하세요. 그다음 실제 앱을 평소처럼 사용하면 됩니다. `http://localhost:4777/_anlyx/viewer`에 Anlyx Workspace를 함께 열어두고, 실제 버튼을 누르거나 폼을 제출하면 매칭된 백엔드 흐름이 실시간으로 갱신됩니다.

## 지원 범위

| 영역                   | v0.1 지원                                               |
| ---------------------- | ------------------------------------------------------- |
| Backend deep support   | Spring Boot endpoint 및 flow scanning                   |
| Frontend deep support  | Next.js App Router page discovery 및 Playwright capture |
| Basic backend support  | OpenAPI endpoint import                                 |
| Basic frontend support | OpenAPI-only 프로젝트용 manual URLs                     |
| v0.1 Deep Support 제외 | FastAPI, Express, NestJS, React Router                  |

## 실제 앱에 붙이기

npm 패키지가 배포된 뒤에는 설치하고 config를 생성합니다.

```bash
npm install -D anlyx
npx anlyx init
```

최소 `anlyx.config.ts` 예시:

```ts
export default {
  projectName: "my-app",
  backend: {
    type: "spring",
    sourceDir: "./backend"
  },
  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000",
    router: "app"
  },
  server: {
    port: 4777,
    openBrowser: true,
    mode: "inject"
  },
  dev: {
    command: "npm run dev"
  }
};
```

Anlyx를 앱 옆에서 실행합니다.

```bash
npx anlyx dev
```

일반적인 Next.js App Router 프로젝트에서는 `anlyx dev`가 개발 전용 Next server bridge를 preload하고 Live Workspace를 엽니다. `dev.command`로 앱을 실행하기 어려운 환경이라면 앱을 직접 켜고, 개발 환경에서만 fallback capture script를 사용할 수 있습니다.

```html
<script src="http://localhost:4777/_anlyx/capture.js" defer></script>
```

Anlyx는 로컬 개발용 도구입니다. production에서 사용하지 마세요.

필수 환경은 Node.js 22 이상입니다. 기여자는 `package.json`에 고정된 pnpm 버전을 Corepack으로 사용하는 것을 권장합니다. 새 장비에서 Playwright capture가 실패하면 `npx playwright install chromium`으로 로컬 capture용 Chromium을 설치하세요.

## 동작 방식

1. Spring Boot endpoint와 best-effort Controller -> Service -> Repository 경로를 스캔합니다.
2. Next.js App Router page와 dynamic route sample을 찾습니다.
3. 로컬 페이지 상태와 브라우저에서 보이는 API 호출을 캡처합니다.
4. `anlyx dev`가 bridge를 preload할 수 있으면 로컬 Next.js 서버의 `fetch` 호출도 관찰합니다.
5. 같은 요청에 대해 Spring Boot dev bridge span이 들어오면 Controller/Service/Repository/JDBC timing을 합칩니다.
6. 사용자 액션 요청과 auth, health, polling, framework, static asset 트래픽을 분리합니다.
7. 매칭된 요청을 Summary, Timing, Diagram, confidence, evidence가 포함된 full-page Live Workspace로 스트리밍합니다.

## UI 표면

| Surface             | 역할                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Live Workspace      | `http://localhost:4777/_anlyx/viewer`에서 live request flow를 확인하는 기본 분석 화면입니다. |
| Capture badge       | 앱 쪽에서 capture 상태를 작게 알려주고 Workspace로 이동할 수 있게 하는 선택적 진입점입니다.  |
| Capture runtime     | 개발 환경에서만 `fetch`/XHR을 관찰합니다. 큰 drawer를 렌더링하지 않습니다.                   |
| Next server bridge  | 개발 환경에서만 로컬 Next.js 서버의 server-side data loading `fetch`를 관찰합니다.           |
| Spring dev bridge   | 개발 환경에서만 상관된 Controller/Service/Repository/JDBC span timing을 보고합니다.          |
| README / Pages demo | 손으로 그린 mock이 아니라 같은 Live Workspace 방향을 보여주는 fixture-backed 데모입니다.     |

## 근거와 타이밍

Anlyx는 측정된 데이터와 코드에서 나온 근거를 의도적으로 구분합니다.

| 라벨                  | 의미                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| Browser observed      | 로컬 브라우저 요청이나 액션이 캡처되었습니다. 시간은 브라우저 런타임 측정값입니다.   |
| Next server observed  | 로컬 Next.js 서버 `fetch`가 캡처되었습니다. 시간은 Next.js dev process 측정값입니다. |
| Backend observed      | 개발 전용 Spring Boot bridge가 메서드나 JDBC span을 보고했습니다.                    |
| Source matched        | 스캔된 소스 코드에서 찾은 근거입니다. 실제 runtime 측정값이 아닙니다.                |
| Not proven            | 코드에는 있는 경로지만 이 요청에서 실행됐다고 증명할 수 없습니다.                    |
| Response not observed | 소스 근거는 찾았지만 브라우저나 Next 서버 응답 시간은 캡처되지 않았습니다.           |

Timing에 `999 ms` 같은 값이 보이면 placeholder가 아니라 로컬 런타임 이벤트에서 캡처된 값입니다. 소스 전용 행은 measured span이 아니라 estimate 또는 not-proven 행으로 표시합니다.

## 데모 이미지와 Live Demo

README 이미지와 Live Demo는 같은 React preview surface에서 생성합니다.

```bash
corepack pnpm docs:readme-demo
corepack pnpm demo:dev
corepack pnpm demo:build
```

`docs:readme-demo`는 `docs/assets/readme/anlyx-demo.png`를 생성합니다. GitHub Pages 데모는 `apps/demo`에 있고 fake app과 Live Workspace 제품 방향을 함께 보여줍니다. Pages workflow는 `main` push 때 데모 build를 검증하고, 실제 배포는 GitHub Pages 설정 후 manual workflow dispatch로 실행합니다.

## Capture와 Dynamic Routes

config만 먼저 확인하고 싶다면 정적 스캔부터 실행합니다.

```bash
npx anlyx scan --skip-capture
```

프론트엔드가 실행 중이면 capture를 포함해 스캔합니다.

```bash
npx anlyx scan
```

Next.js 동적 라우트는 capture가 방문할 실제 URL을 만들 수 있도록 `sampleParams`를 제공합니다.

```ts
export default {
  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000",
    router: "app",
    sampleParams: {
      "/benefit/[brandSlug]/[benefitSlugWithId]": {
        brandSlug: "starbucks",
        benefitSlugWithId: "birthday-coupon-123"
      }
    }
  }
};
```

## Troubleshooting

### Cannot find module 'anlyx'

`npx anlyx init --force`로 생성되는 import-free config를 사용합니다. `defineConfig` import는 대상 프로젝트가 `anlyx`를 devDependency로 설치하고 해석할 수 있을 때만 사용합니다.

### Next.js App Router directory not found

`frontend.sourceDir`를 frontend root 또는 source root로 지정합니다. v0.1에서 지원하는 구조는 다음과 같습니다.

```txt
frontend/app
frontend/src/app
sourceDir이 ./frontend/src일 때 ./frontend/src/app
```

### .anlyx/report-data.json not generated

먼저 다음 명령으로 정적 scan을 확인합니다.

```bash
npx anlyx scan --skip-capture
```

실패하면 config 경로, backend source directory, frontend app directory, 터미널 에러를 확인합니다. `anlyx dev`는 report data가 없을 때 lightweight scan을 실행하지만, scan 문제만 분리해서 볼 때는 `anlyx scan --skip-capture`가 여전히 유용합니다.

### Pages are pending

`--skip-capture`, manual frontend URLs, capture data가 없는 route에서는 정상입니다. Pending page는 숨기지 않고 뷰어에 표시합니다.

### Playwright/capture fails

프론트엔드 서버가 `frontend.baseUrl`에서 실행 중인지, dynamic route에 `sampleParams`가 있는지, 로그인 전용 페이지에 capture 설정이 있는지 확인합니다. capture 문제를 분리하려면 `--skip-capture`로 정적 scan을 먼저 실행합니다.

### Spring Security 또는 CORS가 dev bridge를 막는 경우

Spring Security filter는 요청이 Spring MVC controller에 도달하기 전에 `401` 또는 `403`을 반환할 수 있습니다. 이 경우 개발용 bridge가 backend span을 보고하지 않는 한 Anlyx는 controller와 downstream layer를 소스 근거 또는 실행 미확인으로 보여줘야 합니다. 요청 상관관계가 잡히지 않으면 로컬 frontend origin에 한해서 Spring CORS 설정에 `X-Anlyx-Request-Id` 헤더를 허용하세요.

### 패키지 상태

npm publish는 아직 멈춰둔 상태입니다. 첫 공개 npm 배포 전에는 다음을 확인합니다.

```bash
corepack pnpm build
corepack pnpm test
corepack pnpm pack:local
corepack pnpm pack:smoke
npm pack --dry-run
```

실제로 npm에 배포하고 깨끗한 프로젝트에서 설치 검증하기 전까지는 live npm release라고 안내하지 않습니다.

## v0.1 제외 범위

- FastAPI, Express, NestJS Deep Support
- React Router Deep Support
- Static HTML export
- Mermaid export
- PNG/SVG export
- GitHub Actions report generation
- Java Agent runtime tracing
- LLM flow summary

## 개발 환경

Anlyx는 pnpm workspace, TypeScript, ESLint, Prettier, Vitest를 사용합니다.

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm format
corepack pnpm -r build
```

패키지 검증은 local build와 pack dry-run으로 확인합니다. 자세한 내용은 [`docs/release/npm-publish-preflight.md`](./docs/release/npm-publish-preflight.md)와 [`docs/release/v0.1-release-runbook.md`](./docs/release/v0.1-release-runbook.md)를 참고합니다.

## 기여하기

[`CONTRIBUTING.md`](./CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md), [`SECURITY.md`](./SECURITY.md), [`Roadmap`](./docs/product/roadmap.md), [`Adapter Development Guide`](./docs/adapters/adapter-development.md)를 참고하세요.

## Release Notes

[`docs/release/v0.1.3-release-notes.md`](./docs/release/v0.1.3-release-notes.md)와 [GitHub release](https://github.com/suhannoh/anlyx/releases/tag/v0.1.3)를 참고하세요.
