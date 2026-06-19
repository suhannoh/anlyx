import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";

import { describe, expect, it } from "vitest";

import {
  parseEndpoint,
  parseEndpointFlow,
  parsePageStoryboard,
  parseScanResult
} from "./schema.js";

const fixtureRoot = resolve(cwd(), "fixtures/spring-next-sample/expected");

function readFixture<T>(fileName: string): T {
  return JSON.parse(readFileSync(resolve(fixtureRoot, fileName), "utf8")) as T;
}

describe("Anlyx data schema", () => {
  it("valid endpoint JSON passes", () => {
    const endpoints = readFixture<unknown[]>("endpoints.json");

    expect(() => parseEndpoint(endpoints[0])).not.toThrow();
  });

  it("valid flow JSON passes", () => {
    const flows = readFixture<unknown[]>("flows.json");

    expect(() => parseEndpointFlow(flows[0])).not.toThrow();
  });

  it("valid page storyboard JSON passes", () => {
    const pages = readFixture<unknown[]>("pages.json");

    expect(() => parsePageStoryboard(pages[0])).not.toThrow();
  });

  it("valid report-data JSON passes", () => {
    const reportData = readFixture<unknown>("report-data.json");

    expect(() => parseScanResult(reportData)).not.toThrow();
  });

  it("report-data embeds the split expected JSON without field loss", () => {
    const endpoints = readFixture<unknown>("endpoints.json");
    const flows = readFixture<unknown>("flows.json");
    const pages = readFixture<unknown>("pages.json");
    const reportData = parseScanResult(readFixture<unknown>("report-data.json"));

    expect(reportData.endpoints).toEqual(endpoints);
    expect(reportData.flows).toEqual(flows);
    expect(reportData.pages).toEqual(pages);
  });

  it("invalid confidence fails", () => {
    const [endpoint] =
      readFixture<[Record<string, unknown>, ...Record<string, unknown>[]]>("endpoints.json");

    expect(() => parseEndpoint({ ...endpoint, confidence: "certain" })).toThrow();
  });

  it("invalid captureStatus fails", () => {
    const [page] = readFixture<[Record<string, unknown>, ...Record<string, unknown>[]]>(
      "pages.json"
    );

    expect(() => parsePageStoryboard({ ...page, captureStatus: "hidden" })).toThrow();
  });

  it("missing required field fails", () => {
    const [endpoint] =
      readFixture<[Record<string, unknown>, ...Record<string, unknown>[]]>("endpoints.json");
    const missingId = { ...endpoint };
    delete missingId.id;

    expect(() => parseEndpoint(missingId)).toThrow();
  });
});
