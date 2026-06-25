import { describe, expect, it } from "vitest";

import { pageStoryboardSchema, type PageStoryboard } from "@anlyx/core";

import { capturePages, createCaptureAdapter, type CaptureDriver } from "./capture-adapter.js";

describe("Capture Adapter", () => {
  it("successful capture updates screenshots and captureStatus", async () => {
    const pages = await capturePages([page("/benefits")], baseOptions(), successDriver());

    expect(pages[0]).toMatchObject({
      captureStatus: "success",
      screenshots: [
        {
          segmentIndex: 0,
          path: ".anlyx/screenshots/page-next-benefits/0.png",
          viewport: { width: 1440, height: 900 },
          scrollY: 0
        }
      ],
      apiCalls: [{ method: "GET", path: "/api/public/benefits", status: 200 }]
    });
    expect(pages[0]?.apiCalls[0]).not.toHaveProperty("endpointId");
  });

  it("preserves source-discovered API calls when browser capture succeeds", async () => {
    const sourcePage = page("/");
    sourcePage.apiCalls = [
      { method: "GET", path: "/api/public/home" },
      {
        method: "GET",
        path: "/api/public/benefits",
        endpointId: "endpoint:get:/api/public/benefits"
      }
    ];

    const pages = await capturePages([sourcePage], baseOptions(), successDriver());

    expect(pages[0]?.apiCalls).toEqual([
      { method: "GET", path: "/api/public/home" },
      {
        method: "GET",
        path: "/api/public/benefits",
        endpointId: "endpoint:get:/api/public/benefits",
        status: 200
      }
    ]);
  });

  it("failed capture returns captureStatus failed with errorMessage", async () => {
    const pages = await capturePages([page("/admin/benefits")], baseOptions(), {
      async capturePage() {
        throw new Error("Login required");
      }
    });

    expect(pages[0]).toMatchObject({
      route: "/admin/benefits",
      screenshots: [],
      apiCalls: [],
      captureStatus: "failed",
      errorMessage: "Login required"
    });
  });

  it("missing sampleParams page remains pending", async () => {
    const pages = await capturePages(
      [page("/benefit/[brandSlug]/[benefitSlugWithId]")],
      baseOptions(),
      successDriver()
    );

    expect(pages[0]).toMatchObject({
      screenshots: [],
      apiCalls: [],
      captureStatus: "pending",
      errorMessage: "Missing sampleParams for /benefit/[brandSlug]/[benefitSlugWithId]"
    });
  });

  it("generated page storyboards pass core pageStoryboardSchema", async () => {
    const pages = await capturePages([page("/benefits")], baseOptions(), successDriver());

    expect(() => pageStoryboardSchema.array().parse(pages)).not.toThrow();
  });

  it("createCaptureAdapter capturePages works", async () => {
    const adapter = createCaptureAdapter(baseOptions(), successDriver());

    await expect(adapter.capturePages([page("/benefits")])).resolves.toMatchObject([
      {
        captureStatus: "success"
      }
    ]);
  });

  it("tests do not require real browser installation", async () => {
    const driver = successDriver();
    const pages = await capturePages([page("/benefits")], baseOptions(), driver);

    expect(pages[0]?.captureStatus).toBe("success");
  });
});

function baseOptions() {
  return {
    baseUrl: "http://localhost:3000",
    outputDir: ".anlyx/screenshots"
  };
}

function successDriver(): CaptureDriver {
  return {
    async capturePage({ page, viewport, outputDir }) {
      return {
        screenshots: [
          {
            segmentIndex: 0,
            path: `${outputDir}/${page.id.replaceAll(":", "-")}/0.png`,
            viewport,
            scrollY: 0
          }
        ],
        apiCalls: [{ method: "GET", path: "/api/public/benefits", status: 200 }]
      };
    }
  };
}

function page(route: string): PageStoryboard {
  return {
    id: `page:next:${route === "/" ? "root" : route.slice(1).replaceAll("/", "-")}`,
    route,
    filePath: "frontend/app/page.tsx",
    screenshots: [],
    apiCalls: [],
    captureStatus: "pending"
  };
}
