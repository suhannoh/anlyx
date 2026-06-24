<p align="center">
  <img src="./docs/assets/brand/anlyx-logo-card.png" alt="Anlyx" width="460" />
</p>

<h3 align="center">실제 앱을 클릭하고, 그 요청이 백엔드 어디까지 가는지 봅니다.</h3>

<p align="center">
  브라우저에서 관찰한 사용자 액션 요청을 Spring Boot와 Next.js 스캔 결과에 연결하는 action-first flow map.
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
  <a href="https://www.npmjs.com/package/anlyx"><img alt="npm" src="https://img.shields.io/npm/v/anlyx?color=2563eb"></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/github/license/suhannoh/anlyx?color=0f172a"></a>
  <a href="https://github.com/suhannoh/anlyx/actions/workflows/ci.yml"><img alt="ci" src="https://img.shields.io/github/actions/workflow/status/suhannoh/anlyx/ci.yml?branch=main&label=ci"></a>
  <a href="https://suhannoh.github.io/anlyx/"><img alt="demo" src="https://img.shields.io/badge/demo-GitHub%20Pages-16a34a"></a>
</p>

<p align="center">
  <img src="./docs/assets/readme/anlyx-demo.gif" alt="사용자 액션이 백엔드 흐름 다이어그램으로 매핑되는 Anlyx 데모" />
</p>

## 무엇을 하나요?

Anlyx는 브라우저 DevTools, Swagger, 백엔드 코드, DB 모델을 오가며 확인하던 질문을 바로 보여줍니다.

```txt
방금 이 버튼을 눌렀는데, 어떤 API가 호출됐고 백엔드 어디까지 갔지?
```

실제 로컬 앱은 자기 포트에서 그대로 실행됩니다. Anlyx는 마지막 사용자 액션에서 발생한 API를 관찰하고, 그 요청을 스캔된 백엔드 경로와 연결합니다.

```txt
User action -> Browser API -> Controller -> Service -> Repository -> Database -> Result
```

Anlyx는 증거를 구분합니다. 브라우저 요청은 실제 관찰값이고, Controller, Service, Repository, Database node는 향후 runtime bridge가 보고하기 전까지 source scan 또는 추론 결과입니다.

## 왜 쓰나요?

| 기존에는...                                              | Anlyx는...                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| DevTools network row를 뒤져야 했습니다                   | 방금 클릭한 액션의 요청을 메인 플로우로 보여줍니다            |
| route, Swagger, service, repository를 따로 봐야 했습니다 | 하나의 시각 경로로 프론트 액션부터 백엔드 흐름까지 보여줍니다 |
| health check, polling, auth check가 섞였습니다           | 백그라운드 트래픽은 조용히 분리합니다                         |
| 왜 이 node가 나왔는지 알기 어려웠습니다                  | confidence와 evidence를 함께 보여줍니다                       |
| 프로젝트 설명을 말로 해야 했습니다                       | 로컬 overlay와 viewer로 온보딩을 시각화합니다                 |

## 빠른 시작

```bash
npm install -D anlyx
npx anlyx init
npx anlyx dev
```

그다음 실제 앱을 평소처럼 사용하면 됩니다. 버튼을 누르거나 폼을 제출하면 Anlyx는 `4777` 포트에서 runtime을 조용히 띄우고, 실제 프론트엔드 앱 위에 Flow Drawer를 주입합니다.

## 지원 범위

| 영역                   | v0.1 지원                                               |
| ---------------------- | ------------------------------------------------------- |
| Backend deep support   | Spring Boot endpoint 및 flow scanning                   |
| Frontend deep support  | Next.js App Router page discovery 및 Playwright capture |
| Basic backend support  | OpenAPI endpoint import                                 |
| Basic frontend support | OpenAPI-only 프로젝트용 manual URLs                     |
| v0.1 Deep Support 제외 | FastAPI, Express, NestJS, React Router                  |

## 실제 앱에 붙이기

config를 생성합니다.

```bash
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
    baseUrl: "http://localhost:3000"
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

Next.js App Router 앱에서는 root layout에 개발 전용 helper를 추가합니다.

```tsx
import { AnlyxDevOverlay } from "anlyx/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <AnlyxDevOverlay />
      </body>
    </html>
  );
}
```

`AnlyxDevOverlay`는 production에서 아무것도 렌더링하지 않습니다. 특수한 로컬 환경에서는 raw fallback script를 직접 넣을 수 있습니다.

```html
<script src="http://localhost:4777/_anlyx/overlay.js" defer></script>
```

## 동작 방식

1. Spring Boot endpoint와 best-effort Controller -> Service -> Repository 경로를 스캔합니다.
2. Next.js App Router page와 dynamic route sample을 찾습니다.
3. 로컬 페이지 상태와 브라우저에서 보이는 API 호출을 캡처합니다.
4. 사용자 액션 요청과 auth, health, polling 같은 백그라운드 요청을 분리합니다.
5. 브라우저 요청을 스캔된 endpoint/backend flow와 매칭합니다.
6. main path, support calls, confidence, evidence가 포함된 React Flow drawer를 렌더링합니다.

## UI 표면

| Surface             | 역할                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| Injected overlay    | 기본 사용 방식. 실제 앱을 그대로 쓰다가 필요할 때 Anlyx를 엽니다.           |
| Flow Drawer         | 최신 액션 요청, matched backend flow, recent events, evidence를 보여줍니다. |
| Standalone viewer   | `http://localhost:4777/_anlyx/viewer`에서 보는 fallback/debug UI입니다.     |
| README / Pages demo | 손으로 그린 mock이 아니라 실제 `@anlyx/ui` preview 컴포넌트에서 생성합니다. |

## 데모 이미지와 Live Demo

README 이미지와 Live Demo는 같은 React preview surface에서 생성합니다.

```bash
corepack pnpm docs:readme-demo
corepack pnpm demo:dev
corepack pnpm demo:build
```

`docs:readme-demo`는 `docs/assets/readme/anlyx-demo.gif`와 `docs/assets/readme/anlyx-demo.png`를 생성합니다. GitHub Pages 데모는 `apps/demo`에 있고 같은 Flow Drawer preview를 import합니다. Pages workflow는 `main` push 때 데모 build만 검증하고, 실제 배포는 repository에서 GitHub Pages를 켠 뒤 manual workflow dispatch로만 실행합니다.

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

### 패키지 상태

`anlyx@0.1.3` 이상을 사용하세요. 오래된 `0.1.0`, `0.1.1` 빌드는 권장하지 않습니다. 릴리즈 패키지는 pnpm pack dry-run으로 검증해 workspace dependency가 publish 전에 실제 버전으로 해석되는지 확인합니다.

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
