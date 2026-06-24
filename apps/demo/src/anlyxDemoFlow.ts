export type FlowNodeStatus = "matched" | "inferred" | "blocked" | "scanned" | "not-proven";

export type FlowLayer =
  | "action"
  | "api"
  | "controller"
  | "auth"
  | "service"
  | "repository"
  | "database"
  | "result";

export type FlowNode = {
  id: string;
  layer: FlowLayer;
  title: string;
  subtitle?: string;
  method?: string;
  path?: string;
  durationMs?: number;
  offsetMs?: number;
  status: FlowNodeStatus;
  proven: boolean;
  evidence?: string[];
};

export type BackendSpan = {
  id: string;
  parentId?: string;
  layer: Exclude<FlowLayer, "action" | "api" | "result">;
  title: string;
  subtitle?: string;
  durationMs: number;
  offsetMs: number;
  evidence?: string[];
};

export type FlowRecord = {
  id: string;
  requestId: string;
  method: string;
  path: string;
  shortPath: string;
  statusCode: number;
  outcome: "success" | "blocked" | "error";
  outcomeLabel: string;
  totalDurationMs: number;
  diagramDurationMs: number;
  confidence: "low" | "medium" | "high";
  createdAtLabel: string;
  scannedAtLabel: string;
  repository: string;
  analyzer: string;
  sourceAction?: string;
  nodes: FlowNode[];
  backendSpans?: BackendSpan[];
};

export type DemoScenarioKey = "search" | "detail" | "save" | "admin" | "redeem";

export type DemoScenarioFixture = {
  key: DemoScenarioKey;
  label: string;
  method: "GET" | "POST";
  path: string;
  statusCode: number;
  outcome: FlowRecord["outcome"];
  outcomeLabel: string;
  resultTitle: string;
  resultSubtitle: string;
  controller: string;
  service: string;
  repository: string;
  database: string;
  authGate?: boolean;
  totalDurationMs: number;
  diagramDurationMs: number;
  responseBody: Record<string, unknown>;
};

export type DemoCaptureEvent = {
  id: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  startedAt: number;
  endedAt: number;
  action?: {
    label: string;
    selector?: string;
    text?: string;
    timestamp: number;
  };
};

export type DemoLiveEvent = DemoCaptureEvent & {
  scenarioKey: DemoScenarioKey | "unknown";
  receivedAt: number;
  flow: FlowRecord;
};

