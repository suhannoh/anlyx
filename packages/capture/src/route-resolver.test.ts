import { describe, expect, it } from "vitest";

import {
  buildScreenshotPath,
  calculateScreenshotSegments,
  normalizeApiCall,
  resolvePageRouteToUrl
} from "./route-resolver.js";

describe("capture route resolver", () => {
  it("static route resolves to full URL", () => {
    expect(
      resolvePageRouteToUrl({
        baseUrl: "http://localhost:3000",
        route: "/benefits"
      })
    ).toEqual({ ok: true, url: "http://localhost:3000/benefits" });
  });

  it("dynamic route resolves with sampleParams", () => {
    expect(
      resolvePageRouteToUrl({
        baseUrl: "http://localhost:3000",
        route: "/benefit/[brandSlug]/[benefitSlugWithId]",
        sampleParams: {
          "/benefit/[brandSlug]/[benefitSlugWithId]": {
            brandSlug: "starbucks",
            benefitSlugWithId: "birthday-coupon-123"
          }
        }
      })
    ).toEqual({
      ok: true,
      url: "http://localhost:3000/benefit/starbucks/birthday-coupon-123"
    });
  });

  it("catch-all route resolves with sampleParams", () => {
    expect(
      resolvePageRouteToUrl({
        baseUrl: "http://localhost:3000",
        route: "/docs/[...slug]",
        sampleParams: {
          "/docs/[...slug]": {
            slug: "guides/getting-started"
          }
        }
      })
    ).toEqual({
      ok: true,
      url: "http://localhost:3000/docs/guides/getting-started"
    });
  });

  it("optional catch-all route can be omitted", () => {
    expect(
      resolvePageRouteToUrl({
        baseUrl: "http://localhost:3000",
        route: "/docs/[[...slug]]",
        sampleParams: {
          "/docs/[[...slug]]": {}
        }
      })
    ).toEqual({ ok: true, url: "http://localhost:3000/docs" });
  });

  it("missing sampleParams returns pending reason", () => {
    expect(
      resolvePageRouteToUrl({
        baseUrl: "http://localhost:3000",
        route: "/benefit/[brandSlug]/[benefitSlugWithId]"
      })
    ).toEqual({
      ok: false,
      reason: "Missing sampleParams for /benefit/[brandSlug]/[benefitSlugWithId]"
    });
  });

  it("segment calculation creates expected scrollY values", () => {
    const segments = calculateScreenshotSegments({
      pageId: "page:next:benefit-detail",
      outputDir: ".anlyx/screenshots",
      scrollHeight: 2400,
      segmentHeight: 900,
      viewport: { width: 1440, height: 900 }
    });

    expect(segments.map((segment) => segment.scrollY)).toEqual([0, 900, 1800]);
  });

  it("screenshot path is stable and POSIX-style", () => {
    expect(
      buildScreenshotPath({
        outputDir: ".anlyx/screenshots",
        pageId: "page:next:benefit/[id]",
        segmentIndex: 2
      })
    ).toBe(".anlyx/screenshots/page-next-benefit-id/2.png");
  });

  it("API call normalization stores method path and status", () => {
    expect(
      normalizeApiCall({
        method: "get",
        url: "http://localhost:8080/api/public/benefits/123?preview=true",
        resourceType: "fetch",
        status: 200
      })
    ).toEqual({
      method: "GET",
      path: "/api/public/benefits/123?preview=true",
      status: 200
    });
  });

  it("non-fetch/xhr requests are ignored", () => {
    expect(
      normalizeApiCall({
        method: "GET",
        url: "http://localhost:3000/app.js",
        resourceType: "script",
        status: 200
      })
    ).toBeNull();
  });
});
