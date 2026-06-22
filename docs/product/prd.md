# PRD — Anlyx

> Repository copy of the Anlyx Product Requirements Document. This document preserves the original product scope and intent for v0.1 planning.

## Table of Contents

- [0. 문서 정보](#0-문서-정보)
- [1. 프로젝트 개요](#1-프로젝트-개요)
- [2. 브랜드 정의](#2-브랜드-정의)
- [3. 문제 정의](#3-문제-정의)
- [4. 핵심 가치](#4-핵심-가치)
- [5. 핵심 사용자](#5-핵심-사용자)
- [6. 제품 목표](#6-제품-목표)
- [7. 비목표](#7-비목표)
- [8. 핵심 개념](#8-핵심-개념)
- [9. 지원 수준 전략](#9-지원-수준-전략)
- [10. v0.1 지원 대상](#10-v01-지원-대상)
- [11. 백엔드 기능 요구사항](#11-백엔드-기능-요구사항)
- [12. 프론트 기능 요구사항](#12-프론트-기능-요구사항)
- [13. Replay Lite 요구사항](#13-replay-lite-요구사항)
- [14. 최종 디자인 방향](#14-최종-디자인-방향)
- [15. 설치 및 실행 방식](#15-설치-및-실행-방식)
- [16. 설정 파일 예시](#16-설정-파일-예시)
- [17. 내부 아키텍처](#17-내부-아키텍처)
- [18. 공통 데이터 모델 초안](#18-공통-데이터-모델-초안)
- [19. 기술 스택](#19-기술-스택)
- [20. v0.1 필수 기능](#20-v01-필수-기능)
- [21. v0.1 제외 기능](#21-v01-제외-기능)
- [22. v0.2 후보 기능](#22-v02-후보-기능)
- [23. v0.3 후보 기능](#23-v03-후보-기능)
- [24. 성공 기준](#24-성공-기준)
- [25. 핵심 차별점](#25-핵심-차별점)
- [26. 주요 리스크](#26-주요-리스크)
- [27. README 대표 이미지 방향](#27-readme-대표-이미지-방향)
- [28. 이미지 생성 프롬프트](#28-이미지-생성-프롬프트)
- [29. 리뷰어 검증 질문](#29-리뷰어-검증-질문)
- [30. 최종 요약](#30-최종-요약)

## 0. 문서 정보

- 프로젝트명: **Anlyx**
- 발음: **앤릭스**
- 분류: 오픈소스 개발자 도구 / API Flow Storyboard / Interaction Flow Inspector
- v0.1 핵심 대상: **Spring Boot + Next.js App Router**
- 문서 목적: Anlyx의 제품 방향, MVP 범위, 핵심 기능, 디자인 방향, 기술 스택을 정의한다.

---

# 1. 프로젝트 개요

**Anlyx**는 실제 로컬 프론트엔드 앱 위에 얇은 개발자 오버레이를 올리고, 사용자가 앱에서 버튼이나 컴포넌트를 눌러 발생시킨 API 요청이 어떤 백엔드 엔드포인트, 서비스 레이어, Repository, 데이터베이스 흐름으로 이어지는지 즉시 보여주는 개발자 도구다.

개발자는 Anlyx를 통해 별도의 목록 화면에서 엔드포인트를 고르는 대신, 평소처럼 로컬 앱을 사용한다. Anlyx는 브라우저에서 관찰한 API 요청을 스캔된 정적 분석 결과와 매칭하고, 우측 Flow Drawer에서 해당 요청이 어떤 Controller, Service, Repository, Database Table, Frontend Page와 연결되는지 보여준다.

또한 프론트 화면에서 시작된 요청이 백엔드와 데이터베이스를 거쳐 다시 화면으로 돌아오는 흐름을 애니메이션으로 재생하여, 정적인 문서가 아니라 **“실제 앱에서 바로 열리는 애플리케이션 구조 지도”**처럼 보여주는 것을 목표로 한다.

---

# 2. 브랜드 정의

## 2.1 프로젝트명

**Anlyx**

의미:

```txt
Analyze + Links + X
```

해석:

- Analyze: 프로젝트 구조를 분석한다.
- Links: 페이지, API, 서비스, DB의 연결을 보여준다.
- X: 개발자 도구다운 확장성, 실험성, 시각화의 느낌을 준다.

## 2.2 슬로건

```txt
Anlyx — Interaction-first flow maps for modern web apps.
```

## 2.3 한 줄 설명

```txt
Anlyx turns real app interactions, APIs, services, and database flows into animated evidence maps.
```

## 2.4 한국어 설명

```txt
Anlyx는 실제 프론트 앱 조작에서 발생한 API를 백엔드 엔드포인트, 서비스 레이어, 데이터베이스 흐름까지 이어 보여주는 개발자 도구다.
```

---

# 3. 문제 정의

대부분의 웹 프로젝트는 규모가 커질수록 다음 문제가 발생한다.

1. API 엔드포인트가 많아져서 어떤 API가 어떤 화면에서 사용되는지 파악하기 어렵다.
2. Controller, Service, Repository, Entity, DTO가 분리되어 있어 요청 흐름을 따라가기 어렵다.
3. 비즈니스 로직 중간에 다른 Service, Utility, Mapper, Validator, Cache, 외부 API가 섞이면 핵심 흐름과 보조 흐름을 구분하기 어렵다.
4. Swagger는 API 목록과 명세는 보여주지만, 내부 처리 흐름과 프론트 화면 연결까지 보여주지는 않는다.
5. Storybook은 컴포넌트 문서화에는 강하지만, 실제 Page → API → Backend → DB 흐름을 보여주지는 않는다.
6. APM/Tracing 도구는 운영 환경의 트레이스와 성능 분석에는 강하지만, 신규 기여자 온보딩용 구조 이해 도구로는 무겁다.
7. Call Graph 도구는 코드 호출 관계를 보여줄 수 있지만, 실제 프론트 화면, API, DB 흐름까지 보기 좋게 연결하지는 못한다.
8. 신규 합류자나 오픈소스 기여자는 프로젝트 구조를 이해하기 위해 README, Swagger, 코드, DB 스키마, 프론트 라우트를 따로 확인해야 한다.

Anlyx는 이 문제를 해결하기 위해 **API 명세 + 코드 흐름 + 프론트 화면 캡처 + 요청/응답 애니메이션**을 하나의 개발자 경험으로 묶는다.

---

# 4. 핵심 가치

Anlyx의 핵심 가치는 다음 한 문장으로 정리된다.

```txt
코드 흐름을 읽기 쉽게, 보기 좋게, 공유 가능하게 만든다.
```

Anlyx는 단순한 정적 분석기가 아니다.

Anlyx는 프로젝트를 처음 보는 사람이 다음 질문에 빠르게 답할 수 있도록 돕는 온보딩/시각화 도구다.

```txt
이 화면은 어떤 API를 호출하는가?
이 API는 어떤 Controller에서 시작되는가?
어떤 Service와 Repository를 거치는가?
어떤 DB Table과 연결되는가?
응답은 다시 어떤 화면으로 돌아가는가?
```

---

# 5. 핵심 사용자

## 5.1 오픈소스 Maintainer

오픈소스 프로젝트에 새로 온 기여자가 프로젝트 구조를 빠르게 이해하도록 돕고 싶다.

핵심 시나리오:

```txt
New contributor? Run Anlyx and see how this app works.
```

## 5.2 신규 합류 개발자

회사 프로젝트에 처음 합류했을 때, 프론트 페이지와 백엔드 API, DB 흐름을 빠르게 파악하고 싶다.

## 5.3 주니어 개발자

Controller, Service, Repository, Database가 실제로 어떻게 이어지는지 시각적으로 학습하고 싶다.

## 5.4 프로젝트 오너

자신의 프로젝트 구조를 README, 문서 사이트, 포트폴리오에 보기 좋게 보여주고 싶다.

## 5.5 리팩토링 담당자

특정 API가 어떤 화면, 서비스, Repository, DB Table과 연결되어 있는지 영향 범위를 파악하고 싶다.

---

# 6. 제품 목표

## 6.1 전체 목표

1. `anlyx dev`가 로컬 Anlyx 런타임 서버를 띄우고, 실제 프론트 앱은 기존 `frontend.baseUrl`에서 그대로 실행되도록 유지한다.
2. 사용자가 실제 앱에서 버튼이나 컴포넌트를 눌렀을 때 발생한 API 요청을 브라우저에서 관찰한다.
3. 관찰된 요청을 스캔된 엔드포인트와 매칭하고, 우측 Flow Drawer에서 내부 처리 흐름을 보여준다.
4. Main Flow와 Sub Flow를 구분해 복잡한 호출 구조를 읽기 쉽게 만든다.
5. 프론트 페이지에서 백엔드로 요청이 이동하고, DB 처리 후 다시 화면으로 응답이 돌아오는 과정을 애니메이션으로 보여준다.
6. 실제 프론트 Page 단위만 탐색하고, Playwright 기반으로 화면을 캡처해 fallback/debug 스토리보드로 만든다.
7. 세로로 긴 페이지는 Desktop 기준으로 여러 구간으로 나누어 캡처한다.
8. npm 기반 CLI로 설치 및 실행할 수 있게 한다.
9. 결과물을 실제 앱 위에 주입된 로컬 오버레이와 fallback/debug 로컬 웹 UI에서 확인할 수 있게 한다.
10. v0.1에서는 Spring Boot + Next.js App Router 조합을 가장 완성도 있게 지원한다.
11. 다른 백엔드는 OpenAPI 기반 Basic Support를 제공한다.

## 6.2 v0.1 목표

v0.1은 모든 프레임워크를 깊게 지원하지 않는다.

v0.1의 목표는 다음이다.

```txt
Spring Boot + Next.js 프로젝트 하나를 가장 예쁘고 이해하기 쉽게 보여주는 것
+
OpenAPI 기반으로 다른 백엔드도 최소한의 엔드포인트 목록을 보여주는 것
```

---

# 7. 비목표

v0.1에서 다음은 목표로 하지 않는다.

1. 모든 언어와 모든 프레임워크의 완벽한 내부 흐름 분석
2. FastAPI, Express, NestJS, Django, Flask의 Deep Support
3. 모든 함수 호출을 끝없이 따라가는 완전한 Call Graph 생성
4. 운영 APM 수준의 실시간 트래픽 분석
5. Java Agent 기반 런타임 트레이싱
6. 보안 취약점 자동 분석
7. 성능 병목 자동 진단
8. DB 쿼리 최적화 추천
9. PR 전후 흐름 비교
10. GitHub Actions 자동 리포트
11. 정적 HTML 리포트 export
12. 모든 프론트 동적 페이지 인스턴스 캡처

Anlyx v0.1은 **완벽한 분석기**가 아니라, **프로젝트 흐름을 이해하기 쉽게 보여주는 첫 번째 온보딩 맵**을 만드는 데 집중한다.

---

# 8. 핵심 개념

## 8.1 Endpoint

HTTP Method와 Path로 식별되는 백엔드 API 단위다.

예시:

```txt
GET /api/benefits/{id}
POST /api/auth/login
GET /api/brands
```

## 8.2 Frontend Page

실제 라우트 단위로 렌더링되는 프론트 페이지다.

예시:

```txt
/
 /benefits
 /benefit/[brandSlug]/[benefitSlugWithId]
 /login
 /admin/benefits
```

컴포넌트 파일, 레이아웃 파일, 훅, 유틸, 테스트 파일은 Page로 보지 않는다.

## 8.3 Main Flow

요청 처리의 핵심 흐름이다.

예시:

```txt
Frontend Page
→ Endpoint
→ Controller
→ Service
→ Repository
→ Database
→ Repository
→ Service
→ Controller
→ Endpoint
→ Frontend Page
```

Main Flow는 사용자가 가장 먼저 이해해야 하는 중심 경로다.

## 8.4 Sub Flow

메인 흐름을 보조하는 호출이다.

예시:

```txt
Service → Validator
Service → Mapper
Service → Utility
Service → Cache
Service → External API
Service → Another Service
```

Sub Flow는 기본적으로 접힌 상태로 표시한다.

사용자가 필요할 때 펼쳐서 확인할 수 있다.

## 8.5 Replay Lite

요청과 응답의 이동 과정을 최소한의 애니메이션으로 보여주는 기능이다.

v0.1에서는 복잡한 타임라인이 아니라, Main Flow를 순서대로 하이라이트하고 요청/응답 포인트가 흐름을 따라 이동하는 수준으로 구현한다.

---

# 9. 지원 수준 전략

Anlyx는 여러 언어와 프레임워크를 지원하되, 모든 프레임워크에 같은 깊이의 분석을 제공하지 않는다.

지원 수준은 다음 3단계로 구분한다.

## 9.1 Basic Support

최소 지원 수준이다.

제공 기능:

```txt
- OpenAPI 문서 import
- 엔드포인트 목록 표시
- 요청/응답 스키마 표시
- 기본 API 노드 다이어그램
- 수동 URL 기반 프론트 캡처
```

## 9.2 Enhanced Support

프레임워크 구조를 읽어 자동화 수준을 높인 지원이다.

제공 기능:

```txt
- 코드에서 라우트/엔드포인트 자동 탐색
- Controller/Handler 파일 위치 연결
- 프론트 Page/Route 자동 탐색
- 페이지 캡처 중 발생한 API 호출 연결
- 코드 위치, 파일 경로, 함수명 표시
```

## 9.3 Deep Support

프로젝트 내부 처리 흐름까지 보여주는 심화 지원이다.

제공 기능:

```txt
- Controller → Service → Repository 흐름 추적
- Entity/Table 연결
- Main Flow / Sub Flow 구분
- DB 노드 표시
- Replay Lite 지원
```

---

# 10. v0.1 지원 대상

## 10.1 Backend

| 대상                | Basic | Enhanced | Deep |
| ------------------- | ----: | -------: | ---: |
| Spring Boot         |     O |        O |    O |
| OpenAPI 지원 백엔드 |     O |        X |    X |
| FastAPI             |     O |        X |    X |
| Express             |     O |        X |    X |
| NestJS              |     O |        X |    X |
| Flask               |     O |        X |    X |
| Django              |     O |        X |    X |

v0.1에서 FastAPI, Express, NestJS, Flask, Django는 **OpenAPI 문서가 있는 경우 Basic Support만 제공**한다.

## 10.2 Frontend

| 대상                 | Basic | Enhanced | Deep |
| -------------------- | ----: | -------: | ---: |
| Next.js App Router   |     O |        O |    O |
| Next.js Pages Router |     O |        △ |    △ |
| React Router         |     O |        X |    X |
| 일반 SPA             |     O |        X |    X |

v0.1의 대표 데모 조합은 다음이다.

```txt
Spring Boot + Next.js App Router
```

---

# 11. 백엔드 기능 요구사항

## 11.1 엔드포인트 리스트

좌측 패널에는 Swagger처럼 백엔드 엔드포인트 목록을 표시한다.

각 엔드포인트 항목은 다음 정보를 포함한다.

```txt
- HTTP Method
- Path
- Controller 이름
- Handler Method 이름
- Request DTO 또는 Schema
- Response DTO 또는 Schema
- 인증 필요 여부
- 태그 또는 그룹
- 연결된 프론트 페이지 수
```

예시:

```txt
GET /api/public/benefits/{id}
PublicBenefitController#getDetail
Response: BenefitDetailResponse
Used by: /benefit/[brandSlug]/[benefitSlugWithId]
```

## 11.2 엔드포인트 검색 및 필터

사용자는 다음 기준으로 엔드포인트를 검색/필터링할 수 있다.

```txt
- Method
- Path
- Controller
- Service
- Repository
- DTO
- DB Table
- 인증 여부
- 연결된 프론트 페이지
```

## 11.3 엔드포인트 상세 플로우

엔드포인트를 클릭하면 중앙 캔버스에 플로우 차트가 표시된다.

기본 노드 타입:

```txt
- Frontend Page
- Endpoint
- Controller
- Service
- Repository
- Database Table
- DTO
- External API
- Cache
- Utility
- Validator
- Mapper
```

## 11.4 Main Flow / Sub Flow 구분

Main Flow는 요청 처리의 핵심 경로로 표시한다.

예시:

```txt
GET /api/public/benefits/{id}
→ PublicBenefitController
→ PublicBenefitService
→ BenefitRepository
→ benefits table
```

Sub Flow는 보조 경로로 표시한다.

예시:

```txt
PublicBenefitService
→ BenefitDisplayMapper
→ DateRangeUtil
→ PublicVisibilityPolicy
```

시각적 표현:

```txt
Main Flow:
- 굵은 선
- 중앙 배치
- 기본 노출

Sub Flow:
- 얇은 선 또는 점선
- 사이드 배치
- 기본 접힘
```

## 11.5 호출 깊이 제한

모든 함수 호출을 무한히 따라가지 않기 위해 기본 분석 깊이를 제한한다.

기본값:

```txt
Main Flow depth: 4
Sub Flow depth: 1
Utility depth: 0 또는 1
동일 클래스 내부 private method: 기본 접힘
반복/순환 호출: 자동 중단
```

설정 파일에서 조정 가능해야 한다.

## 11.6 Spring Boot 분석 범위

v0.1의 Spring Boot Deep Support는 다음을 대상으로 한다.

```txt
- @RestController
- @Controller
- @RequestMapping
- @GetMapping
- @PostMapping
- @PutMapping
- @PatchMapping
- @DeleteMapping
- Service 클래스 호출 추론
- Repository 인터페이스 호출 추론
- JPA Entity / @Table 기반 DB Table 추론
```

## 11.7 DB 연결 표시

Repository, JPA Entity, `@Table` 정보를 기반으로 DB Table 노드를 생성한다.

예시:

```txt
BenefitRepository → benefits
BrandRepository → brands
BenefitSourceRepository → benefit_sources
```

DB Table 추론 우선순위:

```txt
1. @Table(name = "...")
2. Entity 클래스명 기반 추론
3. Repository 제네릭 타입 기반 추론
4. 추론 실패 시 Unknown Database Node 표시
```

## 11.8 분석 정확도 표시

Spring Boot의 DI, 인터페이스 주입, AOP, 프록시, 동적 Bean 생성은 정적 분석만으로 완벽히 추적하기 어렵다.

따라서 Anlyx는 분석 결과에 confidence를 표시한다.

Confidence 기준:

```txt
High:
Controller에서 구체 Service 클래스를 직접 호출하거나 명확한 단일 구현체가 있는 경우

Medium:
인터페이스 타입 주입이지만 구현체가 하나만 발견된 경우

Low:
구현체가 여러 개이거나 동적 주입 가능성이 있는 경우

Unknown:
분석 불가 또는 런타임 정보가 필요한 경우
```

UI 표현:

```txt
실선:
확정된 호출

점선:
추론된 호출

경고 배지:
confidence 낮음

Unknown 노드:
분석 불가 구간
```

---

# 12. 프론트 기능 요구사항

## 12.1 실제 Page만 탐색

프론트 프로젝트에서 실제 라우트 Page만 수집한다.

Next.js App Router:

```txt
app/**/page.tsx
app/**/page.jsx
```

Next.js Pages Router:

```txt
pages/**/*.tsx
pages/**/*.jsx
단, pages/api/** 제외
```

수집하지 않는 것:

```txt
- components/**
- hooks/**
- utils/**
- layouts/**
- tests/**
- stories/**
- API route
- 단순 UI 컴포넌트
```

## 12.2 동적 라우트 처리

동적 라우트는 하나의 Page 템플릿으로 취급한다.

예시:

```txt
/benefit/[brandSlug]/[benefitSlugWithId]
```

이 라우트는 실제 혜택 개수만큼 수백 장 캡처하지 않는다.

대신 설정 파일의 `sampleParams`를 사용해 대표 화면만 캡처한다.

예시:

```ts
sampleParams: {
  "/benefit/[brandSlug]/[benefitSlugWithId]": {
    brandSlug: "starbucks",
    benefitSlugWithId: "birthday-coupon-123"
  }
}
```

`sampleParams`가 없으면 해당 페이지는 “캡처 대기” 상태로 표시한다.

## 12.3 페이지 캡처

Playwright 기반으로 각 Page를 캡처한다.

기본 Desktop viewport:

```txt
width: 1440
height: 900
```

세로로 긴 페이지는 하나의 긴 이미지로만 보여주지 않고, 여러 구간으로 나누어 스토리보드 카드로 표시한다.

예시:

```txt
/benefit/[brandSlug]/[benefitSlugWithId]

Segment 1: Hero / Summary
Segment 2: Detail Info
Segment 3: Related Benefits
Segment 4: Footer
```

## 12.4 인증 페이지 캡처

로그인이 필요한 페이지를 캡처하기 위해 Playwright `storageState` 설정을 지원한다.

설정 예시:

```ts
frontend: {
  capture: {
    storageState: "./.anlyx/auth-state.json";
  }
}
```

캡처 실패 시 해당 페이지는 실패 상태로 표시하고, 실패 원인을 UI에 노출한다.

예시:

```txt
Capture failed:
- Login required
- Missing sampleParams
- 404 response
- Network timeout
```

## 12.5 API 호출 수집

페이지 캡처 과정에서 발생한 네트워크 요청을 수집한다.

각 Page 카드에는 호출된 API 목록을 표시한다.

예시:

```txt
Page: /benefit/[brandSlug]/[benefitSlugWithId]

Calls:
- GET /api/public/benefits/{id}
- GET /api/public/benefits/{id}/related
```

API 항목을 클릭하면 해당 백엔드 엔드포인트 플로우로 이동한다.

## 12.6 Page Storyboard

프론트 페이지는 스토리보드 형태로 표시한다.

각 Page Storyboard는 다음 정보를 포함한다.

```txt
- Route
- File Path
- Screenshot Segments
- 호출한 API 목록
- 연결된 백엔드 Flow
- 캡처 성공/실패 상태
```

---

# 13. Replay Lite 요구사항

## 13.1 Replay Lite 목적

Replay Lite는 사용자가 요청/응답 흐름을 시각적으로 이해하도록 돕는 최소 애니메이션 기능이다.

v0.1에서는 복잡한 타임라인이나 상세 이벤트 로그를 제공하지 않는다.

Main Flow를 중심으로 요청과 응답이 이동하는 느낌을 보여주는 데 집중한다.

## 13.2 Replay Lite 동작

```txt
1. Frontend Page 노드에서 요청 포인트가 출발한다.
2. Endpoint 노드가 하이라이트된다.
3. Controller 노드가 하이라이트된다.
4. Service 노드가 하이라이트된다.
5. Repository 노드가 하이라이트된다.
6. Database 노드가 하이라이트된다.
7. 응답 포인트가 Database에서 출발한다.
8. Repository → Service → Controller → Endpoint를 거쳐 Frontend Page로 돌아온다.
9. 전체 흐름이 반복 재생된다.
```

## 13.3 Replay Lite 옵션

v0.1에서 제공할 옵션:

```txt
- 재생
- 일시정지
- 처음부터 다시 재생
- 반복 재생 on/off
- Main Flow만 재생
```

v0.2 이후 확장 후보:

```txt
- 속도 조절
- Step-by-step 보기
- Sub Flow 포함
- 요청/응답 타임라인
- 노드별 상세 이벤트 표시
```

---

# 14. 최종 디자인 방향

## 14.1 디자인 결론

Anlyx의 최종 디자인 방향은 다음과 같다.

```txt
기본 제품 UI:
Clean Light + Blueprint Dashboard

README / 랜딩 대표 이미지:
Dark Mode + Replay Lite glowing flow

전체 정체성:
IDE처럼 신뢰감 있고,
Linear/Vercel 계열처럼 깔끔하고,
Replay 순간만 살아 움직이는 개발자 도구
```

기본 앱은 라이트 테마를 우선한다.

다크모드는 옵션으로 제공하되, README나 랜딩페이지에서는 다크모드 Replay 장면을 대표 이미지로 사용한다.

## 14.2 기본 화면 구조

Anlyx의 웹 UI는 기본적으로 3단 구조를 가진다.

왼쪽 패널:

```txt
- Anlyx 로고
- 프로젝트명
- 기술 스택 배지
- Endpoint / Pages / Replay 탭
- 검색 입력창
- 엔드포인트 목록
- 페이지 목록
```

중앙 캔버스:

```txt
- Flow Chart
- Page Storyboard
- Replay Lite
- Zoom / Pan / Fit View
- 도트 그리드 배경
```

오른쪽 패널:

```txt
- 선택한 노드 상세 정보
- 타입
- 클래스/함수 이름
- 파일 경로
- 라인 번호
- DTO 정보
- DB Table 정보
- Confidence 정보
- 연결된 Page/Endpoint 정보
```

하단 영역:

```txt
- Replay Lite Control
- 현재 활성 노드 표시
- Main Flow 진행 상태
```

## 14.3 View Mode

v0.1에서 제공할 View Mode는 다음과 같다.

### 1. Endpoint Map

엔드포인트 중심으로 백엔드 처리 흐름을 보여준다.

### 2. Page Storyboard

프론트 페이지 캡처와 호출 API를 보여준다.

### 3. Replay Lite

요청과 응답이 이동하는 애니메이션을 보여준다.

v0.2 이후 추가 후보:

```txt
- Impact View
- Diff View
- Export View
```

## 14.4 Endpoint Map 화면 예시

Endpoint Map 화면은 다음 구조를 가진다.

```txt
[Left Sidebar]
GET /api/public/benefits/{id}
GET /api/benefits
POST /api/benefits
POST /api/auth/login
GET /api/brands

[Center Canvas]
Frontend Page
→ Endpoint
→ Controller
→ Service
→ Repository → Database

[Right Inspector]
Selected Node:
Type: Service
Class: PublicBenefitService
Method: getBenefitDetail
File: .../service/PublicBenefitService.java
Line: 82
Confidence: High
Sub Flows:
- BenefitDisplayMapper
- DateRangeUtil
- PublicVisibilityPolicy
DB Tables:
- benefits
- brands
Response Schema:
- BenefitDetailResponse
```

## 14.5 Page Storyboard 화면 예시

Page Storyboard 화면은 다음 구조를 가진다.

```txt
Page Storyboard
Zup · Next.js App Router · 6 pages · 5 captured

Route:
/benefit/[brandSlug]/[benefitSlugWithId]

Segments:
- Hero / Summary
- Detail Info
- Related Benefits
- Footer

API Calls:
GET /api/public/benefits/{id} 200
GET /api/public/benefits/{id}/related 200
GET /api/brands/{slug} 200

Capture Failed Example:
/admin/benefits
Reason: Login required
Action: Set storageState in anlyx.config.ts
```

## 14.6 노드 디자인

노드 타입별로 시각적 구분을 제공한다.

```txt
Frontend Page:
화면 캡처 썸네일 카드

Endpoint:
HTTP Method 배지 포함 카드

Controller:
파란색 accent border

Service:
보라색 accent border

Repository:
초록색 accent border

Database:
원통형 또는 테이블형 카드

DTO:
문서 카드

External API:
외부 링크 카드

Cache:
번개 또는 메모리 카드

Utility / Validator / Mapper:
작은 보조 카드
```

## 14.7 색상 가이드

Light Theme:

```txt
Background: #F7F8FB
Panel: #FFFFFF
Canvas: #FAFAFA
Border: #E5E7EB
Text Primary: #111827
Text Secondary: #6B7280

GET: Mint / Green
POST: Blue
PUT/PATCH: Amber
DELETE: Red

Controller: Blue
Service: Violet
Repository: Emerald
Database: Amber / Olive
Sub Flow: Slate dashed line
Confidence High: Green
Confidence Medium: Amber
Confidence Low: Orange
Unknown: Gray
```

Dark Theme:

```txt
Background: #0B0F14
Panel: #111827
Canvas: #0D1117
Border: #1F2937
Text Primary: #F9FAFB
Text Secondary: #9CA3AF
Glow Accent: Cyan / Violet
```

## 14.8 시각 효과 원칙

시각 효과는 생동감을 주되 정보 가독성을 해치지 않아야 한다.

권장 표현:

```txt
- 현재 실행 중인 노드 glow
- 요청/응답 포인트가 선을 따라 이동
- DB 도착 시 pulse 효과
- Sub Flow 펼침 시 fade/scale animation
- 선택한 노드 주변 강조
- 선택하지 않은 흐름 dim 처리
```

비권장 표현:

```txt
- 과도한 파티클
- 계속 움직이는 배경
- 모든 노드의 과한 반짝임
- 정보 가독성을 해치는 3D 효과
- 과도한 Glassmorphism
- 모든 노드 동시 애니메이션
```

## 14.9 디자인 기준

Anlyx는 다음 느낌을 목표로 한다.

```txt
Clean Light + Purposeful Color Accent
```

즉, 흰 배경 기반의 깔끔한 제품 UI를 기본으로 하고, 노드 타입마다 왼쪽 border accent 색상으로만 구분한다.

Sub Flow는 dashed edge로 표시하여 자동으로 “보조 흐름”이라는 신호를 준다.

다크모드는 실제 사용 옵션과 데모 이미지용으로 제공한다.

---

# 15. 설치 및 실행 방식

Anlyx는 npm 기반으로 설치 및 실행할 수 있어야 한다.

권장 사용 흐름:

```bash
npx anlyx init
npx anlyx scan
npx anlyx dev
```

## 15.1 init

설정 파일을 생성한다.

```bash
npx anlyx init
```

생성 파일:

```txt
anlyx.config.ts
```

## 15.2 scan

프로젝트를 분석하고 중간 산출물을 생성한다.

```bash
npx anlyx scan
```

생성 결과:

```txt
.anlyx/flow.json
.anlyx/pages.json
.anlyx/screenshots/
.anlyx/report-data.json
```

## 15.3 dev

로컬 Anlyx 런타임 서버를 실행한다.

최종 사용자 경험은 다음 3단계로 수렴해야 한다.

```bash
npm i -D anlyx
npx anlyx init
npx anlyx dev
```

사용자는 이 3단계 외에 `localhost:4777`, `/_anlyx/overlay.js`, `report-data` endpoint, 수동 script tag 주입을 알 필요가 없어야 한다.

`npx anlyx dev`는 장기적으로 다음 작업을 하나의 개발 명령으로 처리한다.

- 필요한 경우 scan을 자동 실행하거나 stale 상태를 감지한다.
- 실제 프론트엔드 dev server를 실행하거나 이미 실행 중인 서버를 감지한다.
- Anlyx runtime을 실행한다.
- 개발 모드에서만 overlay script를 실제 프론트엔드에 자동 주입한다.
- 실제 앱 URL을 연다.
- 앱 실행 자체는 막지 않고, Anlyx 분석 실패나 대기 상태는 overlay 안에서 표시한다.

```bash
npx anlyx dev
```

기본 포트:

```txt
http://localhost:4777
```

기본 모드인 Inject Mode에서는 `http://localhost:4777`이 실제 앱을 대신 보여주지 않는다. 실제 앱은 기존 개발 서버인 `frontend.baseUrl`에서 그대로 열고, Anlyx는 로컬 전용 스크립트와 report data API를 제공한다.

Inject Mode의 기본 사용 화면은 실제 앱 URL이다. 예를 들어 Zup 데모는 `http://localhost:3000`에서 그대로 사용하고, `http://localhost:4777`은 overlay script, report data, standalone debug viewer를 제공하는 백그라운드 런타임으로 취급한다.

Overlay가 보여주는 핵심 대상은 “모든 네트워크 로그”가 아니라 사용자가 방금 클릭, 제출, 키 입력 등으로 발생시킨 실제 요청 흐름이다. 클릭과 가까운 시점에 발생한 API 요청은 메인 Flow Drawer로 자동 승격한다. `useEffect`, health check, polling, page-load성 요청은 기록하되 Drawer를 자동으로 열거나 현재 선택 흐름을 빼앗지 않는다. 사용자가 필요할 때 Recent API events에서 직접 선택해 확인한다.

Flow Drawer는 실제 앱 위에 얹히므로 사용자가 앱을 계속 확인할 수 있어야 한다. 최소한 다음 dev-only 조작을 지원한다.

- 투명도 조절
- Drawer 크기 조절
- Drawer 위치 드래그 이동
- 한국어/영어 shell label 전환

Next.js App Router에서는 다음 dev-only helper를 root layout에 추가하는 것을 기본 경로로 한다.

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

`AnlyxDevOverlay`는 production에서 아무것도 렌더링하지 않아야 한다. 특수한 환경이나 디버깅에서는 다음 raw script tag를 fallback으로 사용할 수 있다.

```html
<script src="http://localhost:4777/_anlyx/overlay.js" defer></script>
```

스크립트는 실제 앱 origin 안에서 실행되므로, 프록시 origin 차이로 인해 hydration, auth, theme, cookie, localStorage 동작이 달라지는 문제를 피한다.

Standalone debug viewer는 다음 경로에서 계속 사용할 수 있다.

```txt
http://localhost:4777/_anlyx/viewer
```

포트 변경:

```bash
npx anlyx dev --port 4999
```

---

# 16. 설정 파일 예시

## 16.1 Spring Boot + Next.js 예시

```ts
import { defineConfig } from "anlyx";

export default defineConfig({
  projectName: "Zup",

  backend: {
    type: "spring",
    sourceDir: "./backend/src/main/java",
    baseUrl: "http://localhost:8080",
    openApiUrl: "http://localhost:8080/v3/api-docs",
    actuatorMappingsUrl: "http://localhost:8080/actuator/mappings",
    maxMainDepth: 4,
    maxSubDepth: 1,
    includeUtilities: false
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
    openBrowser: true,
    mode: "inject"
  },

  dev: {
    command: "npm run dev"
  }
});
```

## 16.2 OpenAPI-only 백엔드 예시

```ts
import { defineConfig } from "anlyx";

export default defineConfig({
  projectName: "OpenAPI App",

  backend: {
    type: "openapi",
    openApiUrl: "http://localhost:8000/openapi.json",
    baseUrl: "http://localhost:8000"
  },

  frontend: {
    type: "manual",
    baseUrl: "http://localhost:3000",
    urls: ["/", "/dashboard", "/items"]
  },

  server: {
    port: 4777,
    mode: "inject"
  },

  dev: {
    command: "npm run dev"
  }
});
```

---

# 17. 내부 아키텍처

Anlyx는 Core + Adapter 구조로 설계한다.

```txt
anlyx-core
  - 공통 데이터 모델
  - Flow JSON 스키마
  - 분석 결과 병합
  - Confidence 계산

anlyx-cli
  - init
  - scan
  - dev

anlyx-ui
  - React 기반 웹 UI
  - Flow Canvas
  - Page Storyboard
  - Replay Lite

anlyx-adapter-spring
  - Spring Boot 엔드포인트/코드 분석

anlyx-adapter-next
  - Next.js Page 분석

anlyx-adapter-openapi
  - OpenAPI 기반 엔드포인트 import

anlyx-capture
  - Playwright 기반 페이지 캡처
  - 네트워크 요청 수집
```

---

# 18. 공통 데이터 모델 초안

## 18.1 Endpoint

```ts
type Endpoint = {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  framework?: string;
  controller?: string;
  handler?: string;
  filePath?: string;
  lineNumber?: number;
  requestSchema?: string;
  responseSchema?: string;
  authRequired?: boolean;
  tags?: string[];
};
```

## 18.2 FlowNode

```ts
type FlowNode = {
  id: string;
  type:
    | "page"
    | "endpoint"
    | "controller"
    | "service"
    | "repository"
    | "database"
    | "dto"
    | "schema"
    | "externalApi"
    | "cache"
    | "utility"
    | "validator"
    | "mapper"
    | "unknown";
  label: string;
  filePath?: string;
  lineNumber?: number;
  confidence?: "high" | "medium" | "low" | "unknown";
  metadata?: Record<string, unknown>;
};
```

## 18.3 FlowEdge

```ts
type FlowEdge = {
  id: string;
  from: string;
  to: string;
  kind: "main" | "sub" | "request" | "response" | "db" | "external" | "cache";
  label?: string;
  animated?: boolean;
  confidence?: "high" | "medium" | "low" | "unknown";
};
```

## 18.4 EndpointFlow

```ts
type EndpointFlow = {
  endpointId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  mainPath: string[];
  subFlows: {
    id: string;
    parentNodeId: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
    collapsedByDefault: boolean;
  }[];
};
```

## 18.5 PageStoryboard

```ts
type PageStoryboard = {
  id: string;
  route: string;
  filePath?: string;
  screenshots: {
    segmentIndex: number;
    path: string;
    viewport: {
      width: number;
      height: number;
    };
    scrollY: number;
  }[];
  apiCalls: {
    method: string;
    path: string;
    endpointId?: string;
    status?: number;
  }[];
  captureStatus: "success" | "failed" | "pending";
  errorMessage?: string;
};
```

---

# 19. 기술 스택

## 19.1 v0.1 최소 디자인/프론트 스택

```txt
React Flow
Dagre
Motion
shadcn/ui
Tailwind CSS
Shiki
Playwright
```

## 19.2 목적별 스택

| 목적                 | 추천                                 |
| -------------------- | ------------------------------------ |
| 플로우 캔버스        | React Flow                           |
| 자동 그래프 레이아웃 | Dagre                                |
| 고급 그래프 레이아웃 | ELK.js                               |
| 애니메이션           | Motion                               |
| UI 컴포넌트          | shadcn/ui                            |
| 스타일링             | Tailwind CSS                         |
| 코드/DTO 하이라이트  | Shiki                                |
| 페이지 캡처          | Playwright                           |
| README/데모 이미지   | Playwright 자체 UI 캡처              |
| 고급 Replay 타임라인 | v0.2 이후 Motion 유지 또는 GSAP 검토 |

## 19.3 코드 분석

```txt
Java/Spring:
JavaParser 또는 Tree-sitter 기반

TypeScript/JavaScript:
ts-morph 기반

OpenAPI:
공통 엔드포인트 import
```

## 19.4 CLI / 패키징

```txt
Node.js
TypeScript
pnpm workspace
npx 실행 지원
```

## 19.5 v0.2 이후 후보 스택

```txt
ELK.js:
Sub Flow와 복잡한 분기 구조 배치

Satori:
OG 이미지 또는 정적 리포트 이미지 생성

d3-force:
Impact View에서 역방향 연결 그래프 표현

GSAP:
정밀한 타임라인 Replay가 필요할 경우만 검토
```

## 19.6 피해야 할 스택/효과

```txt
- Three.js 기반 과한 3D 노드
- Spline 기반 3D 대시보드
- Vanta.js 스타일 배경 파티클
- 과도한 Aceternity UI 배경 애니메이션
- 모든 노드에 상시 glow/pulse 적용
```

---

# 20. v0.1 필수 기능

v0.1 필수 기능은 다음으로 제한한다.

```txt
- npx anlyx init
- npx anlyx scan
- npx anlyx dev
- anlyx.config.ts 생성
- OpenAPI 기반 엔드포인트 목록 import
- Spring Boot 엔드포인트 스캔
- Spring Boot Controller → Service → Repository 흐름 best-effort 추적
- JPA Entity / Repository 기반 DB Table 추론
- 분석 confidence 표시
- Next.js App Router Page 스캔
- 동적 라우트 sampleParams 처리
- Playwright 기반 페이지 캡처
- 긴 페이지 segment 캡처
- Playwright storageState 기반 인증 페이지 캡처 지원
- 캡처 중 네트워크 API 호출 수집
- Page → Endpoint 연결
- React Flow 기반 Flow Chart 표시
- Main Flow / Sub Flow 구분
- Replay Lite 애니메이션
- 로컬 웹 UI 제공
- Clean Light 기본 UI
- Dark Mode Replay 데모 화면
```

---

# 21. v0.1 제외 기능

다음 기능은 v0.1 필수 범위에서 제외한다.

```txt
- FastAPI Deep Support
- Express Deep Support
- NestJS Adapter
- Flask/Django Adapter
- React Router Deep Support
- Impact View
- Diff View
- GitHub Actions 리포트
- Mermaid export
- PNG/SVG export
- 정적 HTML 리포트 export
- 고급 Replay 타임라인
- Java Agent 기반 런타임 트레이싱
- 외부 API/Cache/Event 자동 탐지 강화
```

---

# 22. v0.2 후보 기능

```txt
- FastAPI Enhanced Support
- Express Enhanced Support
- React Router Enhanced Support
- 정적 HTML 리포트 export
- Mermaid export
- PNG/SVG export
- Impact View
- Advanced Replay
- Cache / External API / Event 노드 강화
- Prisma / TypeORM / SQLAlchemy DB 연결 강화
- ELK.js 기반 고급 레이아웃
```

---

# 23. v0.3 후보 기능

```txt
- Java Agent 기반 런타임 트레이싱
- PR Flow Diff
- GitHub Actions 자동 리포트
- Adapter SDK
- 플러그인 시스템
- LLM 기반 흐름 요약
- 코드 변경에 따른 영향도 코멘트
- 대규모 모노레포 지원
- 다중 서비스 아키텍처 맵
```

---

# 24. 성공 기준

v0.1 성공 기준은 다음과 같다.

```txt
1. 사용자가 npx anlyx init / scan / dev를 실행할 수 있다.
2. Spring Boot 프로젝트의 엔드포인트 목록이 표시된다.
3. OpenAPI 문서가 있으면 최소 엔드포인트 목록을 import할 수 있다.
4. Spring Boot Controller → Service → Repository → DB 흐름이 best-effort로 표시된다.
5. 분석 confidence가 UI에 표시된다.
6. Next.js App Router의 실제 Page 목록이 표시된다.
7. 동적 라우트는 sampleParams 기반으로 대표 화면을 캡처한다.
8. 긴 페이지는 segment 단위로 나누어 캡처된다.
9. 인증 페이지는 Playwright storageState를 통해 캡처할 수 있다.
10. 페이지 캡처 중 발생한 API 호출이 백엔드 엔드포인트와 연결된다.
11. 엔드포인트 클릭 시 Flow Chart가 표시된다.
12. Main Flow와 Sub Flow가 구분된다.
13. Replay Lite로 요청/응답 흐름을 시각적으로 재생할 수 있다.
14. 기본 UI는 Clean Light 방향으로 읽기 쉽게 구성된다.
15. README/랜딩에 사용할 Dark Replay 데모 화면을 만들 수 있다.
16. 사용자가 처음 보는 프로젝트의 Page → API → Service → DB 흐름을 UI에서 이해할 수 있다.
```

---

# 25. 핵심 차별점

Anlyx는 Swagger, Storybook, APM, Call Graph 도구와 다르다.

Swagger는 API 명세를 보여준다.
Storybook은 컴포넌트 상태를 보여준다.
APM은 운영 중 트레이스를 보여준다.
Call Graph 도구는 코드 호출 관계를 보여준다.

Anlyx는 이들을 하나로 연결해 다음 흐름을 보여준다.

```txt
Frontend Page
→ API Endpoint
→ Controller
→ Service
→ Repository
→ Database
→ Response
→ Frontend Page
```

핵심 차별점:

```txt
- 엔드포인트 중심 백엔드 흐름 시각화
- 프론트 페이지 캡처 기반 스토리보드
- Page → API → Service → DB 연결
- Main Flow와 Sub Flow 구분
- 요청/응답 Replay Lite
- Confidence 기반 분석 신뢰도 표시
- Clean Light 기반 가독성 높은 제품 UI
- Dark Replay 기반 임팩트 있는 데모 이미지
```

---

# 26. 주요 리스크

## 26.1 Spring Boot 정적 분석 정확도

Spring Boot 프로젝트는 DI, 인터페이스, AOP, 프록시, 동적 Bean 생성 등으로 인해 정적 분석이 어렵다.

대응:

```txt
- best-effort 분석으로 명시
- confidence 표시
- 실선/점선으로 확정/추론 흐름 구분
- Unknown 노드 제공
- v0.3에서 Java Agent 기반 런타임 트레이싱 검토
```

## 26.2 다이어그램 복잡도

모든 호출을 표시하면 오히려 보기 어려워질 수 있다.

대응:

```txt
- Main Flow 우선 표시
- Sub Flow 기본 접힘
- 호출 depth 제한
- Utility 호출 기본 숨김
- 검색/필터 제공
- 선택하지 않은 흐름 dim 처리
```

## 26.3 프론트 캡처 실패

로그인, 동적 파라미터, 데이터 없음, 네트워크 실패로 캡처가 실패할 수 있다.

대응:

```txt
- sampleParams 제공
- Playwright storageState 지원
- 수동 URL 설정 지원
- 캡처 실패 상태와 실패 원인 표시
```

## 26.4 v0.1 범위 확대 위험

다양한 프레임워크를 동시에 깊게 지원하려 하면 v0.1 완성 가능성이 낮아진다.

대응:

```txt
- v0.1 Deep Support는 Spring Boot + Next.js로 제한
- 나머지는 OpenAPI Basic Support만 제공
- Adapter 확장은 v0.2 이후로 이동
```

## 26.5 디자인 과잉 위험

오픈소스 데모 이미지를 예쁘게 만들려다 실제 도구 가독성이 떨어질 수 있다.

대응:

```txt
- 기본 제품 UI는 Clean Light로 유지
- 애니메이션은 Replay Lite 실행 중에만 강조
- 상시 파티클/3D/글로우 효과 금지
- 다크모드는 대표 데모 이미지와 선택 옵션으로 사용
```

---

# 27. README 대표 이미지 방향

Anlyx의 README 대표 이미지는 다음 두 장을 우선 사용한다.

## 27.1 Endpoint Map 대표 이미지

구성:

```txt
- 좌측: Endpoint 목록
- 중앙: Page → Endpoint → Controller → Service → Repository → DB Flow
- 우측: Selected Node Inspector
- 하단: Replay Lite 버튼
```

추천 톤:

```txt
Dark Mode + glowing Replay dot
```

목적:

```txt
GitHub에서 처음 봤을 때 “오, 예쁘다. 내 프로젝트에도 돌려보고 싶다”는 인상을 준다.
```

## 27.2 Page Storyboard 대표 이미지

구성:

```txt
- Page Storyboard 타이틀
- Next.js App Router 페이지 목록
- 각 페이지의 screenshot segment
- 우측 API Calls
- Capture failed empty state
```

추천 톤:

```txt
Clean Light
```

목적:

```txt
Anlyx가 단순 백엔드 다이어그램 도구가 아니라 프론트 화면까지 연결하는 도구라는 점을 보여준다.
```

---

# 28. 이미지 생성 프롬프트

## 28.1 Endpoint Map Dark Demo

```txt
Dark developer tool UI screenshot, split-pane layout. Left panel shows API endpoint list with GET and POST method badges. Center canvas shows an animated flow chart connecting Frontend Page, API Endpoint, Controller, Service, Repository, and Database nodes. Right panel shows selected node details, file path, confidence badge, sub flows, and database tables. Clean minimal developer dashboard, subtle glowing line animation, modern Vercel and Linear inspired style, high contrast, polished product screenshot, 16:9.
```

## 28.2 Page Storyboard Clean Light

```txt
Clean light mode developer tool UI screenshot. Page Storyboard dashboard for a Next.js App Router project. Large white cards show segmented page screenshots like a filmstrip, each page has route path, file path, capture status, and API calls with green GET badges and 200 status codes. Minimal shadcn/ui style, soft gray background, crisp typography, professional open source README screenshot, 16:9.
```

## 28.3 Landing Hero Image

```txt
Modern open source developer tool landing page hero image. A beautiful architecture flow map shows Frontend Page to API to Service to Repository to Database and back as animated visual flow. Clean light interface with a dark replay preview card floating on top. Subtle blueprint grid, colored node accents, polished SaaS quality, GitHub README ready, 16:9.
```

---

# 29. 리뷰어 검증 질문

다른 AI 또는 리뷰어에게 다음 질문으로 검증을 요청한다.

```txt
1. Anlyx의 문제 정의가 실제 개발자들이 겪는 문제와 충분히 맞는가?
2. Swagger, Storybook, APM, Call Graph 도구와 비교했을 때 차별점이 명확한가?
3. v0.1을 Spring Boot + Next.js Deep Support로 좁힌 것이 현실적인가?
4. OpenAPI 기반 Basic Support를 함께 제공하는 전략이 적절한가?
5. Main Flow / Sub Flow 분리가 실제 사용성에 도움이 되는가?
6. Replay Lite가 v0.1에 포함될 만큼 중요한 차별점인가?
7. Playwright 기반 Page Storyboard가 핵심 가치로 충분한가?
8. Spring Boot 정적 분석의 confidence 표시 방식이 신뢰도 문제를 완화할 수 있는가?
9. Clean Light 기본 UI + Dark Replay 데모 이미지 전략이 적절한가?
10. v0.1에서 더 줄여야 할 기능이 있는가?
11. 반대로 v0.1에서 반드시 유지해야 할 기능은 무엇인가?
```

---

# 30. 최종 요약

Anlyx는 현대 웹 애플리케이션의 구조를 시각적으로 이해하기 위한 개발자 도구다.

목표는 단순히 엔드포인트를 나열하는 것이 아니라, 프론트 페이지에서 출발한 요청이 백엔드 엔드포인트, 서비스 레이어, Repository, 데이터베이스를 거쳐 다시 화면으로 돌아오는 흐름을 보기 좋은 플로우 맵과 스토리보드로 보여주는 것이다.

v0.1은 Spring Boot + Next.js 프로젝트를 가장 완성도 있게 지원하는 데 집중한다.
다른 백엔드는 OpenAPI 기반 Basic Support만 제공한다.

Anlyx의 핵심 킬러 기능은 다음 3가지다.

```txt
1. Main Flow / Sub Flow 분리
2. Page Storyboard
3. Replay Lite
```

Anlyx의 최종 가치는 다음과 같다.

```txt
처음 보는 프로젝트도 Anlyx로 페이지, API, 서비스, DB 흐름을 한눈에 이해한다.
```
