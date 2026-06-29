import { describe, expect, it } from "vitest";

import { defineConfig, normalizeConfig, parseConfig } from "./config.js";

const springNextConfig = {
  projectName: "Zup",
  backend: {
    type: "spring",
    sourceDir: "./backend/src/main/java",
    baseUrl: "http://localhost:8080",
    openApiUrl: "http://localhost:8080/v3/api-docs",
    actuatorMappingsUrl: "http://localhost:8080/actuator/mappings"
  },
  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000",
    router: "app",
    sampleParams: {
      "/benefit/[brandSlug]/[benefitSlugWithId]": {
        brandSlug: "starbucks",
        benefitSlugWithId: "birthday-coupon-123"
      }
    }
  }
} as const;

const openApiManualConfig = {
  projectName: "OpenAPI App",
  backend: {
    type: "openapi",
    openApiUrl: "http://localhost:8000/openapi.json",
    baseUrl: "http://localhost:8000"
  },
  frontend: {
    type: "manual",
    baseUrl: "http://localhost:3000",
    urls: ["/", "/dashboard", "/items"]
  }
} as const;

describe("Anlyx config schema", () => {
  it("valid Spring + Next config passes", () => {
    expect(parseConfig(springNextConfig)).toEqual(springNextConfig);
  });

  it("valid OpenAPI + manual config passes", () => {
    expect(parseConfig(openApiManualConfig)).toEqual(openApiManualConfig);
  });

  it("missing required spring sourceDir fails", () => {
    const config = {
      ...springNextConfig,
      backend: {
        type: "spring"
      }
    };

    expect(() => parseConfig(config)).toThrow(/backend\.sourceDir/);
  });

  it("missing openApiUrl fails", () => {
    const config = {
      ...openApiManualConfig,
      backend: {
        type: "openapi"
      }
    };

    expect(() => parseConfig(config)).toThrow(/backend\.openApiUrl/);
  });

  it("missing manual urls fails", () => {
    const config = {
      ...openApiManualConfig,
      frontend: {
        type: "manual",
        baseUrl: "http://localhost:3000"
      }
    };

    expect(() => parseConfig(config)).toThrow(/frontend\.urls/);
  });

  it("default server port is applied", () => {
    expect(normalizeConfig(springNextConfig).server.port).toBe(4777);
    expect(normalizeConfig(openApiManualConfig).server.openBrowser).toBe(true);
    expect(normalizeConfig(openApiManualConfig).server.mode).toBe("inject");
  });

  it("explicit inject server mode passes", () => {
    const normalized = normalizeConfig({
      ...springNextConfig,
      server: {
        port: 4888,
        openBrowser: false,
        mode: "inject"
      }
    });

    expect(normalized.server).toEqual({
      port: 4888,
      openBrowser: false,
      mode: "inject"
    });
  });

  it("normalizes optional dev command", () => {
    const normalized = normalizeConfig({
      ...springNextConfig,
      dev: {
        command: "npm run dev"
      }
    });

    expect(normalized.dev).toEqual({
      command: "npm run dev"
    });
  });

  it("explicit viewer server mode passes", () => {
    const normalized = normalizeConfig({
      ...springNextConfig,
      server: {
        port: 4888,
        openBrowser: false,
        mode: "viewer"
      }
    });

    expect(normalized.server).toEqual({
      port: 4888,
      openBrowser: false,
      mode: "viewer"
    });
  });

  it("default viewport is applied", () => {
    const normalized = normalizeConfig(openApiManualConfig);

    expect(normalized.frontend.viewport).toEqual({ width: 1440, height: 900 });
    expect(normalized.frontend.capture).toEqual({ mode: "segments", segmentHeight: 900 });
  });

  it("invalid backend type fails", () => {
    expect(() =>
      parseConfig({
        ...springNextConfig,
        backend: {
          type: "fastapi",
          sourceDir: "./backend"
        }
      })
    ).toThrow(/backend\.type/);
  });

  it("invalid frontend type fails", () => {
    expect(() =>
      parseConfig({
        ...springNextConfig,
        frontend: {
          type: "react-router",
          sourceDir: "./frontend",
          baseUrl: "http://localhost:3000"
        }
      })
    ).toThrow(/frontend\.type/);
  });

  it("defineConfig preserves the provided object", () => {
    expect(defineConfig(springNextConfig)).toBe(springNextConfig);
  });
});