export const demoScenarioFixtures: DemoScenarioFixture[] = [
  {
    key: "search",
    label: "Search benefits",
    method: "GET",
    path: "/api/public/benefits",
    statusCode: 200,
    outcome: "success",
    outcomeLabel: "200 OK",
    resultTitle: "200 Search results",
    resultSubtitle: "3 benefits returned",
    controller: "PublicBenefitController.search",
    service: "BenefitSearchService.findVisibleBenefits",
    repository: "BenefitSearchRepository.queryByKeyword",
    database: "benefits_search_index",
    totalDurationMs: 286,
    diagramDurationMs: 116,
    responseBody: {
      query: "coffee",
      results: [
        { id: 123, title: "Birthday coffee coupon" },
        { id: 124, title: "Morning espresso club" },
        { id: 125, title: "Team cafe stipend" }
      ]
    }
  },
  {
    key: "detail",
    label: "Open detail",
    method: "GET",
    path: "/api/public/benefits/123",
    statusCode: 200,
    outcome: "success",
    outcomeLabel: "200 OK",
    resultTitle: "200 Benefit detail",
    resultSubtitle: "Detail payload returned",
    controller: "PublicBenefitController.getDetail",
    service: "PublicBenefitService.findVisibleBenefit",
    repository: "BenefitRepository.findById",
    database: "benefits",
    totalDurationMs: 318,
    diagramDurationMs: 128,
    responseBody: {
      id: 123,
      title: "Birthday coffee coupon",
      eligibility: "All full-time employees",
      amount: "$8"
    }
  },
  {
    key: "save",
    label: "Save perk",
    method: "POST",
    path: "/api/account/saved-benefit",
    statusCode: 401,
    outcome: "blocked",
    outcomeLabel: "401 Unauthorized (Blocked)",
    resultTitle: "401 Auth required",
    resultSubtitle: "Request blocked",
    controller: "SavedBenefitController.create",
    service: "SavedBenefitService.save",
    repository: "SavedBenefitRepository.insert",
    database: "saved_benefit",
    authGate: true,
    totalDurationMs: 612,
    diagramDurationMs: 182,
    responseBody: {
      error: "AUTH_REQUIRED",
      message: "Sign in before saving this benefit."
    }
  },
  {
    key: "admin",
    label: "Admin sync",
    method: "POST",
    path: "/api/admin/sync",
    statusCode: 403,
    outcome: "blocked",
    outcomeLabel: "403 Forbidden (Blocked)",
    resultTitle: "403 Admin required",
    resultSubtitle: "Policy stopped request",
    controller: "AdminBenefitController.sync",
    service: "AdminSyncService.syncCatalog",
    repository: "BenefitRepository.bulkUpsert",
    database: "benefits",
    authGate: true,
    totalDurationMs: 438,
    diagramDurationMs: 164,
    responseBody: {
      error: "ADMIN_REQUIRED",
      message: "The current demo user cannot run catalog sync."
    }
  },
  {
    key: "redeem",
    label: "Redeem perk",
    method: "POST",
    path: "/api/account/redeem",
    statusCode: 409,
    outcome: "blocked",
    outcomeLabel: "409 Conflict (Blocked)",
    resultTitle: "409 Already redeemed",
    resultSubtitle: "Decision returned",
    controller: "RedemptionController.redeem",
    service: "RedemptionService.issueCoupon",
    repository: "RedemptionRepository.create",
    database: "redemptions",
    totalDurationMs: 356,
    diagramDurationMs: 142,
    responseBody: {
      error: "ALREADY_REDEEMED",
      message: "This perk was already redeemed for the current cycle."
    }
  }
];

export function matchDemoScenario(
  method: string,
  rawPath: string
): DemoScenarioFixture | undefined {
  const path = normalizePath(rawPath);
  const upperMethod = method.toUpperCase();

  return demoScenarioFixtures.find(
    (scenario) => scenario.method === upperMethod && scenario.path === path
  );
}

export function buildFlowRecordForCapture(capture: DemoCaptureEvent): FlowRecord {
  const scenario = matchDemoScenario(capture.method, capture.path);

  if (!scenario) {
    return buildUnknownFlow(capture);
  }

  return buildScenarioFlow(scenario, capture);
}

export function normalizePath(rawPath: string): string {
  try {
    return new URL(rawPath, "http://anlyx.local").pathname;
  } catch {
    return rawPath.split("?")[0] ?? rawPath;
  }
}

