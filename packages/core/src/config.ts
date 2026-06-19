import { z } from "zod";

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigValidationError";
  }
}

export const viewportConfigSchema = z
  .object({
    width: z.number(),
    height: z.number()
  })
  .strict();

export const captureConfigSchema = z
  .object({
    mode: z.literal("segments").optional(),
    segmentHeight: z.number().optional(),
    storageState: z.string().optional(),
    timeoutMs: z.number().optional()
  })
  .strict();

export const springBackendConfigSchema = z
  .object({
    type: z.literal("spring"),
    sourceDir: z.string(),
    baseUrl: z.string().optional(),
    openApiUrl: z.string().optional(),
    actuatorMappingsUrl: z.string().optional(),
    maxMainDepth: z.number().optional(),
    maxSubDepth: z.number().optional(),
    includeUtilities: z.boolean().optional()
  })
  .strict();

export const openApiBackendConfigSchema = z
  .object({
    type: z.literal("openapi"),
    openApiUrl: z.string(),
    baseUrl: z.string().optional()
  })
  .strict();

export const backendConfigSchema = z.discriminatedUnion("type", [
  springBackendConfigSchema,
  openApiBackendConfigSchema
]);

export const nextFrontendConfigSchema = z
  .object({
    type: z.literal("next"),
    sourceDir: z.string(),
    baseUrl: z.string(),
    router: z.literal("app"),
    viewport: viewportConfigSchema.optional(),
    capture: captureConfigSchema.optional(),
    sampleParams: z.record(z.string(), z.record(z.string(), z.string())).optional()
  })
  .strict();

export const manualFrontendConfigSchema = z
  .object({
    type: z.literal("manual"),
    baseUrl: z.string(),
    urls: z.array(z.string()),
    viewport: viewportConfigSchema.optional(),
    capture: captureConfigSchema.optional()
  })
  .strict();

export const frontendConfigSchema = z.discriminatedUnion("type", [
  nextFrontendConfigSchema,
  manualFrontendConfigSchema
]);

export const serverConfigSchema = z
  .object({
    port: z.number().optional(),
    openBrowser: z.boolean().optional()
  })
  .strict();

export const anlyxConfigSchema = z
  .object({
    projectName: z.string(),
    backend: backendConfigSchema,
    frontend: frontendConfigSchema,
    server: serverConfigSchema.optional()
  })
  .strict();

export type ViewportConfig = z.infer<typeof viewportConfigSchema>;
export type CaptureConfig = z.infer<typeof captureConfigSchema>;
export type SpringBackendConfig = z.infer<typeof springBackendConfigSchema>;
export type OpenApiBackendConfig = z.infer<typeof openApiBackendConfigSchema>;
export type BackendConfig = z.infer<typeof backendConfigSchema>;
export type NextFrontendConfig = z.infer<typeof nextFrontendConfigSchema>;
export type ManualFrontendConfig = z.infer<typeof manualFrontendConfigSchema>;
export type FrontendConfig = z.infer<typeof frontendConfigSchema>;
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type AnlyxConfig = z.infer<typeof anlyxConfigSchema>;

export type NormalizedCaptureConfig = {
  mode: "segments";
  segmentHeight: number;
  storageState?: string;
  timeoutMs?: number;
};

export type NormalizedServerConfig = {
  port: number;
  openBrowser: boolean;
};

export type NormalizedSpringBackendConfig = SpringBackendConfig & {
  maxMainDepth: number;
  maxSubDepth: number;
  includeUtilities: boolean;
};

export type NormalizedOpenApiBackendConfig = OpenApiBackendConfig;
export type NormalizedBackendConfig = NormalizedSpringBackendConfig | NormalizedOpenApiBackendConfig;

export type NormalizedNextFrontendConfig = Omit<NextFrontendConfig, "viewport" | "capture"> & {
  viewport: ViewportConfig;
  capture: NormalizedCaptureConfig;
};

export type NormalizedManualFrontendConfig = Omit<ManualFrontendConfig, "viewport" | "capture"> & {
  viewport: ViewportConfig;
  capture: NormalizedCaptureConfig;
};

export type NormalizedFrontendConfig =
  | NormalizedNextFrontendConfig
  | NormalizedManualFrontendConfig;

export type NormalizedAnlyxConfig = {
  projectName: string;
  backend: NormalizedBackendConfig;
  frontend: NormalizedFrontendConfig;
  server: NormalizedServerConfig;
};

export function defineConfig<const TConfig extends AnlyxConfig>(config: TConfig): TConfig {
  return config;
}

export function parseConfig(value: unknown): AnlyxConfig {
  const result = anlyxConfigSchema.safeParse(value);

  if (!result.success) {
    throw new ConfigValidationError(formatConfigIssues(result.error.issues));
  }

  return result.data;
}

export function normalizeConfig(value: unknown): NormalizedAnlyxConfig {
  const config = parseConfig(value);

  return {
    projectName: config.projectName,
    backend: normalizeBackendConfig(config.backend),
    frontend: normalizeFrontendConfig(config.frontend),
    server: {
      port: config.server?.port ?? 4777,
      openBrowser: config.server?.openBrowser ?? true
    }
  };
}

function normalizeBackendConfig(backend: BackendConfig): NormalizedBackendConfig {
  if (backend.type === "spring") {
    return {
      ...backend,
      maxMainDepth: backend.maxMainDepth ?? 4,
      maxSubDepth: backend.maxSubDepth ?? 1,
      includeUtilities: backend.includeUtilities ?? false
    };
  }

  return backend;
}

function normalizeFrontendConfig(frontend: FrontendConfig): NormalizedFrontendConfig {
  return {
    ...frontend,
    viewport: frontend.viewport ?? { width: 1440, height: 900 },
    capture: normalizeCaptureConfig(frontend.capture)
  };
}

function normalizeCaptureConfig(capture: CaptureConfig | undefined): NormalizedCaptureConfig {
  const normalized: NormalizedCaptureConfig = {
    mode: capture?.mode ?? "segments",
    segmentHeight: capture?.segmentHeight ?? 900
  };

  if (capture?.storageState !== undefined) {
    normalized.storageState = capture.storageState;
  }

  if (capture?.timeoutMs !== undefined) {
    normalized.timeoutMs = capture.timeoutMs;
  }

  return normalized;
}

function formatConfigIssues(issues: z.core.$ZodIssue[]): string {
  const details = issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "config";
    return `${path}: ${issue.message}`;
  });

  return `Invalid Anlyx config: ${details.join("; ")}`;
}
