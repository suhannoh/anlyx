import { readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import type { PageStoryboard } from "@anlyx/core";

export type NextAppRouterAdapterOptions = {
  sourceDir: string;
  baseUrl?: string;
  sampleParams?: Record<string, Record<string, string>>;
};

export type FrontendAdapter = {
  name: string;
  scanPages(): Promise<PageStoryboard[]>;
};

const PAGE_FILE_NAMES = new Set(["page.tsx", "page.jsx", "page.ts", "page.js"]);
const EXCLUDED_DIRECTORY_NAMES = new Set([
  "components",
  "hooks",
  "utils",
  "tests",
  "stories",
  "__tests__"
]);

export async function scanNextAppRouterPages(
  options: NextAppRouterAdapterOptions
): Promise<PageStoryboard[]> {
  void options.baseUrl;
  void options.sampleParams;
  const appDir = join(options.sourceDir, "app");

  await assertAppDirectoryExists(appDir);

  const pageFiles = await collectPageFiles(appDir);
  const pages = pageFiles
    .map((filePath) => toPageStoryboard(appDir, filePath))
    .sort((left, right) => left.route.localeCompare(right.route));

  assertNoDuplicateRoutes(pages);

  return pages;
}

export function createNextFrontendAdapter(
  options: NextAppRouterAdapterOptions
): FrontendAdapter {
  return {
    name: "next",
    async scanPages() {
      return scanNextAppRouterPages(options);
    }
  };
}

async function assertAppDirectoryExists(appDir: string): Promise<void> {
  try {
    const appDirStat = await stat(appDir);

    if (!appDirStat.isDirectory()) {
      throw new Error();
    }
  } catch {
    throw new Error(`Next.js App Router directory not found: ${appDir}`);
  }
}

async function collectPageFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const pageFiles: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
        pageFiles.push(...(await collectPageFiles(entryPath)));
      }

      continue;
    }

    if (entry.isFile() && PAGE_FILE_NAMES.has(entry.name)) {
      pageFiles.push(entryPath);
    }
  }

  return pageFiles;
}

function toPageStoryboard(appDir: string, filePath: string): PageStoryboard {
  const route = filePathToRoute(appDir, filePath);

  return {
    id: `page:next:${toRouteSlug(route)}`,
    route,
    filePath,
    screenshots: [],
    apiCalls: [],
    captureStatus: "pending"
  };
}

function filePathToRoute(appDir: string, filePath: string): string {
  const relativePath = relative(appDir, filePath);
  const segments = relativePath.split(sep).slice(0, -1);
  const routeSegments = segments.filter((segment) => !isRouteGroupSegment(segment));

  if (routeSegments.length === 0) {
    return "/";
  }

  return `/${routeSegments.join("/")}`;
}

function isRouteGroupSegment(segment: string): boolean {
  return segment.startsWith("(") && segment.endsWith(")");
}

function assertNoDuplicateRoutes(pages: PageStoryboard[]): void {
  const seenRoutes = new Set<string>();

  for (const page of pages) {
    if (seenRoutes.has(page.route)) {
      throw new Error(`Duplicate Next.js App Router route detected: ${page.route}`);
    }

    seenRoutes.add(page.route);
  }
}

function toRouteSlug(route: string): string {
  const slug = route
    .replace(/^\/$/, "root")
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "root";
}
