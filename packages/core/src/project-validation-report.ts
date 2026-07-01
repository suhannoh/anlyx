import { z } from "zod";

const validationIssueSchema = z
  .object({
    severity: z.enum(["error", "warning"]),
    code: z.string().min(1),
    message: z.string().min(1),
    path: z.string().min(1)
  })
  .strict();

const sourceIssueBreakdownSchema = z
  .object({
    missingSource: z.number().int().nonnegative(),
    missingFiles: z.number().int().nonnegative(),
    unreadableFiles: z.number().int().nonnegative(),
    outsideRoot: z.number().int().nonnegative(),
    placeholderLines: z.number().int().nonnegative(),
    outOfRangeLines: z.number().int().nonnegative(),
    missingSymbols: z.number().int().nonnegative()
  })
  .strict();

export const projectValidationReportSchema = z
  .object({
    schemaVersion: z.literal("0.1"),
    generatedAt: z.string().min(1),
    valid: z.boolean(),
    summary: z
      .object({
        sourceIssueCount: z.number().int().nonnegative(),
        sourceIssueBreakdown: sourceIssueBreakdownSchema.optional(),
        coverageStatus: z.enum(["complete", "partial", "unknown"]),
        modeled: z
          .object({
            pages: z.number().int().nonnegative(),
            requests: z.number().int().nonnegative(),
            flows: z.number().int().nonnegative(),
            architectureNodes: z.number().int().nonnegative()
          })
          .strict(),
        detected: z
          .object({
            pages: z.number().int().nonnegative().optional(),
            requests: z.number().int().nonnegative().optional(),
            flows: z.number().int().nonnegative().optional(),
            architectureNodes: z.number().int().nonnegative().optional(),
            frontendApiUsages: z.number().int().nonnegative().optional(),
            backendEndpoints: z.number().int().nonnegative().optional()
          })
          .strict()
          .optional()
      })
      .strict(),
    issues: z.array(validationIssueSchema).default([])
  })
  .strict();

export type ProjectValidationReport = z.infer<typeof projectValidationReportSchema>;

export function parseProjectValidationReport(value: unknown): ProjectValidationReport {
  return projectValidationReportSchema.parse(value);
}
