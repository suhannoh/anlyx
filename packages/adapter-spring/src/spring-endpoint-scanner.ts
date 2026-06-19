import { readdir, readFile, stat } from "node:fs/promises";
import { join, sep } from "node:path";

import type { Endpoint, EndpointFlow, HttpMethod } from "@anlyx/core";

import { scanSpringFlows } from "./spring-flow-scanner.js";

export type SpringEndpointScannerOptions = {
  sourceDir: string;
  baseUrl?: string;
  maxMainDepth?: number;
  maxSubDepth?: number;
  includeUtilities?: boolean;
};

export type BackendAdapter = {
  name: string;
  scanEndpoints(): Promise<Endpoint[]>;
  scanFlows(endpoints?: Endpoint[]): Promise<EndpointFlow[]>;
};

type ControllerClass = {
  className: string;
  classPath: string;
  filePath: string;
  body: string;
  bodyStartIndex: number;
};

type MappingAnnotation = {
  annotationName: string;
  content: string;
  index: number;
  endIndex: number;
};

const MAPPING_METHODS: Record<string, HttpMethod> = {
  GetMapping: "GET",
  PostMapping: "POST",
  PutMapping: "PUT",
  PatchMapping: "PATCH",
  DeleteMapping: "DELETE"
};

const SUPPORTED_REQUEST_METHODS = new Set<HttpMethod>(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export async function scanSpringEndpoints(
  options: SpringEndpointScannerOptions
): Promise<Endpoint[]> {
  void options.baseUrl;
  await assertSourceDirectoryExists(options.sourceDir);

  const javaFiles = await collectJavaFiles(options.sourceDir);
  const endpoints: Endpoint[] = [];

  for (const filePath of javaFiles) {
    const content = await readFile(filePath, "utf8");
    const controllers = extractControllerClasses(content, filePath);

    for (const controller of controllers) {
      endpoints.push(...extractControllerEndpoints(content, controller));
    }
  }

  endpoints.sort((left, right) => left.id.localeCompare(right.id));
  assertNoDuplicateEndpoints(endpoints);

  return endpoints;
}

export function createSpringBackendAdapter(options: SpringEndpointScannerOptions): BackendAdapter {
  return {
    name: "spring",
    async scanEndpoints() {
      return scanSpringEndpoints(options);
    },
    async scanFlows(endpoints: Endpoint[] = []) {
      return scanSpringFlows(options, endpoints);
    }
  };
}

async function assertSourceDirectoryExists(sourceDir: string): Promise<void> {
  try {
    const sourceDirStat = await stat(sourceDir);

    if (!sourceDirStat.isDirectory()) {
      throw new Error();
    }
  } catch {
    throw new Error(`Spring source directory not found: ${sourceDir}`);
  }
}

async function collectJavaFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectJavaFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && isScannableJavaFile(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

function isScannableJavaFile(filePath: string): boolean {
  if (!filePath.endsWith(".java")) {
    return false;
  }

  const normalizedParts = filePath.split(sep);
  const srcIndex = normalizedParts.lastIndexOf("src");

  if (srcIndex >= 0 && normalizedParts[srcIndex + 1] === "test") {
    return false;
  }

  return !/(?:Test|Tests)\.java$/.test(filePath);
}

function extractControllerClasses(content: string, filePath: string): ControllerClass[] {
  const controllers: ControllerClass[] = [];
  const classPattern = /\bclass\s+([A-Za-z_][\w]*)\b/g;
  let classMatch: RegExpExecArray | null;

  while ((classMatch = classPattern.exec(content))) {
    const className = classMatch[1];

    if (!className) {
      continue;
    }

    const annotationBlock = readAnnotationBlockBefore(content, classMatch.index);

    if (!/@(?:RestController|Controller)\b/.test(annotationBlock)) {
      continue;
    }

    const bodyStart = content.indexOf("{", classPattern.lastIndex);
    const bodyEnd = bodyStart >= 0 ? findMatchingBrace(content, bodyStart) : -1;

    if (bodyStart < 0 || bodyEnd < 0) {
      continue;
    }

    controllers.push({
      className,
      classPath: readClassMappingPath(annotationBlock) ?? "",
      filePath,
      body: content.slice(bodyStart + 1, bodyEnd),
      bodyStartIndex: bodyStart + 1
    });
  }

  void filePath;
  return controllers;
}

function extractControllerEndpoints(content: string, controller: ControllerClass): Endpoint[] {
  const endpoints: Endpoint[] = [];
  const mappings = readMappingAnnotations(controller.body);

  for (const mapping of mappings) {
    const method = readHttpMethod(mapping);

    if (!method) {
      continue;
    }

    const methodPath = readMappingPath(mapping.content);

    if (methodPath === undefined) {
      continue;
    }

    const methodSignature = readNextMethodSignature(
      controller.body,
      mapping.endIndex,
      controller.bodyStartIndex,
      controller.filePath
    );

    if (!methodSignature) {
      continue;
    }

    const path = normalizePath(controller.classPath, methodPath);
    const endpoint: Endpoint = {
      id: `${method}:${path}`,
      method,
      path,
      framework: "spring",
      supportLevel: "deep",
      controller: controller.className,
      handler: methodSignature.methodName,
      filePath: methodSignature.filePath,
      lineNumber: lineNumberAt(content, methodSignature.absoluteIndex),
      tags: [controller.className],
      confidence: "high"
    };
    const requestSchema = readRequestSchema(methodSignature.parameters);
    const responseSchema = unwrapResponseSchema(methodSignature.returnType);

    if (requestSchema) {
      endpoint.requestSchema = requestSchema;
    }

    if (responseSchema) {
      endpoint.responseSchema = responseSchema;
    }

    endpoints.push(endpoint);
  }

  return endpoints;
}

function readAnnotationBlockBefore(content: string, index: number): string {
  const beforeClass = content.slice(0, index);
  const lastBoundary = Math.max(beforeClass.lastIndexOf("}"), beforeClass.lastIndexOf(";"));

  return beforeClass.slice(lastBoundary + 1);
}

function readClassMappingPath(annotationBlock: string): string | undefined {
  const requestMappingMatch = /@RequestMapping\b\s*(?:\(([\s\S]*?)\))?/.exec(annotationBlock);

  if (!requestMappingMatch) {
    return undefined;
  }

  return readMappingPath(requestMappingMatch[1] ?? "");
}

function readMappingAnnotations(body: string): MappingAnnotation[] {
  const annotations: MappingAnnotation[] = [];
  const annotationPattern =
    /@(RequestMapping|GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping)\b/g;
  let annotationMatch: RegExpExecArray | null;

  while ((annotationMatch = annotationPattern.exec(body))) {
    const annotationName = annotationMatch[1];

    if (!annotationName) {
      continue;
    }

    const openParenIndex = skipWhitespace(body, annotationPattern.lastIndex);
    let content = "";
    let endIndex = annotationPattern.lastIndex;

    if (body[openParenIndex] === "(") {
      const closeParenIndex = findMatchingParen(body, openParenIndex);

      if (closeParenIndex < 0) {
        continue;
      }

      content = body.slice(openParenIndex + 1, closeParenIndex);
      endIndex = closeParenIndex + 1;
      annotationPattern.lastIndex = endIndex;
    }

    annotations.push({
      annotationName,
      content,
      index: annotationMatch.index,
      endIndex
    });
  }

  return annotations;
}

function readHttpMethod(mapping: MappingAnnotation): HttpMethod | undefined {
  if (mapping.annotationName in MAPPING_METHODS) {
    return MAPPING_METHODS[mapping.annotationName];
  }

  const requestMethodMatch = /RequestMethod\.(GET|POST|PUT|PATCH|DELETE)\b/.exec(mapping.content);
  const method = requestMethodMatch?.[1] as HttpMethod | undefined;

  if (method && SUPPORTED_REQUEST_METHODS.has(method)) {
    return method;
  }

  return undefined;
}

function readMappingPath(annotationContent: string): string | undefined {
  if (annotationContent.includes("+")) {
    return undefined;
  }

  const namedPathMatch = /(?:value|path)\s*=\s*"([^"]+)"/.exec(annotationContent);
  const positionalPathMatch = /^\s*"([^"]+)"/.exec(annotationContent);
  const path = namedPathMatch?.[1] ?? positionalPathMatch?.[1] ?? "";

  if (path.includes("${")) {
    return undefined;
  }

  return path;
}

