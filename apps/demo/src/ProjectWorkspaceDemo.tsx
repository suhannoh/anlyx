import "@xyflow/react/dist/style.css";
import "../../../packages/ui/src/workspace/workspace.css";
import "./project-workspace-demo.css";

import { WorkspaceApp } from "@anlyx/ui";
import type { ProjectData } from "@anlyx/core";

const demoProjectData: ProjectData = {
  schemaVersion: "0.3.0",
  project: {
    id: "anlyx-demo",
    name: "Anlyx",
    description: "Local Project JSON viewer for AI Agent-authored project understanding.",
    analyzedAt: "2026-06-30T10:24:00.000Z",
    frameworkNotes: ["React", "TypeScript", "Node.js"],
    generatedBy: {
      kind: "agent",
      name: "Codex"
    }
  },
  areas: [
    {
      id: "viewer",
      name: "Viewer",
      order: 1,
      evidenceIds: ["evidence.workspace"]
    }
  ],
  pages: [
    {
      id: "page.pages",
      path: "/",
      title: "Pages",
      areaId: "viewer",
      description: "Project overview and page-by-page flow explanation.",
      featureIds: ["feature.inspect-pages"],
      evidenceIds: ["evidence.workspace"],
      confidence: "high",
      metadata: {
        pageType: "Viewer",
        layout: "ProjectWorkspace",
        tags: ["pages", "requests", "evidence"]
      }
    },
    {
      id: "page.map",
      path: "/map",
      title: "Map",
      areaId: "viewer",
      description: "Layered architecture map rendered from authored project nodes and edges.",
      featureIds: ["feature.inspect-map"],
      evidenceIds: ["evidence.map"],
      confidence: "high",
      metadata: {
        pageType: "Viewer",
        tags: ["architecture", "nodes", "edges"]
      }
    },
    {
      id: "page.json",
      path: "/json",
      title: "JSON",
      areaId: "viewer",
      description: "Raw Project JSON inspection surface.",
      featureIds: ["feature.inspect-json"],
      evidenceIds: ["evidence.schema"],
      confidence: "high",
      metadata: {
        pageType: "Viewer",
        tags: ["schema", "debug"]
      }
    }
  ],
  features: [
    {
      id: "feature.inspect-pages",
      pageId: "page.pages",
      name: "Inspect page behavior",
      description: "Inspect authored pages, primary requests, selected flows, evidence, and unknowns.",
      requests: [],
      requestIds: ["request.project-data"],
      evidenceIds: ["evidence.workspace"],
      confidence: "high"
    },
    {
      id: "feature.inspect-map",
      pageId: "page.map",
      name: "Inspect architecture map",
      description: "Inspect architecture nodes and connections across layers.",
      requests: [],
      requestIds: ["request.map-graph"],
      evidenceIds: ["evidence.map"],
      confidence: "medium"
    },
    {
      id: "feature.inspect-json",
      pageId: "page.json",
      name: "Inspect raw authored JSON",
      description: "View the raw authored JSON for pages, flows, evidence, and metadata.",
      requests: [],
      requestIds: ["request.project-data"],
      evidenceIds: ["evidence.schema"],
      confidence: "high"
    }
  ],
  requests: [
    {
      id: "request.project-data",
      method: "GET",
      path: "/api/project-data",
      role: "primary",
      purpose: "dev-runtime",
      description: "Loads the current anlyx.project.json from the local runtime.",
      flowId: "flow.project-data",
      evidenceIds: ["evidence.workspace"],
      confidence: "high",
      metadata: {
        pageId: "page.pages"
      }
    },
    {
      id: "request.map-graph",
      method: "GET",
      path: "/api/map-graph",
      role: "supporting",
      purpose: "data-load",
      description: "Provides normalized architecture nodes and edges for the Map view.",
      flowId: "flow.map-graph",
      evidenceIds: ["evidence.map"],
      confidence: "medium",
      metadata: {
        pageId: "page.map"
      }
    },
    {
      id: "request.summary",
      method: "GET",
      path: "/api/project-summary",
      role: "supporting",
      purpose: "data-load",
      description: "Provides overview and capability summaries.",
      flowId: "flow.project-data",
      evidenceIds: ["evidence.schema"],
      confidence: "medium",
      metadata: {
        pageId: "page.pages"
      }
    }
  ],
  flows: [
    {
      id: "flow.project-data",
      requestId: "request.project-data",
      name: "Load Project Workspace",
      layerIds: [],
      layers: [
        {
          id: "layer.page",
          kind: "frontend",
          label: "ViewerApp",
          status: "source-matched",
          evidenceIds: ["evidence.workspace"],
          confidence: "high",
          source: {
            filePath: "packages/ui/src/viewer/ViewerApp.tsx",
            symbol: "ViewerApp"
          }
        },
        {
          id: "layer.api",
          kind: "api",
          label: "GET /api/project-data",
          status: "source-matched",
          evidenceIds: ["evidence.workspace"],
          confidence: "high",
          source: {
            filePath: "packages/cli/src/dev-command.ts",
            symbol: "createLocalUiServer"
          }
        },
        {
          id: "layer.service",
          kind: "service",
          label: "Read project data",
          status: "source-matched",
          evidenceIds: ["evidence.workspace"],
          confidence: "high",
          source: {
            filePath: "packages/cli/src/dev-command.ts",
            symbol: "readProjectData"
          }
        },
        {
          id: "layer.result",
          kind: "result",
          label: "ProjectData JSON",
          status: "source-matched",
          evidenceIds: ["evidence.schema"],
          confidence: "high"
        }
      ],
      evidenceIds: ["evidence.workspace"],
      confidence: "high"
    },
    {
      id: "flow.map-graph",
      requestId: "request.map-graph",
      name: "Render architecture map",
      layers: [],
      layerIds: [],
      evidenceIds: ["evidence.map"],
      confidence: "medium"
    }
  ],
  architecture: {
    nodes: [
      {
        id: "node.viewer",
        kind: "frontend",
        label: "ViewerApp",
        displayLabel: "ViewerApp",
        domain: "Page",
        source: {
          filePath: "packages/ui/src/viewer/ViewerApp.tsx",
          symbol: "ViewerApp"
        },
        evidenceIds: ["evidence.workspace"],
        confidence: "high"
      },
      {
        id: "node.project-api",
        kind: "api",
        label: "Project data",
        displayLabel: "Project data",
        domain: "API",
        source: {
          filePath: "packages/cli/src/dev-command.ts",
          symbol: "createLocalUiServer"
        },
        evidenceIds: ["evidence.workspace"],
        confidence: "high",
        metadata: {
          contracts: {
            endpoint: "GET /api/project-data",
            input: { name: "None", shape: null },
            output: {
              name: "ProjectData",
              kind: "dto",
              shape: {
                schemaVersion: "string",
                project: "ProjectInfo",
                pages: "ProjectPage[]",
                features: "ProjectFeature[]",
                architecture: "ArchitectureGraph"
              }
            },
            relatedModels: ["ProjectData", "ArchitectureNode", "ArchitectureEdge"]
          }
        }
      },
      {
        id: "node.map-api",
        kind: "api",
        label: "Map graph",
        displayLabel: "Map graph",
        domain: "API",
        evidenceIds: ["evidence.map"],
        confidence: "medium"
      },
      {
        id: "node.runtime",
        kind: "service",
        label: "Dev runtime",
        displayLabel: "Dev runtime",
        domain: "Service",
        source: {
          filePath: "packages/cli/src/dev-command.ts",
          symbol: "runDevCommand"
        },
        evidenceIds: ["evidence.workspace"],
        confidence: "high",
        metadata: {
          contracts: {
            input: { name: "anlyx.project.json", shape: null },
            output: { name: "ProjectData", kind: "dto" },
            transforms: ["validate schema", "normalize split files", "build workspace model"]
          }
        }
      },
      {
        id: "node.map-projection",
        kind: "service",
        label: "Map projection",
        displayLabel: "Map projection",
        domain: "Viewer",
        evidenceIds: ["evidence.map"],
        confidence: "medium"
      },
      {
        id: "node.repo",
        kind: "repository",
        label: "Project JSON repo",
        displayLabel: "Project JSON repo",
        domain: "Runtime",
        evidenceIds: ["evidence.repo"],
        confidence: "medium"
      },
      {
        id: "node.normalize",
        kind: "mapper",
        label: "Normalize JSON",
        displayLabel: "Normalize JSON",
        domain: "Map",
        source: {
          filePath: "packages/core/src/project-normalize.ts",
          symbol: "normalizeProjectInput"
        },
        evidenceIds: ["evidence.schema"],
        confidence: "high",
        metadata: {
          contracts: {
            input: { name: "RawProjectInput", kind: "dto" },
            output: { name: "ProjectData", kind: "dto" },
            mapping: "Raw split files -> normalized project model"
          }
        }
      },
      {
        id: "node.schema",
        kind: "policy",
        label: "Project schema",
        displayLabel: "Project schema",
        domain: "Policy",
        source: {
          filePath: "packages/core/src/project-schema.ts",
          symbol: "projectDataSchema"
        },
        evidenceIds: ["evidence.schema"],
        confidence: "high"
      },
      {
        id: "node.workspace-ui",
        kind: "result",
        label: "Workspace UI",
        displayLabel: "Workspace UI",
        domain: "UI",
        evidenceIds: ["evidence.workspace"],
        confidence: "high"
      },
      {
        id: "node.map-ui",
        kind: "result",
        label: "Map UI",
        displayLabel: "Map UI",
        domain: "UI",
        evidenceIds: ["evidence.map"],
        confidence: "high"
      }
    ],
    edges: [
      {
        id: "edge.viewer.project-api",
        source: "node.viewer",
        target: "node.project-api",
        role: "primary",
        evidenceIds: ["evidence.workspace"],
        confidence: "high"
      },
      {
        id: "edge.viewer.map-api",
        source: "node.viewer",
        target: "node.map-api",
        role: "primary",
        evidenceIds: ["evidence.map"],
        confidence: "medium"
      },
      {
        id: "edge.project-api.runtime",
        source: "node.project-api",
        target: "node.runtime",
        role: "primary",
        evidenceIds: ["evidence.workspace"],
        confidence: "high"
      },
      {
        id: "edge.map-api.runtime",
        source: "node.map-api",
        target: "node.runtime",
        role: "shared",
        evidenceIds: ["evidence.map"],
        confidence: "medium"
      },
      {
        id: "edge.project-summary.runtime",
        source: "node.map-api",
        target: "node.map-projection",
        role: "primary",
        evidenceIds: ["evidence.map"],
        confidence: "medium"
      },
      {
        id: "edge.runtime.repo",
        source: "node.runtime",
        target: "node.repo",
        role: "shared",
        evidenceIds: ["evidence.repo"],
        confidence: "medium"
      },
      {
        id: "edge.repo.normalize",
        source: "node.repo",
        target: "node.normalize",
        role: "primary",
        evidenceIds: ["evidence.schema"],
        confidence: "high"
      },
      {
        id: "edge.normalize.schema",
        source: "node.normalize",
        target: "node.schema",
        role: "primary",
        evidenceIds: ["evidence.schema"],
        confidence: "high"
      },
      {
        id: "edge.schema.workspace",
        source: "node.schema",
        target: "node.workspace-ui",
        role: "primary",
        evidenceIds: ["evidence.workspace"],
        confidence: "high"
      },
      {
        id: "edge.map-projection.map-ui",
        source: "node.map-projection",
        target: "node.map-ui",
        role: "primary",
        evidenceIds: ["evidence.map"],
        confidence: "medium"
      }
    ]
  },
  evidence: [
    {
      id: "evidence.workspace",
      status: "source-matched",
      label: "Workspace source matched",
      source: {
        filePath: "packages/ui/src/workspace/WorkspaceApp.tsx"
      },
      targetIds: ["page.pages", "request.project-data", "node.viewer", "node.workspace-ui"],
      confidence: "high"
    },
    {
      id: "evidence.map",
      status: "agent-inferred",
      label: "Map graph relationship authored for demo",
      targetIds: ["page.map", "request.map-graph", "node.map-api", "node.map-ui"],
      confidence: "medium"
    },
    {
      id: "evidence.schema",
      status: "source-matched",
      label: "Project schema source matched",
      source: {
        filePath: "packages/core/src/project-schema.ts",
        symbol: "projectDataSchema"
      },
      targetIds: ["node.schema", "node.normalize"],
      confidence: "high"
    },
    {
      id: "evidence.repo",
      status: "agent-inferred",
      label: "Project JSON repository layer inferred",
      targetIds: ["node.repo"],
      confidence: "medium"
    }
  ],
  measurements: [],
  dictionary: {
    defaultLanguage: "en",
    terms: [
      {
        id: "term.project-json",
        term: "Project JSON",
        definition: "The AI Agent-authored project model that Anlyx validates and renders.",
        relatedIds: ["node.schema", "request.project-data"]
      }
    ]
  },
  overview: {
    summary:
      "Anlyx is a local Project JSON viewer. It renders AI Agent-authored project facts as Pages, Map, Overview, Capabilities, and JSON.",
    projectType: "Local developer documentation viewer",
    mainPurpose: "Make project structure understandable without uploading source code.",
    actors: [
      {
        id: "actor.user",
        name: "User",
        role: "user",
        description: "Inspects authored project structure locally.",
        evidenceIds: ["evidence.workspace"],
        confidence: "high"
      },
      {
        id: "actor.agent",
        name: "AI Agent",
        role: "external",
        description: "Authors anlyx.project.json from repository inspection.",
        evidenceIds: ["evidence.schema"],
        confidence: "medium"
      }
    ],
    coreEntities: [
      {
        id: "entity.project-data",
        name: "ProjectData",
        kind: "core-entity",
        description: "Normalized project facts rendered by the viewer.",
        dataRefs: [{ kind: "model", name: "ProjectData" }],
        evidenceIds: ["evidence.schema"],
        confidence: "high"
      }
    ],
    mainAreas: [],
    implementation: [
      {
        id: "impl.react",
        name: "React",
        kind: "frontend",
        description: "Renders the local Project JSON workspace.",
        evidenceIds: ["evidence.workspace"],
        confidence: "high"
      },
      {
        id: "impl.typescript",
        name: "TypeScript",
        kind: "tooling",
        description: "Defines schema, CLI, and viewer contracts.",
        evidenceIds: ["evidence.schema"],
        confidence: "high"
      },
      {
        id: "impl.node",
        name: "Node.js",
        kind: "backend",
        description: "Serves the local 4777 viewer and project data endpoint.",
        evidenceIds: ["evidence.workspace"],
        confidence: "medium"
      }
    ],
    suggestedReadingPath: [],
    evidenceIds: ["evidence.workspace"],
    confidence: "high"
  },
  capabilities: [
    {
      id: "capability.load-project-json",
      actorRole: "user",
      name: "Load Project JSON",
      description: "Load the current project definition from the CLI runtime into the workspace.",
      entry: {
        type: "page",
        label: "Viewer workspace",
        pageId: "page.pages",
        path: "/"
      },
      pageIds: ["page.pages"],
      featureIds: ["feature.inspect-pages"],
      requestIds: ["request.project-data"],
      flowIds: ["flow.project-data"],
      dataRefs: [{ kind: "model", name: "ProjectData", operation: "read" }],
      status: "connected",
      visibleResult: "Pages, Map, Overview, Capabilities, and JSON render from ProjectData.",
      evidenceIds: ["evidence.workspace"],
      confidence: "high"
    },
    {
      id: "capability.inspect-pages",
      actorRole: "user",
      name: "Inspect page behavior",
      description: "Inspect authored pages, selected flows, evidence, and unknowns.",
      entry: {
        type: "page",
        label: "Pages tab",
        pageId: "page.pages",
        path: "/"
      },
      pageIds: ["page.pages"],
      featureIds: ["feature.inspect-pages"],
      requestIds: ["request.project-data"],
      flowIds: ["flow.project-data"],
      dataRefs: [
        { kind: "model", name: "ProjectPage[]", operation: "read" },
        { kind: "model", name: "ProjectFlow[]", operation: "read" }
      ],
      status: "connected",
      visibleResult: "The Pages tab explains what a page does and which request/flow supports it.",
      evidenceIds: ["evidence.workspace"],
      confidence: "high"
    },
    {
      id: "capability.inspect-map",
      actorRole: "user",
      name: "Inspect architecture map",
      description: "Inspect authored architecture nodes and connections across layers.",
      entry: {
        type: "page",
        label: "Map tab",
        pageId: "page.map",
        path: "/map"
      },
      pageIds: ["page.map"],
      featureIds: ["feature.inspect-map"],
      requestIds: ["request.map-graph"],
      flowIds: ["flow.map-graph"],
      dataRefs: [{ kind: "model", name: "ArchitectureGraph", operation: "read" }],
      status: "connected",
      visibleResult: "The Map tab shows architecture nodes and edge relationships.",
      evidenceIds: ["evidence.map"],
      confidence: "medium"
    },
    {
      id: "capability.inspect-json",
      actorRole: "user",
      name: "Inspect raw authored JSON",
      description: "Open raw Project JSON for debugging and validation.",
      entry: {
        type: "page",
        label: "JSON tab",
        pageId: "page.json",
        path: "/json"
      },
      pageIds: ["page.json"],
      featureIds: ["feature.inspect-json"],
      requestIds: ["request.project-data"],
      flowIds: ["flow.project-data"],
      dataRefs: [{ kind: "model", name: "ProjectData", operation: "read" }],
      status: "connected",
      visibleResult: "The JSON tab exposes the authored source of truth.",
      evidenceIds: ["evidence.schema"],
      confidence: "high"
    }
  ],
  dataLifecycles: [],
  impactMaps: []
};

export function ProjectWorkspaceDemo(): JSX.Element {
  return <WorkspaceApp projectData={demoProjectData} />;
}
