import { z } from "zod";
import { confidenceLevelSchema, httpMethodSchema } from "./schema.js";

export const projectSchemaVersionSchema = z.literal("0.2.0");
export const projectLanguageSchema = z.enum(["ko", "en", "zh", "ja", "fr"]);

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
    }))
  })
  .strict();

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
export type ProjectData = z.infer<typeof projectDataSchema>;

export function parseProjectData(value: unknown): ProjectData {
  return projectDataSchema.parse(value);
}
