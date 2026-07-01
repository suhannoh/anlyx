import { z } from "zod";
import { confidenceLevelSchema, httpMethodSchema } from "./schema.js";

export const projectSchemaVersionSchema = z.enum(["0.2.0", "0.3.0"]);
export const projectLanguageSchema = z.enum(["ko", "en", "zh", "ja", "fr"]);
export const projectActorRoleSchema = z.enum([
  "visitor",
  "user",
  "admin",
  "system",
  "public",
  "external",
  "unknown"
]);

export const requestRoleSchema = z.enum(["primary", "supporting", "background", "external"]);

export const requestPurposeSchema = z.enum([
  "data-load",
  "mutation",
  "auth-session",
  "preload",
  "analytics",
  "tracking",
  "permission",
  "notification",
  "polling",
  "health-check",
  "external-api",
  "dev-runtime",
  "unknown"
]);

export const flowLayerKindSchema = z.enum([
  "frontend",
  "request",
  "api",
  "controller",
  "handler",
  "middleware",
  "service",
  "policy",
  "mapper",
  "repository",
  "database",
  "cache",
  "queue",
  "job",
  "external",
  "result",
  "unknown"
]);

export const evidenceStatusSchema = z.enum([
  "observed",
  "measured",
  "source-matched",
  "agent-inferred",
  "manual",
  "not-proven",
  "unknown"
]);

export const measurementSourceSchema = z.enum([
  "har",
  "browser-network",
  "log",
  "trace",
  "opentelemetry",
  "framework-profiler",
  "apm-export",
  "test-trace"
]);

const metadataSchema = z.record(z.string(), z.unknown());

export const dataOperationSchema = z.enum([
  "create",
  "read",
  "update",
  "delete",
  "publish",
  "archive",
  "validate",
  "expire",
  "unknown"
]);

export const sourceLocationSchema = z
  .object({
    filePath: z.string().min(1).optional(),
    lineStart: z.number().int().positive().optional(),
    lineEnd: z.number().int().positive().optional(),
    symbol: z.string().min(1).optional()
  })
  .strict();

export const projectGeneratedBySchema = z
  .object({
    kind: z.enum(["agent", "manual"]),
    name: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    version: z.string().min(1).optional()
  })
  .strict();

