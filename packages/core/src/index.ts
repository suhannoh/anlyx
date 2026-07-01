export type {
  AnlyxConfig,
  BackendConfig,
  CaptureConfig,
  DevConfig,
  FrontendConfig,
  ManualFrontendConfig,
  NextFrontendConfig,
  NormalizedAnlyxConfig,
  NormalizedBackendConfig,
  NormalizedCaptureConfig,
  NormalizedDevConfig,
  NormalizedFrontendConfig,
  NormalizedManualFrontendConfig,
  NormalizedNextFrontendConfig,
  NormalizedOpenApiBackendConfig,
  NormalizedServerConfig,
  NormalizedSpringBackendConfig,
  OpenApiBackendConfig,
  ServerConfig,
  SpringBackendConfig,
  ViewportConfig
} from "./config.js";

export type {
  FixtureExpectedData,
  FixtureValidationIssue,
  FixtureValidationResult
} from "./fixture-validation.js";

export type {
  AggregateReportDataInput,
  ReportAggregationIssue,
  ReportAggregationResult,
  ReportAggregationWarning
} from "./report-aggregation.js";

export type {
  AnalysisEvidence,
  ApiCall,
  BridgeEstimateTiming,
  BridgeFlowRequest,
  BridgeFlowResponse,
  BridgeFlowStatus,
  BridgeFlowTiming,
  BridgeMeasuredTiming,
  BridgeUnknownTiming,
  CaptureResult,
  CaptureStatus,
  ConfidenceLevel,
  Endpoint,
  EndpointFlow,
  FlowEdge,
  FlowNode,
  HttpMethod,
  MapEdge,
  MapEdgeType,
  MapGraph,
  MapNode,
  MapNodeType,
  PageStoryboard,
  ReportData,
  ScanResult,
  ScreenshotSegment,
  SubFlow,
  SupportLevel,
  Viewport
} from "./schema.js";

export type { ProjectInput, SplitProjectInput } from "./project-normalize.js";

export type {
  ArchitectureEdge,
  ArchitectureGraph,
  ArchitectureNode,
  BusinessEffect,
  CapabilityEntry,
  DataChange,
  DataLifecycle,
  DataOperation,
  DataRef,
  DictionaryTerm,
  EvidenceStatus,
  FlowLayerKind,
  ImpactAffected,
  ImpactEdge,
  ImpactMap,
  ImpactTarget,
  LifecycleStage,
  LifecycleTransition,
  MeasurementSource,
  ProjectArea,
  ProjectActor,
  ProjectActorRole,
  ProjectCapability,
  ProjectCoverage,
  ProjectCoverageCounts,
  ProjectData,
  ProjectDictionary,
  ProjectEntity,
  ProjectEntityRef,
  ProjectEvidence,
  ProjectFeature,
  ProjectFlow,
  ProjectFlowLayer,
  ProjectGeneratedBy,
  ProjectImplementationItem,
  ProjectInfo,
  ProjectLanguage,
  ProjectMainArea,
  ProjectMeasurement,
  ProjectOverview,
  ProjectPage,
  ProjectRequest,
  ProjectSchemaVersion,
  RequestPurpose,
  RequestRole,
  SourceLocation,
  SuggestedReadingStep
} from "./project-schema.js";

export type { ProjectValidationReport } from "./project-validation-report.js";

export type {
  NormalizeFlowFileToReportData,
  NormalizeFlowFileToScanResult
} from "./flow-spec/normalize.js";

export type {
  FlowValidationIssue,
  FlowValidationOptions,
  FlowValidationResult
} from "./flow-spec/validate.js";

export type {
  AnlyxFlowFile,
  Flow,
  FlowEdge as FlowSpecEdge,
  FlowEntry,
  FlowEvidence,
  FlowEvidenceKind,
  FlowGeneratedBy,
  FlowNode as FlowSpecNode,
  FlowNodeType,
  FlowProject,
  FlowRequest,
  FlowResponse,
  FlowSnapshot,
  FlowStatus,
  FlowSourceLocation,
  FlowTiming
} from "./flow-spec/schema.js";

export type {
  BackendObservedSpan,
  BackendSpanEvent,
  BrowserActionEvent,
  BrowserPageViewEvent,
  BrowserRequestEvent,
  FlowLayer,
  FlowLayerExecution,
  FlowLayerType,
  FlowRecord,
  FlowRecordMatchState,
  FlowRecordTrigger,
  LiveEvidenceLevel
} from "./live-flow.js";