function buildScenarioFlow(scenario: DemoScenarioFixture, capture: DemoCaptureEvent): FlowRecord {
  const shortPath = shortenPath(scenario.path);
  const actionLabel = capture.action?.label ?? scenario.label;
  const blocked = scenario.outcome !== "success";
  const resultDuration = scenario.outcome === "success" ? 2 : 1;
  const serviceProven = !scenario.authGate;
  const actionDuration = 4;
  const apiOffset = 3;
  const apiDuration = Math.max(1, scenario.totalDurationMs - apiOffset);
  const controllerOffset = Math.max(apiOffset + 12, 18);
  const controllerDuration = 8;
  const decisionOffset = controllerOffset + controllerDuration + 4;
  const resultOffset = Math.max(decisionOffset + 12, scenario.totalDurationMs - resultDuration);
  const authDuration = scenario.authGate ? Math.max(24, resultOffset - decisionOffset - 4) : 18;
  const repositoryDuration = 18;
  const databaseDuration = 12;
  const serviceOffset = decisionOffset + authDuration + 6;
  const databaseOffset = resultOffset - databaseDuration - 14;
  const repositoryOffset = databaseOffset - repositoryDuration - 8;
  const serviceDuration = scenario.authGate
    ? 34
    : Math.max(34, repositoryOffset - serviceOffset - 8);

  const backendSpans = serviceProven
    ? buildDemoBackendSpans({
        scenario,
        controllerOffset,
        controllerDuration,
        resultOffset,
        serviceOffset,
        serviceDuration,
        databaseOffset,
        databaseDuration
      })
    : undefined;

  const downstreamNodes: FlowNode[] = [
    {
      id: "service",
      layer: "service",
      title: scenario.service,
      subtitle: "scanned business logic",
      status: serviceProven ? "matched" : "not-proven",
      proven: serviceProven,
      evidence: ["Known scanned path"],
      ...(serviceProven
        ? {
            durationMs: serviceDuration,
            offsetMs: serviceOffset
          }
        : {})
    },
    {
      id: "repository",
      layer: "repository",
      title: scenario.repository,
      subtitle: "scanned data access",
      status: serviceProven ? "matched" : "not-proven",
      proven: serviceProven,
      evidence: ["Known scanned path"],
      ...(serviceProven
        ? {
            durationMs: repositoryDuration,
            offsetMs: repositoryOffset
          }
        : {})
    },
    {
      id: "database",
      layer: "database",
      title: scenario.database,
      subtitle: "scanned persistence",
      status: serviceProven ? "matched" : "not-proven",
      proven: serviceProven,
      evidence: ["Known scanned path"],
      ...(serviceProven
        ? {
            durationMs: databaseDuration,
            offsetMs: databaseOffset
          }
        : {})
    }
  ];

  return {
    id: flowIdFrom(capture.id),
    requestId: capture.id,
    method: scenario.method,
    path: scenario.path,
    shortPath,
    statusCode: scenario.statusCode,
    outcome: scenario.outcome,
    outcomeLabel: scenario.outcomeLabel,
    totalDurationMs: scenario.totalDurationMs,
    diagramDurationMs: scenario.diagramDurationMs,
    confidence: "high",
    createdAtLabel: formatTime(capture.endedAt),
    scannedAtLabel: "May 9, 2025 10:21:44 AM",
    repository: "benefits-service",
    analyzer: "Anlyx Engine v2.3.1",
    sourceAction: actionLabel,
    ...(backendSpans ? { backendSpans } : {}),
    nodes: [
      {
        id: "action",
        layer: "action",
        title: actionLabel,
        subtitle: "user click captured",
        durationMs: actionDuration,
        offsetMs: 0,
        status: "matched",
        proven: true,
        evidence: ["Click event captured"]
      },
      {
        id: "api",
        layer: "api",
        title: scenario.method,
        subtitle: shortPath,
        method: scenario.method,
        path: scenario.path,
        durationMs: apiDuration,
        offsetMs: apiOffset,
        status: "matched",
        proven: true,
        evidence: ["Browser fetch observed", "Endpoint matched"]
      },
      {
        id: "controller",
        layer: "controller",
        title: scenario.controller,
        subtitle: controllerName(scenario.controller),
        durationMs: controllerDuration,
        offsetMs: controllerOffset,
        status: "matched",
        proven: true,
        evidence: ["Controller match"]
      },
      {
        id: "auth",
        layer: "auth",
        title: scenario.authGate ? "Auth gate inferred" : "Policy decision",
        subtitle: scenario.authGate ? "request stopped before business logic" : "request allowed",
        durationMs: authDuration,
        offsetMs: decisionOffset,
        status: scenario.authGate ? "inferred" : "matched",
        proven: true,
        evidence: scenario.authGate
          ? ["AuthGateInterceptor.java", "status blocked"]
          : ["Decision branch observed"]
      },
      {
        id: "result",
        layer: "result",
        title: scenario.resultTitle,
        subtitle: scenario.resultSubtitle,
        durationMs: resultDuration,
        offsetMs: resultOffset,
        status: blocked ? "blocked" : "matched",
        proven: true,
        evidence: ["Response observed"]
      },
      ...downstreamNodes
    ]
  };
}

