import { readdir, readFile } from "node:fs/promises";
import { join, sep } from "node:path";

import type {
  ConfidenceLevel,
  Endpoint,
  EndpointFlow,
  FlowEdge,
  FlowNode,
  SubFlow
} from "@anlyx/core";

import { resolveSpringJavaSourceDir } from "./spring-source-dir.js";

export type SpringFlowScannerOptions = {
  sourceDir: string;
  maxMainDepth?: number;
  maxSubDepth?: number;
  includeUtilities?: boolean;
};

type JavaKind =
  | "controller"
  | "service"
  | "repository"
  | "entity"
  | "utility"
  | "interface"
  | "unknown";

type JavaClass = {
  className: string;
  kind: JavaKind;
  filePath: string;
  lineNumber: number;
  annotations: string[];
  fields: JavaField[];
  methods: JavaMethod[];
  implementsNames: string[];
  repositoryEntity?: string;
  tableName?: string;
};

type JavaField = {
  type: string;
  name: string;
};

type JavaMethod = {
  name: string;
  body: string;
  lineNumber: number;
};

type Resolution =
  | {
      status: "resolved";
      javaClass: JavaClass;
      confidence: ConfidenceLevel;
    }
  | {
      status: "unknown";
      typeName: string;
      confidence: ConfidenceLevel;
    };

type MainStep = {
  node: FlowNode;
  edgeKind: FlowEdge["kind"];
  confidence: ConfidenceLevel;
};

const DEFAULT_MAX_MAIN_DEPTH = 4;
const DEFAULT_MAX_SUB_DEPTH = 1;

export async function scanSpringFlows(
  options: SpringFlowScannerOptions,
  endpoints: Endpoint[]
): Promise<EndpointFlow[]> {
  const index = await buildJavaSourceIndex(options.sourceDir);
  const maxMainDepth = options.maxMainDepth ?? DEFAULT_MAX_MAIN_DEPTH;
  const maxSubDepth = options.maxSubDepth ?? DEFAULT_MAX_SUB_DEPTH;

  return endpoints.map((endpoint) => buildEndpointFlow(endpoint, index, maxMainDepth, maxSubDepth));
}

async function buildJavaSourceIndex(sourceDir: string): Promise<Map<string, JavaClass>> {
  const resolvedSourceDir = await resolveSpringJavaSourceDir(sourceDir);
  const javaFiles = await collectJavaFiles(resolvedSourceDir);
  const index = new Map<string, JavaClass>();

  for (const filePath of javaFiles) {
    const content = await readFile(filePath, "utf8");
    const classes = extractJavaClasses(content, filePath);

    for (const javaClass of classes) {
      index.set(javaClass.className, javaClass);
    }
  }

  return index;
}

