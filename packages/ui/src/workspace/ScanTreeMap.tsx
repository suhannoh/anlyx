import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps
} from "@xyflow/react";
import {
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Workflow,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import ELKConstructor from "elkjs/lib/elk.bundled.js";
import type { ELK, ElkNode } from "elkjs/lib/elk-api.js";
import type { ReportData } from "@anlyx/core";

type TreeKind =
  | "frontend_file"
  | "frontend_request"
  | "api_endpoint"
  | "controller"
  | "service"
  | "repository"
  | "db_table"
  | "collapsed";

type TreeDomain =
  | "Benefits"
  | "Auth"
  | "Users"
  | "Membership"
  | "Recommendations"
  | "Admin"
  | "Analytics"
  | "Data"
  | "Shared";

type TreeNodeData = {
  label: string;
  displayLabel?: string;
  subtitle?: string;
  kind: TreeKind;
  domain: TreeDomain;
  file?: string;
  depth: number;
  confidence: "high" | "medium" | "low";
  hub?: boolean;
  quietLabel?: boolean;
  collapsedCount?: number;
};

type EdgeVisualRole = "primary_path" | "shared_dependency" | "aggregate" | "low_confidence";

type TreeFlowNode = Node<TreeNodeData, "treeNode">;
type TreeFlowEdge = Edge<{ visualRole: EdgeVisualRole }>;
type TreeTooltipState = { x: number; y: number; node: TreeFlowNode };
type TreeFlowFitView = {
  fitView(options?: { padding?: number; duration?: number }): void;
};
type FlowPath = { nodeIds: Set<string>; edgeIds: Set<string> };

type ScanTreeMapProps = {
  data: ReportData;
};

const Elk = ELKConstructor as unknown as new () => ELK;
const elk = new Elk();

const KIND_LABEL: Record<TreeKind, string> = {
  frontend_file: "Frontend",
  frontend_request: "Request",
  api_endpoint: "API",
  controller: "Controller",
  service: "Service",
  repository: "Repository",
  db_table: "DB table",
  collapsed: "Group"
};

const KIND_COLOR: Record<TreeKind, string> = {
  frontend_file: "#0f766e",
  frontend_request: "#0891b2",
  api_endpoint: "#2563eb",
  controller: "#7c3aed",
  service: "#d97706",
  repository: "#16a34a",
  db_table: "#ea580c",
  collapsed: "#64748b"
};

const DOMAIN_Y: Record<TreeDomain, number> = {
  Benefits: 120,
  Admin: 245,
  Auth: 380,
  Shared: 520,
  Users: 660,
  Membership: 800,
  Recommendations: 940,
  Analytics: 1080,
  Data: 650
};

const LAYER_X: Record<TreeKind, number> = {
  frontend_file: 220,
  frontend_request: 360,
  api_endpoint: 520,
  controller: 690,
  service: 875,
  repository: 1105,
  db_table: 1325,
  collapsed: 210
};

const VISIBLE_STATS = {
  visible: "primary paths",
  hover: "hover adds shared deps",
  confidence: "high"
};

const UNDERLYING_STATS = {
  frontendRequests: 56,
  apiEndpoints: 39,
  controllers: 13,
  services: 19,
  repositories: 13,
  dbTables: 16
};

const NODE_SIZE_BY_KIND: Record<TreeKind, { width: number; height: number }> = {
  frontend_file: { width: 42, height: 34 },
  frontend_request: { width: 198, height: 42 },
  api_endpoint: { width: 198, height: 42 },
  controller: { width: 212, height: 48 },
  service: { width: 210, height: 52 },
  repository: { width: 218, height: 52 },
  db_table: { width: 148, height: 42 },
  collapsed: { width: 204, height: 54 }
};

const HUB_NODE_SIZE = { width: 224, height: 60 };
const TOOLTIP_WIDTH = 260;
const TOOLTIP_HEIGHT = 190;
const TOOLTIP_GAP = 14;
const COLUMN_GUIDES: Array<{ label: string; left: string }> = [
  { label: "Request group", left: "8.5%" },
  { label: "Request", left: "23%" },
  { label: "API endpoint", left: "35.6%" },
  { label: "Controller", left: "47.6%" },
  { label: "Service", left: "59.9%" },
  { label: "Repository", left: "74.6%" },
  { label: "DB table", left: "88.8%" }
];

function getTreeNodeSize(kind: TreeKind, hub?: boolean): { width: number; height: number } {
  if (hub) {
    return HUB_NODE_SIZE;
  }

  return NODE_SIZE_BY_KIND[kind];
}

function n(
  id: string,
  kind: TreeKind,
  label: string,
  domain: TreeDomain,
  layerOffset = 0,
  rowOffset = 0,
  extra: Partial<TreeNodeData> = {}
): TreeFlowNode {
  const hub = extra.hub === true;
  const collapsed = kind === "collapsed";
  const nodeData: TreeNodeData = {
    label,
    kind,
    domain,
    depth: layerDepth(kind),
    confidence: "high",
    quietLabel: !hub && !collapsed && kind === "frontend_file",
    ...extra
  };
  const size = getTreeNodeSize(kind, hub);

  return {
    id,
    type: "treeNode",
    position: {
      x: (kind === "collapsed" ? LAYER_X.frontend_file : LAYER_X[kind]) + layerOffset,
      y: DOMAIN_Y[domain] + rowOffset
    },
    data: nodeData,
    style: {
      width: size.width,
      height: size.height
    }
  };
}

function e(
  source: string,
  target: string,
  visualRole: EdgeVisualRole = "primary_path"
): TreeFlowEdge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    type: "scanTreeEdge",
    sourceHandle: "out",
    targetHandle: "in",
    data: { visualRole },
    className: `scan-tree-edge scan-tree-edge--${visualRole.replace("_", "-")}`
  };
}