function buildDemoBackendSpans({
  controllerOffset,
  controllerDuration,
  databaseDuration,
  databaseOffset,
  resultOffset,
  scenario,
  serviceDuration,
  serviceOffset
}: {
  scenario: DemoScenarioFixture;
  controllerOffset: number;
  controllerDuration: number;
  resultOffset: number;
  serviceOffset: number;
  serviceDuration: number;
  databaseOffset: number;
  databaseDuration: number;
}): BackendSpan[] {
  const primaryRepositoryOffset = Math.min(serviceOffset + 34, resultOffset - 84);
  const primaryRepositoryDuration = 18;
  const policyServiceOffset = Math.min(
    primaryRepositoryOffset + primaryRepositoryDuration + 14,
    resultOffset - 58
  );
  const policyServiceDuration = Math.max(18, Math.round(serviceDuration * 0.18));
  const supportRepositoryOffset = Math.min(
    policyServiceOffset + policyServiceDuration + 8,
    resultOffset - 42
  );
  const supportRepositoryDuration = Math.max(
    10,
    Math.min(22, resultOffset - supportRepositoryOffset - 26)
  );
  const controllerReturnOffset = Math.min(databaseOffset + databaseDuration + 6, resultOffset - 8);

  return [
    {
      id: "controller-span",
      layer: "controller",
      title: scenario.controller,
      subtitle: "request handler entered",
      offsetMs: controllerOffset,
      durationMs: controllerDuration,
      evidence: ["demo backend span: controller enter"]
    },
    {
      id: "service-main-span",
      parentId: "controller-span",
      layer: "service",
      title: scenario.service,
      subtitle: "primary business logic",
      offsetMs: serviceOffset,
      durationMs: serviceDuration,
      evidence: ["demo backend span: service method"]
    },
    {
      id: "repository-primary-span",
      parentId: "service-main-span",
      layer: "repository",
      title: scenario.repository,
      subtitle: "primary data lookup",
      offsetMs: primaryRepositoryOffset,
      durationMs: primaryRepositoryDuration,
      evidence: ["demo backend span: repository method"]
    },
    {
      id: "service-policy-span",
      parentId: "service-main-span",
      layer: "service",
      title:
        scenario.key === "redeem"
          ? "RedemptionPolicyService.checkCycle"
          : "BenefitPolicyService.filterVisible",
      subtitle: "secondary service call",
      offsetMs: policyServiceOffset,
      durationMs: policyServiceDuration,
      evidence: ["demo backend span: nested service method"]
    },
    {
      id: "repository-support-span",
      parentId: "service-policy-span",
      layer: "repository",
      title:
        scenario.key === "redeem"
          ? "RedemptionRepository.findCurrentCycle"
          : "MerchantRuleRepository.findActiveRules",
      subtitle: "supporting data access",
      offsetMs: supportRepositoryOffset,
      durationMs: supportRepositoryDuration,
      evidence: ["demo backend span: nested repository method"]
    },
    {
      id: "database-span",
      parentId: "repository-support-span",
      layer: "database",
      title: scenario.database,
      subtitle: "database persistence call",
      offsetMs: databaseOffset,
      durationMs: databaseDuration,
      evidence: ["demo backend span: database call"]
    },
    {
      id: "controller-return-span",
      parentId: "controller-span",
      layer: "controller",
      title: "Return to controller",
      subtitle: "serialize response and leave handler",
      offsetMs: controllerReturnOffset,
      durationMs: Math.max(1, resultOffset - controllerReturnOffset),
      evidence: ["demo backend span: response return"]
    }
  ];
}