function buildEndpointFlow(
  endpoint: Endpoint,
  index: Map<string, JavaClass>,
  maxMainDepth: number,
  maxSubDepth: number
): EndpointFlow {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const subFlows: SubFlow[] = [];
  const mainPath: string[] = [];
  const endpointNode = createEndpointNode(endpoint);

  addMainNode(endpointNode, nodes, mainPath);

  const controller = endpoint.controller ? index.get(endpoint.controller) : undefined;
  const controllerNode = controller
    ? createClassNode(controller, "controller", endpoint.handler)
    : createUnknownNode("controller", endpoint.controller ?? "missing");
  addMainStep(
    endpointNode,
    { node: controllerNode, edgeKind: "main", confidence: "high" },
    nodes,
    edges,
    mainPath
  );

  if (!controller || mainPath.length > maxMainDepth + 1) {
    return { endpointId: endpoint.id, nodes, edges, mainPath, subFlows };
  }

  const controllerMethod = findMethod(controller, endpoint.handler);
  const serviceStep = resolveFirstCallStep({
    ownerClass: controller,
    method: controllerMethod,
    index,
    expectedKind: "service",
    unknownKind: "service",
    nodeType: "service",
    edgeKind: "main"
  });

  if (!serviceStep) {
    return { endpointId: endpoint.id, nodes, edges, mainPath, subFlows };
  }

  addMainStep(controllerNode, serviceStep, nodes, edges, mainPath);

  if (mainPath.length > maxMainDepth + 1 || serviceStep.node.type !== "service") {
    return { endpointId: endpoint.id, nodes, edges, mainPath, subFlows };
  }

  const serviceClass = getClassFromNode(serviceStep.node, index);
  const serviceMethodName = readClassMethodName(serviceStep.node);
  const serviceMethod = serviceClass ? findMethod(serviceClass, serviceMethodName) : undefined;

  if (serviceClass && serviceMethod) {
    const subFlow = buildServiceSubFlow(
      serviceClass,
      serviceMethod,
      serviceStep.node.id,
      index,
      maxSubDepth
    );

    if (subFlow.nodes.length > 0) {
      subFlows.push(subFlow);
    }
  }

  const repositoryStep = serviceClass
    ? resolveFirstCallStep({
        ownerClass: serviceClass,
        method: serviceMethod,
        index,
        expectedKind: "repository",
        unknownKind: "repository",
        nodeType: "repository",
        edgeKind: "main"
      })
    : undefined;

  if (!repositoryStep) {
    return { endpointId: endpoint.id, nodes, edges, mainPath, subFlows };
  }

  addMainStep(serviceStep.node, repositoryStep, nodes, edges, mainPath);

  if (mainPath.length > maxMainDepth + 1 || repositoryStep.node.type !== "repository") {
    return { endpointId: endpoint.id, nodes, edges, mainPath, subFlows };
  }

  const repositoryClass = getClassFromNode(repositoryStep.node, index);
  const databaseStep = repositoryClass
    ? createDatabaseStep(repositoryClass, index)
    : createUnknownStep("database", "repository", "unknown");

  addMainStep(repositoryStep.node, databaseStep, nodes, edges, mainPath);

  return { endpointId: endpoint.id, nodes, edges, mainPath, subFlows };
}

function resolveFirstCallStep(options: {
  ownerClass: JavaClass;
  method: JavaMethod | undefined;
  index: Map<string, JavaClass>;
  expectedKind: JavaKind;
  unknownKind: "service" | "repository";
  nodeType: FlowNode["type"];
  edgeKind: FlowEdge["kind"];
}): MainStep | undefined {
  if (!options.method) {
    return undefined;
  }

  const calls = readFieldCalls(options.method.body);

  for (const call of calls) {
    const field = options.ownerClass.fields.find((candidate) => candidate.name === call.fieldName);

    if (!field) {
      continue;
    }

    const resolution = resolveType(field.type, options.expectedKind, options.index);

    if (resolution.status === "unknown") {
      if (!isLikelyKind(field.type, options.expectedKind)) {
        continue;
      }

      return {
        node: createUnknownNode(options.unknownKind, resolution.typeName, resolution.confidence),
        edgeKind: options.edgeKind,
        confidence: resolution.confidence
      };
    }

    if (resolution.javaClass.kind !== options.expectedKind) {
      continue;
    }

    return {
      node: createClassNode(
        resolution.javaClass,
        options.nodeType,
        call.methodName,
        resolution.confidence
      ),
      edgeKind: options.edgeKind,
      confidence: resolution.confidence
    };
  }

  return undefined;
}

function isLikelyKind(typeName: string, expectedKind: JavaKind): boolean {
  if (expectedKind === "service") {
    return typeName.endsWith("Service");
  }

  if (expectedKind === "repository") {
    return typeName.endsWith("Repository");
  }

  return true;
}