export {
  ConfigValidationError,
  anlyxConfigSchema,
  backendConfigSchema,
  captureConfigSchema,
  devConfigSchema,
  defineConfig,
  frontendConfigSchema,
  manualFrontendConfigSchema,
  nextFrontendConfigSchema,
  normalizeConfig,
  openApiBackendConfigSchema,
  parseConfig,
  serverConfigSchema,
  springBackendConfigSchema,
  viewportConfigSchema
} from "./config.js";

export { validateFixtureExpectedData } from "./fixture-validation.js";

export { aggregateReportData, matchApiCallToEndpoint } from "./report-aggregation.js";

export {
  analysisEvidenceSchema,
  apiCallSchema,
  bridgeEstimateTimingSchema,
  bridgeFlowRequestSchema,
  bridgeFlowResponseSchema,
  bridgeFlowStatusSchema,
  bridgeFlowTimingSchema,
  bridgeMeasuredTimingSchema,
  bridgeUnknownTimingSchema,
  captureResultSchema,
  captureStatusSchema,
  confidenceLevelSchema,
  endpointFlowSchema,
  endpointSchema,
  flowEdgeSchema,
  flowNodeSchema,
  httpMethodSchema,
  pageStoryboardSchema,
  parseCaptureResult,
  parseEndpoint,
  parseEndpointFlow,
  parsePageStoryboard,
  parseReportData,
  parseScanResult,
  reportDataSchema,
  scanResultSchema,
  screenshotSegmentSchema,
  subFlowSchema,
  supportLevelSchema,
  viewportSchema
} from "./schema.js";

export { normalizeProjectInput } from "./project-normalize.js";

export {
  architectureEdgeSchema,
  architectureGraphSchema,
  architectureNodeSchema,
  businessEffectSchema,
  capabilityEntrySchema,
  dataChangeSchema,
  dataLifecycleSchema,
  dataOperationSchema,
  dataRefSchema,
  dictionaryTermSchema,
  evidenceStatusSchema,
  flowLayerKindSchema,
  impactAffectedSchema,
  impactEdgeSchema,
  impactMapSchema,
  impactTargetSchema,
  lifecycleStageSchema,
  lifecycleTransitionSchema,
  measurementSourceSchema,
  parseProjectData,
  projectCoverageCountsSchema,
  projectCoverageSchema,
  projectActorRoleSchema,
  projectActorSchema,
  projectAreaSchema,
  projectCapabilitySchema,
  projectDataSchema,
  projectDictionarySchema,
  projectEntityRefSchema,
  projectEntitySchema,
  projectEvidenceSchema,
  projectFeatureSchema,
  projectFlowLayerSchema,
  projectFlowSchema,
  projectGeneratedBySchema,
  projectImplementationItemSchema,
  projectInfoSchema,
  projectLanguageSchema,
  projectMainAreaSchema,
  projectMeasurementSchema,
  projectOverviewSchema,
  projectPageSchema,
  projectRequestSchema,
  projectSchemaVersionSchema,
  requestPurposeSchema,
  requestRoleSchema,
  sourceLocationSchema,
  suggestedReadingStepSchema
} from "./project-schema.js";

export {
  parseProjectValidationReport,
  projectValidationReportSchema
} from "./project-validation-report.js";

export {
  normalizeFlowFileToReportData,
  normalizeFlowFileToScanResult
} from "./flow-spec/normalize.js";

export { validateAnlyxFlowFile } from "./flow-spec/validate.js";

export {
  anlyxFlowFileSchema,
  flowEntrySchema,
  flowEdgeSchema as flowSpecEdgeSchema,
  flowEvidenceKindSchema,
  flowEvidenceSchema,
  flowGeneratedBySchema,
  flowNodeSchema as flowSpecNodeSchema,
  flowNodeTypeSchema,
  flowProjectSchema,
  flowRequestSchema,
  flowResponseSchema,
  flowSchema,
  flowSnapshotSchema,
  flowStatusSchema,
  flowSourceLocationSchema,
  flowTimingSchema,
  parseAnlyxFlowFile,
  parseFlow
} from "./flow-spec/schema.js";

export {
  buildFlowRecordFromBrowserEvent,
  mergeBackendSpansIntoFlowRecord,
  normalizeBrowserEventPath
} from "./live-flow.js";
