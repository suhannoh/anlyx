# npm Publish Preflight

## Purpose

This document records checks to run before publishing Anlyx packages. It is not
a publish log and it must not be used as proof that a release happened.

## Required Verification

Run from the repository root:

```bash
corepack pnpm install
corepack pnpm format:write
corepack pnpm typecheck
corepack pnpm test
corepack pnpm -r build
corepack pnpm lint
git diff --check
git status
```

Required result:

- All commands pass.
- The working tree contains only intended release changes.
- No generated tarballs, scratch files, or local project secrets are staged.

## Package Dry Run

Run package dry-runs before publishing:

```bash
corepack pnpm --filter @anlyx/core pack --dry-run
corepack pnpm --filter @anlyx/ui pack --dry-run
corepack pnpm --filter anlyx pack --dry-run
```

Additional adapter/helper packages may be packed when they are included in the
release.

Check that tarballs include:

- `dist` output.
- `README.md`.
- `LICENSE`.
- `package.json`.
- The CLI `bin` entry for `anlyx`.

Check that tarballs do not include:

- Source tests.
- Scratch files.
- Local `.anlyx/agent` notes from a user project.
- Temporary packages or generated archives.
- Unconverted `workspace:*` dependency ranges.

## Project JSON Smoke

Before publishing, install the packed CLI in a temporary project and verify:

```bash
npx anlyx --help
npx anlyx init --force
npx anlyx validate anlyx.project.json
npx anlyx import anlyx.project.json
npx anlyx dev --no-open
```

The smoke should prove the Project JSON path, not optional measurements.

## Non-Goals

- Do not publish from this preflight.
- Do not create Git tags from this preflight.
- Do not upload private project JSON.
- Do not claim timing support unless real measurements are included.
