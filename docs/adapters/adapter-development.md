# Producer Development Notes

## Purpose

This document explains how to build optional Anlyx producers. A producer reads a
specific project/framework/source and writes Project JSON. The local viewer does
not depend on producer internals.

## Rules

- Output must conform to `docs/contracts/data-contract.md`.
- Project JSON is the only required handoff to the viewer.
- Producers must separate source-matched, agent-inferred, observed, measured,
  manual, not-proven, and unknown evidence.
- Producers must not invent timing.
- Producers must not inject demo/mock data into a real project file.
- Producers must be local-first and avoid uploading project architecture.

## Suggested Output

```txt
anlyx.project.json
```

or, for larger projects:

```txt
.anlyx/project/
  index.json
  pages.json
  features.json
  requests.json
  flows.json
  architecture.json
  evidence.json
  measurements.json
  dictionary.json
```

The import command should normalize split files into the same Project JSON
contract.

## Naming

Any project-local producer code should use Anlyx-prefixed names, for example:

```txt
AnlyxProjectProducer
AnlyxRouteCollector
AnlyxArchitectureWriter
```

Do not add generic production names such as `Tracer` or `Scanner` without an
Anlyx prefix.
