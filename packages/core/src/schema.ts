import { z } from "zod";

export const httpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export const confidenceLevelSchema = z.enum(["high", "medium", "low", "unknown"]);
export const captureStatusSchema = z.enum(["success", "failed", "pending"]);
export const supportLevelSchema = z.enum(["basic", "enhanced", "deep"]);

export const analysisEvidenceSchema = z
  .object({
    label: z.string(),
    detail: z.string().optional(),
    source: z.string().optional(),
    confidence: confidenceLevelSchema.optional()
  })
  .strict();

export const endpointSchema = z
  .object({
    id: z.string(),
    method: httpMethodSchema,
    path: z.string(),
    framework: z.enum(["spring", "openapi"]).optional(),
    supportLevel: supportLevelSchema,
    controller: z.string().optional(),
    handler: z.string().optional(),
    filePath: z.string().optional(),
    lineNumber: z.number().optional(),
    requestSchema: z.string().optional(),
    responseSchema: z.string().optional(),
    authRequired: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    usedByPageIds: z.array(z.string()).optional(),
    confidence: confidenceLevelSchema.optional()
  })
  .strict();

export const flowNodeSchema = z
  .object({
    id: z.string(),
    type: z.enum([
      "page",
      "endpoint",
      "controller",
      "service",
      "repository",
      "database",
      "dto",
      "schema",
      "externalApi",
      "cache",
      "utility",
      "validator",
      "mapper",
      "unknown"
    ]),
    label: z.string(),
    filePath: z.string().optional(),
    lineNumber: z.number().optional(),
    confidence: confidenceLevelSchema.optional(),
    evidence: z.array(analysisEvidenceSchema).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict();

export const flowEdgeSchema = z
  .object({
    id: z.string(),
    from: z.string(),
    to: z.string(),
    kind: z.enum(["main", "sub", "request", "response", "db", "external", "cache"]),
    label: z.string().optional(),
    animated: z.boolean().optional(),
    confidence: confidenceLevelSchema.optional(),
    evidence: z.array(analysisEvidenceSchema).optional()
  })
  .strict();

export const subFlowSchema = z
  .object({
    id: z.string(),
    parentNodeId: z.string(),
    nodes: z.array(flowNodeSchema),
    edges: z.array(flowEdgeSchema),
    collapsedByDefault: z.boolean()
  })
  .strict();

export const endpointFlowSchema = z
  .object({
    endpointId: z.string(),
    nodes: z.array(flowNodeSchema),
    edges: z.array(flowEdgeSchema),
    mainPath: z.array(z.string()),
    subFlows: z.array(subFlowSchema)
  })
  .strict();

export const viewportSchema = z
  .object({
    width: z.number(),
    height: z.number()
  })
  .strict();

export const screenshotSegmentSchema = z
  .object({
    segmentIndex: z.number(),
    title: z.string().optional(),
    path: z.string().optional(),
    viewport: viewportSchema,
    scrollY: z.number()
  })
  .strict();

export const apiCallSchema = z
  .object({
    method: httpMethodSchema,
    path: z.string(),
    endpointId: z.string().optional(),
    status: z.number().optional()
  })
  .strict();

export const pageStoryboardSchema = z
  .object({
    id: z.string(),
    route: z.string(),
    filePath: z.string().optional(),
    screenshots: z.array(screenshotSegmentSchema),
    apiCalls: z.array(apiCallSchema),
    captureStatus: captureStatusSchema,
    errorMessage: z.string().optional()
  })
  .strict();

export const captureResultSchema = z
  .object({
    pages: z.array(pageStoryboardSchema),
    capturedAt: z.string(),
    viewport: viewportSchema,
    storageStateUsed: z.string().optional()
  })
  .strict();

export const scanResultSchema = z
  .object({
    projectName: z.string(),
    generatedAt: z.string(),
    schemaVersion: z.literal("0.1"),
    endpoints: z.array(endpointSchema),
    flows: z.array(endpointFlowSchema),
    pages: z.array(pageStoryboardSchema),
    capture: captureResultSchema.optional(),
    warnings: z.array(
      z
        .object({
          code: z.string(),
          message: z.string(),
          targetId: z.string().optional()
        })
        .strict()
    )
  })
  .strict();

export type HttpMethod = z.infer<typeof httpMethodSchema>;
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;
export type CaptureStatus = z.infer<typeof captureStatusSchema>;
export type SupportLevel = z.infer<typeof supportLevelSchema>;
export type AnalysisEvidence = z.infer<typeof analysisEvidenceSchema>;
export type Endpoint = z.infer<typeof endpointSchema>;
export type FlowNode = z.infer<typeof flowNodeSchema>;
export type FlowEdge = z.infer<typeof flowEdgeSchema>;
export type SubFlow = z.infer<typeof subFlowSchema>;
export type EndpointFlow = z.infer<typeof endpointFlowSchema>;
export type Viewport = z.infer<typeof viewportSchema>;
export type ScreenshotSegment = z.infer<typeof screenshotSegmentSchema>;
export type ApiCall = z.infer<typeof apiCallSchema>;
export type PageStoryboard = z.infer<typeof pageStoryboardSchema>;
export type CaptureResult = z.infer<typeof captureResultSchema>;
export type ScanResult = z.infer<typeof scanResultSchema>;

export function parseEndpoint(value: unknown): Endpoint {
  return endpointSchema.parse(value);
}

export function parseEndpointFlow(value: unknown): EndpointFlow {
  return endpointFlowSchema.parse(value);
}

export function parsePageStoryboard(value: unknown): PageStoryboard {
  return pageStoryboardSchema.parse(value);
}

export function parseScanResult(value: unknown): ScanResult {
  return scanResultSchema.parse(value);
}

export function parseCaptureResult(value: unknown): CaptureResult {
  return captureResultSchema.parse(value);
}
