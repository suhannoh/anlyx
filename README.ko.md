<p align="center">
  <img src="./docs/assets/brand/anlyx-logo-card.png" alt="Anlyx" width="460" />
</p>

<h3 align="center">AI Agent가 작성한 Project JSON을 로컬 아키텍처 뷰어로 봅니다.</h3>

<p align="center">
  Anlyx는 사용자의 AI Agent가 분석한 프로젝트 구조를 <code>anlyx.project.json</code>으로 받아
  <code>localhost:4777</code>에서 Pages, Map, JSON 화면으로 시각화합니다.
</p>

<p align="center">
  <a href="https://suhannoh.github.io/anlyx/"><strong>Live Demo</strong></a>
  ·
  <a href="https://suhannoh.github.io/anlyx/docs">문서 사이트</a>
  ·
  <a href="https://suhannoh.github.io/anlyx/demo">Workspace 시연</a>
  ·
  <a href="#빠른-시작">빠른 시작</a>
  ·
  <a href="#핵심-원칙">핵심 원칙</a>
  ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/anlyx"><img alt="npm" src="https://img.shields.io/npm/v/anlyx?color=2563eb"></a>
  <a href="./LICENSE"><img alt="license" src="https://img.shields.io/github/license/suhannoh/anlyx?color=0f172a"></a>
  <a href="https://github.com/suhannoh/anlyx/actions/workflows/ci.yml"><img alt="ci" src="https://img.shields.io/github/actions/workflow/status/suhannoh/anlyx/ci.yml?branch=main&label=ci"></a>
  <a href="https://suhannoh.github.io/anlyx/"><img alt="demo" src="https://img.shields.io/badge/demo-GitHub%20Pages-16a34a"></a>
</p>

## 무엇을 하나요?

Anlyx는 framework scanner가 아닙니다. 사용자의 AI Agent가 프로젝트를 읽고,
정해진 계약에 맞춰 `anlyx.project.json`을 작성하면 Anlyx가 그 데이터를
로컬 4777 viewer에서 이해하기 쉬운 제품 화면으로 렌더링합니다.

```txt
Project JSON -> validate -> import -> localhost:4777 viewer
```

viewer는 세 가지 화면을 제공합니다.

- `Pages`: 페이지별 목적, 기능, 요청, 대표 backend path를 읽습니다.
- `Map`: frontend request에서 API, Controller, Service, Repository, DB까지 이어지는 구조를 봅니다.
- `JSON`: 현재 로딩된 Project JSON과 split JSON 파일을 확인합니다.

## 왜 쓰나요?

| 기존에는...                                 | Anlyx는...                                                          |
| ------------------------------------------- | ------------------------------------------------------------------- |
| AI Agent 설명이 긴 텍스트로만 남았습니다    | Agent가 작성한 JSON을 검증 가능한 화면으로 렌더링합니다             |
| 프론트 요청과 백엔드 레이어를 따로 봤습니다 | 요청, API, Controller, Service, Repository, DB를 한 흐름으로 봅니다 |
| 프로젝트마다 framework가 달라 막혔습니다    | 분석은 사용자의 AI Agent가 맡고, Anlyx는 공통 JSON 계약만 봅니다    |
| 개발자가 아니면 구조 파악이 어려웠습니다    | 기획자, 신입, 리뷰어도 Pages/Map으로 구조를 읽을 수 있습니다        |
| 근거와 추정이 섞였습니다                    | source-matched, agent-inferred, observed, not-proven을 분리합니다   |

## 빠른 시작

```bash
npm install -D anlyx
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev
```

그다음 `http://localhost:4777`에서 로컬 viewer를 엽니다.

Agent 작성 가이드는
[`docs/agent/anlyx-project-json-agent-guide.md`](./docs/agent/anlyx-project-json-agent-guide.md)에 있습니다.
데이터 계약은 [`docs/contracts/data-contract.md`](./docs/contracts/data-contract.md)를 기준으로 합니다.

