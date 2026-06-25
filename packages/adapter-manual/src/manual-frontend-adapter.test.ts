import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { pageStoryboardSchema } from "@anlyx/core";

import { createManualFrontendAdapter, scanManualPages } from "./manual-frontend-adapter.js";

describe("Manual Frontend Adapter", () => {
  it("manual urls create page storyboards", () => {
    const pages = scanManualPages({
      baseUrl: "http://localhost:3000",
      urls: ["/", "/dashboard", "/items"]
    });

    expect(pages).toHaveLength(3);
    expect(pages.map((page) => page.route)).toEqual(["/", "/dashboard", "/items"]);
  });

  it("root path creates stable root id", () => {
    const [page] = scanManualPages({
      baseUrl: "http://localhost:3000",
      urls: ["/"]
    });

    expect(page?.id).toBe("page:manual:root");
  });

  it("nested path creates stable id", () => {
    const [page] = scanManualPages({
      baseUrl: "http://localhost:3000",
      urls: ["/items/123"]
    });

    expect(page?.id).toBe("page:manual:items-123");
  });

  it("query string is allowed and contributes to stable id", () => {
    const [page] = scanManualPages({
      baseUrl: "http://localhost:3000",
      urls: ["/search?q=test"]
    });

    expect(page?.route).toBe("/search?q=test");
    expect(page?.id).toBe("page:manual:search-q-test");
  });

  it("filePath is omitted for manual pages", () => {
    const [page] = scanManualPages({
      baseUrl: "http://localhost:3000",
      urls: ["/dashboard"]
    });

    expect(page).not.toHaveProperty("filePath");
  });

  it("screenshots and apiCalls are empty before capture", () => {
    const [page] = scanManualPages({
      baseUrl: "http://localhost:3000",
      urls: ["/dashboard"]
    });

    expect(page?.screenshots).toEqual([]);
    expect(page?.apiCalls).toEqual([]);
  });

  it("captureStatus is pending", () => {
    const [page] = scanManualPages({
      baseUrl: "http://localhost:3000",
      urls: ["/dashboard"]
    });

    expect(page?.captureStatus).toBe("pending");
  });

  it("generated pages pass core pageStoryboard schema", () => {
    const pages = scanManualPages({
      baseUrl: "http://localhost:3000",
      urls: ["/", "/dashboard", "/search?q=test"]
    });

    expect(() => pageStoryboardSchema.array().parse(pages)).not.toThrow();
  });

  it("invalid non-path URL fails", () => {
    expect(() =>
      scanManualPages({
        baseUrl: "http://localhost:3000",
        urls: ["http://localhost:3000/dashboard"]
      })
    ).toThrow("Manual frontend URL must be a path starting with /");
  });

  it("duplicate URLs are deduplicated after normalization", () => {
    const pages = scanManualPages({
      baseUrl: "http://localhost:3000",
      urls: ["/dashboard", "/dashboard/", "/dashboard"]
    });

    expect(pages).toHaveLength(1);
    expect(pages[0]?.route).toBe("/dashboard");
  });

  it("empty urls returns an empty page list", () => {
    expect(
      scanManualPages({
        baseUrl: "http://localhost:3000",
        urls: []
      })
    ).toEqual([]);
  });

  it("createManualFrontendAdapter exposes async scanPages", async () => {
    const adapter = createManualFrontendAdapter({
      baseUrl: "http://localhost:3000",
      urls: ["/dashboard"]
    });

    await expect(adapter.scanPages()).resolves.toEqual([
      {
        id: "page:manual:dashboard",
        route: "/dashboard",
        screenshots: [],
        apiCalls: [],
        captureStatus: "pending"
      }
    ]);
  });

  it("manual React route files can contribute source-derived API calls", async () => {
    const sourceDir = await mkdtemp(join(tmpdir(), "anlyx-manual-react-"));

    try {
      await writeProjectFile(
        sourceDir,
        "pages/Home.tsx",
        `
        import { getPublicHome } from "@/lib/api";

        export function Home() {
          void getPublicHome();
          return null;
        }
        `
      );
      await writeProjectFile(
        sourceDir,
        "lib/api.ts",
        `
        export function getJson<T>(path: string): Promise<T> {
          return fetch(\`http://localhost:8080\${path}\`).then((response) => response.json());
        }

        export function getPublicHome() {
          return getJson("/api/public/home");
        }
        `
      );

      const adapter = createManualFrontendAdapter({
        baseUrl: "http://localhost:3000",
        urls: ["/"],
        sourceDir,
        routeFiles: {
          "/": ["pages/Home.tsx"]
        }
      });

      const [page] = await adapter.scanPages();

      expect(page?.apiCalls).toEqual([{ method: "GET", path: "/api/public/home" }]);
    } finally {
      await rm(sourceDir, { recursive: true, force: true });
    }
  });
});

async function writeProjectFile(
  root: string,
  relativePath: string,
  content: string
): Promise<void> {
  const filePath = join(root, relativePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${content.trim()}\n`);
}
