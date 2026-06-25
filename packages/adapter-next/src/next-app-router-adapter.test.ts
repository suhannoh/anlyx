import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { pageStoryboardSchema } from "@anlyx/core";

import { createNextFrontendAdapter, scanNextAppRouterPages } from "./next-app-router-adapter.js";

describe("Next.js App Router Adapter", () => {
  let projectRoot: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "anlyx-next-adapter-"));
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("app root page creates / route", async () => {
    await writeProjectFile("app/page.tsx");

    const pages = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(pages).toHaveLength(1);
    expect(pages[0]?.route).toBe("/");
    expect(pages[0]?.id).toBe("page:next:root");
    expect(pages[0]?.filePath).toBe(join(projectRoot, "app/page.tsx"));
  });

  it("sourceDir can point directly at the app directory", async () => {
    await writeProjectFile("app/page.tsx");

    const pages = await scanNextAppRouterPages({ sourceDir: join(projectRoot, "app") });

    expect(pages[0]?.route).toBe("/");
    expect(pages[0]?.filePath).toBe(join(projectRoot, "app/page.tsx"));
  });

  it("sourceDir can point at frontend root with src/app", async () => {
    await writeProjectFile("frontend/src/app/dashboard/page.tsx");

    const pages = await scanNextAppRouterPages({ sourceDir: join(projectRoot, "frontend") });

    expect(pages[0]?.route).toBe("/dashboard");
    expect(pages[0]?.filePath).toBe(join(projectRoot, "frontend/src/app/dashboard/page.tsx"));
  });

  it("sourceDir can point at src with app", async () => {
    await writeProjectFile("frontend/src/app/items/page.tsx");

    const pages = await scanNextAppRouterPages({ sourceDir: join(projectRoot, "frontend/src") });

    expect(pages[0]?.route).toBe("/items");
    expect(pages[0]?.filePath).toBe(join(projectRoot, "frontend/src/app/items/page.tsx"));
  });

  it("nested page creates nested route", async () => {
    await writeProjectFile("app/benefits/page.tsx");

    const [page] = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(page?.route).toBe("/benefits");
    expect(page?.id).toBe("page:next:benefits");
  });

  it("dynamic route is preserved as template route", async () => {
    await writeProjectFile("app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx");

    const [page] = await scanNextAppRouterPages({
      sourceDir: projectRoot,
      sampleParams: {
        "/benefit/[brandSlug]/[benefitSlugWithId]": {
          brandSlug: "starbucks",
          benefitSlugWithId: "birthday-coupon-123"
        }
      }
    });

    expect(page?.route).toBe("/benefit/[brandSlug]/[benefitSlugWithId]");
    expect(page?.id).toBe("page:next:benefit-brandSlug-benefitSlugWithId");
  });

  it("route group segment is omitted", async () => {
    await writeProjectFile("app/(public)/benefits/page.jsx");

    const [page] = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(page?.route).toBe("/benefits");
    expect(page?.id).toBe("page:next:benefits");
  });

  it("catch-all route is preserved", async () => {
    await writeProjectFile("app/docs/[...slug]/page.ts");
    await writeProjectFile("app/archive/[[...slug]]/page.js");

    const pages = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(pages.map((page) => page.route)).toEqual(["/archive/[[...slug]]", "/docs/[...slug]"]);
  });

  it("special files are ignored", async () => {
    await writeProjectFile("app/page.tsx");
    await writeProjectFile("app/layout.tsx");
    await writeProjectFile("app/loading.tsx");
    await writeProjectFile("app/error.tsx");
    await writeProjectFile("app/not-found.tsx");
    await writeProjectFile("app/api/route.ts");
    await writeProjectFile("app/components/card/page.tsx");
    await writeProjectFile("app/hooks/useThing/page.tsx");
    await writeProjectFile("app/utils/format/page.tsx");
    await writeProjectFile("app/tests/example/page.tsx");
    await writeProjectFile("app/stories/button/page.tsx");

    const pages = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(pages.map((page) => page.route)).toEqual(["/"]);
  });

  it("pages router files are ignored", async () => {
    await writeProjectFile("app/page.tsx");
    await writeProjectFile("pages/index.tsx");
    await writeProjectFile("pages/about.tsx");

    const pages = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(pages.map((page) => page.route)).toEqual(["/"]);
  });

  it("generated pages have empty screenshots when no source API calls are found", async () => {
    await writeProjectFile("app/dashboard/page.tsx");

    const [page] = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(page?.screenshots).toEqual([]);
    expect(page?.apiCalls).toEqual([]);
  });

  it("detects direct fetch API calls in page files", async () => {
    await writeProjectFile(
      "app/dashboard/page.tsx",
      `
      export default async function Page() {
        await fetch("/api/public/dashboard", { method: "POST" });
        return null;
      }
      `
    );

    const [page] = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(page?.apiCalls).toEqual([{ method: "POST", path: "/api/public/dashboard" }]);
  });

  it("detects imported API helper calls used by a page", async () => {
    await writeProjectFile(
      "frontend/src/app/page.tsx",
      `
      import { getPublicHome } from "@/lib/api";

      export default async function HomePage() {
        const home = await getPublicHome();
        return null;
      }
      `
    );
    await writeProjectFile(
      "frontend/src/lib/api.ts",
      `
      async function getJson<T>(path: string): Promise<T> {
        return fetch(\`http://localhost:8080\${path}\`).then((response) => response.json());
      }

      export function getPublicHome() {
        return getJson("/api/public/home");
      }

      export function getUnusedRanking() {
        return getJson("/api/public/ranking");
      }
      `
    );

    const [page] = await scanNextAppRouterPages({ sourceDir: join(projectRoot, "frontend") });

    expect(page?.apiCalls).toEqual([{ method: "GET", path: "/api/public/home" }]);
  });

  it("detects axios and sendBeacon API calls", async () => {
    await writeProjectFile(
      "app/page.tsx",
      `
      import axios from "axios";

      export default function Page() {
        axios.get("/api/public/search?q=coffee");
        navigator.sendBeacon("/api/public/page-views", "{}");
        return null;
      }
      `
    );

    const [page] = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(page?.apiCalls).toEqual([
      { method: "GET", path: "/api/public/search?q=coffee" },
      { method: "POST", path: "/api/public/page-views" }
    ]);
  });

  it("keeps dynamic template path segments matchable", async () => {
    await writeProjectFile(
      "app/vertical/[vertical]/page.tsx",
      `
      export default async function Page({ params }: { params: { vertical: string } }) {
        await fetch(\`/api/public/verticals/\${params.vertical}\`);
        await fetch("https://example.com/not-an-api");
        return null;
      }
      `
    );

    const [page] = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(page?.apiCalls).toEqual([{ method: "GET", path: "/api/public/verticals/{vertical}" }]);
  });

  it("drops dynamic query suffix helpers from template paths", async () => {
    await writeProjectFile(
      "app/ranking/page.tsx",
      `
      export default async function Page() {
        const suffix = "?period=weekly";
        await fetch(\`/api/public/ranking\${suffix}\`);
        return null;
      }
      `
    );

    const [page] = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(page?.apiCalls).toEqual([{ method: "GET", path: "/api/public/ranking" }]);
  });

  it("generated pages have captureStatus pending", async () => {
    await writeProjectFile("app/dashboard/page.tsx");

    const [page] = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(page?.captureStatus).toBe("pending");
  });

  it("generated pages pass core pageStoryboardSchema", async () => {
    await writeProjectFile("app/page.tsx");
    await writeProjectFile("app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx");

    const pages = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(() => pageStoryboardSchema.array().parse(pages)).not.toThrow();
  });

  it("stable id is generated for root nested and dynamic routes", async () => {
    await writeProjectFile("app/page.tsx");
    await writeProjectFile("app/benefits/page.tsx");
    await writeProjectFile("app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx");

    const pages = await scanNextAppRouterPages({ sourceDir: projectRoot });

    expect(pages.map((page) => page.id)).toEqual([
      "page:next:root",
      "page:next:benefit-brandSlug-benefitSlugWithId",
      "page:next:benefits"
    ]);
  });

  it("duplicate route throws clear error", async () => {
    await writeProjectFile("app/(admin)/dashboard/page.tsx");
    await writeProjectFile("app/(public)/dashboard/page.tsx");

    await expect(scanNextAppRouterPages({ sourceDir: projectRoot })).rejects.toThrow(
      "Duplicate Next.js App Router route detected: /dashboard"
    );
  });

  it("missing app directory throws clear error", async () => {
    await expect(scanNextAppRouterPages({ sourceDir: projectRoot })).rejects.toThrow(
      "Next.js App Router directory not found"
    );
  });

  it("async scanPages adapter surface works", async () => {
    await writeProjectFile("app/dashboard/page.tsx");
    const adapter = createNextFrontendAdapter({ sourceDir: projectRoot });

    await expect(adapter.scanPages()).resolves.toMatchObject([
      {
        id: "page:next:dashboard",
        route: "/dashboard",
        screenshots: [],
        apiCalls: [],
        captureStatus: "pending"
      }
    ]);
  });

  async function writeProjectFile(relativePath: string, content?: string): Promise<void> {
    const filePath = join(projectRoot, relativePath);
    await mkdir(filePath.split("/").slice(0, -1).join("/"), { recursive: true });
    await writeFile(filePath, content ?? "export default function Page() { return null; }\n");
  }
});