function layerDepth(kind: TreeKind): number {
  switch (kind) {
    case "frontend_file":
      return 1;
    case "frontend_request":
      return 2;
    case "api_endpoint":
      return 3;
    case "controller":
      return 4;
    case "service":
      return 5;
    case "repository":
      return 6;
    case "db_table":
      return 7;
    default:
      return 1;
  }
}

function buildTreeMock(): { nodes: TreeFlowNode[]; edges: TreeFlowEdge[] } {
  const nodes: TreeFlowNode[] = [
    n("benefits-group", "collapsed", "Benefits requests +14", "Benefits", 0, -74, {
      collapsedCount: 14,
      file: "src/features/benefits/**"
    }),
    n("benefits-page", "frontend_file", "BenefitsPage.tsx", "Benefits", 0, -34, {
      file: "src/features/benefits/BenefitsPage.tsx"
    }),
    n("benefit-list", "frontend_file", "BenefitList.tsx", "Benefits", 0, 4, {
      file: "src/features/benefits/BenefitList.tsx"
    }),
    n("use-benefits", "frontend_file", "useBenefits.ts", "Benefits", 0, 42, {
      file: "src/features/benefits/useBenefits.ts"
    }),
    n("req-benefits-get", "frontend_request", "axios.get('/api/benefits')", "Benefits", 0, -18),
    n("req-benefits-post", "frontend_request", "axios.post('/api/benefits')", "Benefits", 0, 32),
    n("api-benefits-get", "api_endpoint", "GET /api/benefits", "Benefits", 0, -16),
    n("api-benefits-post", "api_endpoint", "POST /api/benefits", "Benefits", 0, 36),
    n("benefit-controller", "controller", "BenefitController", "Benefits", 0, 8, {
      file: "src/controllers/benefit.controller.ts"
    }),
    n("source-controller", "controller", "SourceController", "Benefits", -8, -70, {
      file: "src/controllers/source.controller.ts"
    }),
    n("benefit-service", "service", "BenefitService", "Benefits", 0, 0, {
      file: "src/services/benefit.service.ts",
      hub: true
    }),
    n("source-service", "service", "SourceService", "Benefits", 25, -84, {
      file: "src/services/source.service.ts"
    }),
    n("benefit-repo", "repository", "BenefitRepository", "Benefits", 0, 5, {
      file: "src/repositories/benefit.repository.ts",
      hub: true
    }),
    n("source-repo", "repository", "SourceRepository", "Benefits", 10, -70, {
      file: "src/repositories/source.repository.ts"
    }),
    n("benefits-table", "db_table", "benefits", "Benefits", 0, -20),
    n("benefit-sources-table", "db_table", "benefit_sources", "Benefits", 0, 22),
    n("benefit-tags-table", "db_table", "benefit_tags", "Benefits", 0, 64),

    n("admin-group", "collapsed", "Admin endpoints +9", "Admin", 0, -42, {
      collapsedCount: 9,
      file: "src/admin/**"
    }),
    n("admin-dashboard", "frontend_file", "AdminDashboard.tsx", "Admin", 0, -4, {
      file: "src/admin/AdminDashboard.tsx"
    }),
    n("user-management", "frontend_file", "UserManagement.tsx", "Admin", 0, 36, {
      file: "src/admin/UserManagement.tsx"
    }),
    n("req-admin-users", "frontend_request", "axios.get('/api/admin/users')", "Admin", 0, -12),
    n("req-admin-stats", "frontend_request", "axios.get('/api/admin/stats')", "Admin", 0, 38),
    n("api-admin-users", "api_endpoint", "GET /api/admin/users", "Admin", 0, -12),
    n("api-admin-stats", "api_endpoint", "GET /api/admin/stats", "Admin", 0, 38),
    n("admin-controller", "controller", "AdminController", "Admin", 40, 16, {
      file: "src/controllers/admin.controller.ts",
      hub: true
    }),

    n("auth-group", "collapsed", "Auth requests +8", "Auth", 0, -58, {
      collapsedCount: 8,
      file: "src/auth/**"
    }),
    n("login-form", "frontend_file", "LoginForm.tsx", "Auth", 0, -20, {
      file: "src/auth/LoginForm.tsx"
    }),
    n("auth-context", "frontend_file", "AuthContext.tsx", "Auth", 0, 22, {
      file: "src/auth/AuthContext.tsx"
    }),
    n("req-login", "frontend_request", "axios.post('/api/login')", "Auth", 0, -28),
    n("req-me", "frontend_request", "axios.get('/api/me')", "Auth", 0, 22),
    n("api-login", "api_endpoint", "POST /api/login", "Auth", 0, -28),
    n("api-me", "api_endpoint", "GET /api/me", "Auth", 0, 22),
    n("auth-controller", "controller", "AuthController", "Auth", 0, -4, {
      file: "src/controllers/auth.controller.ts",
      hub: true
    }),
    n("auth-service", "service", "AuthService", "Auth", -18, -10, {
      file: "src/services/auth.service.ts",
      hub: true
    }),
    n("token-service", "service", "TokenService", "Auth", 22, 56, {
      file: "src/services/token.service.ts"
    }),

    n("shared-service", "service", "SharedService", "Shared", -18, 0, {
      file: "src/services/shared.service.ts",
      hub: true
    }),
    n("audit-service", "service", "AuditService", "Shared", 18, 72, {
      file: "src/services/audit.service.ts"
    }),
    n("notification-service", "service", "NotificationService", "Shared", 25, -70, {
      file: "src/services/notification.service.ts"
    }),

    n("users-group", "collapsed", "User flows +11", "Users", 0, -62, {
      collapsedCount: 11,
      file: "src/features/users/**"
    }),
    n("profile-page", "frontend_file", "ProfilePage.tsx", "Users", 0, -24, {
      file: "src/features/users/ProfilePage.tsx"
    }),
    n("user-settings", "frontend_file", "UserSettings.tsx", "Users", 0, 16, {
      file: "src/features/users/UserSettings.tsx"
    }),
    n("req-users", "frontend_request", "axios.get('/api/users')", "Users", 0, -28),
    n("req-user-patch", "frontend_request", "axios.patch('/api/users/:id')", "Users", 0, 24),
    n("api-users", "api_endpoint", "GET /api/users", "Users", 0, -28),
    n("api-user-patch", "api_endpoint", "PATCH /api/users/:id", "Users", 0, 24),
    n("user-controller", "controller", "UserController", "Users", -8, 0, {
      file: "src/controllers/user.controller.ts",
      hub: true
    }),
    n("user-service", "service", "UserService", "Users", -10, -18, {
      file: "src/services/user.service.ts",
      hub: true
    }),
    n("user-repo", "repository", "UserRepository", "Users", -12, -26, {
      file: "src/repositories/user.repository.ts",
      hub: true
    }),
    n("role-repo", "repository", "RoleRepository", "Users", 8, 38, {
      file: "src/repositories/role.repository.ts",
      hub: true
    }),
    n("users-table", "db_table", "users", "Users", 0, -42),
    n("roles-table", "db_table", "roles", "Users", 0, 4),
    n("permissions-table", "db_table", "permissions", "Users", 0, 50),

    n("membership-page", "frontend_file", "MembershipPage.tsx", "Membership", 0, -38, {
      file: "src/features/membership/MembershipPage.tsx"
    }),
    n("req-memberships", "frontend_request", "axios.get('/api/memberships')", "Membership", 0, -20),
    n("api-memberships", "api_endpoint", "GET /api/memberships", "Membership", 0, -20),
    n("membership-controller", "controller", "MembershipController", "Membership", 0, -8, {
      displayLabel: "MembershipCtrl",
      file: "src/controllers/membership.controller.ts",
      hub: true
    }),
    n("membership-service", "service", "MembershipService", "Membership", 0, -2, {
      file: "src/services/membership.service.ts",
      hub: true
    }),
    n("membership-repo", "repository", "MembershipRepository", "Membership", 0, -6, {
      file: "src/repositories/membership.repository.ts"
    }),
    n("membership-table", "db_table", "memberships", "Membership", 0, -18),
    n("membership-plan-table", "db_table", "membership_plans", "Membership", 0, 26),

    n("recommendation-group", "collapsed", "Recommendation calls +7", "Recommendations", 0, -50, {
      collapsedCount: 7,
      file: "src/features/recommendations/**"
    }),
    n("recommendation-page", "frontend_file", "RecommendationPage.tsx", "Recommendations", 0, -12, {
      file: "src/features/recommendations/RecommendationPage.tsx"
    }),
    n(
      "req-recommendations",
      "frontend_request",
      "axios.get('/api/recommendations')",
      "Recommendations",
      0,
      -6
    ),
    n("api-recommendations", "api_endpoint", "GET /api/recommendations", "Recommendations", 0, -6),
    n(
      "recommendation-controller",
      "controller",
      "RecommendationController",
      "Recommendations",
      0,
      0,
      {
        displayLabel: "RecommendationCtrl",
        file: "src/controllers/recommendation.controller.ts"
      }
    ),
    n("recommendation-service", "service", "RecommendationService", "Recommendations", 0, 0, {
      displayLabel: "RecService",
      file: "src/services/recommendation.service.ts"
    }),
    n("recommendation-repo", "repository", "RecommendationRepository", "Recommendations", 0, -10, {
      displayLabel: "RecommendationRepo",
      file: "src/repositories/recommendation.repository.ts"
    }),
    n("interaction-repo", "repository", "InteractionRepository", "Recommendations", 0, 36, {
      file: "src/repositories/interaction.repository.ts"
    }),
    n("recommendations-table", "db_table", "recommendations", "Recommendations", 0, -20),
    n("user-interactions-table", "db_table", "user_interactions", "Recommendations", 0, 26),

    n("analytics-group", "collapsed", "Analytics jobs +6", "Analytics", 0, -34, {
      collapsedCount: 6,
      file: "src/analytics/**"
    }),
    n("req-page-views", "frontend_request", "trackPageView('/')", "Analytics", -185, 10),
    n("api-page-views", "api_endpoint", "POST /api/analytics/page-view", "Analytics", 0, 10),
    n("analytics-controller", "controller", "AnalyticsController", "Analytics", 0, 10, {
      file: "src/controllers/analytics.controller.ts"
    }),
    n("pageview-service", "service", "PageViewAnalyticsService", "Analytics", 0, 10, {
      displayLabel: "PageViewSvc",
      file: "src/services/page-view-analytics.service.ts"
    }),
    n("pageview-repo", "repository", "PageViewRepository", "Analytics", 0, 10, {
      file: "src/repositories/page-view.repository.ts"
    }),
    n("pageviews-table", "db_table", "page_views", "Analytics", 0, 10),

    n("db-group", "collapsed", "DB tables +12", "Data", 0, 154, {
      collapsedCount: 12,
      file: "database/schema.sql"
    }),
    n("audit-log-table", "db_table", "audit_logs", "Data", 0, 108),
    n("notifications-table", "db_table", "notifications", "Data", 0, 154)
  ];

  const edges: TreeFlowEdge[] = [
    e("benefits-group", "req-benefits-get", "aggregate"),
    e("benefits-page", "req-benefits-get", "low_confidence"),
    e("benefit-list", "req-benefits-get", "low_confidence"),
    e("use-benefits", "req-benefits-get", "low_confidence"),
    e("use-benefits", "req-benefits-post", "low_confidence"),
    e("req-benefits-get", "api-benefits-get"),
    e("req-benefits-post", "api-benefits-post"),
    e("api-benefits-get", "benefit-controller"),
    e("api-benefits-post", "benefit-controller"),
    e("benefit-controller", "benefit-service"),
    e("source-controller", "source-service", "shared_dependency"),
    e("benefit-service", "benefit-repo"),
    e("benefit-service", "source-repo", "shared_dependency"),
    e("source-service", "source-repo"),
    e("benefit-repo", "benefits-table"),
    e("source-repo", "benefit-sources-table"),
    e("source-repo", "benefit-tags-table"),

    e("admin-group", "req-admin-users", "aggregate"),
    e("admin-dashboard", "req-admin-stats", "low_confidence"),
    e("user-management", "req-admin-users", "low_confidence"),
    e("req-admin-users", "api-admin-users"),
    e("req-admin-stats", "api-admin-stats"),
    e("api-admin-users", "admin-controller"),
    e("api-admin-stats", "admin-controller"),
    e("admin-controller", "user-service", "shared_dependency"),
    e("admin-controller", "benefit-service", "shared_dependency"),
    e("admin-controller", "audit-service", "shared_dependency"),

    e("auth-group", "req-login", "aggregate"),
    e("login-form", "req-login", "low_confidence"),
    e("auth-context", "req-me", "low_confidence"),
    e("req-login", "api-login"),
    e("req-me", "api-me"),
    e("api-login", "auth-controller"),
    e("api-me", "auth-controller"),
    e("auth-controller", "auth-service"),
    e("auth-service", "token-service"),
    e("auth-service", "user-service", "shared_dependency"),
    e("auth-service", "role-repo", "shared_dependency"),
    e("token-service", "user-repo", "shared_dependency"),

    e("shared-service", "audit-service", "shared_dependency"),
    e("shared-service", "notification-service", "shared_dependency"),
    e("benefit-service", "shared-service", "shared_dependency"),
    e("auth-service", "shared-service", "shared_dependency"),
    e("user-service", "shared-service", "shared_dependency"),
    e("notification-service", "notifications-table"),
    e("audit-service", "audit-log-table"),

    e("users-group", "req-users", "aggregate"),
    e("profile-page", "req-users", "low_confidence"),
    e("user-settings", "req-user-patch", "low_confidence"),
    e("req-users", "api-users"),
    e("req-user-patch", "api-user-patch"),
    e("api-users", "user-controller"),
    e("api-user-patch", "user-controller"),
    e("user-controller", "user-service"),
    e("user-service", "user-repo"),
    e("user-service", "role-repo"),
    e("user-repo", "users-table"),
    e("role-repo", "roles-table"),
    e("role-repo", "permissions-table"),

    e("membership-page", "req-memberships", "low_confidence"),
    e("req-memberships", "api-memberships"),
    e("api-memberships", "membership-controller"),
    e("membership-controller", "membership-service"),
    e("membership-service", "membership-repo"),
    e("membership-service", "user-service", "shared_dependency"),
    e("membership-repo", "membership-table"),
    e("membership-repo", "membership-plan-table"),

    e("recommendation-group", "req-recommendations", "aggregate"),
    e("recommendation-page", "req-recommendations", "low_confidence"),
    e("req-recommendations", "api-recommendations"),
    e("api-recommendations", "recommendation-controller"),
    e("recommendation-controller", "recommendation-service"),
    e("recommendation-service", "recommendation-repo"),
    e("recommendation-service", "interaction-repo"),
    e("recommendation-service", "user-service", "shared_dependency"),
    e("recommendation-repo", "recommendations-table"),
    e("interaction-repo", "user-interactions-table"),

    e("analytics-group", "req-page-views", "aggregate"),
    e("req-page-views", "api-page-views"),
    e("api-page-views", "analytics-controller"),
    e("analytics-controller", "pageview-service"),
    e("pageview-service", "pageview-repo"),
    e("pageview-repo", "pageviews-table"),
    e("pageview-service", "shared-service", "shared_dependency"),

    e("benefit-repo", "db-group", "shared_dependency"),
    e("user-repo", "db-group", "shared_dependency"),
    e("role-repo", "db-group", "shared_dependency")
  ];

  return { nodes, edges };
}

