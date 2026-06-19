# Anlyx

[English README](./README.md)

Anlyx는 프론트 페이지부터 백엔드 엔드포인트, 서비스 레이어, Repository, 데이터베이스까지 이어지는 흐름을 시각적인 플로우 맵과 스토리보드로 보여주는 오픈소스 개발자 도구입니다.

> 현재 상태: 기획 / 설계 문서 작성 단계입니다. 아직 실제 구현은 시작하지 않았습니다.

Anlyx는 아직 npm 패키지로 설치할 수 있는 상태가 아닙니다. v0.1 구현 전에 범위, 데이터 계약, Adapter 규칙, Fixture expected output, 디자인 문서, Acceptance 기준을 먼저 고정합니다.

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

v0.1은 Spring Boot + Next.js App Router 조합을 가장 완성도 있게 지원하는 데 집중합니다. 다른 백엔드 프레임워크는 OpenAPI 문서가 있을 때 Basic Support로만 다룹니다.

## 개발 방식

이 저장소는 문서 우선 개발 방식을 따릅니다. v0.1 설계 문서, 데이터 계약, Adapter 규칙, Fixture expected output, 디자인 기준, Acceptance 체크리스트가 검토된 뒤 구현을 시작합니다.

현재는 `anlyx init`으로 기본 `anlyx.config.ts`를 생성할 수 있습니다. scan/dev 실행, Adapter
오케스트레이션, capture 실행, npm 패키지 배포는 아직 진행 중입니다.
