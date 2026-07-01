# Data Contract

## Purpose

Anlyx renders project understanding authored by the user's AI Agent.

The primary contract is `anlyx.project.json`. Anlyx validates and visualizes this
file in the local 4777 viewer. It must not invent missing pages, requests,
architecture nodes, evidence, or timing data in real project mode.

## Primary Input

Use one file by default:

```txt
anlyx.project.json
```

Large projects may use split files under `.anlyx/project/`, but the normalized
result must still match the same contract:

```txt
.anlyx/project/
  index.json
  project.json
  areas.json
  pages.json
  features.json
  requests.json
  flows.json
  architecture.json
  evidence.json
  measurements.json
  dictionary.json
  coverage.json
```

## Top-Level Shape

```ts
type ProjectData = {
  schemaVersion: "0.2.0" | "0.3.0";
  project: ProjectInfo;
  areas: ProjectArea[];
  pages: ProjectPage[];
  features: ProjectFeature[];
  requests: ProjectRequest[];
  flows: ProjectFlow[];
  architecture: ArchitectureGraph;
  evidence: ProjectEvidence[];
  measurements: ProjectMeasurement[];
  dictionary: ProjectDictionary;
  coverage?: ProjectCoverage;
  overview: ProjectOverview;
  capabilities: ProjectCapability[];
  dataLifecycles: DataLifecycle[];
  impactMaps: ImpactMap[];
};
```

`0.3.0` adds human-friendly project understanding surfaces. `0.2.0` files remain
valid legacy input and must normalize the new fields to safe empty defaults:

```json
{
  "overview": {},
  "capabilities": [],
  "dataLifecycles": [],
  "impactMaps": []
}
```

## Coverage

`coverage` is optional, but Agents SHOULD author it when the analysis is partial.
It prevents the viewer from implying that a representative model is a complete
project map.

```ts
type ProjectCoverage = {
  status: "complete" | "partial" | "unknown";
  detected?: {
    pages?: number;
    requests?: number;
    flows?: number;
    architectureNodes?: number;
    frontendApiUsages?: number;
    backendEndpoints?: number;
  };
  modeled?: {
    pages?: number;
    requests?: number;
    flows?: number;
    architectureNodes?: number;
    frontendApiUsages?: number;
    backendEndpoints?: number;
  };
  unmodeled?: {
    pages?: string[];
    requests?: string[];
    endpoints?: string[];
    notes?: string[];
  };
  evidenceIds?: string[];
};
```

If detected counts are larger than modeled counts, set `status: "partial"` and
list the important missing areas in `unmodeled`. Do not let the UI say "13 pages
analyzed" as if the whole project only had 13 pages when the Agent detected more.

Minimal valid JSON:

```json
{
  "schemaVersion": "0.2.0",
  "project": {
    "id": "acme-app",
    "name": "Acme App",
    "generatedBy": {
      "kind": "agent",
      "name": "Codex"
    }
  },
  "areas": [],
  "pages": [],
  "features": [],
  "requests": [],
  "flows": [],
  "architecture": {
    "nodes": [],
    "edges": []
  },
  "evidence": [],
  "measurements": [],
  "dictionary": {
    "defaultLanguage": "en",
    "terms": []
  },
  "overview": {},
  "capabilities": [],
  "dataLifecycles": [],
  "impactMaps": []
}
```

## Project

```ts
type ProjectInfo = {
  id: string;
  name: string;
  description?: string;
  root?: string;
  analyzedAt?: string;
  frameworkNotes?: string[];
  generatedBy?: {
    kind: "agent" | "manual";
    name?: string;
    model?: string;
    version?: string;
  };
  metadata?: Record<string, unknown>;
};
```

`project.generatedBy` is where the viewer reads the AI Agent name. `project.name`
is where the viewer reads the project name.

## Project Understanding Surfaces

These `0.3.0` fields are optional authoring surfaces. They must summarize facts
that are already known from the project or evidence. Anlyx must not invent them
when the Agent omits them.

