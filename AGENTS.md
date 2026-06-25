# Anlyx Agent Instructions

## Project Status

Anlyx has moved from the v0.1 planning/design-docs phase into approved v0.1 implementation. Product implementation is allowed when it stays inside the user-approved PR scope and the locked v0.1 boundaries in `docs/product/v0.1-scope-lock.md`.

## Required Reading

Before implementation work, every Agent MUST read:

1. `docs/product/prd.md`
2. `docs/product/v0.1-scope-lock.md`
3. The relevant contract or design document for the files being changed

## Scope Rules

- v0.1 Deep Support MUST remain limited to Spring Boot + Next.js App Router.
- OpenAPI MUST remain Basic Support only.
- Agents MUST NOT add unrequested framework support.
- Agents MUST NOT implement excluded v0.1 features from `docs/product/v0.1-scope-lock.md`.
- Agents MUST prefer `unknown`, `pending`, or `failed` states over unsupported inference.

## Documentation-First Rules

- Data Contract changes MUST update `docs/contracts/data-contract.md` before implementation.
- Config changes MUST update `docs/contracts/config-contract.md` before implementation.
- Adapter public interface changes MUST update `docs/contracts/adapter-contract.md` before implementation.
- Spring, Next.js, and OpenAPI behavior changes MUST update the matching file under `docs/adapters/`.
- UI changes MUST check `docs/design/screens.md`, `docs/design/design-tokens.md`, `docs/design/node-edge-style.md`, and `docs/design/replay-lite.md`.
- Acceptance criteria changes MUST update `docs/acceptance/v0.1-checklist.md`.

## Implementation Guardrails

- Do not add product packages, CLI surfaces, UI surfaces, adapters, scanners, or tests outside the approved v0.1 scope.
- During implementation phases, keep changes scoped and verify against fixture expected output.
- Failed captures and unknown analysis MUST be represented in data and UI. Do not hide them.
- Fixture expected output mismatch means the implementation is not complete.
- npm publishing is paused unless the user explicitly resumes it. Do not claim an npm release is live without verifying a clean npm install.
- The public demo route is `/demo`. Do not add or document a `/Demo` alias.

## Planning and Approval

Before implementation phases, write a plan and get user approval unless the user explicitly instructs the Agent to execute a bounded documentation or maintenance task immediately.

## Verification

Before reporting completion, Agents MUST:

1. Run the relevant verification commands.
2. Check generated data against `docs/contracts/data-contract.md`.
3. Check implementation status against `docs/acceptance/v0.1-checklist.md`.
4. Report any unverified area honestly.

## Commit Scope

Keep commits small and reviewable. Do not mix documentation scope changes with product implementation unless the user explicitly asks for that combined change.