function readNextMethodSignature(
  body: string,
  startIndex: number,
  bodyStartIndex: number,
  filePath: string
): {
  returnType: string;
  methodName: string;
  parameters: string;
  absoluteIndex: number;
  filePath: string;
} | null {
  const rest = body.slice(startIndex);
  const signatureMatch =
    /(?:public|protected|private)\s+(?:static\s+)?([\w.$<>, ?]+?)\s+([A-Za-z_]\w*)\s*\(([\s\S]*?)\)/.exec(
      rest
    );

  if (!signatureMatch) {
    return null;
  }

  const returnType = signatureMatch[1]?.trim();
  const methodName = signatureMatch[2];
  const parameters = signatureMatch[3]?.trim() ?? "";

  if (!returnType || !methodName) {
    return null;
  }

  return {
    returnType,
    methodName,
    parameters,
    absoluteIndex: bodyStartIndex + startIndex + signatureMatch.index,
    filePath
  };
}

function readRequestSchema(parameters: string): string | undefined {
  const requestBodyMatch = /@RequestBody\s+(?:@\w+\s+)*(?:final\s+)?([\w.$<>?]+)\s+\w+/.exec(
    parameters
  );

  return cleanTypeName(requestBodyMatch?.[1]);
}

function unwrapResponseSchema(returnType: string): string | undefined {
  if (returnType === "void" || returnType === "Void") {
    return undefined;
  }

  const responseEntityMatch = /^ResponseEntity\s*<\s*([\w.$<>?, ]+)\s*>$/.exec(returnType);
  const unwrappedType = responseEntityMatch?.[1] ?? returnType;

  return cleanTypeName(unwrappedType);
}