```ts
type ProjectOverview = {
  summary?: string;
  projectType?: string;
  mainPurpose?: string;
  actors: ProjectActor[];
  coreEntities: ProjectEntity[];
  mainAreas: ProjectMainArea[];
  implementation: ProjectImplementationItem[];
  suggestedReadingPath: SuggestedReadingStep[];
  evidenceIds: string[];
  confidence?: ConfidenceLevel;
};
```

```ts
type ProjectCapability = {
  id: string;
  actorRole: "visitor" | "user" | "admin" | "system" | "public" | "external" | "unknown";
  name: string;
  description?: string;
  entry?: CapabilityEntry;
  pageIds: string[];
  featureIds: string[];
  requestIds: string[];
  flowIds: string[];
  dataRefs: DataRef[];
  status: "connected" | "ui-only" | "api-only" | "data-only" | "inferred" | "unknown";
  visibleResult?: string;
  evidenceIds: string[];
  confidence?: ConfidenceLevel;
};
```

```ts
type DataLifecycle = {
  id: string;
  entity: ProjectEntityRef;
  name: string;
  description?: string;
  stageIds: string[];
  stages: LifecycleStage[];
  transitions: LifecycleTransition[];
  evidenceIds: string[];
  confidence?: ConfidenceLevel;
};
```

```ts
type ImpactMap = {
  id: string;
  target: ImpactTarget;
  name: string;
  description?: string;
  impactLevel?: "high" | "medium" | "low" | "unknown";
  affected: ImpactAffected;
  edges: ImpactEdge[];
  summary: string[];
  evidenceIds: string[];
  confidence?: ConfidenceLevel;
};
```

Supporting shared references:

```ts
type DataRef = {
  kind: "entity" | "table" | "field" | "model" | "collection" | "cache" | "queue" | "external" | "unknown";
  name: string;
  refId?: string;
  operation?: "create" | "read" | "update" | "delete" | "publish" | "archive" | "validate" | "expire" | "unknown";
};
```

Authoring rules:

- `overview` explains the project at a glance.
- `capabilities` explain product behavior, not internal function names.
- `dataLifecycles` should cover only core entities with meaningful state or visibility changes.
- `impactMaps` should cover central elements whose changes affect several pages, requests, data objects, or business outcomes.
- Use `unknown`, `not-proven`, `agent-inferred`, and low confidence instead of overclaiming.
- Do not create a separate Evidence screen; `evidence` remains support data for these claims.

## Pages, Features, Requests

Areas group pages. Pages are the default Anlyx entry point.

```ts
type ProjectPage = {
  id: string;
  path: string;
  title: string;
  areaId?: string;
  description?: string;
  featureIds?: string[];
  evidenceIds?: string[];
  confidence?: ConfidenceLevel;
};
```

Features describe human-facing capabilities:

```ts
type ProjectFeature = {
  id: string;
  pageId: string;
  name: string;
  description?: string;
  requests?: ProjectRequest[];
  requestIds?: string[];
  evidenceIds?: string[];
  confidence?: ConfidenceLevel;
};
```

Requests describe meaningful API, background, external, or support calls:

```ts
type ProjectRequest = {
  id: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  path?: string;
  label?: string;
  role: "primary" | "supporting" | "background" | "external";
  purpose:
    | "data-load"
    | "mutation"
    | "auth-session"
    | "preload"
    | "analytics"
    | "tracking"
    | "permission"
    | "notification"
    | "polling"
    | "health-check"
    | "external-api"
    | "dev-runtime"
    | "unknown";
  flowId?: string;
  evidenceIds?: string[];
  confidence?: ConfidenceLevel;
};
```

Do not attach previous-page requests to the current page. If a page has no API
request, leave request references empty.

## Flows

Flows explain one request path in layer order.

```ts
type ProjectFlow = {
  id: string;
  requestId?: string;
  name?: string;
  layers: ProjectFlowLayer[];
  layerIds?: string[];
  evidenceIds?: string[];
  confidence?: ConfidenceLevel;
};
```

