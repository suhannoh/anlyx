# npm Publish Preflight

## Purpose

This document records the release packaging dry-run checks required before publishing Anlyx v0.1 packages to npm.

Do not use this checklist to publish. It is only the preflight for package metadata, build output, tarball contents, workspace dependency conversion, and local CLI execution.

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
    "anlyx": "./dist/index.js"
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
- `@anlyx/core` includes runtime schemas, validators, config helpers, and declaration files.
- `@anlyx/ui` includes built UI modules plus `dist/viewer/viewer.html` and `dist/styles.css`.
- Tarballs include `README.md`, `LICENSE`, and `package.json`.
- Tarballs do not include `src/**/*.test.ts`, `src/**/*.test.tsx`, or `fixtures`.

## Workspace Dependency Conversion

Before publishing, inspect packed package metadata and confirm no `workspace:*` ranges remain.

Recommended local check:

```bash
corepack pnpm --filter anlyx pack --pack-destination /tmp/anlyx-pack
tar -xOf /tmp/anlyx-pack/anlyx-0.1.0.tgz package/package.json
```

pnpm should convert workspace dependencies to publishable version ranges in packed output. If any `workspace:*` range remains, stop the release and either use pnpm publish with workspace conversion or explicitly replace publish-time ranges.

## Local CLI Tarball Check

Without publishing to npm, install the packed CLI tarball into a temporary directory and verify the command entrypoint.

Example:

```bash
mkdir -p /tmp/anlyx-npx-check
cd /tmp/anlyx-npx-check
npm install --ignore-scripts /tmp/anlyx-pack/anlyx-0.1.0.tgz
npx anlyx --help
npx anlyx init --force
```

Expected results:

- `npx anlyx --help` prints available commands.
- `npx anlyx init --force` creates `anlyx.config.ts`.
- This check does not exercise `scan` or `dev` end-to-end.

## Publish-Time Risks

- Internal packages must be published before the `anlyx` CLI package if npm cannot resolve packed local tarball dependencies.
- npm access, authentication, organization permissions, and 2FA are outside local preflight.
- `--ignore-scripts` local install does not install Playwright browsers; full capture validation still requires a runtime environment with Playwright browsers available.
- This repo does not yet include release automation, changelog automation, tags, GitHub Releases, or GitHub Actions publish workflow.

## Explicit Non-Goals

- Do not run `npm publish`.
- Do not create a Git tag.
- Do not create a GitHub Release.
- Do not add GitHub Actions.
- Do not change scanner, adapter, capture, or UI behavior for packaging only.
