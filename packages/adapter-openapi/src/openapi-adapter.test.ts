import { describe, expect, it } from "vitest";

import { endpointFlowSchema, endpointSchema } from "@anlyx/core";

import {
  createOpenApiBackendAdapter,
  scanOpenApiEndpoints,
  scanOpenApiFlows,
  type OpenApiDocument
} from "./openapi-adapter.js";

const openApiDocument = {
  openapi: "3.0.3",
  paths: {
    "/benefits/{id}": {
      get: {
        tags: ["benefits", "public"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            schema: {
              type: "string"
            }
          }
        ],
        responses: {
          "200": {
            description: "Benefit detail",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/BenefitDetailResponse"
                }
              }
            }
          }
        }
      },
      post: {
        tags: ["benefits"],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateBenefitRequest"
              }
            }
          }
        },
        responses: {
          default: {
            description: "Created",
            content: {
              "application/json": {
                schema: {
                  title: "CreateBenefitResponse"
                }
              }
            }
          }
        }
      },
      head: {
        responses: {
          "200": {
            description: "Ignored"
          }
        }
      }
    },
    "/benefits/{id}/status": {
      put: {
        responses: {
          "200": {
            description: "Updated"
          }
        }
      },
      patch: {
        responses: {
          "200": {
            description: "Patched"
          }
        }
      },
      delete: {
        responses: {
          "204": {
            description: "Deleted"
          }
        }
      },
      options: {
        responses: {
          "200": {
            description: "Ignored"
          }
        }
      }
    }
  }
} satisfies OpenApiDocument;

describe("OpenAPI Basic Adapter", () => {
  it("valid OpenAPI document creates endpoints", () => {
    expect(scanOpenApiEndpoints(openApiDocument)).toHaveLength(5);
  });

  it("GET/POST/PUT/PATCH/DELETE methods are supported", () => {
    const methods = scanOpenApiEndpoints(openApiDocument).map((endpoint) => endpoint.method);

    expect(methods).toEqual(["GET", "POST", "PUT", "PATCH", "DELETE"]);
  });

  it("unsupported methods are ignored", () => {
    const endpoints = scanOpenApiEndpoints(openApiDocument);

    expect(endpoints.some((endpoint) => String(endpoint.method) === "HEAD")).toBe(false);
  });

  it("endpoint id is METHOD:/path", () => {
    const [endpoint] = scanOpenApiEndpoints(openApiDocument);

    expect(endpoint?.id).toBe("GET:/benefits/{id}");
  });

  it("tags are mapped", () => {
    const [endpoint] = scanOpenApiEndpoints(openApiDocument);

    expect(endpoint?.tags).toEqual(["benefits", "public"]);
  });

  it("request schema is mapped when requestBody exists", () => {
    const endpoint = scanOpenApiEndpoints(openApiDocument).find(
      (candidate) => candidate.id === "POST:/benefits/{id}"
    );

    expect(endpoint?.requestSchema).toBe("CreateBenefitRequest");
  });

  it("response schema is mapped when 200 response exists", () => {
    const [endpoint] = scanOpenApiEndpoints(openApiDocument);

    expect(endpoint?.responseSchema).toBe("BenefitDetailResponse");
  });

  it("security marks authRequired", () => {
    const [endpoint] = scanOpenApiEndpoints(openApiDocument);

    expect(endpoint?.authRequired).toBe(true);
  });

  it("OpenAPI Basic flow creates only endpoint/schema nodes", () => {
    const endpoints = scanOpenApiEndpoints(openApiDocument);
    const [flow] = scanOpenApiFlows(openApiDocument, endpoints);

    expect(flow?.nodes.map((node) => node.type)).toEqual(["schema", "endpoint", "schema"]);
  });

  it("OpenAPI Basic flow does not create controller/service/repository/database nodes", () => {
    const endpoints = scanOpenApiEndpoints(openApiDocument);
    const flows = scanOpenApiFlows(openApiDocument, endpoints);
    const nodeTypes = flows.flatMap((flow) => flow.nodes.map((node) => node.type));

    expect(nodeTypes).not.toContain("controller");
    expect(nodeTypes).not.toContain("service");
    expect(nodeTypes).not.toContain("repository");
    expect(nodeTypes).not.toContain("database");
  });

  it("generated endpoints pass core endpoint schema", () => {
    const endpoints = scanOpenApiEndpoints(openApiDocument);

    expect(() => endpoints.forEach((endpoint) => endpointSchema.parse(endpoint))).not.toThrow();
  });

  it("generated flows pass core endpointFlow schema", () => {
    const endpoints = scanOpenApiEndpoints(openApiDocument);
    const flows = scanOpenApiFlows(openApiDocument, endpoints);

    expect(() => flows.forEach((flow) => endpointFlowSchema.parse(flow))).not.toThrow();
  });

  it("invalid or missing paths document returns empty result", () => {
    expect(scanOpenApiEndpoints({ openapi: "3.0.3" })).toEqual([]);
    expect(scanOpenApiFlows({ openapi: "3.0.3" }, [])).toEqual([]);
  });

  it("createOpenApiBackendAdapter exposes async backend adapter methods", async () => {
    const adapter = createOpenApiBackendAdapter({ document: openApiDocument });
    const endpoints = await adapter.scanEndpoints();

    await expect(adapter.scanFlows(endpoints)).resolves.toHaveLength(endpoints.length);
  });
});