```ts
type ProjectFlowLayer = {
  id: string;
  kind:
    | "frontend"
    | "request"
    | "api"
    | "controller"
    | "handler"
    | "middleware"
    | "service"
    | "policy"
    | "mapper"
    | "repository"
    | "database"
    | "cache"
    | "queue"
    | "job"
    | "external"
    | "result"
    | "unknown";
  label: string;
  source?: SourceLocation;
  evidenceIds?: string[];
  status?: EvidenceStatus;
  confidence?: ConfidenceLevel;
};
```

Recommended layer order:

```txt
frontend -> request -> api -> controller/handler -> service -> repository -> database/external -> result
```

## Architecture Map

The Map tab renders authored architecture nodes and edges only.

```ts
type ArchitectureGraph = {
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
};
```

```ts
type ArchitectureNode = {
  id: string;
  kind: ProjectFlowLayer["kind"];
  label: string;
  displayLabel?: string;
  domain?: string;
  source?: SourceLocation;
  evidenceIds?: string[];
  confidence?: ConfidenceLevel;
  metadata?: Record<string, unknown>;
};
```

Architecture node `metadata` is optional. Agents may use it to author a compact
data contract for the Map inspector, but Anlyx must still accept nodes without
contract metadata.

Recommended optional convention:

```json
{
  "metadata": {
    "contracts": {
      "endpoint": "GET /api/project-data",
      "input": {
        "name": "None",
        "shape": null
      },
      "output": {
        "name": "ProjectData",
        "kind": "dto",
        "shape": {
          "schemaVersion": "string",
          "project": "ProjectInfo",
          "pages": "ProjectPage[]",
          "architecture": "ArchitectureGraph"
        }
      },
      "relatedModels": ["ProjectData", "ArchitectureNode", "ArchitectureEdge"]
    }
  }
}
```

Do not fabricate DTOs, entities, or shapes. If a contract is not known, omit the
metadata or leave the relevant field absent.

```ts
type ArchitectureEdge = {
  id: string;
  source: string;
  target: string;
  role?: "primary" | "shared" | "aggregate" | "context";
  evidenceIds?: string[];
  confidence?: ConfidenceLevel;
};
```

Primary edges should form readable left-to-right request paths. Shared,
aggregate, and context edges may be used for optional hover/focus relationships,
but they must not be shown as fake primary paths.

## Evidence

```ts
type EvidenceStatus =
  | "observed"
  | "measured"
  | "source-matched"
  | "agent-inferred"
  | "manual"
  | "not-proven"
  | "unknown";
```

Evidence records support claims:

```ts
type ProjectEvidence = {
  id: string;
  status: EvidenceStatus;
  label: string;
  detail?: string;
  source?: SourceLocation;
  targetIds?: string[];
  confidence?: ConfidenceLevel;
};
```

Use the weakest honest status. Never mark inferred source paths as measured.

`source-matched` is stronger than a normal Agent claim. Use it only when the
source file exists, the named symbol or endpoint appears in that file, and the
line range points to the actual source location. Placeholder `lineStart: 1` is
not valid source-matched evidence unless the symbol really starts on line 1.

`anlyx validate` writes `.anlyx/validation-report.json` during import. The viewer
uses that report to show source and coverage issues next to the raw Project JSON.
The report summary includes `sourceIssueCount` plus a source issue breakdown
for missing files, unreadable files, outside-root paths, placeholder lines,
out-of-range lines, and missing symbols.

## Measurements

Measurements are optional and disabled by default in phase 1.

```ts
type ProjectMeasurement = {
  id: string;
  targetId: string;
  source:
    | "browser-performance"
    | "server-span"
    | "database-span"
    | "opentelemetry"
    | "framework-profiler"
    | "apm-export"
    | "test-trace";
  durationMs: number;
  observedAt?: string;
  evidenceId?: string;
};
```

If real measurement data is not available, keep `measurements: []`. The viewer
must show timing as disabled instead of manufacturing timing from source order.

## Languages

Viewer chrome supports:

```txt
ko, en, zh, ja, fr
```

Project-authored text should be written by the user's AI Agent in the language
agreed with the user. The default fallback is English.