export const projectInfoSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    root: z.string().optional(),
    analyzedAt: z.string().optional(),
    frameworkNotes: z.array(z.string()).default([]),
    generatedBy: projectGeneratedBySchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectAreaSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    order: z.number().int().optional(),
    evidenceIds: z.array(z.string().min(1)).default([]),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectPageSchema = z
  .object({
    id: z.string().min(1),
    path: z.string().min(1),
    title: z.string().min(1),
    areaId: z.string().min(1).optional(),
    description: z.string().optional(),
    source: sourceLocationSchema.optional(),
    featureIds: z.array(z.string().min(1)).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectRequestSchema = z
  .object({
    id: z.string().min(1),
    method: httpMethodSchema.optional(),
    path: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    role: requestRoleSchema,
    purpose: requestPurposeSchema,
    description: z.string().optional(),
    flowId: z.string().min(1).optional(),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectFeatureSchema = z
  .object({
    id: z.string().min(1),
    pageId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    requests: z.array(projectRequestSchema).default([]),
    requestIds: z.array(z.string().min(1)).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectFlowLayerSchema = z
  .object({
    id: z.string().min(1),
    kind: flowLayerKindSchema,
    label: z.string().min(1),
    source: sourceLocationSchema.optional(),
    evidenceIds: z.array(z.string().min(1)).default([]),
    status: evidenceStatusSchema.default("unknown"),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectFlowSchema = z
  .object({
    id: z.string().min(1),
    requestId: z.string().min(1).optional(),
    name: z.string().optional(),
    layers: z.array(projectFlowLayerSchema).default([]),
    layerIds: z.array(z.string().min(1)).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const architectureNodeSchema = z
  .object({
    id: z.string().min(1),
    kind: flowLayerKindSchema,
    label: z.string().min(1),
    displayLabel: z.string().optional(),
    domain: z.string().optional(),
    source: sourceLocationSchema.optional(),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const architectureEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    role: z.enum(["primary", "shared", "aggregate", "context"]).default("primary"),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const architectureGraphSchema = z
  .object({
    nodes: z.array(architectureNodeSchema).default([]),
    edges: z.array(architectureEdgeSchema).default([])
  })
  .strict();

export const projectEvidenceSchema = z
  .object({
    id: z.string().min(1),
    status: evidenceStatusSchema,
    label: z.string().min(1),
    detail: z.string().optional(),
    source: sourceLocationSchema.optional(),
    targetIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectMeasurementSchema = z
  .object({
    id: z.string().min(1),
    targetId: z.string().min(1),
    source: measurementSourceSchema,
    durationMs: z.number().nonnegative(),
    observedAt: z.string().optional(),
    evidenceId: z.string().min(1).optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const dictionaryTermSchema = z
  .object({
    id: z.string().min(1),
    term: z.string().min(1),
    definition: z.string().min(1),
    relatedIds: z.array(z.string().min(1)).default([]),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectDictionarySchema = z
  .object({
    defaultLanguage: projectLanguageSchema.default("en"),
    terms: z.array(dictionaryTermSchema).default([])
  })
  .strict();

export const projectCoverageCountsSchema = z
  .object({
    pages: z.number().int().nonnegative().optional(),
    requests: z.number().int().nonnegative().optional(),
    flows: z.number().int().nonnegative().optional(),
    architectureNodes: z.number().int().nonnegative().optional(),
    frontendApiUsages: z.number().int().nonnegative().optional(),
    backendEndpoints: z.number().int().nonnegative().optional()
  })
  .strict();

export const projectCoverageSchema = z
  .object({
    status: z.enum(["complete", "partial", "unknown"]).default("unknown"),
    detected: projectCoverageCountsSchema.optional(),
    modeled: projectCoverageCountsSchema.optional(),
    unmodeled: z
      .object({
        pages: z.array(z.string().min(1)).default([]),
        requests: z.array(z.string().min(1)).default([]),
        endpoints: z.array(z.string().min(1)).default([]),
        notes: z.array(z.string().min(1)).default([])
      })
      .strict()
      .default(() => ({ pages: [], requests: [], endpoints: [], notes: [] })),
    evidenceIds: z.array(z.string().min(1)).default([]),
    metadata: metadataSchema.optional()
  })
  .strict();

export const dataRefSchema = z
  .object({
    kind: z.enum([
      "entity",
      "table",
      "field",
      "model",
      "collection",
      "cache",
      "queue",
      "external",
      "unknown"
    ]),
    name: z.string().min(1),
    refId: z.string().min(1).optional(),
    operation: dataOperationSchema.optional()
  })
  .strict();

export const projectActorSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: projectActorRoleSchema,
    description: z.string().optional(),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectEntitySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z
      .enum(["core-entity", "table", "model", "collection", "field", "external", "unknown"])
      .default("unknown"),
    description: z.string().optional(),
    dataRefs: z.array(dataRefSchema).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectMainAreaSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    pageIds: z.array(z.string().min(1)).default([]),
    featureIds: z.array(z.string().min(1)).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectImplementationItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(["frontend", "backend", "database", "cache", "queue", "external", "tooling", "unknown"]),
    description: z.string().optional(),
    source: sourceLocationSchema.optional(),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const suggestedReadingStepSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    target: z.enum(["overview", "capabilities", "data-lifecycle", "impact-map", "pages", "map", "json"]),
    description: z.string().optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectOverviewSchema = z
  .object({
    summary: z.string().optional(),
    projectType: z.string().optional(),
    mainPurpose: z.string().optional(),
    actors: z.array(projectActorSchema).default([]),
    coreEntities: z.array(projectEntitySchema).default([]),
    mainAreas: z.array(projectMainAreaSchema).default([]),
    implementation: z.array(projectImplementationItemSchema).default([]),
    suggestedReadingPath: z.array(suggestedReadingStepSchema).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const capabilityEntrySchema = z
  .object({
    type: z.enum(["page", "route", "action", "request", "job", "external", "unknown"]),
    label: z.string().min(1),
    pageId: z.string().min(1).optional(),
    path: z.string().min(1).optional(),
    source: sourceLocationSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectCapabilitySchema = z
  .object({
    id: z.string().min(1),
    actorRole: projectActorRoleSchema,
    name: z.string().min(1),
    description: z.string().optional(),
    entry: capabilityEntrySchema.optional(),
    pageIds: z.array(z.string().min(1)).default([]),
    featureIds: z.array(z.string().min(1)).default([]),
    requestIds: z.array(z.string().min(1)).default([]),
    flowIds: z.array(z.string().min(1)).default([]),
    dataRefs: z.array(dataRefSchema).default([]),
    status: z.enum(["connected", "ui-only", "api-only", "data-only", "inferred", "unknown"]),
    visibleResult: z.string().optional(),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectEntityRefSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1),
    kind: z.enum(["core-entity", "table", "model", "collection", "field", "unknown"]),
    dataRefs: z.array(dataRefSchema).default([])
  })
  .strict();

export const lifecycleStageSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    actorRole: projectActorRoleSchema.optional(),
    state: z.string().optional(),
    pageIds: z.array(z.string().min(1)).default([]),
    requestIds: z.array(z.string().min(1)).default([]),
    flowIds: z.array(z.string().min(1)).default([]),
    dataRefs: z.array(dataRefSchema).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const dataChangeSchema = z
  .object({
    operation: dataOperationSchema,
    target: z.string().min(1),
    from: z.string().optional(),
    to: z.string().optional(),
    description: z.string().optional()
  })
  .strict();

export const lifecycleTransitionSchema = z
  .object({
    id: z.string().min(1),
    fromStageId: z.string().min(1),
    toStageId: z.string().min(1),
    label: z.string().optional(),
    trigger: z
      .object({
        type: z.enum([
          "user-action",
          "admin-action",
          "system-job",
          "request",
          "scheduler",
          "manual",
          "external",
          "unknown"
        ]),
        label: z.string().optional(),
        requestIds: z.array(z.string().min(1)).default([]),
        source: sourceLocationSchema.optional()
      })
      .strict()
      .optional(),
    dataChanges: z.array(dataChangeSchema).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    status: evidenceStatusSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const dataLifecycleSchema = z
  .object({
    id: z.string().min(1),
    entity: projectEntityRefSchema,
    name: z.string().min(1),
    description: z.string().optional(),
    stageIds: z.array(z.string().min(1)).default([]),
    stages: z.array(lifecycleStageSchema).default([]),
    transitions: z.array(lifecycleTransitionSchema).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const impactTargetSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum([
      "entity",
      "field",
      "page",
      "feature",
      "request",
      "flow",
      "area",
      "service",
      "repository",
      "external",
      "unknown"
    ]),
    label: z.string().min(1),
    refId: z.string().min(1).optional(),
    dataRef: dataRefSchema.optional(),
    source: sourceLocationSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const businessEffectSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string().optional(),
    severity: z.enum(["high", "medium", "low", "unknown"]).optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const impactAffectedSchema = z
  .object({
    pageIds: z.array(z.string().min(1)).default([]),
    featureIds: z.array(z.string().min(1)).default([]),
    requestIds: z.array(z.string().min(1)).default([]),
    flowIds: z.array(z.string().min(1)).default([]),
    areaIds: z.array(z.string().min(1)).default([]),
    dataRefs: z.array(dataRefSchema).default([]),
    businessEffects: z.array(businessEffectSchema).default([])
  })
  .strict();

export const impactEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    label: z.string().optional(),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const impactMapSchema = z
  .object({
    id: z.string().min(1),
    target: impactTargetSchema,
    name: z.string().min(1),
    description: z.string().optional(),
    impactLevel: z.enum(["high", "medium", "low", "unknown"]).optional(),
    affected: impactAffectedSchema,
    edges: z.array(impactEdgeSchema).default([]),
    summary: z.array(z.string()).default([]),
    evidenceIds: z.array(z.string().min(1)).default([]),
    confidence: confidenceLevelSchema.optional(),
    metadata: metadataSchema.optional()
  })
  .strict();

export const projectDataSchema = z
  .object({
    schemaVersion: projectSchemaVersionSchema,
    project: projectInfoSchema,
    areas: z.array(projectAreaSchema).default([]),
    pages: z.array(projectPageSchema).default([]),
    features: z.array(projectFeatureSchema).default([]),
    requests: z.array(projectRequestSchema).default([]),
    flows: z.array(projectFlowSchema).default([]),
    architecture: architectureGraphSchema.default(() => ({ nodes: [], edges: [] })),
    evidence: z.array(projectEvidenceSchema).default([]),
    measurements: z.array(projectMeasurementSchema).default([]),
    dictionary: projectDictionarySchema.default(() => ({
      defaultLanguage: "en" as const,
      terms: []
    })),
    coverage: projectCoverageSchema.optional(),
    overview: projectOverviewSchema.default(() => ({
      actors: [],
      coreEntities: [],
      mainAreas: [],
      implementation: [],
      suggestedReadingPath: [],
      evidenceIds: []
    })),
    capabilities: z.array(projectCapabilitySchema).default([]),
    dataLifecycles: z.array(dataLifecycleSchema).default([]),
    impactMaps: z.array(impactMapSchema).default([])
  })
  .strict();

export type DataOperation = z.infer<typeof dataOperationSchema>;
export type DataRef = z.infer<typeof dataRefSchema>;
export type ProjectActorRole = z.infer<typeof projectActorRoleSchema>;
export type ProjectActor = z.infer<typeof projectActorSchema>;
export type ProjectEntity = z.infer<typeof projectEntitySchema>;
export type ProjectMainArea = z.infer<typeof projectMainAreaSchema>;
export type ProjectImplementationItem = z.infer<typeof projectImplementationItemSchema>;
export type SuggestedReadingStep = z.infer<typeof suggestedReadingStepSchema>;
export type ProjectOverview = z.infer<typeof projectOverviewSchema>;
export type CapabilityEntry = z.infer<typeof capabilityEntrySchema>;
export type ProjectCapability = z.infer<typeof projectCapabilitySchema>;
export type ProjectEntityRef = z.infer<typeof projectEntityRefSchema>;
export type LifecycleStage = z.infer<typeof lifecycleStageSchema>;
export type DataChange = z.infer<typeof dataChangeSchema>;
export type LifecycleTransition = z.infer<typeof lifecycleTransitionSchema>;
export type DataLifecycle = z.infer<typeof dataLifecycleSchema>;
export type ImpactTarget = z.infer<typeof impactTargetSchema>;
export type BusinessEffect = z.infer<typeof businessEffectSchema>;
export type ImpactAffected = z.infer<typeof impactAffectedSchema>;
export type ImpactEdge = z.infer<typeof impactEdgeSchema>;
export type ImpactMap = z.infer<typeof impactMapSchema>;
export type ProjectSchemaVersion = z.infer<typeof projectSchemaVersionSchema>;
export type ProjectLanguage = z.infer<typeof projectLanguageSchema>;
export type RequestRole = z.infer<typeof requestRoleSchema>;
export type RequestPurpose = z.infer<typeof requestPurposeSchema>;
export type FlowLayerKind = z.infer<typeof flowLayerKindSchema>;
export type EvidenceStatus = z.infer<typeof evidenceStatusSchema>;
export type MeasurementSource = z.infer<typeof measurementSourceSchema>;
export type SourceLocation = z.infer<typeof sourceLocationSchema>;
export type ProjectGeneratedBy = z.infer<typeof projectGeneratedBySchema>;
export type ProjectInfo = z.infer<typeof projectInfoSchema>;
export type ProjectArea = z.infer<typeof projectAreaSchema>;
export type ProjectPage = z.infer<typeof projectPageSchema>;
export type ProjectRequest = z.infer<typeof projectRequestSchema>;
export type ProjectFeature = z.infer<typeof projectFeatureSchema>;
export type ProjectFlowLayer = z.infer<typeof projectFlowLayerSchema>;
export type ProjectFlow = z.infer<typeof projectFlowSchema>;
export type ArchitectureNode = z.infer<typeof architectureNodeSchema>;
export type ArchitectureEdge = z.infer<typeof architectureEdgeSchema>;
export type ArchitectureGraph = z.infer<typeof architectureGraphSchema>;
export type ProjectEvidence = z.infer<typeof projectEvidenceSchema>;
export type ProjectMeasurement = z.infer<typeof projectMeasurementSchema>;
export type DictionaryTerm = z.infer<typeof dictionaryTermSchema>;
export type ProjectDictionary = z.infer<typeof projectDictionarySchema>;
export type ProjectCoverageCounts = z.infer<typeof projectCoverageCountsSchema>;
export type ProjectCoverage = z.infer<typeof projectCoverageSchema>;
export type ProjectData = z.infer<typeof projectDataSchema>;

export function parseProjectData(value: unknown): ProjectData {
  return projectDataSchema.parse(value);
}
