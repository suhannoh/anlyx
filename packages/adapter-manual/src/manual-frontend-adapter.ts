import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type { ApiCall, HttpMethod, PageStoryboard } from "@anlyx/core";

export type ManualFrontendAdapterOptions = {
  baseUrl: string;
  urls: string[];
  sourceDir?: string;
  routeFiles?: Record<string, string[]>;
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
      const pages = scanManualPages(options);

      if (!options.sourceDir || !options.routeFiles) {
        return pages;
      }

      return Promise.all(
        pages.map(async (page) => ({
          ...page,
          apiCalls: await scanManualRouteApiCalls({
            page,
            sourceDir: options.sourceDir!,
            routeFiles: options.routeFiles!
          })
        }))
      );
    }
  };
}

async function scanManualRouteApiCalls(options: {
  page: PageStoryboard;
  sourceDir: string;
  routeFiles: Record<string, string[]>;
}): Promise<ApiCall[]> {
  const files = options.routeFiles[options.page.route] ?? [];
  const calls: ApiCall[] = [];
  const visited = new Set<string>();

  for (const file of files) {
    calls.push(
      ...(await scanFileApiCalls(resolve(options.sourceDir, file), options.sourceDir, visited))
    );
  }

  return uniqueApiCalls(calls);
}

async function scanFileApiCalls(
  filePath: string,
  sourceDir: string,
  visited: Set<string>
): Promise<ApiCall[]> {
  if (visited.has(filePath)) {
    return [];
  }

  visited.add(filePath);

  let content: string;

  try {
    content = await readFile(filePath, "utf8");
  } catch {
    return [];
  }

  const calls = extractApiCalls(content);

  for (const importedFunction of parseNamedImports(content)) {
    if (!isIdentifierCalled(content, importedFunction.name)) {
      continue;
    }

    const importedFile = resolveImportFile(filePath, sourceDir, importedFunction.source);

    if (!importedFile) {
      continue;
    }

    calls.push(...(await scanFileApiCalls(importedFile, sourceDir, visited)));
  }

  return calls;
}

function extractApiCalls(content: string): ApiCall[] {
  return [
    ...extractFetchCalls(content),
    ...extractAxiosCalls(content),
    ...extractHelperCalls(content),
    ...extractSendBeaconCalls(content)
  ];
}

function extractFetchCalls(content: string): ApiCall[] {
  const calls: ApiCall[] = [];
  const fetchPattern = /\bfetch\s*\(\s*([^,\n)]+)(?:,\s*([\s\S]*?))?\)/g;

  for (const match of content.matchAll(fetchPattern)) {
    const path = readStaticApiPath(match[1]);

    if (path) {
      calls.push({ method: readMethodFromInit(match[2]) ?? "GET", path });
    }
  }

  return calls;
}

function extractAxiosCalls(content: string): ApiCall[] {
  const calls: ApiCall[] = [];
  const methodPattern = /\baxios\.(get|post|put|patch|delete)\s*\(\s*([^,\n)]+)/gi;

  for (const match of content.matchAll(methodPattern)) {
    const path = readStaticApiPath(match[2]);

    if (path) {
      calls.push({ method: toHttpMethod(match[1]), path });
    }
  }

  const objectPattern = /\baxios\s*\(\s*\{([\s\S]*?)\}\s*\)/g;

  for (const match of content.matchAll(objectPattern)) {
    const body = match[1] ?? "";
    const path = readObjectStringProperty(body, "url");

    if (path && isApiPath(path)) {
      calls.push({ method: toHttpMethod(readObjectStringProperty(body, "method") ?? "GET"), path });
    }
  }

  return calls;
}

function extractHelperCalls(content: string): ApiCall[] {
  const calls: ApiCall[] = [];
  const helperPattern =
    /\b([A-Za-z_$][\w$]*(?:Json|Api|Request|Fetch|Client|Data)?)\s*(?:<[^>()]+>)?\s*\(\s*([^,\n)]+)/g;

  for (const match of content.matchAll(helperPattern)) {
    const helperName = match[1] ?? "";

    if (helperName === "fetch" || helperName === "axios" || helperName === "sendBeacon") {
      continue;
    }

    const path = readStaticApiPath(match[2]);

    if (path) {
      calls.push({ method: methodFromHelperName(helperName), path });
    }
  }

  return calls;
}

