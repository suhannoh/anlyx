# Next.js Producer Notes

Next.js support is an optional Project JSON producer strategy.

An AI Agent may inspect a Next.js project to author:

- Pages and routes.
- Route handlers.
- API client calls.
- Server actions, loaders, or framework-specific data paths when present.
- Source evidence pointing to files and symbols.

The Agent must not assume every project is Next.js. The viewer only consumes the
resulting Project JSON.

## Required Behavior

- Preserve route templates instead of expanding every dynamic data row.
- Mark unresolved dynamic params as unknown or not-proven.
- Do not treat source discovery as measured runtime.
- Keep source file paths as evidence, not as UI-only labels.
- Leave `measurements: []` unless real runtime or telemetry timing exists.
