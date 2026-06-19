import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scanResultSchema } from "@anlyx/core";
import { describe, expect, it } from "vitest";

import { runCli } from "./index.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixtureRoot = join(repositoryRoot, "fixtures/spring-next-sample");

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "anlyx-acceptance-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("v0.1 acceptance smoke", () => {
  it("runs init, scan --skip-capture, and dev --no-open against the fixture source", async () => {
    await withTempDir(async (dir) => {
      const copiedFixtureRoot = join(dir, "spring-next-sample");
      await cp(fixtureRoot, copiedFixtureRoot, { recursive: true });

      const writes: string[] = [];
      const initExitCode = await runCli(["init"], {
        cwd: dir,
        write: (message) => writes.push(message)
      });
      const forceInitExitCode = await runCli(["init", "--force"], {
        cwd: dir,
        write: (message) => writes.push(message)
      });

      expect(initExitCode).toBe(0);
      expect(forceInitExitCode).toBe(0);

      await writeFile(join(dir, "anlyx.config.ts"), createFixtureConfig(), "utf8");

      const scanExitCode = await runCli(["scan", "--skip-capture"], {
        cwd: dir,
        write: (message) => writes.push(message)
      });

      expect(scanExitCode).toBe(0);

      const reportDataPath = join(dir, ".anlyx/report-data.json");
      const endpointsPath = join(dir, ".anlyx/endpoints.json");
      const flowsPath = join(dir, ".anlyx/flows.json");
      const pagesPath = join(dir, ".anlyx/pages.json");
      const reportData = scanResultSchema.parse(
        JSON.parse(await readFile(reportDataPath, "utf8")) as unknown
      );

      expect(reportData.projectName).toBe("Anlyx Fixture");
      expect(reportData.endpoints.map((endpoint) => endpoint.path)).toEqual([
        "/api/public/benefits",
        "/api/public/benefits/{id}"
      ]);
      expect(
        reportData.flows.every((flow) => flow.nodes.every((node) => node.type !== "page"))
      ).toBe(true);
      expect(
        reportData.flows.flatMap((flow) => flow.edges).some((edge) => edge.kind === "response")
      ).toBe(false);
      expect(reportData.pages.map((page) => page.route)).toEqual([
        "/admin/benefits",
        "/benefit/[brandSlug]/[benefitSlugWithId]",
        "/benefits"
      ]);
      expect(reportData.pages.every((page) => page.captureStatus === "pending")).toBe(true);
      expect(JSON.parse(await readFile(endpointsPath, "utf8"))).toEqual(reportData.endpoints);
      expect(JSON.parse(await readFile(flowsPath, "utf8"))).toEqual(reportData.flows);
      expect(JSON.parse(await readFile(pagesPath, "utf8"))).toEqual(reportData.pages);

      const devPorts: number[] = [];
      const devExitCode = await runCli(["dev", "--no-open", "--out", ".anlyx", "--port", "4777"], {
        cwd: dir,
        write: (message) => writes.push(message),
        dependencies: {
          async createLocalUiServer({ port }) {
            devPorts.push(port);
            return { url: `http://localhost:${port}` };
          },
          async openBrowser() {
            throw new Error("Browser must not open during acceptance smoke.");
          }
        }
      });

      expect(devExitCode).toBe(0);
      expect(devPorts).toEqual([4777]);
      expect(writes.join("\n")).toContain("Started Anlyx UI at http://localhost:4777");
    });
  });
});

function createFixtureConfig(): string {
  return `export default {
  projectName: "Anlyx Fixture",
  backend: {
    type: "spring",
    sourceDir: "./spring-next-sample/backend/src/main/java",
    maxMainDepth: 4,
    maxSubDepth: 1,
    includeUtilities: false
  },
  frontend: {
    type: "next",
    sourceDir: "./spring-next-sample/frontend",
    baseUrl: "http://localhost:3000",
    router: "app",
    sampleParams: {
      "/benefit/[brandSlug]/[benefitSlugWithId]": {
        brandSlug: "starbucks",
        benefitSlugWithId: "birthday-coupon-123"
      }
    }
  },
  server: {
    port: 4777,
    openBrowser: false
  }
};
`;
}
