# Release Runbook

## Purpose

This runbook describes the manual release sequence for Anlyx packages after the
Project JSON pivot.

It is not a publish log. It must not be used as proof that a release happened.

## Release Principle

The published product must describe Anlyx as:

```txt
anlyx.project.json -> validate -> import -> local 4777 viewer
```

Do not publish wording that presents live analysis setup, fake demo data, or
runtime timing as the default product path.

## Before Publishing

1. Read `docs/release/npm-publish-preflight.md`.
2. Run the full local verification.
3. Pack the packages.
4. Install the packed CLI in a temporary project.
5. Validate/import a real `anlyx.project.json`.
6. Open the local 4777 viewer.
7. Confirm the working tree is clean.

## Package Order

Publish package dependencies before the CLI package. Current package names are:

- `@anlyx/core`
- `@anlyx/ui`
- `@anlyx/adapter-openapi`
- `@anlyx/adapter-manual`
- `@anlyx/adapter-next`
- `@anlyx/adapter-spring`
- `@anlyx/capture`
- `anlyx`

Use `corepack pnpm publish` so workspace dependency ranges are converted
correctly.

## Do Not Publish When

- `anlyx.project.json` validation fails.
- The viewer falls back to fake data in a real project.
- Timing UI claims measurements when `measurements` is empty.
- Package tarballs contain local scratch files.
- npm authentication, scope ownership, or 2FA state is unclear.

## After Publishing

- Verify `npx anlyx --help` from a fresh temporary directory.
- Verify `npx anlyx init --force`.
- Verify Project JSON validate/import.
- Record the published version and npm package URLs in a release note.
