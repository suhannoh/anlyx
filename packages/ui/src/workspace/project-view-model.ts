import type {
  ProjectArea,
  ProjectData,
  ProjectEvidence,
  ProjectFeature,
  ProjectFlow,
  ProjectFlowLayer,
  ProjectPage,
  ProjectRequest
} from "@anlyx/core";

export type ProjectPageIndexItem = {
  id: string;
  title: string;
  path: string;
  description?: string;
  featureCount: number;
  confidence?: string;
};

export type ProjectPageIndexGroup = {
  id: string;
  name: string;
  pages: ProjectPageIndexItem[];
};

export type ProjectRequestView = ProjectRequest & {
  source: "feature" | "project";
};

export type ProjectFeatureView = ProjectFeature & {
  requests: ProjectRequestView[];
};

export type ProjectFlowView = ProjectFlow & {
  request?: ProjectRequestView;
  layers: ProjectFlowLayer[];
};

export type ProjectEvidenceSummary = {
  observed: number;
  measured: number;
  sourceMatched: number;
  agentInferred: number;
  manual: number;
  notProven: number;
  unknown: number;
  total: number;
};

export type ProjectSelectedPageView = {
  page: ProjectPage;
  areaName: string;
  features: ProjectFeatureView[];
  requests: ProjectRequestView[];
  flows: ProjectFlowView[];
  evidence: ProjectEvidence[];
  evidenceSummary: ProjectEvidenceSummary;
  hasMeasurements: boolean;
};

export type ProjectWorkspaceViewModel = {
  dictionary: ProjectData["dictionary"];
  project: ProjectData["project"];
  schemaVersion: ProjectData["schemaVersion"];
  pageGroups: ProjectPageIndexGroup[];
  selectedPage: ProjectSelectedPageView | undefined;
  totals: {
    areas: number;
    pages: number;
    features: number;
    requests: number;
    flows: number;
    evidence: number;
    measurements: number;
    architectureNodes: number;
    architectureEdges: number;
  };
};

export function buildProjectWorkspaceViewModel(
  data: ProjectData,
  selectedPageId?: string
): ProjectWorkspaceViewModel {
  const areaById = new Map(data.areas.map((area) => [area.id, area]));
  const requestById = new Map(data.requests.map((request) => [request.id, request]));
  const pageId = selectedPageId ?? data.pages[0]?.id;
  const selectedPage = data.pages.find((page) => page.id === pageId) ?? data.pages[0];

  return {
    dictionary: data.dictionary,
    project: data.project,
    schemaVersion: data.schemaVersion,
    pageGroups: groupPagesByArea(data.pages, data.areas, data.features),
    selectedPage: selectedPage
      ? buildSelectedPageView(data, selectedPage, areaById, requestById)
      : undefined,
    totals: {
      areas: data.areas.length,
      pages: data.pages.length,
      features: data.features.length,
      requests: data.requests.length,
      flows: data.flows.length,
      evidence: data.evidence.length,
      measurements: data.measurements.length,
      architectureNodes: data.architecture.nodes.length,
      architectureEdges: data.architecture.edges.length
    }
  };
}

function groupPagesByArea(
  pages: ProjectPage[],
  areas: ProjectArea[],
  features: ProjectFeature[]
): ProjectPageIndexGroup[] {
  const orderByArea = new Map(areas.map((area, index) => [area.id, area.order ?? index]));
  const featureCountByPageId = new Map<string, number>();
  const groups = new Map<string, ProjectPageIndexGroup>();

  for (const feature of features) {
    featureCountByPageId.set(feature.pageId, (featureCountByPageId.get(feature.pageId) ?? 0) + 1);
  }

  for (const area of [...areas].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    groups.set(area.id, { id: area.id, name: area.name, pages: [] });
  }

  groups.set("uncategorized", { id: "uncategorized", name: "Uncategorized", pages: [] });

  for (const page of pages) {
    const group = page.areaId ? groups.get(page.areaId) : undefined;
    const targetGroup = group ?? groups.get("uncategorized")!;

    targetGroup.pages.push({
      id: page.id,
      title: page.title,
      path: page.path,
      ...(page.description ? { description: page.description } : {}),
      featureCount: Math.max(page.featureIds.length, featureCountByPageId.get(page.id) ?? 0),
      ...(page.confidence ? { confidence: page.confidence } : {})
    });
  }

  return [...groups.values()]
    .filter((group) => group.pages.length > 0)
    .sort((a, b) => {
      if (a.id === "uncategorized") return 1;
      if (b.id === "uncategorized") return -1;
      return (orderByArea.get(a.id) ?? 0) - (orderByArea.get(b.id) ?? 0);
    });
}