function connectedIds(
  nodeId: string | null,
  edges: TreeFlowEdge[],
  includeTwoHop = false
): Set<string> {
  const ids = new Set<string>();
  if (!nodeId) return ids;
  ids.add(nodeId);

  for (const edge of edges) {
    if (edge.source === nodeId) ids.add(edge.target);
    if (edge.target === nodeId) ids.add(edge.source);
  }

  if (!includeTwoHop) return ids;

  const firstHop = [...ids];
  for (const id of firstHop) {
    for (const edge of edges) {
      if (edge.source === id) ids.add(edge.target);
      if (edge.target === id) ids.add(edge.source);
    }
  }
  return ids;
}

function flowPathFrom(
  nodeId: string | null,
  nodes: TreeFlowNode[],
  edges: TreeFlowEdge[]
): FlowPath {
  if (!nodeId) {
    return { nodeIds: new Set(), edgeIds: new Set() };
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const primaryEdges = edges.filter(
    (edge) => edge.data?.visualRole === "primary_path" || edge.data?.visualRole === "aggregate"
  );
  const nodeIds = new Set<string>([nodeId]);
  const edgeIds = new Set<string>();

  const addUpstream = (id: string): void => {
    for (const edge of primaryEdges) {
      if (edge.target !== id || edgeIds.has(edge.id)) continue;
      const sourceKind = nodeById.get(edge.source)?.data.kind;
      if (sourceKind === "frontend_file" || sourceKind === "db_table") continue;
      edgeIds.add(edge.id);
      nodeIds.add(edge.source);
      addUpstream(edge.source);
    }
  };

  const addDownstream = (id: string): void => {
    for (const edge of primaryEdges) {
      if (edge.source !== id || edgeIds.has(edge.id)) continue;
      if (edge.data?.visualRole !== "primary_path") continue;
      edgeIds.add(edge.id);
      nodeIds.add(edge.target);
      addDownstream(edge.target);
    }
  };

  addUpstream(nodeId);
  addDownstream(nodeId);

  return { nodeIds, edgeIds };
}

function isDefaultVisibleEdge(edge: TreeFlowEdge): boolean {
  return edge.data?.visualRole === "primary_path" || edge.data?.visualRole === "aggregate";
}

function nodeIdsFromEdges(edges: TreeFlowEdge[]): Set<string> {
  const ids = new Set<string>();
  for (const edge of edges) {
    ids.add(edge.source);
    ids.add(edge.target);
  }
  return ids;
}

function defaultReachableEdges(nodes: TreeFlowNode[], edges: TreeFlowEdge[]): TreeFlowEdge[] {
  const visibleCandidates = edges.filter(isDefaultVisibleEdge);
  const reachable = new Set(
    nodes
      .filter((node) => node.data.kind === "collapsed" || node.data.kind === "frontend_request")
      .map((node) => node.id)
  );
  const selected: TreeFlowEdge[] = [];
  const selectedIds = new Set<string>();
  let changed = true;

  while (changed) {
    changed = false;
    for (const edge of visibleCandidates) {
      if (!reachable.has(edge.source) || selectedIds.has(edge.id)) {
        continue;
      }

      selected.push(edge);
      selectedIds.add(edge.id);
      if (!reachable.has(edge.target)) {
        reachable.add(edge.target);
        changed = true;
      }
    }
  }

  return selected;
}

async function layoutTreeWithElk(graph: {
  nodes: TreeFlowNode[];
  edges: TreeFlowEdge[];
}): Promise<{ nodes: TreeFlowNode[]; edges: TreeFlowEdge[] }> {
  const elkGraph: ElkNode = {
    id: "anlyx-scan-map",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "SPLINES",
      "elk.spacing.nodeNode": "34",
      "elk.layered.spacing.nodeNodeBetweenLayers": "72",
      "elk.layered.spacing.edgeNodeBetweenLayers": "34",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES"
    },
    children: graph.nodes.map((node) => {
      const hub = node.data.hub === true;
      const size = getTreeNodeSize(node.data.kind, hub);
      return {
        id: node.id,
        width: size.width,
        height: size.height
      };
    }),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
    }))
  };

  const layoutedGraph = await elk.layout(elkGraph);
  const positions = new Map<string, { x: number; y: number }>(
    layoutedGraph.children?.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]) ?? []
  );

  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: {
        x: positions.get(node.id)?.x ?? node.position.x,
        y: node.position.y
      }
    })),
    edges: graph.edges
  };
}

function ScanTreeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data
}: EdgeProps<TreeFlowEdge>): JSX.Element {
  const visualRole = data?.visualRole ?? "primary_path";
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: visualRole === "aggregate" ? 18 : 14,
    offset: visualRole === "shared_dependency" ? 18 : 12
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      className={`scan-tree-edge__path scan-tree-edge--${visualRole.replace("_", "-")}`}
      {...(markerEnd ? { markerEnd } : {})}
    />
  );
}

function TreeNode({ data, selected }: NodeProps<TreeFlowNode>): JSX.Element {
  const kind = data.kind;
  const color = KIND_COLOR[kind];
  const hub = data.hub === true;
  const collapsed = kind === "collapsed";
  const displayLabel =
    data.displayLabel ??
    (collapsed && data.collapsedCount ? data.label.replace(/\s\+\d+$/, "") : data.label);

  return (
    <div
      className={`scan-tree-node scan-tree-node--${kind} ${hub ? "is-hub" : ""} ${
        collapsed ? "is-collapsed" : ""
      } ${data.quietLabel ? "is-quiet-label" : ""} ${selected ? "is-selected" : ""}`}
      style={{ "--node-color": color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Left} id="in" className="scan-tree-handle" />
      <span className="scan-tree-node__dot" />
      <span className="scan-tree-node__label">
        <strong>{displayLabel}</strong>
        {data.subtitle ? <small>{data.subtitle}</small> : null}
        {collapsed && data.collapsedCount ? <small>collapsed dependency group</small> : null}
      </span>
      {collapsed && data.collapsedCount ? (
        <span className="scan-tree-node__count">+{data.collapsedCount}</span>
      ) : null}
      <Handle type="source" position={Position.Right} id="out" className="scan-tree-handle" />
    </div>
  );
}

const nodeTypes = { treeNode: TreeNode };
const edgeTypes = { scanTreeEdge: ScanTreeEdge };

export function ScanTreeMap({ data }: ScanTreeMapProps): JSX.Element {
  const graph = useMemo(buildTreeMock, []);
  const [layoutedGraph, setLayoutedGraph] = useState(graph);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isolatedNodeId, setIsolatedNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TreeTooltipState | null>(null);
  const [flowPlaying, setFlowPlaying] = useState(true);
  const [flowSpeed, setFlowSpeed] = useState(1);
  const hoverClearTimer = useRef<number | null>(null);
  const reactFlowRef = useRef<TreeFlowFitView | null>(null);

  const persistentFocusId = isolatedNodeId ?? selectedNodeId;
  const highlightId = hoveredNodeId ?? persistentFocusId;
  useEffect(() => {
    let cancelled = false;

    layoutTreeWithElk(graph)
      .then((nextGraph) => {
        if (!cancelled) {
          setLayoutedGraph(nextGraph);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLayoutedGraph(graph);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [graph]);

  useEffect(
    () => () => {
      if (hoverClearTimer.current) {
        window.clearTimeout(hoverClearTimer.current);
      }
    },
    []
  );

  const defaultEdges = useMemo(
    () => defaultReachableEdges(layoutedGraph.nodes, layoutedGraph.edges),
    [layoutedGraph.edges, layoutedGraph.nodes]
  );

  const selectedFlowPath = useMemo(
    () => flowPathFrom(persistentFocusId, layoutedGraph.nodes, layoutedGraph.edges),
    [layoutedGraph.edges, layoutedGraph.nodes, persistentFocusId]
  );

  const activeIds = hoveredNodeId
    ? connectedIds(hoveredNodeId, layoutedGraph.edges, false)
    : isolatedNodeId
      ? selectedFlowPath.nodeIds
      : persistentFocusId
        ? selectedFlowPath.nodeIds
        : connectedIds(selectedNodeId, layoutedGraph.edges, selectedNodeId !== null);

  const visibleEdges = useMemo(() => {
    if (hoveredNodeId) {
      const mergedEdges = new Map(defaultEdges.map((edge) => [edge.id, edge]));
      for (const edge of layoutedGraph.edges) {
        const isDirectlyConnected = edge.source === hoveredNodeId || edge.target === hoveredNodeId;
        const canRevealOnHover = edge.data?.visualRole === "shared_dependency";
        if (isDirectlyConnected && canRevealOnHover) {
          mergedEdges.set(edge.id, edge);
        }
      }
      return [...mergedEdges.values()];
    }

    if (!persistentFocusId) {
      return defaultEdges;
    }

    return layoutedGraph.edges.filter((edge) => {
      if (!activeIds.has(edge.source) || !activeIds.has(edge.target)) {
        return false;
      }

      if (isolatedNodeId) {
        return edge.data?.visualRole === "primary_path" || edge.data?.visualRole === "aggregate";
      }

      return edge.data?.visualRole !== "low_confidence";
    });
  }, [
    activeIds,
    defaultEdges,
    hoveredNodeId,
    isolatedNodeId,
    layoutedGraph.edges,
    persistentFocusId
  ]);

  const visibleNodeIds = useMemo(() => {
    const ids = nodeIdsFromEdges(visibleEdges);
    if (highlightId) {
      ids.add(highlightId);
    }
    return ids;
  }, [highlightId, visibleEdges]);

  const nodes = useMemo(
    () =>
      layoutedGraph.nodes
        .filter((node) => visibleNodeIds.has(node.id))
        .map((node) => {
          const isFocused = node.id === highlightId;
          return {
            ...node,
            selected: node.id === selectedNodeId,
            className: `${node.className ?? ""} is-active ${isFocused ? "is-focused" : ""}`.trim()
          };
        }),
    [highlightId, layoutedGraph.nodes, selectedNodeId, visibleNodeIds]
  );

  const edges = useMemo(
    () =>
      visibleEdges.map((edge) => {
        const isActive =
          highlightId !== null &&
          ((activeIds.has(edge.source) && activeIds.has(edge.target)) ||
            edge.source === highlightId ||
            edge.target === highlightId);
        const isLiveFlow = persistentFocusId !== null && selectedFlowPath.edgeIds.has(edge.id);
        const isQuietAggregate = highlightId === null && edge.data?.visualRole === "aggregate";
        return {
          ...edge,
          animated: isLiveFlow && flowPlaying,
          className: `${edge.className ?? ""} ${isActive ? "is-active" : ""} ${
            isLiveFlow ? "is-live-flow" : ""
          } ${!flowPlaying ? "is-paused" : ""} flow-speed-${String(flowSpeed).replace(".", "-")} ${
            isQuietAggregate ? "is-aggregate-idle" : ""
          }`.trim()
        };
      }),
    [
      activeIds,
      flowPlaying,
      flowSpeed,
      highlightId,
      persistentFocusId,
      selectedFlowPath.edgeIds,
      visibleEdges
    ]
  );

  useEffect(() => {
    window.requestAnimationFrame(() => {
      reactFlowRef.current?.fitView({ padding: 0.055, duration: 120 });
    });
  }, [edges.length, layoutedGraph, nodes.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Escape") return;
      setSelectedNodeId(null);
      setIsolatedNodeId(null);
      setHoveredNodeId(null);
      setTooltip(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectedNode = layoutedGraph.nodes.find((node) => node.id === (persistentFocusId ?? ""));
  const sourceLabel = data.projectName || "Anlyx workspace";

  function keepHoverAlive(): void {
    if (hoverClearTimer.current) {
      window.clearTimeout(hoverClearTimer.current);
      hoverClearTimer.current = null;
    }
  }

  function clearHoverSoon(): void {
    if (hoverClearTimer.current) {
      window.clearTimeout(hoverClearTimer.current);
    }

    hoverClearTimer.current = window.setTimeout(() => {
      setHoveredNodeId(null);
      setTooltip(null);
      hoverClearTimer.current = null;
    }, 220);
  }

  function handleNodeHover(event: MouseEvent, node: TreeFlowNode): void {
    keepHoverAlive();
    setHoveredNodeId(node.id);
    setTooltip(positionTooltipForNode(event.currentTarget, node));
  }

  function handleNodeMove(event: MouseEvent, node: TreeFlowNode): void {
    keepHoverAlive();
    setHoveredNodeId(node.id);
    setTooltip((current) => {
      if (current?.node.id === node.id) {
        return current;
      }

      return positionTooltipForNode(event.currentTarget, node);
    });
  }

  function handleNodeLeave(): void {
    clearHoverSoon();
  }

  function clearFlowFocus(): void {
    setSelectedNodeId(null);
    setIsolatedNodeId(null);
    setHoveredNodeId(null);
    setTooltip(null);
  }

  function replayFlow(): void {
    setFlowPlaying(false);
    window.requestAnimationFrame(() => setFlowPlaying(true));
  }

  return (
    <div className="scan-tree-workspace" data-testid="map-graph">
      <header className="scan-tree-header">
        <div>
          <div className="scan-tree-breadcrumbs">
            <span>Flows</span>
            <span>/</span>
            <strong>Map</strong>
          </div>
          <div className="scan-tree-title-row">
            <h1>Map</h1>
            <span aria-hidden="true" />
          </div>
          <p>Primary request paths stay visible. Hover a node to reveal shared dependencies.</p>
        </div>
        <div className="scan-tree-header__meta">
          <strong>{sourceLabel}</strong>
          <span>{formatScanTime(data.generatedAt)}</span>
          <small>curated tree mock · {UNDERLYING_STATS.frontendRequests}+ frontend requests</small>
        </div>
      </header>

      <div className="scan-tree-toolbar">
        <label className="scan-tree-search">
          <Search size={15} />
          <input placeholder="Search nodes" aria-label="Search nodes" />
        </label>
        <div className="scan-tree-toolbar__right">
          <button type="button">
            <SlidersHorizontal size={15} />
            Filters
          </button>
          <span>
            <Workflow size={15} />
            Layout: Layered Tree
          </span>
          <span>Clusters: On</span>
          <button type="button" aria-label="More options">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="scan-tree-metrics">
        <span>{nodes.length} visible nodes</span>
        <span>{edges.length} primary edges</span>
        <span>{VISIBLE_STATS.visible}</span>
        <span>{VISIBLE_STATS.hover}</span>
        <span>{VISIBLE_STATS.confidence} confidence</span>
      </div>

      <section className="scan-tree-canvas-shell">
        <div className="scan-tree-column-guides" aria-hidden="true">
          {COLUMN_GUIDES.map((column) => (
            <span key={column.label} style={{ left: column.left }} data-label={column.label} />
          ))}
        </div>
        <div className="scan-tree-hint">
          Default: primary paths · Click request/API to replay flow · Hover: shared dependencies
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.052 }}
          minZoom={0.34}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          elementsSelectable
          panOnScroll
          proOptions={{ hideAttribution: true }}
          onInit={(instance) => {
            reactFlowRef.current = instance;
          }}
          onNodeMouseEnter={handleNodeHover}
          onNodeMouseMove={handleNodeMove}
          onNodeMouseLeave={handleNodeLeave}
          onNodeClick={(_, node) => {
            setSelectedNodeId((current) => (current === node.id ? null : node.id));
            setIsolatedNodeId(null);
            setFlowPlaying(true);
          }}
          onNodeDoubleClick={(_, node) => {
            setIsolatedNodeId((current) => (current === node.id ? null : node.id));
            setSelectedNodeId(node.id);
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setIsolatedNodeId(null);
            setHoveredNodeId(null);
            setTooltip(null);
          }}
        >
          <Background color="#dde7f0" gap={18} size={1} />
          <Controls showInteractive={false} className="scan-tree-controls" />
        </ReactFlow>

        <details className="scan-tree-legend" open>
          <summary>Legend</summary>
          <div>
            {(
              [
                "collapsed",
                "frontend_file",
                "frontend_request",
                "api_endpoint",
                "controller",
                "service",
                "repository",
                "db_table"
              ] as TreeKind[]
            ).map((kind) => (
              <span key={kind}>
                <i style={{ background: KIND_COLOR[kind] }} />
                {KIND_LABEL[kind]}
              </span>
            ))}
          </div>
        </details>

        {selectedNode ? (
          <div className="scan-tree-live-flow-pill">
            <button
              type="button"
              aria-label={flowPlaying ? "Pause live flow" : "Play live flow"}
              onClick={() => setFlowPlaying((current) => !current)}
            >
              {flowPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <span>
              Live flow:{" "}
              <strong>{selectedNode.data.displayLabel ?? selectedNode.data.label}</strong>
            </span>
            <button type="button" aria-label="Replay live flow" onClick={replayFlow}>
              <RotateCcw size={13} />
            </button>
            <select
              aria-label="Live flow speed"
              value={flowSpeed}
              onChange={(event) => setFlowSpeed(Number(event.target.value))}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1.0x</option>
              <option value={2}>2.0x</option>
            </select>
            <button type="button" aria-label="Clear flow focus" onClick={clearFlowFocus}>
              <X size={13} />
            </button>
          </div>
        ) : null}

        {tooltip ? (
          <ScanTreeTooltip
            tooltip={tooltip}
            edgeCount={countEdges(tooltip.node.id, layoutedGraph.edges)}
            onMouseEnter={keepHoverAlive}
            onMouseLeave={clearHoverSoon}
          />
        ) : null}
      </section>
    </div>
  );
}

function ScanTreeTooltip({
  edgeCount,
  onMouseEnter,
  onMouseLeave,
  tooltip
}: {
  tooltip: TreeTooltipState;
  edgeCount: number;
  onMouseEnter(): void;
  onMouseLeave(): void;
}): JSX.Element {
  const { node, x, y } = tooltip;
  return (
    <div
      className="scan-tree-tooltip"
      style={{ left: x, top: y }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <strong>{node.data.label}</strong>
      <dl>
        <div>
          <dt>Type</dt>
          <dd>{KIND_LABEL[node.data.kind]}</dd>
        </div>
        <div>
          <dt>Domain</dt>
          <dd>{node.data.domain}</dd>
        </div>
        <div>
          <dt>File</dt>
          <dd>{node.data.file ?? "derived dependency node"}</dd>
        </div>
        <div>
          <dt>Connected</dt>
          <dd>{edgeCount} nodes</dd>
        </div>
        <div>
          <dt>Depth</dt>
          <dd>{node.data.depth}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{node.data.confidence}</dd>
        </div>
      </dl>
    </div>
  );
}

function positionTooltipForNode(target: EventTarget, node: TreeFlowNode): TreeTooltipState {
  const element = target instanceof HTMLElement ? target : undefined;
  const rect = element?.getBoundingClientRect();

  if (!rect) {
    return { x: TOOLTIP_GAP, y: TOOLTIP_GAP, node };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const hasRightSpace = rect.right + TOOLTIP_GAP + TOOLTIP_WIDTH <= viewportWidth - TOOLTIP_GAP;
  const preferredX = hasRightSpace
    ? rect.right + TOOLTIP_GAP
    : rect.left - TOOLTIP_GAP - TOOLTIP_WIDTH;
  const x = clamp(preferredX, TOOLTIP_GAP, viewportWidth - TOOLTIP_WIDTH - TOOLTIP_GAP);
  const centeredY = rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2;
  const y = clamp(centeredY, TOOLTIP_GAP, viewportHeight - TOOLTIP_HEIGHT - TOOLTIP_GAP);

  return { x, y, node };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function countEdges(nodeId: string, edges: TreeFlowEdge[]): number {
  return edges.filter((edge) => edge.source === nodeId || edge.target === nodeId).length;
}

function formatScanTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
