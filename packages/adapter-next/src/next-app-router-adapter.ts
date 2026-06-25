import { readFile, readdir, stat } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

import type { ApiCall, HttpMethod, PageStoryboard } from "@anlyx/core";

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
const SOURCE_FILE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
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
  const appDir = await resolveAppDirectory(options.sourceDir);
  const projectSourceRoot = resolveProjectSourceRoot(options.sourceDir, appDir);

  const pageFiles = await collectPageFiles(appDir);
  const pages = (
    await Promise.all(
      pageFiles.map((filePath) => toPageStoryboard(appDir, projectSourceRoot, filePath))
    )
  ).sort((left, right) => left.route.localeCompare(right.route));

  assertNoDuplicateRoutes(pages);

  return pages;
}

export function createNextFrontendAdapter(options: NextAppRouterAdapterOptions): FrontendAdapter {
  return {
    name: "next",
    async scanPages() {
      return scanNextAppRouterPages(options);
    }
  };
}

async function resolveAppDirectory(sourceDir: string): Promise<string> {
  const candidates = [
    ...(basename(sourceDir) === "app" ? [sourceDir] : []),
    join(sourceDir, "app"),
    join(sourceDir, "src", "app")
  ];

  for (const candidate of candidates) {
    if (await isDirectory(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Next.js App Router directory not found. Checked: ${candidates.join(", ")}`);
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const pathStat = await stat(path);

    return pathStat.isDirectory();
  } catch {
    return false;
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

async function toPageStoryboard(
  appDir: string,
  projectSourceRoot: string,
  filePath: string
): Promise<PageStoryboard> {
  const route = filePathToRoute(appDir, filePath);

  return {
    id: `page:next:${toRouteSlug(route)}`,
    route,
    filePath,
    screenshots: [],
    apiCalls: await scanPageApiCalls(filePath, projectSourceRoot),
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

function resolveProjectSourceRoot(sourceDir: string, appDir: string): string {
  const normalizedAppDir = resolve(appDir);

  if (basename(normalizedAppDir) === "app") {
    return dirname(normalizedAppDir);
  }

  return resolve(sourceDir);
}

async function scanPageApiCalls(pageFilePath: string, sourceRoot: string): Promise<ApiCall[]> {
  const visitedFunctions = new Set<string>();
  const calls = await scanFileApiCalls(pageFilePath, sourceRoot, undefined, visitedFunctions);

  return uniqueApiCalls(calls);
}

async function scanFileApiCalls(
  filePath: string,
  sourceRoot: string,
  exportedFunctionName: string | undefined,
  visitedFunctions: Set<string>
): Promise<ApiCall[]> {
  const visitKey = `${filePath}:${exportedFunctionName ?? "*"}`;

  if (visitedFunctions.has(visitKey)) {
    return [];
  }

  visitedFunctions.add(visitKey);

  let content: string;

  try {
    content = await readFile(filePath, "utf8");
  } catch {
    return [];
  }

  const analysisContent = exportedFunctionName
    ? extractExportedFunctionBody(content, exportedFunctionName)
    : content;

  if (!analysisContent) {
    return [];
  }

  const calls = extractApiCalls(analysisContent);
  const importedFunctions = parseNamedImports(content);

  for (const importedFunction of importedFunctions) {
    if (!isIdentifierCalled(analysisContent, importedFunction.name)) {
      continue;
    }

    const importedFilePath = await resolveImportFile(
      filePath,
      sourceRoot,
      importedFunction.source
    );

    if (!importedFilePath) {
      continue;
    }

    calls.push(
      ...(await scanFileApiCalls(
        importedFilePath,
        sourceRoot,
        importedFunction.importedName,
        visitedFunctions
      ))
    );
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

    if (!path) {
      continue;
    }

    calls.push({
      method: readMethodFromInit(match[2]) ?? "GET",
      path
    });
  }

  return calls;
}

function extractAxiosCalls(content: string): ApiCall[] {
  const calls: ApiCall[] = [];
  const methodPattern = /\baxios\.(get|post|put|patch|delete)\s*\(\s*([^,\n)]+)/gi;

  for (const match of content.matchAll(methodPattern)) {
    const path = readStaticApiPath(match[2]);

    if (!path) {
      continue;
    }

    calls.push({
      method: toHttpMethod(match[1]),
      path
    });
  }

  const objectPattern = /\baxios\s*\(\s*\{([\s\S]*?)\}\s*\)/g;

  for (const match of content.matchAll(objectPattern)) {
    const body = match[1] ?? "";
    const path = readObjectStringProperty(body, "url");

    if (!path || !isApiPath(path)) {
      continue;
    }

    calls.push({
      method: toHttpMethod(readObjectStringProperty(body, "method") ?? "GET"),
      path
    });
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

    if (!path) {
      continue;
    }

    calls.push({
      method: methodFromHelperName(helperName),
      path
    });
  }

  return calls;
}

function extractSendBeaconCalls(content: string): ApiCall[] {
  const calls: ApiCall[] = [];
  const sendBeaconPattern = /\bnavigator\.sendBeacon\s*\(\s*([^,\n)]+)/g;

  for (const match of content.matchAll(sendBeaconPattern)) {
    const path = readStaticApiPath(match[1]);

    if (!path) {
      continue;
    }

    calls.push({
      method: "POST",
      path
    });
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
  const pattern = new RegExp(
    String.raw`\b${propertyName}\s*:\s*(["'\`])([^"'\`]+)\1`,
    "i"
  );
  return source.match(pattern)?.[2];
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

  if (template) {
    const templatedPath = template.replace(/\$\{\s*([^}]+?)\s*\}/g, (match, expression, offset) => {
      const name = String(expression).split(".").pop()?.replace(/[^\w$]+/g, "") || "value";

      if (offset > 0 && template[offset - 1] !== "/" && /(?:suffix|query|params?)/i.test(name)) {
        return "";
      }

      return `{${name}}`;
    });

    if (isApiPath(templatedPath)) {
      return normalizeApiPath(templatedPath);
    }
  }

  return undefined;
}

function isApiPath(path: string): boolean {
  if (path.startsWith("/api/")) {
    return true;
  }

  try {
    const parsed = new URL(path);
    return parsed.pathname.startsWith("/api/");
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

  if (lower.startsWith("post") || lower.includes("post")) {
    return "POST";
  }

  if (lower.startsWith("put") || lower.includes("put")) {
    return "PUT";
  }

  if (lower.startsWith("patch") || lower.includes("patch")) {
    return "PATCH";
  }

  if (lower.startsWith("delete") || lower.includes("delete")) {
    return "DELETE";
  }

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

function parseNamedImports(content: string): Array<{
  name: string;
  importedName: string;
  source: string;
}> {
  const imports: Array<{ name: string; importedName: string; source: string }> = [];
  const importPattern = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;

  for (const match of content.matchAll(importPattern)) {
    const specifiers = match[1] ?? "";
    const source = match[2] ?? "";

    for (const rawSpecifier of specifiers.split(",")) {
      const specifier = rawSpecifier.trim();

      if (!specifier || specifier.startsWith("type ")) {
        continue;
      }

      const [imported, local] = specifier.split(/\s+as\s+/);
      const importedName = imported?.trim();
      const name = (local ?? imported)?.trim();

      if (name && importedName) {
        imports.push({ name, importedName, source });
      }
    }
  }

  return imports;
}

function isIdentifierCalled(content: string, identifier: string): boolean {
  return new RegExp(String.raw`\b${escapeRegExp(identifier)}\s*(?:<[^>()]+>)?\s*\(`).test(
    content
  );
}

async function resolveImportFile(
  importerPath: string,
  sourceRoot: string,
  importSource: string
): Promise<string | undefined> {
  if (!importSource.startsWith(".") && !importSource.startsWith("@/")) {
    return undefined;
  }

  const basePath = importSource.startsWith("@/")
    ? join(sourceRoot, importSource.slice(2))
    : resolve(dirname(importerPath), importSource);
  const candidates = [
    ...SOURCE_FILE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...SOURCE_FILE_EXTENSIONS.map((extension) => join(basePath, `index${extension}`))
  ];

  for (const candidate of candidates) {
    if (await isFile(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function isFile(path: string): Promise<boolean> {
  try {
    const pathStat = await stat(path);
    return pathStat.isFile();
  } catch {
    return false;
  }
}

function extractExportedFunctionBody(content: string, exportName: string): string | undefined {
  const escapedName = escapeRegExp(exportName);
  const functionMatch = new RegExp(
    String.raw`export\s+(?:async\s+)?function\s+${escapedName}\b`,
    "m"
  ).exec(content);

  if (functionMatch) {
    const openingBraceIndex = findBodyOpeningBrace(content, functionMatch.index + functionMatch[0].length);
    return openingBraceIndex === undefined
      ? undefined
      : readBalancedBlock(content, openingBraceIndex);
  }

  const constMatch = new RegExp(
    String.raw`export\s+const\s+${escapedName}\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{`,
    "m"
  ).exec(content);

  if (constMatch) {
    return readBalancedBlock(content, constMatch.index + constMatch[0].length - 1);
  }

  const expressionMatch = new RegExp(
    String.raw`export\s+const\s+${escapedName}\s*=\s*([^;]+);`,
    "m"
  ).exec(content);

  return expressionMatch?.[1];
}

function findBodyOpeningBrace(content: string, startIndex: number): number | undefined {
  let parenDepth = 0;
  let angleDepth = 0;
  let quote: string | undefined;
  let escaped = false;

  for (let index = startIndex; index < content.length; index += 1) {
    const character = content[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }

      continue;
    }

    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      continue;
    }

    if (character === ")") {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }

    if (character === "<") {
      angleDepth += 1;
      continue;
    }

    if (character === ">") {
      angleDepth = Math.max(0, angleDepth - 1);
      continue;
    }

    if (character === "{" && parenDepth === 0 && angleDepth === 0) {
      return index;
    }

    if (character === ";" && parenDepth === 0 && angleDepth === 0) {
      return undefined;
    }
  }

  return undefined;
}

function readBalancedBlock(content: string, openingBraceIndex: number): string | undefined {
  let depth = 0;
  let quote: string | undefined;
  let escaped = false;

  for (let index = openingBraceIndex; index < content.length; index += 1) {
    const character = content[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = undefined;
      }

      continue;
    }

    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return content.slice(openingBraceIndex + 1, index);
      }
    }
  }

  return undefined;
}

function uniqueApiCalls(calls: ApiCall[]): ApiCall[] {
  const seen = new Set<string>();
  const unique: ApiCall[] = [];

  for (const call of calls) {
    const key = `${call.method} ${call.path}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(call);
  }

  return unique;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
