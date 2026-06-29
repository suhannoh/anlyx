# Producer / Adapter Contract

## Purpose

Adapters and producers are optional helpers that turn project-specific facts
into Anlyx Project JSON.

They are not the product centerline. The local viewer consumes validated
Project JSON, regardless of which framework, agent, script, or human produced
it.

## Contract Boundary

Every producer MUST output data that conforms to:

```txt
docs/contracts/data-contract.md
```

The viewer MUST NOT depend on a producer implementation detail. It only reads
the imported Project JSON.

## Producer Responsibilities

A producer may inspect:

- Source files.
- Routing definitions.
- API clients.
- Controllers, handlers, middleware, services, repositories, jobs, models, and
  schema files.
- OpenAPI or other API descriptions.
- Local runtime or telemetry output, only when explicitly collected.

A producer must write conservative Project JSON:

- Use `source-matched` for source-backed relationships.
- Use `agent-inferred` or `manual` when reasoning or user notes are involved.
- Use `observed` or `measured` only for real runtime/telemetry evidence.
- Use `unknown` or `not-proven` instead of guessing.

## Optional Package Helpers

Current packages may help an Agent gather facts:

- `@anlyx/adapter-manual`
- `@anlyx/adapter-openapi`
- `@anlyx/adapter-next`
- `@anlyx/adapter-spring`
- `@anlyx/capture`

These packages are optional producer surfaces. A valid `anlyx.project.json`
written by a user's AI Agent is enough for the 4777 viewer.

## Framework Neutrality

Agents MUST inspect the user's actual project before choosing a producer
strategy. Do not assume:

- Spring Boot.
- Next.js.
- React Router.
- Port `3000`.
- A specific source folder.
- A specific database or ORM.

Any framework can be represented when the Agent authors Project JSON that
matches the data contract.

## OpenAPI Rule

OpenAPI may prove endpoint and schema facts. It does not prove internal
controller, service, repository, database, queue, or job paths by itself.

Internal nodes derived only from OpenAPI must be omitted or marked as unknown /
not-proven with clear evidence.

## Measurement Rule

Runtime measurements are optional. Producers must not convert source-derived
ordering into measured timing.

If real measurements are unavailable, write:

```json
{
  "measurements": []
}
```

The viewer will keep Timing disabled.

## Output Rule

The final producer output must be one of:

```txt
anlyx.project.json
.anlyx/project/*.json
```

Split files must normalize into the same Project JSON shape before import.
