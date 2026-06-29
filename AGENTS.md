# Anlyx Agent Instructions

## Product Status

Anlyx is now centered on the local `4777` Project JSON viewer. The primary
product path is:

```txt
user AI Agent analyzes an arbitrary project
-> writes anlyx.project.json
-> Anlyx validates/imports it
-> the local Pages / Map / JSON viewer renders it
```

Older analysis experiments may remain as internal compatibility work, but they
are not the product centerline.

## Required Reading

Before implementation work, every Agent MUST read:

1. `docs/product/product-spine.md`
2. `docs/contracts/data-contract.md`
3. `docs/design/screens.md`
4. The relevant agent, contract, or design document for the files being changed

## Scope Rules

- Anlyx core MUST NOT pretend to understand every framework by itself.
- Project-specific facts MUST come from the user's AI Agent-authored JSON, not
  from hardcoded demo assumptions.
- The viewer MUST NOT invent fake pages, requests, architecture nodes,
  measurements, or relationships in real project mode.
- Unknown, not-proven, manual, agent-inferred, source-matched, observed, and
  measured states MUST remain distinct.
- Timing/measurement UI stays disabled unless valid measurement data is present.
- The local viewer remains a local-first tool. Do not require GitHub upload or
  hosted ingestion for normal use.
- Supported viewer chrome languages are `en`, `ko`, `zh`, `ja`, and `fr`.
  Project-authored text should be written by the user's Agent in the user's
  preferred language.

## Documentation-First Rules

- Project JSON contract changes MUST update `docs/contracts/data-contract.md`
  before implementation.
- Agent setup or authoring behavior changes MUST update `docs/agent/`.
- UI behavior changes MUST check `docs/design/screens.md`,
  `docs/design/design-tokens.md`, and `docs/design/node-edge-style.md`.
- Acceptance criteria changes MUST update `docs/acceptance/phase-1-checklist.md`.
- Release or package behavior changes MUST update `docs/release/`.

## Implementation Guardrails

- Prefer deleting obsolete scanner/demo assumptions over preserving confusing
  legacy branches.
- Keep real project mode data-driven from `anlyx.project.json`.
- Demo/mock data is allowed only in explicit demo surfaces.
- Do not add broad framework-specific runtime probes unless the user explicitly
  scopes that work.
- Fixture expected output mismatch means the implementation is not complete.

## Verification

Before reporting completion, Agents MUST:

1. Run the relevant verification commands.
2. Check generated data against `docs/contracts/data-contract.md`.
3. Check implementation status against `docs/acceptance/phase-1-checklist.md`.
4. Report any unverified area honestly.

## Commit Scope

Keep commits reviewable and decision-oriented.