function buildServiceSubFlow(
  serviceClass: JavaClass,
  serviceMethod: JavaMethod,
  parentNodeId: string,
  index: Map<string, JavaClass>,
  maxSubDepth: number
): SubFlow {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  if (maxSubDepth <= 0) {
    return {
      id: `subflow:${parentNodeId}:support`,
      parentNodeId,
      nodes,
      edges,
      collapsedByDefault: true
    };
  }

  const calls = readFieldCalls(serviceMethod.body);
  const firstRepositoryCallIndex = calls.findIndex((call) => {
    const field = serviceClass.fields.find((candidate) => candidate.name === call.fieldName);
    const resolved = field ? resolveType(field.type, "repository", index) : undefined;
    return resolved?.status === "resolved" && resolved.javaClass.kind === "repository";
  });

  calls.forEach((call, indexInCalls) => {
    if (indexInCalls === firstRepositoryCallIndex) {
      return;
    }

    const field = serviceClass.fields.find((candidate) => candidate.name === call.fieldName);

    if (!field) {
      return;
    }

    const resolved = resolveAnyType(field.type, index);
    const node =
      resolved.status === "resolved"
        ? createSubFlowNode(resolved.javaClass, call.methodName, resolved.confidence)
        : createUnknownNode("helper", field.type, resolved.confidence);

    addUniqueNode(nodes, node);
    edges.push({
      id: `edge:${parentNodeId}->${node.id}`,
      from: parentNodeId,
      to: node.id,
      kind: "sub",
      confidence: node.confidence
    });
  });

  return {
    id: `subflow:${parentNodeId}:support`,
    parentNodeId,
    nodes,
    edges,
    collapsedByDefault: true
  };
}