function cleanTypeName(typeName: string | undefined): string | undefined {
  if (!typeName) {
    return undefined;
  }

  const withoutPackage = typeName.trim().split(".").at(-1);

  return withoutPackage?.replace(/[?<>]/g, "").trim() || undefined;
}

function normalizePath(basePath: string, methodPath: string): string {
  const combinedPath = `/${basePath}/${methodPath}`.replace(/\/+/g, "/").replace(/\/$/, "");

  return combinedPath || "/";
}

function assertNoDuplicateEndpoints(endpoints: Endpoint[]): void {
  const endpointIds = new Set<string>();

  for (const endpoint of endpoints) {
    if (endpointIds.has(endpoint.id)) {
      throw new Error(`Duplicate Spring endpoint detected: ${endpoint.id}`);
    }

    endpointIds.add(endpoint.id);
  }
}

function skipWhitespace(value: string, index: number): number {
  let cursor = index;

  while (/\s/.test(value[cursor] ?? "")) {
    cursor += 1;
  }

  return cursor;
}

function findMatchingParen(value: string, openParenIndex: number): number {
  return findMatchingPair(value, openParenIndex, "(", ")");
}

function findMatchingBrace(value: string, openBraceIndex: number): number {
  return findMatchingPair(value, openBraceIndex, "{", "}");
}

function findMatchingPair(
  value: string,
  openIndex: number,
  openChar: string,
  closeChar: string
): number {
  let depth = 0;

  for (let index = openIndex; index < value.length; index += 1) {
    if (value[index] === openChar) {
      depth += 1;
    }

    if (value[index] === closeChar) {
      depth -= 1;
    }

    if (depth === 0) {
      return index;
    }
  }

  return -1;
}

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}
