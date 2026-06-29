import type { PageStoryboard } from "@anlyx/core";

export type ManualFrontendAdapterOptions = {
  baseUrl: string;
  urls: string[];
};

export type FrontendAdapter = {
  name: string;
  scanPages(): Promise<PageStoryboard[]>;
};

export function scanManualPages(options: ManualFrontendAdapterOptions): PageStoryboard[] {
  void options.baseUrl;
  const routes = dedupeRoutes(options.urls.map(normalizeManualRoute));

  return routes.map((route) => ({
    id: `page:manual:${toRouteSlug(route)}`,
    route,
    screenshots: [],
    apiCalls: [],
    captureStatus: "pending"
  }));
}

export function createManualFrontendAdapter(
  options: ManualFrontendAdapterOptions
): FrontendAdapter {
  return {
    name: "manual",
    async scanPages() {
      return scanManualPages(options);
    }
  };
}

function normalizeManualRoute(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//")) {
    throw new Error("Manual frontend URL must be a path starting with /.");
  }

  const parsed = new URL(url, "http://anlyx.local");

  if (parsed.origin !== "http://anlyx.local") {
    throw new Error("Manual frontend URL must be a path starting with /.");
  }

  const path = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");

  return `${path}${parsed.search}`;
}

function dedupeRoutes(routes: string[]): string[] {
  return [...new Set(routes)];
}

function toRouteSlug(route: string): string {
  const slug = route
    .replace(/^\/$/, "root")
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return slug || "root";
}
