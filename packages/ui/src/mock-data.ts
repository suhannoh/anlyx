import { scanResultSchema, type ScanResult } from "@anlyx/core";

export const mockScanResult: ScanResult = scanResultSchema.parse({
  projectName: "Zup",
  generatedAt: "2026-06-19T00:00:00.000Z",
  schemaVersion: "0.1",
  endpoints: [
    {
      id: "endpoint:get:/api/public/benefits/{id}",
      method: "GET",
      path: "/api/public/benefits/{id}",
      framework: "spring",
      supportLevel: "deep",
      controller: "PublicBenefitController",
      handler: "getDetail",
      filePath: "backend/src/main/java/com/zup/benefit/PublicBenefitController.java",
      lineNumber: 24,
      responseSchema: "BenefitDetailResponse",
      authRequired: false,
      tags: ["benefits", "public"],
      usedByPageIds: ["page:benefit-detail"],
      confidence: "high"
    }
  ],
  flows: [
    {
      endpointId: "endpoint:get:/api/public/benefits/{id}",
      nodes: [
        {
          id: "page:benefit-detail",
          type: "page",
          label: "/benefit/[brandSlug]/[benefitSlugWithId]",
          filePath: "frontend/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx",
          confidence: "high"
        },
        {
          id: "endpoint:get:/api/public/benefits/{id}",
          type: "endpoint",
          label: "GET /api/public/benefits/{id}",
          confidence: "high"
        },
        {
          id: "controller:PublicBenefitController#getDetail",
          type: "controller",
          label: "PublicBenefitController#getDetail",
          filePath: "backend/src/main/java/com/zup/benefit/PublicBenefitController.java",
          lineNumber: 24,
          confidence: "unknown"
        },
        {
          id: "service:PublicBenefitService#getBenefitDetail",
          type: "service",
          label: "PublicBenefitService#getBenefitDetail",
          confidence: "high"
        },
        {
          id: "repository:BenefitRepository#findById",
          type: "repository",
          label: "BenefitRepository#findById",
          confidence: "high"
        },
        {
          id: "database:benefits",
          type: "database",
          label: "benefits",
          confidence: "high",
          metadata: {
            tableName: "benefits"
          }
        }
      ],
      edges: [
        {
          id: "edge:page-to-endpoint",
          from: "page:benefit-detail",
          to: "endpoint:get:/api/public/benefits/{id}",
          kind: "request",
          animated: true,
          confidence: "high"
        }
      ],
      mainPath: [
        "page:benefit-detail",
        "endpoint:get:/api/public/benefits/{id}",
        "controller:PublicBenefitController#getDetail",
        "service:PublicBenefitService#getBenefitDetail",
        "repository:BenefitRepository#findById",
        "database:benefits"
      ],
      subFlows: [
        {
          id: "subflow:benefit-detail-support",
          parentNodeId: "service:PublicBenefitService#getBenefitDetail",
          collapsedByDefault: true,
          nodes: [],
          edges: []
        }
      ]
    }
  ],
  pages: [
    {
      id: "page:benefit-detail",
      route: "/benefit/[brandSlug]/[benefitSlugWithId]",
      filePath: "frontend/app/benefit/[brandSlug]/[benefitSlugWithId]/page.tsx",
      screenshots: [
        {
          segmentIndex: 0,
          title: "Hero / Summary",
          path: ".anlyx/screenshots/benefit-detail-0.png",
          viewport: {
            width: 1440,
            height: 900
          },
          scrollY: 0
        }
      ],
      apiCalls: [
        {
          method: "GET",
          path: "/api/public/benefits/123",
          endpointId: "endpoint:get:/api/public/benefits/{id}",
          status: 200
        }
      ],
      captureStatus: "success"
    },
    {
      id: "page:admin-benefits",
      route: "/admin/benefits",
      filePath: "frontend/app/admin/benefits/page.tsx",
      screenshots: [],
      apiCalls: [],
      captureStatus: "failed",
      errorMessage: "Login required"
    },
    {
      id: "page:pending-dynamic",
      route: "/preview/[slug]",
      screenshots: [],
      apiCalls: [],
      captureStatus: "pending",
      errorMessage: "Missing sampleParams"
    }
  ],
  warnings: [
    {
      code: "LOW_CONFIDENCE_NODE",
      message: "controller confidence is unknown",
      targetId: "controller:PublicBenefitController#getDetail"
    }
  ]
});