function createDatabaseStep(repositoryClass: JavaClass, index: Map<string, JavaClass>): MainStep {
  const entityName = repositoryClass.repositoryEntity;

  if (!entityName) {
    return createUnknownStep("database", "database", repositoryClass.className);
  }

  const entityClass = index.get(entityName);
  const tableName = entityClass?.tableName ?? toSnakeCase(entityName);
  const node: FlowNode = {
    id: `database:${tableName}`,
    type: "database",
    label: tableName,
    confidence: entityClass ? "high" : "unknown",
    evidence: [
      {
        label: entityClass ? "Resolved repository entity" : "Inferred table from entity name",
        detail: `${entityName} -> ${tableName}`,
        source: "spring-flow-scanner",
        confidence: entityClass ? "high" : "unknown"
      }
    ],
    metadata: {
      entityName
    }
  };

  return {
    node,
    edgeKind: "db",
    confidence: node.confidence ?? "unknown"
  };
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

function extractJavaClasses(content: string, filePath: string): JavaClass[] {
  const classes: JavaClass[] = [];
  const declarationPattern = /\b(class|interface)\s+([A-Za-z_]\w*)\b([^{]*)\{/g;
  let declarationMatch: RegExpExecArray | null;

  while ((declarationMatch = declarationPattern.exec(content))) {
    const declarationType = declarationMatch[1];
    const className = declarationMatch[2];
    const declarationTail = declarationMatch[3] ?? "";
    const bodyStart = content.indexOf("{", declarationPattern.lastIndex - 1);
    const bodyEnd = bodyStart >= 0 ? findMatchingBrace(content, bodyStart) : -1;

    if (!declarationType || !className || bodyStart < 0 || bodyEnd < 0) {
      continue;
    }

    const annotationBlock = readAnnotationBlockBefore(content, declarationMatch.index);
    const annotations = readAnnotations(annotationBlock);
    const body = content.slice(bodyStart + 1, bodyEnd);
    const implementsNames = readImplementsNames(declarationTail);
    const repositoryEntity = readRepositoryEntity(declarationTail);
    const tableName = readTableName(annotationBlock);

    classes.push({
      className,
      kind: classifyJavaClass({
        className,
        declarationType,
        annotations,
        declarationTail
      }),
      filePath,
      lineNumber: lineNumberAt(content, declarationMatch.index),
      annotations,
      fields: readFields(body),
      methods: readMethods(body, content, bodyStart + 1),
      implementsNames,
      ...(repositoryEntity ? { repositoryEntity } : {}),
      ...(tableName ? { tableName } : {})
    });
  }

  return classes;
}

function classifyJavaClass(input: {
  className: string;
  declarationType: string;
  annotations: string[];
  declarationTail: string;
}): JavaKind {
  if (
    input.annotations.some((annotation) => ["RestController", "Controller"].includes(annotation))
  ) {
    return "controller";
  }

  if (input.annotations.includes("Service") || input.annotations.includes("Component")) {
    return "service";
  }

  if (
    input.annotations.includes("Repository") ||
    /(?:JpaRepository|CrudRepository)\s*</.test(input.declarationTail) ||
    input.className.endsWith("Repository")
  ) {
    return "repository";
  }

  if (input.annotations.includes("Entity")) {
    return "entity";
  }

  if (input.declarationType === "interface") {
    return "interface";
  }

  if (/(Mapper|Validator|Util|Utility|Policy|Helper)$/.test(input.className)) {
    return "utility";
  }

  return "unknown";
}

function readFields(body: string): JavaField[] {
  const fields: JavaField[] = [];
  const fieldPattern =
    /(?:@Autowired\s*)?(?:private|protected|public)?\s*(?:final\s+)?([A-Z][A-Za-z0-9_]*(?:<[^;]+>)?)\s+([a-zA-Z_]\w*)\s*;/g;
  let fieldMatch: RegExpExecArray | null;

  while ((fieldMatch = fieldPattern.exec(body))) {
    const type = fieldMatch[1];
    const name = fieldMatch[2];

    if (type && name) {
      fields.push({ type: cleanTypeName(type), name });
    }
  }

  return fields;
}

function readMethods(body: string, fullContent: string, bodyStartIndex: number): JavaMethod[] {
  const methods: JavaMethod[] = [];
  const methodPattern =
    /(?:public|protected|private)\s+(?:static\s+)?(?:[\w.$<>, ?]+?)\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/g;
  let methodMatch: RegExpExecArray | null;

  while ((methodMatch = methodPattern.exec(body))) {
    const name = methodMatch[1];
    const openBraceIndex = body.indexOf("{", methodPattern.lastIndex - 1);
    const closeBraceIndex = openBraceIndex >= 0 ? findMatchingBrace(body, openBraceIndex) : -1;

    if (!name || openBraceIndex < 0 || closeBraceIndex < 0) {
      continue;
    }

    methods.push({
      name,
      body: body.slice(openBraceIndex + 1, closeBraceIndex),
      lineNumber: lineNumberAt(fullContent, bodyStartIndex + methodMatch.index)
    });
    methodPattern.lastIndex = closeBraceIndex + 1;
  }

  return methods;
}

function resolveType(
  typeName: string,
  expectedKind: JavaKind,
  index: Map<string, JavaClass>
): Resolution {
  const direct = index.get(cleanTypeName(typeName));

  if (direct && direct.kind === expectedKind) {
    return {
      status: "resolved",
      javaClass: direct,
      confidence: "high"
    };
  }

  if (direct?.kind === "interface") {
    const implementations = [...index.values()].filter((candidate) =>
      candidate.implementsNames.includes(direct.className)
    );

    if (implementations.length === 1 && implementations[0]?.kind === expectedKind) {
      return {
        status: "resolved",
        javaClass: implementations[0],
        confidence: "medium"
      };
    }

    return {
      status: "unknown",
      typeName: direct.className,
      confidence: implementations.length > 1 ? "low" : "unknown"
    };
  }

  return {
    status: "unknown",
    typeName: cleanTypeName(typeName),
    confidence: "unknown"
  };
}

function resolveAnyType(typeName: string, index: Map<string, JavaClass>): Resolution {
  const direct = index.get(cleanTypeName(typeName));

  if (direct) {
    return {
      status: "resolved",
      javaClass: direct,
      confidence: "high"
    };
  }

  return {
    status: "unknown",
    typeName: cleanTypeName(typeName),
    confidence: "unknown"
  };
}

function findMethod(javaClass: JavaClass, methodName: string | undefined): JavaMethod | undefined {
  if (!methodName) {
    return undefined;
  }

  return javaClass.methods.find((method) => method.name === methodName);
}

function readFieldCalls(body: string): Array<{ fieldName: string; methodName: string }> {
  const calls: Array<{ fieldName: string; methodName: string }> = [];
  const callPattern = /\b([a-zA-Z_]\w*)\s*\.\s*([a-zA-Z_]\w*)\s*\(/g;
  let callMatch: RegExpExecArray | null;

  while ((callMatch = callPattern.exec(body))) {
    const fieldName = callMatch[1];
    const methodName = callMatch[2];

    if (fieldName && methodName && fieldName !== "this") {
      calls.push({ fieldName, methodName });
    }
  }

  return calls;
}

function createEndpointNode(endpoint: Endpoint): FlowNode {
  return {
    id: `endpoint:${endpoint.id}`,
    type: "endpoint",
    label: `${endpoint.method} ${endpoint.path}`,
    confidence: endpoint.confidence ?? "high",
    evidence: [
      {
        label: "Endpoint matched",
        detail: `${endpoint.method} ${endpoint.path}`,
        source: "spring-endpoint-scanner",
        confidence: endpoint.confidence ?? "high"
      }
    ]
  };
}

function createClassNode(
  javaClass: JavaClass,
  type: FlowNode["type"],
  methodName?: string,
  confidence: ConfidenceLevel = "high"
): FlowNode {
  return {
    id: `${type}:${javaClass.className}`,
    type,
    label: methodName ? `${javaClass.className}#${methodName}` : javaClass.className,
    filePath: javaClass.filePath,
    lineNumber: javaClass.lineNumber,
    confidence,
    evidence: [
      {
        label: evidenceLabelForType(type),
        detail: methodName ? `${javaClass.className}#${methodName}` : javaClass.className,
        source: "spring-flow-scanner",
        confidence
      }
    ],
    metadata: {
      className: javaClass.className,
      ...(methodName ? { methodName } : {}),
      ...(javaClass.repositoryEntity ? { entityName: javaClass.repositoryEntity } : {})
    }
  };
}

function createSubFlowNode(
  javaClass: JavaClass,
  methodName: string,
  confidence: ConfidenceLevel
): FlowNode {
  const type = classifySubFlowNodeType(javaClass);

  return {
    id: `${type}:${javaClass.className}`,
    type,
    label: `${javaClass.className}#${methodName}`,
    filePath: javaClass.filePath,
    lineNumber: javaClass.lineNumber,
    confidence,
    evidence: [
      {
        label: "Detected support call",
        detail: `${javaClass.className}#${methodName}`,
        source: "spring-flow-scanner",
        confidence
      }
    ],
    metadata: {
      className: javaClass.className,
      methodName
    }
  };
}

function classifySubFlowNodeType(javaClass: JavaClass): FlowNode["type"] {
  if (javaClass.className.includes("Mapper")) {
    return "mapper";
  }

  if (javaClass.className.includes("Validator")) {
    return "validator";
  }

  if (javaClass.kind === "service") {
    return "service";
  }

  return "utility";
}

function createUnknownStep(
  flowNodeKind: "service" | "repository" | "database",
  labelKind: string,
  labelValue: string
): MainStep {
  const node = createUnknownNode(labelKind, labelValue);

  return {
    node,
    edgeKind: flowNodeKind === "database" ? "db" : "main",
    confidence: "unknown"
  };
}

function createUnknownNode(
  kind: string,
  labelValue: string,
  confidence: ConfidenceLevel = "unknown"
): FlowNode {
  return {
    id: `unknown:${kind}:${labelValue}`,
    type: "unknown",
    label: `${kind}: ${labelValue}`,
    confidence,
    evidence: [
      {
        label: "Analysis stopped",
        detail: `Could not resolve ${kind} ${labelValue}`,
        source: "spring-flow-scanner",
        confidence
      }
    ]
  };
}

function addMainNode(node: FlowNode, nodes: FlowNode[], mainPath: string[]): void {
  addUniqueNode(nodes, node);
  mainPath.push(node.id);
}

function addMainStep(
  fromNode: FlowNode,
  step: MainStep,
  nodes: FlowNode[],
  edges: FlowEdge[],
  mainPath: string[]
): void {
  addUniqueNode(nodes, step.node);
  mainPath.push(step.node.id);
  edges.push({
    id: `edge:${fromNode.id}->${step.node.id}`,
    from: fromNode.id,
    to: step.node.id,
    kind: step.edgeKind,
    confidence: step.confidence,
    evidence: [
      {
        label: "Detected call relationship",
        detail: `${fromNode.label} -> ${step.node.label}`,
        source: "spring-flow-scanner",
        confidence: step.confidence
      }
    ]
  });
}

function evidenceLabelForType(type: FlowNode["type"]): string {
  switch (type) {
    case "controller":
      return "Resolved controller method";
    case "service":
      return "Resolved service class by field type";
    case "repository":
      return "Repository call detected in method body";
    default:
      return "Code node resolved";
  }
}

function addUniqueNode(nodes: FlowNode[], node: FlowNode): void {
  if (!nodes.some((existingNode) => existingNode.id === node.id)) {
    nodes.push(node);
  }
}

function getClassFromNode(node: FlowNode, index: Map<string, JavaClass>): JavaClass | undefined {
  const className =
    typeof node.metadata?.className === "string" ? node.metadata.className : undefined;

  return className ? index.get(className) : undefined;
}

function readClassMethodName(node: FlowNode): string | undefined {
  return typeof node.metadata?.methodName === "string" ? node.metadata.methodName : undefined;
}

function readAnnotationBlockBefore(content: string, index: number): string {
  const beforeDeclaration = content.slice(0, index);
  const lastBoundary = Math.max(
    beforeDeclaration.lastIndexOf("}"),
    beforeDeclaration.lastIndexOf(";")
  );

  return beforeDeclaration.slice(lastBoundary + 1);
}

function readAnnotations(annotationBlock: string): string[] {
  return [...annotationBlock.matchAll(/@([A-Za-z_]\w*)\b/g)]
    .map((match) => match[1])
    .filter((annotation): annotation is string => annotation !== undefined);
}

function readImplementsNames(declarationTail: string): string[] {
  const implementsMatch = /\bimplements\s+([^{]+)/.exec(declarationTail);

  if (!implementsMatch?.[1]) {
    return [];
  }

  return implementsMatch[1].split(",").map((name) => cleanTypeName(name));
}

function readRepositoryEntity(declarationTail: string): string | undefined {
  const repositoryMatch =
    /(?:JpaRepository|CrudRepository|Repository)\s*<\s*([A-Za-z_]\w*)\s*,/.exec(declarationTail);

  return repositoryMatch?.[1];
}

function readTableName(annotationBlock: string): string | undefined {
  const tableMatch = /@Table\s*\(\s*name\s*=\s*"([^"]+)"/.exec(annotationBlock);

  return tableMatch?.[1];
}

function cleanTypeName(typeName: string): string {
  return (
    typeName
      .trim()
      .replace(/<[\s\S]*>$/, "")
      .split(".")
      .at(-1)
      ?.trim() ?? typeName.trim()
  );
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function findMatchingBrace(value: string, openBraceIndex: number): number {
  let depth = 0;

  for (let index = openBraceIndex; index < value.length; index += 1) {
    if (value[index] === "{") {
      depth += 1;
    }

    if (value[index] === "}") {
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
