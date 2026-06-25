# Anlyx Documentation Authoring Guide

> Repository copy of the authoring rules for Anlyx v0.1 planning documents. This guide controls the pre-implementation documentation phase.

## Table of Contents

- [0. 목적](#0-목적)
- [1. 최우선 원칙](#1-최우선-원칙)
- [2. 문서 작성 순서](#2-문서-작성-순서)
- [3. 문서별 작성 지침](#3-문서별-작성-지침)
- [4. 문서 작성 완료 후 보고 형식](#4-문서-작성-완료-후-보고-형식)
- [5. 문서 간 충돌 해결 규칙](#5-문서-간-충돌-해결-규칙)
- [6. 최종 지시문](#6-최종-지시문)

## 0. 목적

이 문서는 AI Agent가 Anlyx PRD를 바탕으로 구현 전 필수 설계 문서를 작성할 때 따라야 하는 기준서다.

목표는 다음이다.

```txt
PRD의 모호함을 줄이고,
v0.1 구현 범위를 고정하며,
AI Agent가 엉뚱한 기능을 만들거나 길을 잃지 않도록
구체적인 문서 자산을 먼저 준비한다.
```

이 문서를 받은 Agent는 **바로 코드를 구현하지 않는다.**
먼저 이 문서에 정의된 설계 문서를 순서대로 작성하고, 사용자 검토를 받은 뒤 구현 단계로 넘어간다.

---

# 1. 최우선 원칙

## 1.1 PRD는 제품 방향, 이 문서는 작업 통제 기준이다

PRD는 “무엇을 만들 것인가”를 설명한다.
이 문서는 “구현 전에 어떤 문서를 만들고, 그 문서를 어떻게 따라야 하는가”를 정의한다.

Agent는 PRD와 이 문서를 함께 읽어야 한다.

## 1.2 v0.1 범위를 임의로 확장하지 않는다

Anlyx v0.1의 Deep Support 대상은 다음으로 제한한다.

```txt
Backend: Spring Boot
Frontend: Next.js App Router
Basic Backend Fallback: OpenAPI
```

v0.1에서 다음은 구현하지 않는다.

```txt
- FastAPI Deep Support
- Express Deep Support
- NestJS Adapter
- Flask/Django Adapter
- React Router Deep Support
- GitHub Actions 리포트
- Mermaid export
- PNG/SVG export
- 정적 HTML 리포트 export
- Java Agent 런타임 트레이싱
- PR Diff
- LLM 요약
- 3D UI
```

## 1.3 문서 작성 중 코드 구현 금지

Agent는 이 문서 세트를 완성하기 전까지 실제 패키지, CLI, UI, Adapter 구현을 시작하지 않는다.

허용되는 작업:

```txt
- README.md 작성
- README.ko.md 작성
- LICENSE 작성
- .gitignore 작성
- docs/** 문서 작성
- fixtures/** 설계 문서 작성
- expected JSON 예시 작성
- AGENTS.md 초안 작성
```

금지되는 작업:

```txt
- packages/** 실제 구현
- CLI 구현
- React UI 구현
- Adapter 구현
- 테스트 코드 구현
```

## 1.4 MUST / SHOULD / MAY / MUST NOT 사용

문서에는 모호한 표현을 줄이기 위해 다음 표현을 사용한다.

```txt
MUST: 반드시 지켜야 한다.
SHOULD: 특별한 이유가 없으면 따라야 한다.
MAY: 선택적으로 허용한다.
MUST NOT: 절대 하면 안 된다.
```

## 1.5 저장소 초기화 및 첫 커밋 규칙

Anlyx GitHub 저장소는 이미 생성되어 있다.

```txt
Repository URL: https://github.com/suhannoh/anlyx.git
Repository name: anlyx
Visibility: Public
```

Agent는 이 저장소를 **이전 프로젝트의 연장선이 아닌 새로운 Anlyx 프로젝트**로 취급해야 한다.

첫 커밋은 구현 커밋이 아니라 **repository bootstrap commit**으로 제한한다.

첫 커밋에서 생성할 파일은 다음으로 제한한다.

```txt
- README.md
- README.ko.md
- LICENSE
- .gitignore
```

첫 커밋에서 생성하지 말아야 할 파일은 다음과 같다.

```txt
- packages/**
- src/**
- app/**
- cli/**
- 실제 구현 코드
- 실제 테스트 코드
- FastAPI / Express / React Router 등 v0.1 제외 범위 관련 코드
```

README 작성 기준은 다음과 같다.

```txt
README.md:
- English main README
- 상단에 Korean README 링크 포함
- Anlyx 한 줄 설명 포함
- v0.1 status가 planning/design phase임을 명시
- 주요 기능 요약
- v0.1 scope 요약
- 문서 작성 후 구현 예정임을 명시

README.ko.md:
- Korean README
- 상단에 English README 링크 포함
- Anlyx 한국어 설명 포함
- v0.1은 Spring Boot + Next.js App Router 중심임을 명시
- 아직 구현 전 설계 단계임을 명시
```

LICENSE 작성 기준은 다음과 같다.

```txt
- MIT License 사용
- Copyright holder: suhannoh
```

.gitignore 작성 기준은 다음과 같다.

```txt
- Node.js / TypeScript 프로젝트 기준
- package manager artifacts 제외
- build output 제외
- test coverage 제외
- env 파일 제외
- Playwright output 제외
- Anlyx generated output 제외
```

.gitignore에는 최소한 다음 패턴을 포함한다.

```gitignore
node_modules/
dist/
build/
coverage/
.next/
.turbo/
.env
.env.*
!.env.example
playwright-report/
test-results/
.anlyx/
.DS_Store
```

첫 커밋 메시지는 다음 중 하나를 사용한다.

```txt
chore: initialize Anlyx repository
```

또는

```txt
docs: initialize Anlyx repository
```

첫 커밋 이후에만 이 문서에 정의된 설계 문서 세트 작성을 시작한다.

---

# 2. 문서 작성 순서

Agent는 다음 순서로 문서를 작성한다.

```txt
0. Repository bootstrap
   - README.md
   - README.ko.md
   - LICENSE
   - .gitignore
   - first commit

1. docs/product/v0.1-scope-lock.md
2. docs/contracts/data-contract.md
3. docs/contracts/config-contract.md
4. docs/contracts/adapter-contract.md
5. docs/adapters/spring-rules.md
6. docs/adapters/next-rules.md
7. docs/adapters/openapi-rules.md
8. docs/fixtures/spring-next-sample-spec.md
9. docs/design/screens.md
10. docs/design/design-tokens.md
11. docs/design/node-edge-style.md
12. docs/design/replay-lite.md
13. docs/acceptance/v0.1-checklist.md
14. AGENTS.md
```

문서 간 의존성은 다음과 같다.

```txt
Repository Bootstrap
  → 저장소의 첫 상태와 공개 문서의 기본 방향을 고정한다.

Scope Lock
  → 모든 문서의 범위를 제한한다.

Data Contract
  → Adapter Contract, UI, Fixture, Acceptance 기준이 된다.

Adapter Rules
  → Fixture Expected Output과 Acceptance 기준이 된다.

Design Docs
  → UI 구현 기준이 된다.

Acceptance Checklist
  → 구현 완료 여부의 최종 기준이 된다.

AGENTS.md
  → 이후 모든 Agent 작업 규칙이 된다.
```

---

# 3. 문서별 작성 지침

## 3.0 Repository Bootstrap Files

### 목적

빈 GitHub 저장소를 Anlyx 오픈소스 프로젝트로 초기화한다.

이 단계는 구현이 아니라, 공개 저장소의 기본 문서와 라이선스를 세팅하는 단계다.

### 대상 저장소

```txt
https://github.com/suhannoh/anlyx.git
```

### 반드시 생성할 파일

```txt
- README.md
- README.ko.md
- LICENSE
- .gitignore
```

### README.md 작성 기준

README.md는 영어를 기본으로 한다.

반드시 포함할 내용:

```txt
- Project name: Anlyx
- Link to README.ko.md
- Tagline: Visual flow maps for modern web apps.
- Short description
- What Anlyx will do
- v0.1 scope
- Current status: planning/design phase
- Documentation-first development notice
```

권장 구조:

```md
# Anlyx

[한국어 문서](./README.ko.md)

Visual flow maps for modern web apps.

Anlyx turns frontend pages, backend endpoints, services, repositories, and database flows into interactive flow maps and storyboards.

> Status: Planning / Design phase. Implementation has not started yet.

## v0.1 Scope

- Spring Boot Deep Support
- Next.js App Router Deep Support
- OpenAPI Basic Support
- Page Storyboard
- Main Flow / Sub Flow
- Replay Lite

## Development Approach

This repository follows documentation-first development.
The implementation starts only after the v0.1 design documents are reviewed.
```

### README.ko.md 작성 기준

README.ko.md는 한국어를 기본으로 한다.

반드시 포함할 내용:

```txt
- 프로젝트명: Anlyx
- README.md 링크
- 한국어 한 줄 설명
- Anlyx가 해결하는 문제
- v0.1 범위
- 현재 상태: 기획/설계 단계
- 문서 우선 개발 방식 안내
```

권장 구조:

```md
# Anlyx

[English README](./README.md)

Anlyx는 프론트 페이지부터 백엔드 엔드포인트, 서비스 레이어, 데이터베이스까지 이어지는 흐름을 애니메이션 맵으로 보여주는 개발자 도구입니다.

> 상태: 기획 / 설계 단계입니다. 아직 실제 구현은 시작하지 않습니다.

## v0.1 범위

- Spring Boot Deep Support
- Next.js App Router Deep Support
- OpenAPI Basic Support
- Page Storyboard
- Main Flow / Sub Flow
- Replay Lite

## 개발 방식

이 저장소는 문서 우선 개발 방식을 따릅니다.
v0.1 설계 문서가 검토된 뒤 구현을 시작합니다.
```

### LICENSE 작성 기준

LICENSE는 MIT License를 사용한다.

```txt
License: MIT
Copyright holder: suhannoh
```

### .gitignore 작성 기준

Node.js / TypeScript / Playwright / Anlyx generated output 기준으로 작성한다.

반드시 포함할 패턴:

```gitignore
node_modules/
dist/
build/
coverage/
.next/
.turbo/
.env
.env.*
!.env.example
playwright-report/
test-results/
.anlyx/
.DS_Store
```

### 첫 커밋 기준

첫 커밋은 위 4개 파일만 포함한다.

권장 커밋 메시지:

```txt
chore: initialize Anlyx repository
```

또는

```txt
docs: initialize Anlyx repository
```

### 완료 기준

Agent가 첫 커밋 완료 후 다음을 보고해야 한다.

```txt
- 생성한 파일 목록
- 사용한 커밋 메시지
- 구현 코드를 추가하지 않았다는 확인
- 다음 단계가 설계 문서 세트 작성이라는 확인
```

---

## 3.1 docs/product/v0.1-scope-lock.md

### 목적

v0.1에서 할 것과 하지 않을 것을 명확히 고정한다.

### 반드시 포함할 내용

```txt
- v0.1 핵심 목표
- v0.1 Deep Support 대상
- v0.1 Basic Support 대상
- v0.1 필수 기능
- v0.1 제외 기능
- v0.2 이후로 미룰 기능
- 범위 변경 규칙
```

### 작성 기준

v0.1 Deep Support는 반드시 다음으로 제한한다.

```txt
Spring Boot + Next.js App Router
```

OpenAPI는 Basic Support만 제공한다.

### 완료 기준

이 문서를 읽은 Agent가 다음을 명확히 알 수 있어야 한다.

```txt
무엇을 구현해야 하는가?
무엇을 절대 구현하면 안 되는가?
추가 기능 제안을 어디까지 거절해야 하는가?
```

---

## 3.2 docs/contracts/data-contract.md

### 목적

Anlyx 내부에서 사용하는 공통 데이터 구조를 고정한다.

분석기, UI, 캡처, Fixture, 테스트는 모두 이 데이터 계약을 기준으로 동작해야 한다.

### 반드시 포함할 타입

```txt
- Endpoint
- FlowNode
- FlowEdge
- EndpointFlow
- PageStoryboard
- ScanResult
- CaptureResult
- ConfidenceLevel
```

### 반드시 포함할 예시

각 타입은 TypeScript 타입 정의와 JSON 예시를 함께 제공해야 한다.

예시:

```ts
type ConfidenceLevel = "high" | "medium" | "low" | "unknown";
```

```json
{
  "id": "service:PublicBenefitService",
  "type": "service",
  "label": "PublicBenefitService",
  "filePath": "backend/src/main/java/.../PublicBenefitService.java",
  "lineNumber": 82,
  "confidence": "high"
}
```

### 작성 기준

Data Contract는 구현 중 임의로 바꾸면 안 된다.

변경이 필요한 경우 다음을 먼저 수정해야 한다.

```txt
1. data-contract.md
2. 관련 fixture expected JSON
3. acceptance checklist
4. 변경 이유 설명
```

### 완료 기준

이 문서만 보고도 Agent가 `.anlyx/report-data.json`의 구조를 만들 수 있어야 한다.

---

## 3.3 docs/contracts/config-contract.md

### 목적

`anlyx.config.ts`의 구조를 고정한다.

### 반드시 포함할 내용

```txt
- defineConfig 사용 예시
- Spring Boot + Next.js 예시
- OpenAPI-only 예시
- backend 설정 필드
- frontend 설정 필드
- capture 설정 필드
- server 설정 필드
- sampleParams 규칙
- storageState 규칙
```

### 필수 설정 예시

```ts
export default defineConfig({
  projectName: "Zup",

  backend: {
    type: "spring",
    sourceDir: "./backend/src/main/java",
    baseUrl: "http://localhost:8080",
    openApiUrl: "http://localhost:8080/v3/api-docs",
    actuatorMappingsUrl: "http://localhost:8080/actuator/mappings",
    maxMainDepth: 4,
    maxSubDepth: 1
  },

  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000",
    router: "app",
    viewport: {
      width: 1440,
      height: 900
    },
    capture: {
      mode: "segments",
      segmentHeight: 900,
      storageState: "./.anlyx/auth-state.json"
    },
    sampleParams: {
      "/benefit/[brandSlug]/[benefitSlugWithId]": {
        brandSlug: "starbucks",
        benefitSlugWithId: "birthday-coupon-123"
      }
    }
  },

  server: {
    port: 4777,
    mode: "inject",
    openBrowser: true
  },

  dev: {
    command: "npm run dev"
  }
});
```

### 완료 기준

이 문서를 보고 Agent가 `anlyx.config.ts` 타입을 구현할 수 있어야 한다.

---

## 3.4 docs/contracts/adapter-contract.md

### 목적

각 Adapter가 어떤 입력을 받고 어떤 출력을 반환해야 하는지 정의한다.

### 반드시 포함할 Adapter

```txt
- SpringBackendAdapter
- OpenApiBackendAdapter
- NextFrontendAdapter
- CaptureAdapter
```

### 반드시 포함할 인터페이스

```ts
type BackendAdapter = {
  name: string;
  scanEndpoints(): Promise<Endpoint[]>;
  scanFlows(endpoints: Endpoint[]): Promise<EndpointFlow[]>;
};

type FrontendAdapter = {
  name: string;
  scanPages(): Promise<PageStoryboard[]>;
};

type CaptureAdapter = {
  capturePages(pages: PageStoryboard[]): Promise<PageStoryboard[]>;
};
```

### 작성 기준

Adapter는 UI에 직접 의존하지 않는다.

Adapter는 반드시 Data Contract에 맞는 결과만 반환한다.

### 완료 기준

이 문서를 보고 Agent가 Adapter 패키지의 public interface를 만들 수 있어야 한다.

---

## 3.5 docs/adapters/spring-rules.md

### 목적

Spring Boot 프로젝트를 어떻게 분석할지 구체적으로 정의한다.

### 반드시 포함할 수집 대상

```txt
- @RestController
- @Controller
- @RequestMapping
- @GetMapping
- @PostMapping
- @PutMapping
- @PatchMapping
- @DeleteMapping
- @Service
- @Repository
- @Entity
- @Table
```

### 반드시 포함할 분석 규칙

```txt
- Controller endpoint 추출 방식
- class-level RequestMapping과 method-level Mapping 조합 방식
- HTTP Method 판별 방식
- Handler Method 이름 추출
- Request DTO / Response DTO best-effort 추론
- Controller → Service 호출 추론
- Service → Repository 호출 추론
- Repository → Entity 추론
- Entity → DB Table 추론
- Sub Flow 판별 기준
- depth 제한
- 순환 호출 중단 기준
```

### confidence 규칙

```txt
High:
직접 클래스 호출 또는 단일 구현체가 명확한 경우

Medium:
인터페이스 타입이지만 구현체가 하나만 발견된 경우

Low:
구현체가 여러 개이거나 동적 주입 가능성이 있는 경우

Unknown:
분석 불가 또는 런타임 정보가 필요한 경우
```

### 반드시 명시할 한계

```txt
- DI/AOP/Proxy는 완전 추적하지 않는다.
- @Transactional, @Cacheable, @Async는 v0.1에서 실행 흐름으로 확장하지 않는다.
- Java Agent 기반 런타임 트레이싱은 v0.3 후보이다.
```

### 완료 기준

이 문서를 보고 Agent가 Spring 분석 범위를 과장하지 않고 구현할 수 있어야 한다.

---

## 3.6 docs/adapters/next-rules.md

### 목적

Next.js 프로젝트에서 실제 Page만 수집하는 규칙을 정의한다.

### 수집 대상

```txt
- app/**/page.tsx
- app/**/page.jsx
- app/**/page.ts
- app/**/page.js
```

### v0.1 우선 대상

```txt
Next.js App Router
```

### 제외 대상

```txt
- app/**/layout.tsx
- app/**/loading.tsx
- app/**/error.tsx
- app/**/not-found.tsx
- pages/api/**
- components/**
- hooks/**
- utils/**
- tests/**
- stories/**
```

### 동적 라우트 규칙

```txt
- [param] 형태는 동적 라우트로 본다.
- 동적 라우트는 실제 데이터 개수만큼 확장하지 않는다.
- sampleParams가 있으면 대표 URL을 만든다.
- sampleParams가 없으면 captureStatus = pending 처리한다.
```

### 완료 기준

이 문서를 보고 Agent가 Zup 같은 프로젝트에서 수백 개의 상세 페이지를 생성하지 않고, Page 템플릿 단위로만 수집할 수 있어야 한다.

---

## 3.7 docs/adapters/openapi-rules.md

### 목적

Spring Boot 외 백엔드를 OpenAPI 기반 Basic Support로 처리하는 규칙을 정의한다.

### 반드시 포함할 내용

```txt
- openApiUrl 입력 방식
- paths 기반 Endpoint 생성 방식
- method/path/tags/requestSchema/responseSchema 추출 규칙
- OpenAPI-only에서는 내부 Flow를 생성하지 않는다는 규칙
- DB Table 노드를 생성하지 않는다는 규칙
```

### OpenAPI-only Flow 규칙

OpenAPI-only 백엔드는 다음 수준까지만 표시한다.

```txt
Endpoint
Request Schema
Response Schema
```

Controller, Service, Repository, DB 노드는 생성하지 않는다.

### 완료 기준

이 문서를 보고 Agent가 FastAPI, Express, NestJS 등을 임의로 Deep 분석하지 않아야 한다.

---

## 3.8 docs/fixtures/spring-next-sample-spec.md

### 목적

v0.1 구현 검증용 Fixture 프로젝트의 구조와 Expected Output을 정의한다.

### 반드시 포함할 Fixture 구조

```txt
fixtures/
  spring-next-sample/
    backend/
    frontend/
    expected/
      endpoints.json
      flows.json
      pages.json
      report-data.json
```

### 샘플 백엔드 흐름

```txt
GET /api/public/benefits/{id}

PublicBenefitController#getDetail
→ PublicBenefitService#getBenefitDetail
→ BenefitRepository#findById
→ benefits table

Sub Flow:
→ BenefitDisplayMapper
→ DateRangeUtil
→ PublicVisibilityPolicy
```

### 샘플 프론트 페이지

```txt
app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx
app/benefits/page.tsx
app/admin/benefits/page.tsx
```

### 반드시 포함할 실패 케이스

```txt
/admin/benefits
captureStatus: failed
reason: Login required
```

### 완료 기준

이 문서를 보고 Agent가 Fixture 프로젝트와 expected JSON을 만들 수 있어야 한다.

---

## 3.9 docs/design/screens.md

### 목적

v0.1 UI 화면 구성을 고정한다.

### v0.1 화면

```txt
1. Endpoint Map
2. Page Storyboard
3. Replay Lite
```

### Endpoint Map에 반드시 포함할 요소

```txt
Left:
- 프로젝트명
- 검색창
- Endpoint / Pages / Replay 탭
- Method badge가 있는 endpoint list

Center:
- 선택된 endpoint header
- React Flow canvas
- Frontend Page → Endpoint → Controller → Service → Repository → DB 흐름
- Main Flow / Sub Flow 구분

Right:
- selected node inspector
- type/class/method/file/line
- confidence badge
- used by pages
- sub flows
- DB tables
- response schema

Bottom:
- Replay Lite controls
```

### Page Storyboard에 반드시 포함할 요소

```txt
- Page route
- file path
- capture status
- screenshot segments
- API calls
- failed capture empty state
```

### 완료 기준

이 문서를 보고 Agent가 UI 배치를 임의로 바꾸지 않아야 한다.

---

## 3.10 docs/design/design-tokens.md

### 목적

Anlyx UI의 색상, 간격, 폰트, radius, 상태 표현을 고정한다.

### 반드시 포함할 테마

```txt
Default: Clean Light
Optional: Dark Mode
Demo: Dark Replay
```

### 반드시 포함할 색상 역할

```txt
Background
Panel
Canvas
Border
Text Primary
Text Secondary

GET
POST
PUT/PATCH
DELETE

Controller
Service
Repository
Database
Sub Flow
Confidence High
Confidence Medium
Confidence Low
Unknown
```

### 디자인 금지사항

```txt
MUST NOT use:
- 과도한 glassmorphism
- 3D 노드
- 배경 파티클
- 모든 노드 상시 glow
- 모든 화면 dark-only
- 정보 가독성을 해치는 장식
```

### 완료 기준

이 문서를 보고 Agent가 Claude 목업 방향의 Clean Light UI를 구현할 수 있어야 한다.

---

## 3.11 docs/design/node-edge-style.md

### 목적

FlowNode와 FlowEdge의 시각 표현을 고정한다.

### 반드시 포함할 노드 스타일

```txt
Frontend Page:
screenshot thumbnail card

Endpoint:
method badge + path

Controller:
blue accent border

Service:
violet accent border

Repository:
emerald accent border

Database:
table/cylinder card

DTO:
document card

Utility/Mapper/Validator:
small secondary card

Unknown:
gray warning card
```

### 반드시 포함할 Edge 스타일

```txt
Main Flow:
solid 2px

Sub Flow:
dashed 1px

Inferred:
dashed with confidence badge

Unknown:
gray dotted

Request:
animated dot forward

Response:
animated dot backward
```

### 완료 기준

이 문서를 보고 Agent가 React Flow custom node/edge 구현 방향을 명확히 알 수 있어야 한다.

---

## 3.12 docs/design/replay-lite.md

### 목적

Replay Lite의 동작을 구체적으로 정의한다.

### v0.1 Replay Lite 동작

```txt
1. Frontend Page 노드에서 request dot 출발
2. Endpoint 노드 highlight
3. Controller 노드 highlight
4. Service 노드 highlight
5. Repository 노드 highlight
6. Database 노드 pulse
7. Response dot이 반대 방향으로 이동
8. Frontend Page 노드로 복귀
9. 반복 재생 가능
```

### v0.1 제공 옵션

```txt
- play
- pause
- restart
- loop on/off
- main flow only
```

### v0.1에서 하지 않을 것

```txt
- 속도 조절
- step-by-step 디버깅
- Sub Flow 포함 replay
- timeline event log
```

### 완료 기준

이 문서를 보고 Agent가 Replay Lite를 과하게 구현하지 않아야 한다.

---

## 3.13 docs/acceptance/v0.1-checklist.md

### 목적

v0.1 구현 완료 여부를 판단하는 체크리스트를 정의한다.

### 반드시 포함할 카테고리

```txt
- CLI
- Config
- Spring Adapter
- OpenAPI Adapter
- Next Adapter
- Capture
- Data Contract
- UI
- Replay Lite
- Fixture
- Scope Guard
```

### 체크리스트 예시

```txt
CLI
- [ ] npx anlyx init 실행 시 anlyx.config.ts가 생성된다.
- [ ] npx anlyx scan 실행 시 .anlyx/report-data.json이 생성된다.
- [ ] npx anlyx dev 실행 시 localhost:4777에서 Anlyx runtime이 열린다.
- [ ] Inject Mode에서 실제 프론트엔드는 frontend.baseUrl에서 그대로 열린다.
- [ ] `npx anlyx dev`가 개발 중인 실제 앱 옆에서 capture/runtime helper를 제공한다.
- [ ] standalone debug viewer는 localhost:4777/_anlyx/viewer에서 열린다.

Spring Adapter
- [ ] GET /api/public/benefits/{id}를 수집한다.
- [ ] Controller 노드를 생성한다.
- [ ] Service 노드를 생성한다.
- [ ] Repository 노드를 생성한다.
- [ ] benefits DB 노드를 생성한다.
- [ ] confidence를 표시한다.

Next Adapter
- [ ] app/**/page.tsx만 Page로 수집한다.
- [ ] 동적 라우트는 sampleParams가 있을 때만 캡처한다.
- [ ] sampleParams가 없으면 pending 처리한다.

UI
- [ ] Endpoint Map이 표시된다.
- [ ] Page Storyboard가 표시된다.
- [ ] Right Inspector가 표시된다.
- [ ] Main Flow와 Sub Flow가 구분된다.
- [ ] Replay Lite가 동작한다.
```

### 완료 기준

Agent가 구현 완료 보고 시 이 체크리스트를 기준으로 결과를 설명해야 한다.

---

## 3.14 AGENTS.md

### 목적

이후 Anlyx 저장소에서 AI Agent가 따라야 할 최상위 작업 규칙을 정의한다.

### 반드시 포함할 규칙

```txt
1. 구현 전 docs/product/prd.md와 docs/product/v0.1-scope-lock.md를 먼저 읽는다.
2. v0.1 제외 기능을 임의로 구현하지 않는다.
3. 데이터 계약 변경 시 docs/contracts/data-contract.md를 먼저 수정한다.
4. UI 변경 시 docs/design 문서를 먼저 확인한다.
5. Adapter 구현은 docs/adapters 규칙을 따른다.
6. Fixture expected output과 맞지 않으면 완료로 보지 않는다.
7. 실패/Unknown 상태를 숨기지 않는다.
8. 작업 전 계획을 작성하고 사용자 승인을 받는다.
9. 구현 후 acceptance checklist를 업데이트한다.
10. 사용자가 요청하지 않은 프레임워크 지원을 추가하지 않는다.
```

### 완료 기준

AGENTS.md만 읽어도 AI Agent가 Anlyx 작업 방식과 금지 범위를 이해할 수 있어야 한다.

---

# 4. 문서 작성 완료 후 보고 형식

Agent는 모든 문서를 작성한 뒤 다음 형식으로 보고한다.

```txt
Repository bootstrap:
- README.md
- README.ko.md
- LICENSE
- .gitignore
- first commit message

작성 완료 문서:
- docs/product/v0.1-scope-lock.md
- docs/contracts/data-contract.md
- ...

핵심 결정:
- v0.1 Deep Support는 Spring Boot + Next.js로 제한
- OpenAPI는 Basic Support만 제공
- UI 기본값은 Clean Light
- Replay는 Replay Lite만 제공

아직 구현하지 않은 것:
- packages/**
- CLI
- UI
- Adapter

검토가 필요한 부분:
- Data Contract 필드명
- Fixture expected JSON
- Design Token 색상값
- Acceptance Checklist 기준
```

Agent는 문서 작성 완료 후 바로 구현을 시작하지 않는다.
사용자의 승인 후 다음 단계로 넘어간다.

---

# 5. 문서 간 충돌 해결 규칙

문서 간 내용이 충돌할 경우 우선순위는 다음과 같다.

```txt
1. v0.1-scope-lock.md
2. data-contract.md
3. adapter-contract.md
4. spring-rules.md / next-rules.md / openapi-rules.md
5. design-tokens.md / screens.md / node-edge-style.md / replay-lite.md
6. acceptance checklist
7. PRD
```

즉, PRD에 넓은 비전이 있더라도 v0.1 Scope Lock이 더 우선한다.

예시:

```txt
PRD에 FastAPI 확장 가능성이 적혀 있어도,
v0.1-scope-lock.md에서 FastAPI Deep Support를 제외했다면
Agent는 FastAPI Deep Support를 구현하면 안 된다.
```

---

# 6. 최종 지시문

Agent는 이 문서를 기준으로 Anlyx 구현 전 설계 문서 세트를 작성한다.

반드시 지켜야 할 원칙은 다음이다.

```txt
- 바로 구현하지 않는다.
- 첫 단계로 README.md, README.ko.md, LICENSE, .gitignore만 생성한다.
- 첫 커밋에는 구현 코드를 포함하지 않는다.
- 그 다음 문서 세트를 작성한다.
- v0.1 범위를 확장하지 않는다.
- Data Contract를 먼저 고정한다.
- Adapter Contract를 먼저 고정한다.
- Fixture와 Expected Output을 만든다.
- Acceptance Checklist를 만든다.
- 사용자 승인 전 구현 단계로 넘어가지 않는다.
```

이 문서의 목표는 Anlyx 구현 과정에서 AI Agent가 길을 잃지 않도록, PRD를 실행 가능한 설계 자산으로 분해하는 것이다.
