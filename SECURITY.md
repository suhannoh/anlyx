# Security Policy

## Supported Versions

Security fixes target the latest published Anlyx version.

## Reporting a Vulnerability

Please do not open a public issue for sensitive security reports.

Use GitHub private vulnerability reporting when available, or contact the maintainer through the repository profile.

Include:

- Anlyx version
- Affected command or package
- Reproduction steps
- Impact
- Any suggested mitigation

## Local Development Boundary

Anlyx is designed for local development. It scans configured local source directories, can visit `frontend.baseUrl` during capture, and serves a local runtime for the injected overlay.

Do not run Anlyx against untrusted projects or configs without reviewing the config first.