function buildSelectedPageView(
  data: ProjectData,
  page: ProjectPage,
  areaById: Map<string, ProjectArea>,
  requestById: Map<string, ProjectRequest>
): ProjectSelectedPageView {
  const pageFeatures = data.features.filter(
    (feature) => feature.pageId === page.id || page.featureIds.includes(feature.id)
  );
  const requestMap = new Map<string, ProjectRequestView>();
  const features = pageFeatures.map((feature): ProjectFeatureView => {
    const requests = collectFeatureRequests(feature, requestById);

    for (const request of requests) {
      requestMap.set(request.id, request);
    }

    return {
      ...feature,
      requests
    };
  });

  for (const request of data.requests) {
    if (isPageScopedRequest(request, page.id)) {
      requestMap.set(request.id, { ...request, source: "project" });
    }
  }

  const requests = [...requestMap.values()];
  const requestIds = new Set(requests.map((request) => request.id));
  const flows = data.flows
    .filter((flow) => (flow.requestId ? requestIds.has(flow.requestId) : false))
    .map((flow): ProjectFlowView => {
      const request = flow.requestId ? requestMap.get(flow.requestId) : undefined;

      return request
        ? {
            ...flow,
            request,
            layers: flow.layers
          }
        : {
            ...flow,
            layers: flow.layers
          };
    });
  const evidenceIds = new Set([
    ...page.evidenceIds,
    ...features.flatMap((feature) => feature.evidenceIds),
    ...requests.flatMap((request) => request.evidenceIds),
    ...flows.flatMap((flow) => [
      ...flow.evidenceIds,
      ...flow.layers.flatMap((layer) => layer.evidenceIds)
    ])
  ]);
  const targetIds = new Set([
    page.id,
    ...features.map((feature) => feature.id),
    ...requests.map((request) => request.id),
    ...flows.flatMap((flow) => [flow.id, ...flow.layers.map((layer) => layer.id)])
  ]);
  const evidence = data.evidence.filter(
    (item) =>
      evidenceIds.has(item.id) ||
      (item.targetIds.length > 0
        ? item.targetIds.some((targetId) => targetIds.has(targetId))
        : targetIds.has(item.id))
  );

  return {
    page,
    areaName: page.areaId ? (areaById.get(page.areaId)?.name ?? "Uncategorized") : "Uncategorized",
    features,
    requests,
    flows,
    evidence,
    evidenceSummary: summarizeEvidence(evidence),
    hasMeasurements: data.measurements.some((measurement) => targetIds.has(measurement.targetId))
  };
}

function collectFeatureRequests(
  feature: ProjectFeature,
  requestById: Map<string, ProjectRequest>
): ProjectRequestView[] {
  const collected = new Map<string, ProjectRequestView>();

  for (const request of feature.requests) {
    collected.set(request.id, { ...request, source: "feature" });
  }

  for (const requestId of feature.requestIds) {
    const request = requestById.get(requestId);

    if (request) {
      collected.set(request.id, { ...request, source: "project" });
    }
  }

  return [...collected.values()];
}

function isPageScopedRequest(request: ProjectRequest, pageId: string): boolean {
  const metadataPageId = request.metadata?.["pageId"];

  return typeof metadataPageId === "string" && metadataPageId === pageId;
}

function summarizeEvidence(evidence: ProjectEvidence[]): ProjectEvidenceSummary {
  const summary: ProjectEvidenceSummary = {
    observed: 0,
    measured: 0,
    sourceMatched: 0,
    agentInferred: 0,
    manual: 0,
    notProven: 0,
    unknown: 0,
    total: evidence.length
  };

  for (const item of evidence) {
    if (item.status === "observed") summary.observed += 1;
    else if (item.status === "measured") summary.measured += 1;
    else if (item.status === "source-matched") summary.sourceMatched += 1;
    else if (item.status === "agent-inferred") summary.agentInferred += 1;
    else if (item.status === "manual") summary.manual += 1;
    else if (item.status === "not-proven") summary.notProven += 1;
    else summary.unknown += 1;
  }

  return summary;
}
