import { z } from "zod";

export const flowNodeTypeSchema = z.enum([
  "ui.action",
  "ui.page",
  "ui.component",
  "api.request",
  "api.route",
  "controller",
  "middleware",
  "auth.session",
  "service",
  "repository",
  "database",
  "external",
  "queue",
  "job",
  "result",
  "response",
  "unknown"
]);

export const flowStatusSchema = z.enum([
  "observed",
  "measured",
  "source-matched",
  "agent-inferred",
  "manual",
  "not-proven",
  "unknown"
]);

export const flowEvidenceKindSchema = z.enum([
  "runtime.browser.click",
  "runtime.browser.fetch",
  "runtime.server.span",
  "runtime.database.query",
  "telemetry.span",
  "source",
  "agent",
  "manual",
  "unknown"
]);

export const flowTimingSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("measured"),
      durationMs: z.number().nonnegative(),
      evidenceId: z.string().min(1)
    })
    .strict(),
  z
    .object({
      kind: z.literal("estimate"),
      durationMs: z.number().nonnegative().optional(),
      reason: z.string().min(1)
    })
    .strict(),
  z
    .object({
      kind: z.literal("unknown")
    })
    .strict()
]);

const recordSchema = z.record(z.string(), z.unknown());

export const flowSourceLocationSchema = z
  .object({
    file: z.string().optional(),
    symbol: z.string().optional(),
    lineStart: z.number().int().positive().optional(),
    lineEnd: z.number().int().positive().optional()
  })
  .strict();

export const flowEvidenceSchema = z
  .object({
    id: z.string().min(1),
    kind: flowEvidenceKindSchema,
    label: z.string().optional(),
    file: z.string().optional(),
    symbol: z.string().optional(),
    lineStart: z.number().int().positive().optional(),
    lineEnd: z.number().int().positive().optional(),
    observedAt: z.string().optional(),
    detail: z.string().optional()
  })
  .strict();

export const flowRequestSchema = z
  .object({
    pathParams: recordSchema.optional(),
    query: recordSchema.optional(),
    headers: recordSchema.optional(),
    body: z.unknown().optional()
  })
  .strict();

export const flowResponseSchema = z
  .object({
    statusCodes: z.array(z.number().int()).optional(),
    bodyShape: z.unknown().optional(),
    source: flowSourceLocationSchema.optional()
  })
  .strict();

export const flowNodeSchema = z
  .object({
    id: z.string().min(1),
    type: flowNodeTypeSchema,
    label: z.string().min(1),
    status: flowStatusSchema.default("unknown"),
    evidenceIds: z.array(z.string().min(1)).optional(),
    timing: flowTimingSchema.optional(),
    request: flowRequestSchema.optional(),
    response: flowResponseSchema.optional(),
    metadata: recordSchema.optional()
  })
  .strict();

export const flowEdgeSchema = z
  .object({
    id: z.string().min(1).optional(),
    from: z.string().min(1),
    to: z.string().min(1),
    label: z.string().optional(),
    status: flowStatusSchema.default("unknown"),
    evidenceIds: z.array(z.string().min(1)).optional(),
    timing: flowTimingSchema.optional(),
    metadata: recordSchema.optional()
  })
  .strict();

export const flowEntrySchema = z
  .object({
    type: z.string().min(1),
    label: z.string().min(1),
    page: z.string().optional()
  })
  .strict();

export const flowSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    entry: flowEntrySchema.optional(),
    nodes: z.array(flowNodeSchema),
    edges: z.array(flowEdgeSchema),
    evidence: z.array(flowEvidenceSchema)
  })
  .strict();

export const flowProjectSchema = z
  .object({
    name: z.string().min(1),
    root: z.string().default("."),
    frameworks: z.array(z.string()).optional()
  })
  .strict();

export const flowGeneratedBySchema = z
  .object({
    type: z.enum(["agent", "manual", "runtime", "adapter", "unknown"]),
    name: z.string().optional(),
    version: z.string().optional(),
    skill: z.string().optional()
  })
  .strict();

export const flowSnapshotSchema = z
  .object({
    id: z.string().min(1),
    createdAt: z.string().min(1),
    source: z.string().min(1),
    git: z
      .object({
        branch: z.string().optional(),
        commit: z.string().optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const anlyxFlowFileSchema = z
  .object({
    schemaVersion: z.literal("0.1.5"),
    project: flowProjectSchema,
    generatedBy: flowGeneratedBySchema.optional(),
    snapshot: flowSnapshotSchema.optional(),
    flows: z.array(flowSchema)
  })
  .strict();

export type FlowNodeType = z.infer<typeof flowNodeTypeSchema>;
export type FlowStatus = z.infer<typeof flowStatusSchema>;
export type FlowEvidenceKind = z.infer<typeof flowEvidenceKindSchema>;
export type FlowTiming = z.infer<typeof flowTimingSchema>;
export type FlowSourceLocation = z.infer<typeof flowSourceLocationSchema>;
export type FlowEvidence = z.infer<typeof flowEvidenceSchema>;
export type FlowRequest = z.infer<typeof flowRequestSchema>;
export type FlowResponse = z.infer<typeof flowResponseSchema>;
export type FlowNode = z.infer<typeof flowNodeSchema>;
export type FlowEdge = z.infer<typeof flowEdgeSchema>;
export type FlowEntry = z.infer<typeof flowEntrySchema>;
export type FlowProject = z.infer<typeof flowProjectSchema>;
export type FlowGeneratedBy = z.infer<typeof flowGeneratedBySchema>;
export type FlowSnapshot = z.infer<typeof flowSnapshotSchema>;
export type Flow = z.infer<typeof flowSchema>;
export type AnlyxFlowFile = z.infer<typeof anlyxFlowFileSchema>;

export function parseAnlyxFlowFile(value: unknown): AnlyxFlowFile {
  return anlyxFlowFileSchema.parse(value);
}

export function parseFlow(value: unknown): Flow {
  return flowSchema.parse(value);
}
