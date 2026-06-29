# OpenAPI Producer Notes

OpenAPI support is an optional Project JSON producer strategy.

OpenAPI can prove endpoint and schema facts. It cannot prove the internal
implementation path behind an endpoint by itself.

## Allowed Output

An AI Agent may use OpenAPI to author:

- API endpoint nodes.
- Method and path metadata.
- Request and response schema summaries.
- External contract evidence.

## Limits

OpenAPI alone must not invent:

- Controller nodes.
- Service nodes.
- Repository nodes.
- Database nodes.
- Internal timing.

When internal source is unavailable, keep those relationships omitted, unknown,
or not-proven.
