#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const options = parseArgs(process.argv.slice(2));
const packDir = resolve(options.packDir ?? "dist-local-pack");
const projectDir = options.projectDir
  ? resolve(options.projectDir)
  : await mkdtemp(join(tmpdir(), "anlyx-install-smoke-"));
const createdProject = !options.projectDir;
const packages = [
  { name: "@anlyx/core", tarball: join(packDir, "anlyx-core-0.1.3.tgz") },
  { name: "@anlyx/ui", tarball: join(packDir, "anlyx-ui-0.1.3.tgz") },
  { name: "@anlyx/adapter-openapi", tarball: join(packDir, "anlyx-adapter-openapi-0.1.3.tgz") },
  { name: "@anlyx/adapter-manual", tarball: join(packDir, "anlyx-adapter-manual-0.1.3.tgz") },
  { name: "@anlyx/adapter-next", tarball: join(packDir, "anlyx-adapter-next-0.1.3.tgz") },
  { name: "@anlyx/adapter-spring", tarball: join(packDir, "anlyx-adapter-spring-0.1.3.tgz") },
  { name: "@anlyx/capture", tarball: join(packDir, "anlyx-capture-0.1.3.tgz") },
  { name: "anlyx", tarball: join(packDir, "anlyx-0.1.3.tgz") }
];

try {
  await prepareProject(projectDir, packages);
  await installTarballs(projectDir);
  await runAnlyxHelp(projectDir);
  await runAnlyxInit(projectDir);
  await writeSmokeSources(projectDir);
  await runAnlyxScan(projectDir);

  process.stdout.write(`Anlyx local install smoke passed in ${projectDir}\n`);
} finally {
  if (createdProject && !options.keep) {
    await rm(projectDir, { recursive: true, force: true });
  }
}

function parseArgs(args) {
  const parsed = {
    keep: false,
    offline: false,
    packDir: undefined,
    projectDir: undefined
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--") {
      continue;
    }

    if (arg === "--keep") {
      parsed.keep = true;
      continue;
    }

    if (arg === "--offline") {
      parsed.offline = true;
      continue;
    }

    if (arg === "--pack-dir") {
      parsed.packDir = args[index + 1];
      index += 1;
      continue;
    }

    if (arg?.startsWith("--pack-dir=")) {
      parsed.packDir = arg.slice("--pack-dir=".length);
      continue;
    }

    if (arg === "--project-dir") {
      parsed.projectDir = args[index + 1];
      index += 1;
      continue;
    }

    if (arg?.startsWith("--project-dir=")) {
      parsed.projectDir = arg.slice("--project-dir=".length);
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return parsed;
}

async function prepareProject(cwd, packageSet) {
  const localDependencies = Object.fromEntries(
    packageSet.map((item) => [item.name, `file:${item.tarball}`])
  );

  await writeFile(
    join(cwd, "package.json"),
    `${JSON.stringify(
      {
        name: "anlyx-local-install-smoke",
        private: true,
        type: "module",
        devDependencies: localDependencies,
        pnpm: {
          overrides: localDependencies
        }
      },
      null,
      2
    )}\n`
  );
}

async function installTarballs(cwd) {
  await execFileAsync("corepack", ["pnpm", "install", ...(options.offline ? ["--offline"] : [])], {
    cwd,
    timeout: 120_000
  });
}

async function runAnlyxHelp(cwd) {
  const { stdout } = await execFileAsync("corepack", ["pnpm", "exec", "anlyx", "--help"], {
    cwd,
    timeout: 30_000
  });

  if (!stdout.includes("anlyx dev")) {
    throw new Error("Installed anlyx binary did not print dev command help.");
  }
}

async function runAnlyxInit(cwd) {
  await execFileAsync("corepack", ["pnpm", "exec", "anlyx", "init"], {
    cwd,
    timeout: 30_000
  });

  const config = await readFile(join(cwd, "anlyx.config.ts"), "utf8");

  if (!config.includes("export default") || !config.includes("projectName")) {
    throw new Error("anlyx init did not create a usable anlyx.config.ts.");
  }
}

async function writeSmokeSources(cwd) {
  await writeProjectFile(
    cwd,
    "backend/src/main/java/com/example/PublicBenefitController.java",
    `
      package com.example;

      import org.springframework.web.bind.annotation.GetMapping;
      import org.springframework.web.bind.annotation.RequestMapping;
      import org.springframework.web.bind.annotation.RestController;

      @RestController
      @RequestMapping("/api/public/benefits")
      class PublicBenefitController {
        @GetMapping("/{id}")
        public String getBenefit() {
          return "ok";
        }
      }
    `
  );

  await writeProjectFile(
    cwd,
    "frontend/app/page.tsx",
    `
      export default function Page() {
        return <main>Anlyx smoke app</main>;
      }
    `
  );
}

async function writeProjectFile(cwd, relativePath, content) {
  const path = join(cwd, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${content.trim()}\n`, "utf8");
}

async function runAnlyxScan(cwd) {
  const { stdout } = await execFileAsync(
    "corepack",
    ["pnpm", "exec", "anlyx", "scan", "--skip-capture"],
    {
      cwd,
      timeout: 60_000
    }
  );

  if (!stdout.includes(".anlyx/report-data.json")) {
    throw new Error("anlyx scan did not report .anlyx/report-data.json output.");
  }
}
