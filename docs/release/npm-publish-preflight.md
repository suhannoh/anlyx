# npm Registry Publish Preflight

## Purpose

This document records the release packaging dry-run checks required before publishing Anlyx v0.1 packages to the npm registry.

Do not use this checklist to publish. It is only the preflight for package metadata, build output, tarball contents, workspace dependency conversion, and local CLI execution.

Anlyx `0.1.0` was published with unresolved `workspace:*` dependencies and is planned for deprecation. Anlyx `0.1.1` is planned for deprecation because the published CLI entrypoint can trigger an unsettled top-level await warning and exit before running commands. The `0.1.2` patch release must be published with `corepack pnpm publish`, not `npm publish`, so pnpm converts workspace protocol dependencies before upload.

For the manual publish sequence, registry checks, and failure response steps, see
[`docs/release/v0.1-release-runbook.md`](./v0.1-release-runbook.md).

## Package Metadata

Every publishable package should define:

- `name`
- `version`
- `description`
- `license`
- `repository`
- `homepage`
- `bugs`
- `type`
- `main`
- `types`
- `exports`
- `files`
- `scripts.build`
- `dependencies`, `peerDependencies`, and `devDependencies` when needed

Scoped internal packages should use public npm access:

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

The CLI package must keep:

```json
{
  "name": "anlyx",
  "bin": {
    "anlyx": "dist/index.js"
  }
}
```

## Build Output

Use TypeScript build output for v0.1 packaging. Do not introduce a bundler just for the dry-run.

Required build command:

```bash
corepack pnpm -r build
```

Expected package artifacts:

- `dist/**/*.js`
- `dist/**/*.d.ts`
- `README.md`
- `LICENSE`
- `package.json`

The npm tarball should not include source tests, fixture data, repository docs, or unrelated workspace files.

## Pack Dry-Run

Run at least:

```bash
corepack pnpm --filter anlyx pack --dry-run
corepack pnpm --filter @anlyx/core pack --dry-run
corepack pnpm --filter @anlyx/ui pack --dry-run
```

Check that:

- `anlyx` includes `dist/index.js` and the `bin` target is present.
- `anlyx` `dist/index.js` starts with `#!/usr/bin/env node` and does not contain top-level `await runCli`.
- `@anlyx/core` includes runtime schemas, validators, config helpers, and declaration files.
- `@anlyx/ui` includes built UI modules plus `dist/viewer/viewer.html` and `dist/styles.css`.
- Tarballs include `README.md`, `LICENSE`, and `package.json`.
- Tarballs do not include `src/**/*.test.ts`, `src/**/*.test.tsx`, or `fixtures`.

## Workspace Dependency Conversion

Before publishing, inspect packed package metadata and confirm no `workspace:*` ranges remain.

For local project demos before npm publish, prefer the version-aligned package-set helper:

```bash
corepack pnpm build
corepack pnpm pack:local -- --pack-destination /tmp/anlyx-pack
```

The helper packs every Anlyx package in dependency order, verifies each packed manifest, and prints one `npm install --save-dev ...` command containing the full local package set. Use that generated command in any external Spring Boot + Next.js demo project instead of installing only the `anlyx` CLI tarball.

Recommended local check:

```bash
corepack pnpm --filter anlyx pack --pack-destination /tmp/anlyx-pack
tar -xOf /tmp/anlyx-pack/anlyx-0.1.2.tgz package/package.json
```

pnpm should convert workspace dependencies to publishable version ranges in packed output. For `0.1.2`, the packed `anlyx` CLI package should contain `@anlyx/*` dependencies as `0.1.2` or a compatible publishable range, never `workspace:*`. If any `workspace:*` range remains, stop the release and use `corepack pnpm publish`/`corepack pnpm pack` behavior that converts workspace ranges or prepare an explicit dependency range fix PR.

## Local CLI Tarball Check

Without publishing to npm, install the packed CLI tarball into a temporary directory and verify the command entrypoint.

Example:

```bash
mkdir -p /tmp/anlyx-npx-check
cd /tmp/anlyx-npx-check
npm install --ignore-scripts /tmp/anlyx-pack/anlyx-0.1.2.tgz
npx anlyx --help
npx anlyx init --force
```

Expected results:

- `npx anlyx --help` prints available commands.
- `npx anlyx init --force` creates `anlyx.config.ts`.
- `npx anlyx scan --skip-capture` creates `.anlyx/report-data.json` when run in a configured project.
- This check does not exercise `scan` or `dev` end-to-end.

## Publish-Time Risks

- Internal packages must be published before the `anlyx` CLI package if npm cannot resolve packed local tarball dependencies.
- Publish must use `corepack pnpm publish`; direct `npm publish` can upload unresolved `workspace:*` dependency ranges.
- npm access, authentication, organization permissions, and 2FA are outside local preflight.
- `--ignore-scripts` local install does not install Playwright browsers; full capture validation still requires a runtime environment with Playwright browsers available.
- This repo does not yet include release automation, changelog automation, tags, GitHub Releases, or GitHub Actions publish workflow.

## Explicit Non-Goals

- Do not run `npm publish`.
- Do not run `corepack pnpm publish` during preflight.
- Do not create a Git tag.
- Do not create a GitHub Release.
- Do not add GitHub Actions.
- Do not change scanner, adapter, capture, or UI behavior for packaging only.
