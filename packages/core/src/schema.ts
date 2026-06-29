import { z } from "zod";

export const httpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export const confidenceLevelSchema = z.enum(["high", "medium", "low", "unknown"]);
export const captureStatusSchema = z.enum(["success", "failed", "pending"]);
export const supportLevelSchema = z.enum(["basic", "enhanced", "deep"]);
export const bridgeFlowStatusSchema = z.enum([
  "observed",
  "measured",
  "source-matched",
  "agent-inferred",
  "manual",
  "not-proven",
  "unknown"
]);

export const bridgeMeasuredTimingSchema = z
  .object({
    kind: z.literal("measured"),
    durationMs: z.number().nonnegative(),
    evidenceId: z.string().min(1)
  })
  .strict();

export const bridgeEstimateTimingSchema = z
  .object({
    kind: z.literal("estimate"),
    durationMs: z.number().nonnegative().optional(),
    reason: z.string().min(1)
  })
  .strict();

export const bridgeUnknownTimingSchema = z
  .object({
    kind: z.literal("unknown")
  })
  .strict();

export const bridgeFlowTimingSchema = z.discriminatedUnion("kind", [
  bridgeMeasuredTimingSchema,
  bridgeEstimateTimingSchema,
  bridgeUnknownTimingSchema
]);

const bridgeRecordSchema = z.record(z.string(), z.unknown());

export const mapNodeTypeSchema = z.enum([
  "frontend_file",
  "frontend_request",
  "api_endpoint",
  "controller",
  "handler",
  "middleware",
  "service",
  "repository",
  "db_table",
  "external",
  "queue",
  "job",
  "unknown"
]);

export const mapEdgeTypeSchema = z.enum([
  "file_calls_request",
  "request_matches_endpoint",
  "endpoint_handled_by_controller",
  "controller_calls_service",
  "handler_calls_service",
  "service_calls_service",
  "service_calls_repository",
  "repository_touches_table",
  "calls_external",
  "publishes_job",
  "unknown"
]);

export const mapGraphGeneratedBySchema = z
  .object({
    kind: z.enum(["agent", "manual", "runtime", "adapter"]),
    name: z.string().optional()
  })
  .strict();

export const mapNodeSchema = z
  .object({
    id: z.string().min(1),
    type: mapNodeTypeSchema,
    label: z.string().min(1),
    filePath: z.string().optional(),
    lineNumber: z.number().int().positive().optional(),
    method: httpMethodSchema.optional(),
    path: z.string().optional(),
    domain: z.string().optional(),
    status: bridgeFlowStatusSchema.optional(),
    confidence: confidenceLevelSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict();

export const mapEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    type: mapEdgeTypeSchema,
    status: bridgeFlowStatusSchema.optional(),
    confidence: confidenceLevelSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict();

export const mapGraphSchema = z
  .object({
    schemaVersion: z.literal("0.1.5"),
    project: z
      .object({
        name: z.string().min(1),
        root: z.string().optional()
      })
      .strict(),
    generatedAt: z.string(),
    generatedBy: mapGraphGeneratedBySchema.optional(),
    nodes: z.array(mapNodeSchema),
    edges: z.array(mapEdgeSchema),
    stats: z
      .object({
        frontendFiles: z.number().int().nonnegative().optional(),
        frontendRequests: z.number().int().nonnegative().optional(),
        apiEndpoints: z.number().int().nonnegative().optional(),
        controllers: z.number().int().nonnegative().optional(),
        handlers: z.number().int().nonnegative().optional(),
        services: z.number().int().nonnegative().optional(),
        repositories: z.number().int().nonnegative().optional(),
        dbTables: z.number().int().nonnegative().optional(),
        externalSystems: z.number().int().nonnegative().optional()
      })
      .strict()
      .optional()
  })
  .strict();

export const bridgeFlowRequestSchema = z
  .object({
    pathParams: bridgeRecordSchema.optional(),
    query: bridgeRecordSchema.optional(),
    headers: bridgeRecordSchema.optional(),
    body: z.unknown().optional()
  })
  .strict();

export const bridgeFlowResponseSchema = z
  .object({
    statusCodes: z.array(z.number().int()).optional(),
    bodyShape: z.unknown().optional(),
    source: z
      .object({
        file: z.string().optional(),
        symbol: z.string().optional(),
        lineStart: z.number().int().positive().optional(),
        lineEnd: z.number().int().positive().optional()
      })
      .strict()
      .optional()
  })
  .strict();

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
    status: bridgeFlowStatusSchema.optional(),
    timing: bridgeFlowTimingSchema.optional(),
    evidenceIds: z.array(z.string().min(1)).optional(),
    request: bridgeFlowRequestSchema.optional(),
    response: bridgeFlowResponseSchema.optional(),
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
    status: bridgeFlowStatusSchema.optional(),
    timing: bridgeFlowTimingSchema.optional(),
    evidenceIds: z.array(z.string().min(1)).optional(),
    evidence: z.array(analysisEvidenceSchema).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
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
    mapGraph: mapGraphSchema.optional(),
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
export type BridgeFlowStatus = z.infer<typeof bridgeFlowStatusSchema>;
export type BridgeMeasuredTiming = z.infer<typeof bridgeMeasuredTimingSchema>;
export type BridgeEstimateTiming = z.infer<typeof bridgeEstimateTimingSchema>;
export type BridgeUnknownTiming = z.infer<typeof bridgeUnknownTimingSchema>;
export type BridgeFlowTiming = z.infer<typeof bridgeFlowTimingSchema>;
export type BridgeFlowRequest = z.infer<typeof bridgeFlowRequestSchema>;
export type BridgeFlowResponse = z.infer<typeof bridgeFlowResponseSchema>;
export type AnalysisEvidence = z.infer<typeof analysisEvidenceSchema>;
export type MapNodeType = z.infer<typeof mapNodeTypeSchema>;
export type MapEdgeType = z.infer<typeof mapEdgeTypeSchema>;
export type MapNode = z.infer<typeof mapNodeSchema>;
export type MapEdge = z.infer<typeof mapEdgeSchema>;
export type MapGraph = z.infer<typeof mapGraphSchema>;
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
export const reportDataSchema = scanResultSchema;
export type ReportData = ScanResult;

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

export function parseReportData(value: unknown): ReportData {
  return reportDataSchema.parse(value);
}

export function parseCaptureResult(value: unknown): CaptureResult {
  return captureResultSchema.parse(value);
}
