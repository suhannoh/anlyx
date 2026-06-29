# Spring Producer Notes

Spring support is an optional Project JSON producer strategy.

An AI Agent may inspect a Spring project to author:

- API endpoints.
- Controllers.
- Interceptors, filters, security gates, or middleware.
- Services.
- Repositories.
- Database tables or entities.
- Jobs, queues, external calls, and result states when discoverable.

The Agent must not assume every project is Spring. The viewer only consumes the
resulting Project JSON.

## Required Behavior

- Prefer source-matched evidence for controller/service/repository links.
- Mark ambiguous downstream calls as agent-inferred, not-proven, or unknown.
- Do not claim a request passed through a layer unless runtime evidence exists.
- Do not convert static source order into measured timing.
- Keep optional local probes development-only and Anlyx-prefixed.
