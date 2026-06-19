import type { Endpoint, EndpointFlow, FlowEdge, FlowNode, HttpMethod } from "@anlyx/core";

export type OpenApiDocument = Record<string, unknown>;

export type OpenApiAdapterOptions = {
  baseUrl?: string;
  source?: string;
};

export type BackendAdapter = {
  name: string;
  scanEndpoints(): Promise<Endpoint[]>;
  scanFlows(endpoints: Endpoint[]): Promise<EndpointFlow[]>;
};

const SUPPORTED_METHODS = ["get", "post", "put", "patch", "delete"] as const;

type SupportedOpenApiMethod = (typeof SUPPORTED_METHODS)[number];

export function scanOpenApiEndpoints(
  document: OpenApiDocument,
  options: OpenApiAdapterOptions = {}
): Endpoint[] {
  void options;
  const paths = asRecord(document.paths);

  if (!paths) {
    return [];
  }

  const endpoints: Endpoint[] = [];

  for (const [path, pathItemValue] of Object.entries(paths)) {
    const pathItem = asRecord(pathItemValue);

    if (!pathItem) {
      continue;
    }

    for (const openApiMethod of SUPPORTED_METHODS) {
      const operation = asRecord(pathItem[openApiMethod]);

      if (!operation) {
        continue;
      }

      const method = toHttpMethod(openApiMethod);
      const endpoint: Endpoint = {
        id: `${method}:${path}`,
        method,
        path,
        framework: "openapi",
        supportLevel: "basic",
        confidence: "high"
      };
      const tags = readStringArray(operation.tags);
      const requestSchema = readRequestSchema(operation);
      const responseSchema = readResponseSchema(operation);

      if (tags.length > 0) {
        endpoint.tags = tags;
      }

      if (requestSchema) {
        endpoint.requestSchema = requestSchema;
      }

      if (responseSchema) {
        endpoint.responseSchema = responseSchema;
      }

      if (hasSecurity(operation)) {
        endpoint.authRequired = true;
      }

      endpoints.push(endpoint);
    }
  }

  return endpoints;
}

export function scanOpenApiFlows(
  _document: OpenApiDocument,
  endpoints: Endpoint[],
  options: OpenApiAdapterOptions = {}
): EndpointFlow[] {
  void options;
  return endpoints.map((endpoint) => {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const endpointNodeId = `endpoint:${endpoint.id}`;

    if (endpoint.requestSchema) {
      const requestNodeId = `schema:request:${endpoint.id}`;
      nodes.push({
        id: requestNodeId,
        type: "schema",
        label: endpoint.requestSchema,
        confidence: "medium"
      });
      edges.push({
        id: `edge:${requestNodeId}->${endpointNodeId}`,
        from: requestNodeId,
        to: endpointNodeId,
        kind: "request",
        confidence: "medium"
      });
    }

    nodes.push({
      id: endpointNodeId,
      type: "endpoint",
      label: `${endpoint.method} ${endpoint.path}`,
      confidence: "high"
    });

    if (endpoint.responseSchema) {
      const responseNodeId = `schema:response:${endpoint.id}`;
      nodes.push({
        id: responseNodeId,
        type: "schema",
        label: endpoint.responseSchema,
        confidence: "medium"
      });
      edges.push({
        id: `edge:${endpointNodeId}->${responseNodeId}`,
        from: endpointNodeId,
        to: responseNodeId,
        kind: "response",
        confidence: "medium"
      });
    }

    return {
      endpointId: endpoint.id,
      nodes,
      edges,
      mainPath: nodes.map((node) => node.id),
      subFlows: []
    };
  });
}

export function createOpenApiBackendAdapter(options: {
  openApiUrl?: string;
  document?: OpenApiDocument;
  baseUrl?: string;
}): BackendAdapter {
  return {
    name: "openapi",
    async scanEndpoints() {
      if (!options.document) {
        throw new Error("OpenAPI document is required for the OpenAPI adapter.");
      }

      return scanOpenApiEndpoints(options.document, toAdapterOptions(options));
    },
    async scanFlows(endpoints: Endpoint[]) {
      if (!options.document) {
        throw new Error("OpenAPI document is required for the OpenAPI adapter.");
      }

      return scanOpenApiFlows(options.document, endpoints, toAdapterOptions(options));
    }
  };
}

function toAdapterOptions(options: {
  openApiUrl?: string;
  baseUrl?: string;
}): OpenApiAdapterOptions {
  const adapterOptions: OpenApiAdapterOptions = {};

  if (options.baseUrl !== undefined) {
    adapterOptions.baseUrl = options.baseUrl;
  }

  if (options.openApiUrl !== undefined) {
    adapterOptions.source = options.openApiUrl;
  }

  return adapterOptions;
}

function toHttpMethod(method: SupportedOpenApiMethod): HttpMethod {
  return method.toUpperCase() as HttpMethod;
}

function readRequestSchema(operation: Record<string, unknown>): string | undefined {
  const requestBody = asRecord(operation.requestBody);
  const requestBodySchema = requestBody ? readContentSchemaLabel(requestBody) : undefined;

  if (requestBodySchema) {
    return requestBodySchema;
  }

  const parameters = Array.isArray(operation.parameters) ? operation.parameters : [];
  const parameterNames = parameters
    .map((parameter) => asRecord(parameter)?.name)
    .filter((name): name is string => typeof name === "string");

  if (parameterNames.length > 0) {
    return `parameters:${parameterNames.join(",")}`;
  }

  return undefined;
}

function readResponseSchema(operation: Record<string, unknown>): string | undefined {
  const responses = asRecord(operation.responses);

  if (!responses) {
    return undefined;
  }

  const response = asRecord(responses["200"]) ?? asRecord(responses.default);

  if (!response) {
    return undefined;
  }

  return readContentSchemaLabel(response);
}

function readContentSchemaLabel(container: Record<string, unknown>): string | undefined {
  const content = asRecord(container.content);

  if (!content) {
    return undefined;
  }

  for (const mediaType of ["application/json", "application/problem+json"]) {
    const schema = asRecord(asRecord(content[mediaType])?.schema);
    const label = schema ? readSchemaLabel(schema) : undefined;

    if (label) {
      return label;
    }
  }

  for (const mediaTypeValue of Object.values(content)) {
    const schema = asRecord(asRecord(mediaTypeValue)?.schema);
    const label = schema ? readSchemaLabel(schema) : undefined;

    if (label) {
      return label;
    }
  }

  return undefined;
}

function readSchemaLabel(schema: Record<string, unknown>): string | undefined {
  if (typeof schema.$ref === "string") {
    return schema.$ref.split("/").at(-1);
  }

  if (typeof schema.title === "string") {
    return schema.title;
  }

  if (typeof schema.type === "string") {
    return schema.type;
  }

  return undefined;
}

function hasSecurity(operation: Record<string, unknown>): boolean {
  return Array.isArray(operation.security) && operation.security.length > 0;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}
