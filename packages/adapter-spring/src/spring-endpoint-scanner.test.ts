import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { endpointSchema } from "@anlyx/core";

import { createSpringBackendAdapter, scanSpringEndpoints } from "./spring-endpoint-scanner.js";

describe("Spring Boot Endpoint Scanner", () => {
  let sourceDir: string;

  beforeEach(async () => {
    sourceDir = await mkdtemp(join(tmpdir(), "anlyx-spring-adapter-"));
  });

  afterEach(async () => {
    await rm(sourceDir, { recursive: true, force: true });
  });

  it("@RestController class is detected", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/benefits")
          public BenefitListResponse list() {}
        }
      `
    );

    const endpoints = await scanSpringEndpoints({ sourceDir });

    expect(endpoints).toHaveLength(1);
  });

  it("sourceDir can point at a Spring backend root", async () => {
    await writeJavaFile(
      "backend/src/main/java/com/zup/PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/benefits")
          public BenefitListResponse list() {}
        }
      `
    );

    const endpoints = await scanSpringEndpoints({ sourceDir: join(sourceDir, "backend") });

    expect(endpoints).toHaveLength(1);
    expect(endpoints[0]?.filePath).toBe(
      join(sourceDir, "backend/src/main/java/com/zup/PublicBenefitController.java")
    );
  });

  it("class-level @RequestMapping plus method-level @GetMapping creates endpoint", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        @RequestMapping("/api/public/benefits")
        class PublicBenefitController {
          @GetMapping("/{id}")
          public BenefitDetailResponse getDetail(@PathVariable Long id) {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint).toMatchObject({
      id: "GET:/api/public/benefits/{id}",
      method: "GET",
      path: "/api/public/benefits/{id}"
    });
  });

  it("@PostMapping @PutMapping @PatchMapping and @DeleteMapping are supported", async () => {
    await writeJavaFile(
      "BenefitAdminController.java",
      `
        @Controller
        @RequestMapping(path = "/api/admin/benefits")
        class BenefitAdminController {
          @PostMapping
          public BenefitResponse create(@RequestBody CreateBenefitRequest request) {}

          @PutMapping("/{id}")
          public BenefitResponse update(@RequestBody UpdateBenefitRequest request) {}

          @PatchMapping("/{id}/status")
          public BenefitResponse patchStatus() {}

          @DeleteMapping("/{id}")
          public void delete() {}
        }
      `
    );

    const endpoints = await scanSpringEndpoints({ sourceDir });

    expect(endpoints.map((endpoint) => endpoint.id)).toEqual([
      "DELETE:/api/admin/benefits/{id}",
      "PATCH:/api/admin/benefits/{id}/status",
      "POST:/api/admin/benefits",
      "PUT:/api/admin/benefits/{id}"
    ]);
  });

  it("@RequestMapping(method = RequestMethod.GET) is supported", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        @RequestMapping(value = "/api/public")
        class PublicBenefitController {
          @RequestMapping(value = "/benefits/{id}", method = RequestMethod.GET)
          public BenefitDetailResponse getDetail() {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint?.id).toBe("GET:/api/public/benefits/{id}");
  });

  it("endpoint id is METHOD:/path", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/api/public/benefits/{id}")
          public BenefitDetailResponse getDetail() {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint?.id).toBe("GET:/api/public/benefits/{id}");
  });

  it("path is normalized", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        @RequestMapping("/api//public/benefits/")
        class PublicBenefitController {
          @GetMapping(path = "/{id}/")
          public BenefitDetailResponse getDetail() {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint?.path).toBe("/api/public/benefits/{id}");
  });

  it("controller class name is mapped", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/benefits")
          public BenefitListResponse list() {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint?.controller).toBe("PublicBenefitController");
    expect(endpoint?.tags).toEqual(["PublicBenefitController"]);
  });

  it("handler method name is mapped", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/benefits/{id}")
          public BenefitDetailResponse getDetail(@PathVariable Long id) {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint?.handler).toBe("getDetail");
  });

  it("filePath and lineNumber are populated", async () => {
    const filePath = await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/benefits/{id}")
          public BenefitDetailResponse getDetail(@PathVariable Long id) {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint?.filePath).toBe(filePath);
    expect(endpoint?.lineNumber).toBeGreaterThan(0);
  });

  it("@RequestBody parameter maps to requestSchema", async () => {
    await writeJavaFile(
      "BenefitAdminController.java",
      `
        @RestController
        class BenefitAdminController {
          @PostMapping("/benefits")
          public BenefitResponse create(@RequestBody CreateBenefitRequest request) {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint?.requestSchema).toBe("CreateBenefitRequest");
  });

  it("return type maps to responseSchema", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/benefits/{id}")
          public BenefitDetailResponse getDetail() {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint?.responseSchema).toBe("BenefitDetailResponse");
  });

  it("ResponseEntity<T> response is unwrapped", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/benefits/{id}")
          public ResponseEntity<BenefitDetailResponse> getDetail() {}
        }
      `
    );

    const [endpoint] = await scanSpringEndpoints({ sourceDir });

    expect(endpoint?.responseSchema).toBe("BenefitDetailResponse");
  });

  it("non-controller Java file is ignored", async () => {
    await writeJavaFile(
      "BenefitService.java",
      `
        @Service
        class BenefitService {
          public BenefitDetailResponse getDetail() {}
        }
      `
    );

    await expect(scanSpringEndpoints({ sourceDir })).resolves.toEqual([]);
  });

  it("test Java files are ignored", async () => {
    await writeJavaFile(
      "PublicBenefitControllerTest.java",
      `
        @RestController
        class PublicBenefitControllerTest {
          @GetMapping("/test")
          public String test() {}
        }
      `
    );
    await writeJavaFile(
      "src/test/java/PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/src-test")
          public String test() {}
        }
      `
    );

    await expect(scanSpringEndpoints({ sourceDir })).resolves.toEqual([]);
  });

  it("duplicate endpoint throws clear error", async () => {
    await writeJavaFile(
      "FirstController.java",
      `
        @RestController
        class FirstController {
          @GetMapping("/benefits")
          public String list() {}
        }
      `
    );
    await writeJavaFile(
      "SecondController.java",
      `
        @RestController
        class SecondController {
          @GetMapping("/benefits")
          public String list() {}
        }
      `
    );

    await expect(scanSpringEndpoints({ sourceDir })).rejects.toThrow(
      "Duplicate Spring endpoint detected: GET:/benefits"
    );
  });

  it("missing sourceDir throws clear error", async () => {
    await expect(scanSpringEndpoints({ sourceDir: join(sourceDir, "missing") })).rejects.toThrow(
      "Spring source directory not found"
    );
  });

  it("generated endpoints pass core endpointSchema", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        @RequestMapping("/api/public/benefits")
        class PublicBenefitController {
          @GetMapping("/{id}")
          public BenefitDetailResponse getDetail(@PathVariable Long id) {}
        }
      `
    );

    const endpoints = await scanSpringEndpoints({ sourceDir });

    expect(() => endpointSchema.array().parse(endpoints)).not.toThrow();
  });

  it("async scanEndpoints adapter surface works", async () => {
    await writeJavaFile(
      "PublicBenefitController.java",
      `
        @RestController
        class PublicBenefitController {
          @GetMapping("/benefits")
          public BenefitListResponse list() {}
        }
      `
    );
    const adapter = createSpringBackendAdapter({ sourceDir });

    await expect(adapter.scanEndpoints()).resolves.toMatchObject([
      {
        id: "GET:/benefits",
        method: "GET",
        controller: "PublicBenefitController",
        handler: "list"
      }
    ]);
    await expect(adapter.scanFlows()).resolves.toEqual([]);
  });

  async function writeJavaFile(relativePath: string, content: string): Promise<string> {
    const filePath = join(sourceDir, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${content.trim()}\n`);
    return filePath;
  }
});
