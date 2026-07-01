<p align="center">
  <img src="./docs/assets/brand/anlyx-logo-card.png" alt="Anlyx" width="460" />
</p>

<h3 align="center">AI가 만든 코드베이스 지도를 로컬에서 검토합니다.</h3>

<p align="center">
  Anlyx는 코딩 에이전트가 작성한 <code>anlyx.project.json</code>을 검증하고,
  <code>localhost:4777</code>에서 페이지, API 흐름, 아키텍처, 근거, 불확실성을 검토할 수 있게 보여줍니다.
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

Anlyx는 모든 프레임워크를 직접 자동 분석하는 도구가 아닙니다. 사용자의
코딩 에이전트가 프로젝트를 읽고 `anlyx.project.json`을 작성하면, Anlyx가
그 파일을 검증한 뒤 로컬 4777 viewer에서 검토 가능한 화면으로 보여줍니다.

```txt
Project JSON -> validate -> import -> localhost:4777 viewer
```

viewer는 다섯 가지 화면을 제공합니다.

- `Pages`: 페이지별 목적, 기능, 요청, 대표 backend path를 읽습니다.
- `Map`: frontend request에서 API, Controller, Service, Repository, DB까지 이어지는 구조를 봅니다.
- `Overview`: 프로젝트 소개, authored stack, 핵심 사용 흐름을 간결하게 봅니다.
- `Capabilities`: 제품 행동이 어떤 entry, request, data, evidence와 연결되는지 확인합니다.
- `JSON`: 현재 로딩된 Project JSON과 split JSON 파일을 확인합니다.

## 가장 빠른 시작: 코딩 에이전트에게 맡기기

처음부터 사람이 JSON을 직접 작성할 필요는 없습니다. 분석하려는 프로젝트에서
Codex, Claude Code, Cursor 같은 코딩 에이전트에게 아래 프롬프트를 붙여넣으세요.

```txt
npm install -D anlyx@latest로 Anlyx를 설치해 주세요.
https://github.com/suhannoh/anlyx 문서와 Project JSON agent guide를 확인해 주세요.
이 저장소를 분석해서 anlyx.project.json을 작성해 주세요.
근거가 있는 범위에서 pages, requests, flows, architecture, evidence, overview, capabilities를 채워 주세요.
확실하지 않은 연결은 agent-inferred, not-proven, unknown으로 남겨 주세요.
아래 명령을 실행해 주세요.
  npx anlyx validate anlyx.project.json
  npx anlyx import anlyx.project.json
  npx anlyx dev
http://localhost:4777을 열고 무엇이 근거 확인됐고, 무엇이 추정이며, 무엇이 아직 불확실한지 보고해 주세요.

나중에 제가 "anlyx refresh"라고 말하면 기존 anlyx.project.json을 다시 만들지 말고 현재 변경분만 반영해 주세요.
```

Anlyx의 기본 흐름은 이렇습니다.

```txt
AI Agent가 저장소 분석
-> anlyx.project.json 작성
-> Anlyx가 검증하고 가져오기
-> localhost:4777에서 로컬 검토
```

## 왜 쓰나요?

| 기존에는...                                 | Anlyx는...                                                          |
| ------------------------------------------- | ------------------------------------------------------------------- |
| AI Agent 설명이 긴 텍스트로만 남았습니다    | Agent가 작성한 JSON을 검증 가능한 화면으로 렌더링합니다             |
| 프론트 요청과 백엔드 레이어를 따로 봤습니다 | 요청, API, Controller, Service, Repository, DB를 한 흐름으로 봅니다 |
| 프로젝트마다 기술 스택이 달라 막혔습니다    | 분석은 사용자의 AI Agent가 맡고, Anlyx는 공통 JSON 계약만 봅니다    |
| 개발자가 아니면 구조 파악이 어려웠습니다    | 기획자, 신입, 리뷰어도 Pages/Map으로 구조를 읽을 수 있습니다        |
| 근거와 추정이 섞였습니다                    | source-matched, agent-inferred, observed, not-proven을 분리합니다   |

## 빠른 시작

```bash
npm install -D anlyx@latest
npx anlyx prompt init
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev
```

그다음 `http://localhost:4777`에서 로컬 viewer를 엽니다.

Agent 작성 가이드는
[`docs/agent/anlyx-project-json-agent-guide.md`](./docs/agent/anlyx-project-json-agent-guide.md)에 있습니다.
데이터 계약은 [`docs/contracts/data-contract.md`](./docs/contracts/data-contract.md)를 기준으로 합니다.

나중에 프로젝트가 바뀌면 AI Agent에게 이렇게 말하면 됩니다.

```txt
anlyx refresh
```

또는 CLI에서 업데이트용 프롬프트를 출력할 수 있습니다.

```bash
npx anlyx prompt refresh
```

refresh 흐름은 기존 `anlyx.project.json`을 먼저 읽고, 변경된 파일을 우선 확인한 뒤,
기존 ID를 유지하면서 바뀐 pages, requests, flows, architecture, evidence만 갱신합니다.

## 핵심 원칙

- Anlyx는 프로젝트 데이터를 추측하지 않습니다.
- 실제 프로젝트 분석은 사용자의 AI Agent가 수행합니다.
- Anlyx는 `anlyx.project.json`과 `.anlyx/project/*.json`을 읽어 시각화합니다.
- 확실하지 않은 정보는 `unknown`, `not-proven`, `agent-inferred`로 남깁니다.
- timing은 실제 measurement가 있을 때만 활성화합니다. 1차 버전에서는 기본 비활성입니다.
- 비밀값, token, cookie, 운영 데이터, 실제 개인정보는 JSON에 넣지 않습니다.
- 모든 처리는 로컬 중심입니다. GitHub나 외부 서비스 업로드를 요구하지 않습니다.

## Project JSON 구조

기본 파일은 `anlyx.project.json`입니다.

```json
{
  "schemaVersion": "0.3.0",
  "project": {},
  "overview": {},
  "areas": [],
  "pages": [],
  "features": [],
  "capabilities": [],
  "requests": [],
  "flows": [],
  "architecture": {},
  "evidence": [],
  "dataLifecycles": [],
  "impactMaps": [],
  "measurements": [],
  "dictionary": { "defaultLanguage": "en", "terms": [] }
}
```

큰 프로젝트에서는 split JSON도 사용할 수 있습니다.

```txt
.anlyx/project/project.json
.anlyx/project/overview.json
.anlyx/project/pages.json
.anlyx/project/features.json
.anlyx/project/capabilities.json
.anlyx/project/requests.json
.anlyx/project/flows.json
.anlyx/project/architecture.json
.anlyx/project/evidence.json
.anlyx/project/dataLifecycles.json
.anlyx/project/impactMaps.json
.anlyx/project/dictionary.json
```

`anlyx.project.json`은 entry file이며, split 파일은 Agent가 관리합니다.

## UI 표면

| Surface      | 역할                                                      |
| ------------ | --------------------------------------------------------- |
| Pages        | 페이지 인덱스, 페이지 설명, 기능, 요청, 대표 Flow Summary |
| Map          | frontend-to-data layered architecture map                 |
| Overview     | 프로젝트 소개, authored stack, 핵심 검사 흐름             |
| Capabilities | 제품 행동, entry/request/data/evidence 연결 확인          |
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

## 릴리즈 노트

현재 베타 릴리즈 초안은 [`docs/release/v0.1.6-beta.0.md`](./docs/release/v0.1.6-beta.0.md)를 참고하세요.
