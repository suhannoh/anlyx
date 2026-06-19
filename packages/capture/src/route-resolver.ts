import type { ApiCall, HttpMethod, ScreenshotSegment, Viewport } from "@anlyx/core";

export type RouteResolution =
  | {
      ok: true;
      url: string;
    }
  | {
      ok: false;
      reason: string;
    };

export type ResolvePageRouteToUrlOptions = {
  baseUrl: string;
  route: string;
  sampleParams?: Record<string, Record<string, string>>;
};

export type ScreenshotSegmentCalculationOptions = {
  pageId: string;
  outputDir: string;
  scrollHeight: number;
  segmentHeight: number;
  viewport: Viewport;
};

export type ScreenshotPathOptions = {
  outputDir: string;
  pageId: string;
  segmentIndex: number;
};

export type RawApiCall = {
  method: string;
  url: string;
  resourceType: string;
  status?: number;
};

const SUPPORTED_METHODS = new Set<HttpMethod>(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export function resolvePageRouteToUrl(options: ResolvePageRouteToUrlOptions): RouteResolution {
  const routeParams = options.sampleParams?.[options.route] ?? {};
  const routeSegments = options.route.split("/").filter(Boolean);
  const resolvedSegments: string[] = [];

  for (const segment of routeSegments) {
    const optionalCatchAll = /^\[\[\.\.\.(\w+)\]\]$/.exec(segment);
    const catchAll = /^\[\.\.\.(\w+)\]$/.exec(segment);
    const dynamic = /^\[(\w+)\]$/.exec(segment);

    if (optionalCatchAll?.[1]) {
      const value = routeParams[optionalCatchAll[1]];

      if (value) {
        resolvedSegments.push(...encodeCatchAllValue(value));
      }

      continue;
    }

    if (catchAll?.[1]) {
      const value = routeParams[catchAll[1]];

      if (!value) {
        return missingSampleParams(options.route);
      }

      resolvedSegments.push(...encodeCatchAllValue(value));
      continue;
    }

    if (dynamic?.[1]) {
      const value = routeParams[dynamic[1]];

      if (!value) {
        return missingSampleParams(options.route);
      }

      resolvedSegments.push(encodeURIComponent(value));
      continue;
    }

    resolvedSegments.push(segment);
  }

  const path = `/${resolvedSegments.join("/")}`.replace(/\/+$/, "") || "/";
  const url = new URL(path, ensureTrailingSlash(options.baseUrl));

  return {
    ok: true,
    url: url.toString().replace(/\/$/, path === "/" ? "/" : "")
  };
}

export function calculateScreenshotSegments(
  options: ScreenshotSegmentCalculationOptions
): ScreenshotSegment[] {
  const segmentHeight = Math.max(1, options.segmentHeight);
  const scrollHeight = Math.max(options.scrollHeight, segmentHeight);
  const segmentCount = Math.ceil(scrollHeight / segmentHeight);

  return Array.from({ length: segmentCount }, (_, segmentIndex) => ({
    segmentIndex,
    path: buildScreenshotPath({
      outputDir: options.outputDir,
      pageId: options.pageId,
      segmentIndex
    }),
    viewport: options.viewport,
    scrollY: segmentIndex * segmentHeight
  }));
}

export function buildScreenshotPath(options: ScreenshotPathOptions): string {
  return `${toPosixPath(options.outputDir)}/${slugifyPageId(options.pageId)}/${options.segmentIndex}.png`;
}

export function normalizeApiCall(raw: RawApiCall): ApiCall | null {
  if (raw.resourceType !== "fetch" && raw.resourceType !== "xhr") {
    return null;
  }

  const method = raw.method.toUpperCase() as HttpMethod;

  if (!SUPPORTED_METHODS.has(method)) {
    return null;
  }

  const url = new URL(raw.url);
  const apiCall: ApiCall = {
    method,
    path: `${url.pathname}${url.search}`
  };

  if (raw.status !== undefined) {
    apiCall.status = raw.status;
  }

  return apiCall;
}

export function dedupeApiCalls(apiCalls: ApiCall[]): ApiCall[] {
  const seen = new Set<string>();
  const deduped: ApiCall[] = [];

  for (const apiCall of apiCalls) {
    const key = `${apiCall.method}:${apiCall.path}:${apiCall.status ?? ""}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(apiCall);
    }
  }

  return deduped;
}

function missingSampleParams(route: string): RouteResolution {
  return {
    ok: false,
    reason: `Missing sampleParams for ${route}`
  };
}

function encodeCatchAllValue(value: string): string[] {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment));
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function toPosixPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/\/+$/, "");
}

function slugifyPageId(pageId: string): string {
  return pageId.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