## 핵심 원칙

- Anlyx는 프로젝트 데이터를 추측하지 않습니다.
- 실제 프로젝트 분석은 사용자의 AI Agent가 수행합니다.
- Anlyx는 `anlyx.project.json`과 `.anlyx/project/*.json`을 읽어 시각화합니다.
- 확실하지 않은 정보는 `unknown`, `not-proven`, `agent-inferred`로 남깁니다.
- timing은 실제 measurement가 있을 때만 활성화합니다. 1차 버전에서는 기본 비활성입니다.
- secret, token, cookie, 실제 개인정보 payload는 JSON에 넣지 않습니다.
- 모든 처리는 로컬 중심입니다. GitHub나 외부 서비스 업로드를 요구하지 않습니다.

## Project JSON 구조

기본 파일은 `anlyx.project.json`입니다.

```json
{
  "schemaVersion": "0.2.0",
  "project": {},
  "areas": [],
  "pages": [],
  "features": [],
  "requests": [],
  "flows": [],
  "architecture": {},
  "evidence": [],
  "measurements": [],
  "dictionary": { "defaultLanguage": "en", "terms": [] }
}
```

큰 프로젝트에서는 split JSON도 사용할 수 있습니다.

```txt
.anlyx/project/project.json
.anlyx/project/pages.json
.anlyx/project/features.json
.anlyx/project/requests.json
.anlyx/project/flows.json
.anlyx/project/architecture.json
.anlyx/project/evidence.json
.anlyx/project/dictionary.json
```

`anlyx.project.json`은 entry file이며, split 파일은 Agent가 관리합니다.

## UI 표면

| Surface      | 역할                                                      |
| ------------ | --------------------------------------------------------- |
| Pages        | 페이지 인덱스, 페이지 설명, 기능, 요청, 대표 Flow Summary |
| Map          | frontend-to-data layered architecture map                 |
| JSON         | Project JSON 파일 목록, raw JSON, schema/count metadata   |
| Status strip | source file, AI Agent, confidence, last analysis          |

## 언어 지원

viewer shell은 한국어, 영어, 중국어, 일본어, 프랑스어를 지원합니다.
프로젝트 설명 텍스트 자체는 사용자의 AI Agent가 사용자 언어에 맞춰 작성합니다.

## 문서

- [Product spine](./docs/product/product-spine.md)
- [Roadmap](./docs/product/roadmap.md)
- [Data contract](./docs/contracts/data-contract.md)
- [Agent Project JSON guide](./docs/agent/anlyx-project-json-agent-guide.md)
- [Agent setup guide](./docs/agent/anlyx-agent-setup-guide.md)
- [Screen contract](./docs/design/screens.md)

## 데모 사이트

Public site는 `apps/demo`에 있습니다.

```bash
corepack pnpm demo:dev
corepack pnpm demo:build
```

GitHub Pages는 `https://suhannoh.github.io/anlyx/` 기준으로 동작하도록 설정되어 있습니다.

## Troubleshooting

### viewer에 데이터가 보이지 않음

먼저 Project JSON을 검증하고 import하세요.

```bash
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
```

### timing이 비활성으로 보임

정상입니다. `measurements`가 비어 있으면 timing은 표시하지 않습니다.
실제 측정 데이터 수집은 2차 기능으로 분리합니다.

### 분석 결과가 부족함

Anlyx가 프로젝트를 자동 추론하지 않습니다. 사용자의 AI Agent가
`docs/agent/anlyx-project-json-agent-guide.md`를 읽고 누락된 pages, requests,
flows, architecture, evidence를 보강해야 합니다.

## 개발 환경

Anlyx는 pnpm workspace, TypeScript, ESLint, Prettier, Vitest를 사용합니다.

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm -r build
```

## 기여하기

[`CONTRIBUTING.md`](./CONTRIBUTING.md), [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md),
[`SECURITY.md`](./SECURITY.md), [`Roadmap`](./docs/product/roadmap.md)을 참고하세요.
