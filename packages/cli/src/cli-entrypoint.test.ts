import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { scanResultSchema } from "@anlyx/core";
import { beforeAll, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const cliDistEntry = join(repositoryRoot, "packages/cli/dist/index.js");
const fixtureRoot = join(repositoryRoot, "fixtures/spring-next-sample");

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "anlyx-built-cli-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runBuiltCli(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(process.execPath, [cliDistEntry, ...args], {
    cwd,
    timeout: 30_000
  });

  return {
    stdout: result.stdout,
    stderr: result.stderr
  };
}

describe("built CLI entrypoint", () => {
  beforeAll(async () => {
    await execFileAsync("corepack", ["pnpm", "-r", "--sort", "run", "build"], {
      cwd: repositoryRoot,
      timeout: 60_000
    });
  }, 90_000);

  it("can run --help without top-level await warnings", async () => {
    await withTempDir(async (dir) => {
      const { stdout, stderr } = await runBuiltCli(["--help"], dir);

      expect(stdout).toContain("Anlyx");
      expect(stdout).toContain("anlyx init");
      expect(stdout).toContain("anlyx scan");
      expect(stdout).toContain("anlyx dev");
      expect(stderr).not.toContain("unsettled top-level await");
    });
  });

  it("can run init --force", async () => {
    await withTempDir(async (dir) => {
      const { stdout, stderr } = await runBuiltCli(["init", "--force"], dir);
      const config = await readFile(join(dir, "anlyx.config.ts"), "utf8");

      expect(stdout).toContain("Created ");
      expect(stdout).toContain("anlyx.config.ts");
      expect(config).toContain("export default {");
      expect(config).not.toContain("defineConfig");
      expect(stderr).not.toContain("unsettled top-level await");
    });
  });

  it("can run scan --skip-capture in a fixture-like project", async () => {
    await withTempDir(async (dir) => {
      const copiedFixtureRoot = join(dir, "spring-next-sample");
      await cp(fixtureRoot, copiedFixtureRoot, { recursive: true });
      await writeFile(join(dir, "anlyx.config.ts"), createFixtureConfig(), "utf8");

      const { stdout, stderr } = await runBuiltCli(["scan", "--skip-capture"], dir);
      const reportData = scanResultSchema.parse(
        JSON.parse(await readFile(join(dir, ".anlyx/report-data.json"), "utf8")) as unknown
      );

      expect(stdout).toContain("Wrote ");
      expect(stdout).toContain(".anlyx/report-data.json");
      expect(reportData.projectName).toBe("Anlyx Fixture");
      expect(reportData.endpoints.length).toBeGreaterThan(0);
      expect(reportData.pages.length).toBeGreaterThan(0);
      expect(stderr).not.toContain("unsettled top-level await");
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
