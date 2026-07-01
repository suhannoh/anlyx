import { z } from "zod";
import {
  architectureGraphSchema,
  dataLifecycleSchema,
  impactMapSchema,
  projectAreaSchema,
  projectCapabilitySchema,
  projectCoverageSchema,
  projectDataSchema,
  projectDictionarySchema,
  projectEvidenceSchema,
  projectFeatureSchema,
  projectFlowSchema,
  projectInfoSchema,
  projectMeasurementSchema,
  projectOverviewSchema,
  projectPageSchema,
  projectRequestSchema,
  projectSchemaVersionSchema,
  type ProjectData
} from "./project-schema.js";

export type SplitProjectInput = {
  index: {
    schemaVersion: z.input<typeof projectSchemaVersionSchema>;
    project: z.input<typeof projectInfoSchema>;
    dictionary?: z.input<typeof projectDictionarySchema>;
  };
  areas?: Array<z.input<typeof projectAreaSchema>>;
  pages?: Array<z.input<typeof projectPageSchema>>;
  features?: Array<z.input<typeof projectFeatureSchema>>;
  requests?: Array<z.input<typeof projectRequestSchema>>;
  flows?: Array<z.input<typeof projectFlowSchema>>;
  architecture?: z.input<typeof architectureGraphSchema>;
  evidence?: Array<z.input<typeof projectEvidenceSchema>>;
  measurements?: Array<z.input<typeof projectMeasurementSchema>>;
  dictionary?: z.input<typeof projectDictionarySchema>;
  coverage?: z.input<typeof projectCoverageSchema>;
  overview?: z.input<typeof projectOverviewSchema>;
  capabilities?: Array<z.input<typeof projectCapabilitySchema>>;
  dataLifecycles?: Array<z.input<typeof dataLifecycleSchema>>;
  impactMaps?: Array<z.input<typeof impactMapSchema>>;
};

export type ProjectInput = z.input<typeof projectDataSchema> | SplitProjectInput;

export function normalizeProjectInput(input: unknown): ProjectData {
  if (isSplitProjectInput(input)) {
    return projectDataSchema.parse({
      schemaVersion: input.index.schemaVersion,
      project: input.index.project,
      areas: input.areas ?? [],
      pages: input.pages ?? [],
      features: input.features ?? [],
      requests: input.requests ?? [],
      flows: input.flows ?? [],
      architecture: input.architecture ?? { nodes: [], edges: [] },
      evidence: input.evidence ?? [],
      measurements: input.measurements ?? [],
      dictionary: input.dictionary ?? input.index.dictionary ?? { defaultLanguage: "en", terms: [] },
      coverage: input.coverage,
      overview: input.overview ?? {},
      capabilities: input.capabilities ?? [],
      dataLifecycles: input.dataLifecycles ?? [],
      impactMaps: input.impactMaps ?? []
    });
  }

  return projectDataSchema.parse(input);
}

function isSplitProjectInput(input: unknown): input is SplitProjectInput {
  return (
    typeof input === "object" &&
    input !== null &&
    "index" in input &&
    typeof input.index === "object" &&
    input.index !== null
  );
}
