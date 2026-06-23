import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const packScript = join(repositoryRoot, "scripts/pack-local-install.mjs");

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "anlyx-local-pack-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("local package install helper", () => {
  it("prints one generic install command for a version-aligned Anlyx package set", async () => {
    await withTempDir(async (dir) => {
      const { stdout } = await execFileAsync(
        process.execPath,
        [packScript, "--dry-run", "--pack-destination", dir],
        {
          cwd: repositoryRoot,
          timeout: 10_000
        }
      );

      expect(stdout).toContain("Anlyx local package set");
      expect(stdout).toContain("@anlyx/core");
      expect(stdout).toContain("@anlyx/ui");
      expect(stdout).toContain("anlyx");
      expect(stdout).toContain("npm install --save-dev");
      expect(stdout).toContain(join(dir, "anlyx-core-0.1.3.tgz"));
      expect(stdout).toContain(join(dir, "anlyx-ui-0.1.3.tgz"));
      expect(stdout).toContain(join(dir, "anlyx-0.1.3.tgz"));
      expect(stdout).not.toContain("zup");
      expect(stdout).not.toContain("workspace:*");
    });
  });
});
