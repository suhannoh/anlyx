import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { endpointFlowSchema } from "@anlyx/core";

import { createSpringBackendAdapter, scanSpringEndpoints } from "./spring-endpoint-scanner.js";
import { scanSpringFlows } from "./spring-flow-scanner.js";

describe("Spring Boot Flow Scanner", () => {
  let sourceDir: string;

  beforeEach(async () => {
    sourceDir = await mkdtemp(join(tmpdir(), "anlyx-spring-flow-"));
  });

  afterEach(async () => {
    await rm(sourceDir, { recursive: true, force: true });
  });

  it("endpoint creates backend-only flow", async () => {
    await writeBenefitFlow();

    const flows = await scanFlows();

    expect(flows).toHaveLength(1);
    expect(flows[0]?.endpointId).toBe("GET:/api/public/benefits/{id}");
    expect(flows[0]?.nodes.some((node) => node.type === "page")).toBe(false);
  });

  it("endpoint node and controller node are created", async () => {
    await writeBenefitFlow();

    const [flow] = await scanFlows();

    expect(flow?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "endpoint:GET:/api/public/benefits/{id}",
          type: "endpoint"
        }),
        expect.objectContaining({
          id: "controller:PublicBenefitController",
          type: "controller",
          label: "PublicBenefitController#getDetail"
        })
      ])
    );
  });

  it("controller method call creates service node", async () => {
    await writeBenefitFlow();

    const [flow] = await scanFlows();

    expect(flow?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "service:PublicBenefitService",
          type: "service",
          confidence: "high"
        })
      ])
    );
  });

  it("service method call creates repository node", async () => {
    await writeBenefitFlow();

    const [flow] = await scanFlows();

    expect(flow?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "repository:BenefitRepository",
          type: "repository",
          confidence: "high"
        })
      ])
    );
  });

  it("repository generic resolves entity", async () => {
    await writeBenefitFlow();

    const [flow] = await scanFlows();

    expect(
      flow?.nodes.find((node) => node.id === "repository:BenefitRepository")?.metadata
    ).toMatchObject({
      entityName: "Benefit"
    });
  });

  it("entity @Table name resolves database table", async () => {
    await writeBenefitFlow();

    const [flow] = await scanFlows();

    expect(flow?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "database:benefits",
          type: "database",
          label: "benefits"
        })
      ])
    );
  });

  it("database fallback uses entity class name when @Table is missing", async () => {
    await writeBenefitFlow({ tableAnnotation: "" });

    const [flow] = await scanFlows();

    expect(flow?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "database:benefit",
          label: "benefit"
        })
      ])
    );
  });

  it("mainPath is endpoint to controller to service to repository to database", async () => {
    await writeBenefitFlow();

    const [flow] = await scanFlows();

    expect(flow?.mainPath).toEqual([
      "endpoint:GET:/api/public/benefits/{id}",
      "controller:PublicBenefitController",
      "service:PublicBenefitService",
      "repository:BenefitRepository",
      "database:benefits"
    ]);
  });

  it("mainPath follows nested service calls before the repository", async () => {
    await writeBenefitFlow({
      extraServiceFields: "private final BenefitLookupService benefitLookupService;",
      serviceBody: `
        public BenefitDetailResponse getBenefitDetail(Long id) {
          return benefitLookupService.loadDetail(id);
        }
      `
    });
    await writeJavaFile(
      "BenefitLookupService.java",
      `
        @Service
        class BenefitLookupService {
          private final BenefitRepository benefitRepository;

          public BenefitDetailResponse loadDetail(Long id) {
            Benefit benefit = benefitRepository.findById(id).orElseThrow();
            return null;
          }
        }
      `
    );

    const [flow] = await scanFlows();

    expect(flow?.mainPath).toEqual([
      "endpoint:GET:/api/public/benefits/{id}",
      "controller:PublicBenefitController",
      "service:PublicBenefitService",
      "service:BenefitLookupService",
      "repository:BenefitRepository",
      "database:benefits"
    ]);
    expect(flow?.subFlows[0]?.nodes).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "service:BenefitLookupService" })])
    );
  });

  it("mainPath skips service helper calls that do not lead to persistence", async () => {
    await writeBenefitFlow({
      extraServiceFields: "private final BenefitAuditService benefitAuditService;",
      serviceBody: `
        public BenefitDetailResponse getBenefitDetail(Long id) {
          benefitAuditService.recordView(id);
          Benefit benefit = benefitRepository.findById(id).orElseThrow();
          return benefitDisplayMapper.toDetail(benefit);
        }
      `
    });
    await writeJavaFile(
      "BenefitAuditService.java",
      `
        @Service
        class BenefitAuditService {
          public void recordView(Long id) {
          }
        }
      `
    );

    const [flow] = await scanFlows();

    expect(flow?.mainPath).toEqual([
      "endpoint:GET:/api/public/benefits/{id}",
      "controller:PublicBenefitController",
      "service:PublicBenefitService",
      "repository:BenefitRepository",
      "database:benefits"
    ]);
    expect(flow?.mainPath).not.toContain("service:BenefitAuditService");
  });

  it("mainPath skips nested service helper chains that do not lead to persistence", async () => {
    await writeBenefitFlow({
      extraServiceFields: "private final BenefitAuditService benefitAuditService;",
      serviceBody: `
        public BenefitDetailResponse getBenefitDetail(Long id) {
          benefitAuditService.recordView(id);
          Benefit benefit = benefitRepository.findById(id).orElseThrow();
          return benefitDisplayMapper.toDetail(benefit);
        }
      `
    });
    await writeJavaFile(
      "BenefitAuditService.java",
      `
        @Service
        class BenefitAuditService {
          private final AuditSinkService auditSinkService;

          public void recordView(Long id) {
            auditSinkService.write(id);
          }
        }
      `
    );
    await writeJavaFile(
      "AuditSinkService.java",
      `
        @Service
        class AuditSinkService {
          public void write(Long id) {
          }
        }
      `
    );

    const [flow] = await scanFlows();

    expect(flow?.mainPath).toEqual([
      "endpoint:GET:/api/public/benefits/{id}",
      "controller:PublicBenefitController",
      "service:PublicBenefitService",
      "repository:BenefitRepository",
      "database:benefits"
    ]);
    expect(flow?.mainPath).not.toContain("service:BenefitAuditService");
    expect(flow?.mainPath).not.toContain("service:AuditSinkService");
  });

  it("mainPath skips controller service helpers that do not lead to persistence", async () => {
    await writeBenefitFlow({
      extraControllerFields: "private final RequestAuditService requestAuditService;",
      controllerBody: `
        @GetMapping("/{id}")
        public BenefitDetailResponse getDetail(Long id) {
          requestAuditService.record(id);
          return publicBenefitService.getBenefitDetail(id);
        }
      `
    });
    await writeJavaFile(
      "RequestAuditService.java",
      `
        @Service
        class RequestAuditService {
          public void record(Long id) {
          }
        }
      `
    );

    const [flow] = await scanFlows();

    expect(flow?.mainPath).toEqual([
      "endpoint:GET:/api/public/benefits/{id}",
      "controller:PublicBenefitController",
      "service:PublicBenefitService",
      "repository:BenefitRepository",
      "database:benefits"
    ]);
    expect(flow?.mainPath).not.toContain("service:RequestAuditService");
  });

  it("mainPath preserves unresolved controller service gaps before later persistence", async () => {
    await writeBenefitFlow({
      extraControllerFields: "private final MissingAuditService missingAuditService;",
      controllerBody: `
        @GetMapping("/{id}")
        public BenefitDetailResponse getDetail(Long id) {
          missingAuditService.record(id);
          return publicBenefitService.getBenefitDetail(id);
        }
      `
    });

    const [flow] = await scanFlows();

    expect(flow?.mainPath).toEqual([
      "endpoint:GET:/api/public/benefits/{id}",
      "controller:PublicBenefitController",
      "unknown:service:MissingAuditService"
    ]);
    expect(flow?.mainPath).not.toContain("service:PublicBenefitService");
    expect(flow?.mainPath).not.toContain("repository:BenefitRepository");
    expect(flow?.mainPath).not.toContain("database:benefits");
  });

  it("main edges and db edge are created", async () => {
    await writeBenefitFlow();

    const [flow] = await scanFlows();

    expect(flow?.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: "endpoint:GET:/api/public/benefits/{id}",
          to: "controller:PublicBenefitController",
          kind: "main"
        }),
        expect.objectContaining({
          from: "repository:BenefitRepository",
          to: "database:benefits",
          kind: "db"
        })
      ])
    );
  });

  it("flow passes core endpointFlowSchema", async () => {
    await writeBenefitFlow();

    const flows = await scanFlows();

    expect(() => endpointFlowSchema.array().parse(flows)).not.toThrow();
  });

  it("sub flow captures mapper utility and policy call", async () => {
    await writeBenefitFlow();

    const [flow] = await scanFlows();

    expect(flow?.subFlows[0]).toMatchObject({
      parentNodeId: "service:PublicBenefitService",
      nodes: expect.arrayContaining([
        expect.objectContaining({ id: "mapper:BenefitDisplayMapper", type: "mapper" }),
        expect.objectContaining({ id: "utility:DateRangeUtil", type: "utility" }),
        expect.objectContaining({ id: "utility:PublicVisibilityPolicy", type: "utility" })
      ])
    });
  });

  it("sub flow is collapsed by default", async () => {
    await writeBenefitFlow();

    const [flow] = await scanFlows();

    expect(flow?.subFlows[0]?.collapsedByDefault).toBe(true);
  });

  it("unresolved service creates unknown node instead of crashing", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          private final MissingBenefitService missingBenefitService;

          @GetMapping("/benefits/{id}")
          public BenefitDetailResponse getDetail(Long id) {
            return missingBenefitService.getBenefitDetail(id);
          }
        }
      `
    );

    const [flow] = await scanFlows();

    expect(flow?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "unknown:service:MissingBenefitService",
          type: "unknown",
          confidence: "unknown"
        })
      ])
    );
  });

  it("unresolved repository creates unknown node instead of crashing", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          private final PublicBenefitService publicBenefitService;

          @GetMapping("/benefits/{id}")
          public BenefitDetailResponse getDetail(Long id) {
            return publicBenefitService.getBenefitDetail(id);
          }
        }
      `
    );
    await writeJavaFile(
      "PublicBenefitService.java",
      `
        @Service
        class PublicBenefitService {
          private final MissingBenefitRepository benefitRepository;

          public BenefitDetailResponse getBenefitDetail(Long id) {
            return benefitRepository.findById(id).orElseThrow();
          }
        }
      `
    );

    const [flow] = await scanFlows();

    expect(flow?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "unknown:repository:MissingBenefitRepository",
          type: "unknown",
          confidence: "unknown"
        })
      ])
    );
  });

  it("interface with single implementation resolves with medium confidence", async () => {
    await writeBenefitFlow({
      serviceFieldType: "BenefitService",
      serviceClassDeclaration: "class PublicBenefitService implements BenefitService"
    });
    await writeJavaFile("BenefitService.java", "interface BenefitService {}\n");

    const [flow] = await scanFlows();

    expect(flow?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "service:PublicBenefitService",
          confidence: "medium"
        })
      ])
    );
  });

  it("multiple implementations do not pick arbitrary implementation", async () => {
    await writeBenefitFlow({
      serviceFieldType: "BenefitService",
      serviceClassDeclaration: "class PublicBenefitService implements BenefitService"
    });
    await writeJavaFile("BenefitService.java", "interface BenefitService {}\n");
    await writeJavaFile(
      "AlternativeBenefitService.java",
      `
        @Service
        class AlternativeBenefitService implements BenefitService {
          public BenefitDetailResponse getBenefitDetail(Long id) {
            return null;
          }
        }
      `
    );

    const [flow] = await scanFlows();

    expect(flow?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "unknown:service:BenefitService",
          confidence: "low"
        })
      ])
    );
    expect(flow?.nodes.some((node) => node.id === "service:PublicBenefitService")).toBe(false);
  });

  it("cycle and depth guard prevents infinite traversal", async () => {
    await writeBenefitFlow({
      serviceBody: `
        public BenefitDetailResponse getBenefitDetail(Long id) {
          return this.getBenefitDetail(id);
        }
      `
    });

    const [flow] = await scanSpringFlows(
      { sourceDir, maxMainDepth: 2 },
      await scanSpringEndpoints({ sourceDir })
    );

    expect(flow?.mainPath.length).toBeLessThanOrEqual(3);
  });

  it("mainPath reserves depth for repository and database together", async () => {
    await writeBenefitFlow({
      extraServiceFields: "private final BenefitStepTwoService benefitStepTwoService;",
      serviceBody: `
        public BenefitDetailResponse getBenefitDetail(Long id) {
          return benefitStepTwoService.load(id);
        }
      `
    });
    await writeJavaFile(
      "BenefitStepTwoService.java",
      `
        @Service
        class BenefitStepTwoService {
          private final BenefitStepThreeService benefitStepThreeService;

          public BenefitDetailResponse load(Long id) {
            return benefitStepThreeService.load(id);
          }
        }
      `
    );
    await writeJavaFile(
      "BenefitStepThreeService.java",
      `
        @Service
        class BenefitStepThreeService {
          private final BenefitRepository benefitRepository;

          public BenefitDetailResponse load(Long id) {
            Benefit benefit = benefitRepository.findById(id).orElseThrow();
            return null;
          }
        }
      `
    );

    const [flow] = await scanFlows();

    expect(flow?.mainPath.length).toBeLessThanOrEqual(6);
    expect(flow?.mainPath).toEqual([
      "endpoint:GET:/api/public/benefits/{id}",
      "controller:PublicBenefitController",
      "service:PublicBenefitService"
    ]);
    expect(flow?.mainPath).not.toContain("service:BenefitStepTwoService");
    expect(flow?.mainPath).not.toContain("service:BenefitStepThreeService");
    expect(flow?.mainPath).not.toContain("repository:BenefitRepository");
    expect(flow?.mainPath).not.toContain("database:benefits");
  });

  it("createSpringBackendAdapter scanFlows works", async () => {
    await writeBenefitFlow();
    const adapter = createSpringBackendAdapter({ sourceDir });
    const endpoints = await adapter.scanEndpoints();

    const flows = await adapter.scanFlows(endpoints);

    expect(flows[0]?.mainPath).toEqual([
      "endpoint:GET:/api/public/benefits/{id}",
      "controller:PublicBenefitController",
      "service:PublicBenefitService",
      "repository:BenefitRepository",
      "database:benefits"
    ]);
  });

  it("sourceDir can point at a Spring backend root for flows", async () => {
    await writeJavaFile(
      "backend/src/main/java/PublicBenefitController.java",
      `
        @RestController
        @RequestMapping("/api/public/benefits")
        class PublicBenefitController {
          private final PublicBenefitService publicBenefitService;

          @GetMapping("/{id}")
          public BenefitDetailResponse getDetail(Long id) {
            return publicBenefitService.getBenefitDetail(id);
          }
        }
      `
    );
    await writeJavaFile(
      "backend/src/main/java/PublicBenefitService.java",
      `
        @Service
        class PublicBenefitService {
          public BenefitDetailResponse getBenefitDetail(Long id) { return null; }
        }
      `
    );
    const backendRoot = join(sourceDir, "backend");
    const endpoints = await scanSpringEndpoints({ sourceDir: backendRoot });

    const [flow] = await scanSpringFlows({ sourceDir: backendRoot }, endpoints);

    expect(flow?.mainPath).toEqual([
      "endpoint:GET:/api/public/benefits/{id}",
      "controller:PublicBenefitController",
      "service:PublicBenefitService"
    ]);
  });

  async function scanFlows() {
    const endpoints = await scanSpringEndpoints({ sourceDir });
    return scanSpringFlows({ sourceDir }, endpoints);
  }

  async function writeBenefitFlow(
    options: {
      tableAnnotation?: string;
      serviceFieldType?: string;
      serviceClassDeclaration?: string;
      extraControllerFields?: string;
      controllerBody?: string;
      extraServiceFields?: string;
      serviceBody?: string;
    } = {}
  ): Promise<void> {
    const serviceFieldType = options.serviceFieldType ?? "PublicBenefitService";
    const serviceClassDeclaration = options.serviceClassDeclaration ?? "class PublicBenefitService";
    const serviceBody =
      options.serviceBody ??
      `
        public BenefitDetailResponse getBenefitDetail(Long id) {
          visibilityPolicy.ensurePublic(id);
          dateRangeUtil.isActive(id);
          Benefit benefit = benefitRepository.findById(id).orElseThrow();
          return benefitDisplayMapper.toDetail(benefit);
        }
      `;
    const controllerBody =
      options.controllerBody ??
      `
        @GetMapping("/{id}")
        public BenefitDetailResponse getDetail(Long id) {
          return publicBenefitService.getBenefitDetail(id);
        }
      `;

    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        @RequestMapping("/api/public/benefits")
        class PublicBenefitController {
          private final ${serviceFieldType} publicBenefitService;
          ${options.extraControllerFields ?? ""}

          ${controllerBody}
        }
      `
    );
    await writeJavaFile(
      "PublicBenefitService.java",
      `
        @Service
        ${serviceClassDeclaration} {
          private final BenefitRepository benefitRepository;
          private final BenefitDisplayMapper benefitDisplayMapper;
          private final DateRangeUtil dateRangeUtil;
          private final PublicVisibilityPolicy visibilityPolicy;
          ${options.extraServiceFields ?? ""}

          ${serviceBody}
        }
      `
    );
    await writeJavaFile(
      "BenefitRepository.java",
      `
        @Repository
        interface BenefitRepository extends JpaRepository<Benefit, Long> {
        }
      `
    );
    await writeJavaFile(
      "Benefit.java",
      `
        @Entity
        ${options.tableAnnotation ?? '@Table(name = "benefits")'}
        class Benefit {
        }
      `
    );
    await writeJavaFile(
      "BenefitDisplayMapper.java",
      `
        @Component
        class BenefitDisplayMapper {
          public BenefitDetailResponse toDetail(Benefit benefit) { return null; }
        }
      `
    );
    await writeJavaFile("DateRangeUtil.java", "class DateRangeUtil {}\n");
    await writeJavaFile("PublicVisibilityPolicy.java", "class PublicVisibilityPolicy {}\n");
  }

  async function writeJavaFile(relativePath: string, content: string): Promise<string> {
    const filePath = join(sourceDir, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${content.trim()}\n`);
    return filePath;
  }
});
