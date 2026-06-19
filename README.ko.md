# Anlyx

[English README](./README.md)

Anlyx는 프론트 페이지부터 백엔드 엔드포인트, 서비스 레이어, Repository, 데이터베이스까지 이어지는 흐름을 시각적인 플로우 맵과 스토리보드로 보여주는 오픈소스 개발자 도구입니다.

> 현재 상태: v0.1.2 patch release 준비 단계입니다.

Anlyx `0.1.0`은 `workspace:*` dependency가 남아 있는 상태로 배포되어 deprecated 처리 예정입니다. Anlyx `0.1.1`은 배포된 CLI entrypoint가 unsettled top-level await 경고를 내고 명령 실행 전에 종료될 수 있어 deprecated 처리 예정입니다. 승인된 pnpm 기반 publish 이후에는 `0.1.2`부터 일반 `npm install anlyx`로 설치 가능한 버전으로 안내합니다.

## 해결하려는 문제

현대 웹 애플리케이션의 기능 하나는 프론트 라우트, API 엔드포인트, Controller, Service, Repository, DB Table, DTO, 유틸리티, 인증 조건에 나뉘어 있습니다.

새로운 개발자나 기여자는 다음 질문에 답하기 위해 여러 문서와 코드를 오가야 합니다.

- 이 화면은 어떤 API를 호출하는가?
- 이 API는 어떤 Controller와 Service에서 처리되는가?
- 어떤 Repository와 DB Table이 연결되는가?
- 핵심 흐름과 보조 흐름은 어떻게 구분되는가?
- API 호출이 발생하는 실제 화면은 어떻게 생겼는가?

Anlyx는 이 정보를 하나의 읽기 쉬운 시각적 지도로 연결하는 것을 목표로 합니다.

## 핵심 기능

- **Endpoint Map**: Swagger처럼 엔드포인트를 나열하고 Controller, Service, Repository, Database Table 흐름과 연결합니다.
- **Page Storyboard**: 프론트 페이지의 route, screenshot segment, capture status, API call을 스토리보드로 보여줍니다.
- **Main Flow / Sub Flow**: 요청 처리의 중심 경로와 mapper, utility, validator 같은 보조 호출을 구분합니다.
- **Replay Lite**: 요청과 응답이 Main Flow를 따라 이동하는 최소 애니메이션을 제공합니다.

## v0.1 범위

Deep Support:

- Spring Boot backend analysis
- Next.js App Router page discovery and capture

Basic Support:

- OpenAPI backend import
- OpenAPI backend 프로젝트를 위한 manual frontend URLs

v0.1은 Spring Boot + Next.js App Router 조합을 가장 완성도 있게 지원하는 데 집중합니다. 다른 백엔드 프레임워크는 OpenAPI 문서가 있을 때 Basic Support로만 다룹니다.

## 사용 흐름

배포된 패키지를 사용할 때의 기본 흐름은 다음과 같습니다.

```bash
npx anlyx init
npx anlyx scan
npx anlyx dev
```

`anlyx@0.1.2` 이상을 사용합니다. 0.1.2 배포가 승인되고 완료되기 전에는 로컬 workspace CLI를 사용합니다.

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm --filter anlyx exec anlyx init
corepack pnpm --filter anlyx exec anlyx scan
corepack pnpm --filter anlyx exec anlyx dev
```

`anlyx scan`은 `.anlyx/report-data.json`을 생성합니다. `anlyx dev`는 이 파일을 읽어 로컬 UI를 띄우며, scan을 자동 실행하지 않습니다.

## v0.1 제외 범위

- FastAPI, Express, NestJS Deep Support
- React Router Deep Support
- Static HTML export
- Mermaid export
- PNG/SVG export
- GitHub Actions report generation
- Java Agent runtime tracing
- LLM flow summary

## 개발 방식

이 저장소는 문서 우선 개발 방식을 따릅니다. v0.1 구현은 scope lock, 데이터 계약, Adapter 규칙, Fixture expected output, 디자인 기준, Acceptance 체크리스트에 의해 제한됩니다.

현재는 `anlyx init`으로 기본 `anlyx.config.ts`를 생성하고, `anlyx scan`으로 로컬 scan JSON 출력을 만들 수 있으며, `anlyx dev`로 로컬 UI를 확인할 수 있습니다. 0.1.2 실제 npm 배포는 별도 승인 후 진행합니다.

npm 배포 전 포장 점검은 로컬 build와 pack dry-run으로 확인합니다. 자세한 항목은 [`docs/release/npm-publish-preflight.md`](./docs/release/npm-publish-preflight.md)를 참고합니다.
수동 릴리스 순서는 [`docs/release/v0.1-release-runbook.md`](./docs/release/v0.1-release-runbook.md)에 정리되어 있습니다.