function extractSendBeaconCalls(content: string): ApiCall[] {
  const calls: ApiCall[] = [];
  const sendBeaconPattern = /\bnavigator\.sendBeacon\s*\(\s*([^,\n)]+)/g;

  for (const match of content.matchAll(sendBeaconPattern)) {
    const path = readStaticApiPath(match[1]);

    if (path) {
      calls.push({ method: "POST", path });
    }
  }

  return calls;
}

function readMethodFromInit(initSource: string | undefined): HttpMethod | undefined {
  if (!initSource) {
    return undefined;
  }

  const method = readObjectStringProperty(initSource, "method");
  return method ? toHttpMethod(method) : undefined;
}

function readObjectStringProperty(source: string, propertyName: string): string | undefined {
  return new RegExp(String.raw`\b${propertyName}\s*:\s*(["'\`])([^"'\`]+)\1`, "i").exec(
    source
  )?.[2];
}

function readStaticApiPath(source: string | undefined): string | undefined {
  if (!source) {
    return undefined;
  }

  const trimmed = source.trim();
  const literal = trimmed.match(/^(["'])([^"']+)\1/)?.[2];

  if (literal && isApiPath(literal)) {
    return normalizeApiPath(literal);
  }

  const template = trimmed.match(/^`([^`]*)`/)?.[1];

  if (!template) {
    return undefined;
  }

  const templatedPath = template.replace(/\$\{\s*([^}]+?)\s*\}/g, (match, expression, offset) => {
    const name =
      String(expression)
        .split(".")
        .pop()
        ?.replace(/[^\w$]+/g, "") || "value";

    if (offset > 0 && template[offset - 1] !== "/" && /(?:suffix|query|params?)/i.test(name)) {
      return "";
    }

    return `{${name}}`;
  });

  return isApiPath(templatedPath) ? normalizeApiPath(templatedPath) : undefined;
}

function isApiPath(path: string): boolean {
  if (path.startsWith("/api/")) {
    return true;
  }

  try {
    return new URL(path).pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function normalizeApiPath(path: string): string {
  try {
    const parsed = new URL(path, "http://anlyx.local");
    return `${decodeURIComponent(parsed.pathname)}${parsed.search}`;
  } catch {
    return path;
  }
}

function methodFromHelperName(helperName: string): HttpMethod {
  const lower = helperName.toLowerCase();

  if (lower.includes("post")) return "POST";
  if (lower.includes("put")) return "PUT";
  if (lower.includes("patch")) return "PATCH";
  if (lower.includes("delete")) return "DELETE";

  return "GET";
}

function toHttpMethod(value: string | undefined): HttpMethod {
  const normalized = value?.toUpperCase();

  if (
    normalized === "POST" ||
    normalized === "PUT" ||
    normalized === "PATCH" ||
    normalized === "DELETE"
  ) {
    return normalized;
  }

  return "GET";
}

function parseNamedImports(content: string): Array<{ name: string; source: string }> {
  const imports: Array<{ name: string; source: string }> = [];
  const importPattern = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;

  for (const match of content.matchAll(importPattern)) {
    const source = match[2] ?? "";

    for (const rawSpecifier of (match[1] ?? "").split(",")) {
      const specifier = rawSpecifier.trim();

      if (!specifier || specifier.startsWith("type ")) {
        continue;
      }

      const [imported, local] = specifier.split(/\s+as\s+/);
      const name = (local ?? imported)?.trim();

      if (name) {
        imports.push({ name, source });
      }
    }
  }

  return imports;
}

function isIdentifierCalled(content: string, identifier: string): boolean {
  return new RegExp(String.raw`\b${escapeRegExp(identifier)}\s*(?:<[^>()]+>)?\s*\(`).test(content);
}

function resolveImportFile(
  importerPath: string,
  sourceDir: string,
  importSource: string
): string | undefined {
  if (!importSource.startsWith(".") && !importSource.startsWith("@/")) {
    return undefined;
  }

  const basePath = importSource.startsWith("@/")
    ? join(sourceDir, importSource.slice(2))
    : resolve(dirname(importerPath), importSource);
  const candidates = [".ts", ".tsx", ".js", ".jsx"].flatMap((extension) => [
    `${basePath}${extension}`,
    join(basePath, `index${extension}`)
  ]);

  return candidates.find((candidate) => existsSync(candidate));
}

function uniqueApiCalls(calls: ApiCall[]): ApiCall[] {
  const seen = new Set<string>();

  return calls.filter((call) => {
    const key = `${call.method}:${call.path}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