function buildUnknownFlow(capture: DemoCaptureEvent): FlowRecord {
  const path = normalizePath(capture.path);
  const statusCode = capture.status;
  const blocked = statusCode >= 400;

  return {
    id: flowIdFrom(capture.id),
    requestId: capture.id,
    method: capture.method.toUpperCase(),
    path,
    shortPath: shortenPath(path),
    statusCode,
    outcome: blocked ? "error" : "success",
    outcomeLabel: `${statusCode} ${blocked ? "Unmatched" : "Observed"}`,
    totalDurationMs: Math.max(1, Math.round(capture.durationMs)),
    diagramDurationMs: Math.max(1, Math.round(capture.durationMs)),
    confidence: "low",
    createdAtLabel: formatTime(capture.endedAt),
    scannedAtLabel: "No fixture match",
    repository: "unknown",
    analyzer: "Anlyx Engine v2.3.1",
    ...(capture.action?.label ? { sourceAction: capture.action.label } : {}),
    nodes: [
      {
        id: "action",
        layer: "action",
        title: capture.action?.label ?? "Browser action",
        subtitle: "user event captured",
        durationMs: Math.max(1, Math.round(capture.durationMs)),
        offsetMs: 2,
        status: "matched",
        proven: true,
        evidence: ["Click event captured"]
      },
      {
        id: "api",
        layer: "api",
        title: capture.method.toUpperCase(),
        subtitle: shortenPath(path),
        durationMs: Math.max(1, Math.round(capture.durationMs)),
        offsetMs: 18,
        status: "matched",
        proven: true,
        evidence: ["Browser request observed"]
      },
      {
        id: "controller",
        layer: "controller",
        title: "Unknown controller",
        subtitle: "no fixture match",
        status: "not-proven",
        proven: false,
        evidence: ["No scanned endpoint matched"]
      },
      {
        id: "auth",
        layer: "auth",
        title: "Unknown decision",
        subtitle: "not inferred",
        status: "not-proven",
        proven: false
      },
      {
        id: "result",
        layer: "result",
        title: `${statusCode} observed`,
        subtitle: "browser response",
        durationMs: 1,
        offsetMs: Math.max(30, Math.round(capture.durationMs) - 2),
        status: blocked ? "blocked" : "matched",
        proven: true
      },
      {
        id: "service",
        layer: "service",
        title: "Unknown service",
        subtitle: "not proven",
        status: "not-proven",
        proven: false
      },
      {
        id: "repository",
        layer: "repository",
        title: "Unknown repository",
        subtitle: "not proven",
        status: "not-proven",
        proven: false
      },
      {
        id: "database",
        layer: "database",
        title: "Unknown database",
        subtitle: "not proven",
        status: "not-proven",
        proven: false
      }
    ]
  };
}

function shortenPath(path: string): string {
  if (path.length <= 24) return path;
  return `${path.slice(0, 22)}...`;
}

function controllerName(value: string): string {
  return value.split(".")[0] ?? value;
}

function flowIdFrom(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "liveflow";
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}

const fallbackScenario = demoScenarioFixtures.find((scenario) => scenario.key === "save");

if (!fallbackScenario) {
  throw new Error("Anlyx demo fallback scenario is missing.");
}

export const demoFlow: FlowRecord = buildScenarioFlow(fallbackScenario, {
  id: "f3c9a2b8-7a4e-4d77-a9b6-5d0ee87c1c31",
  method: "POST",
  path: "/api/account/saved-benefit",
  status: 401,
  durationMs: 612,
  startedAt: Date.now() - 612,
  endedAt: Date.now(),
  action: {
    label: "Save perk",
    selector: "button[data-anlyx-action='save']",
    text: "Save perk",
    timestamp: Date.now() - 616
  }
});
