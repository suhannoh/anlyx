#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const packageOrder = [
  { name: "@anlyx/core", packageDir: "packages/core" },
  { name: "@anlyx/ui", packageDir: "packages/ui" },
  { name: "anlyx", packageDir: "packages/cli" }
];

const options = parseArgs(process.argv.slice(2));
const destination = resolve(options.packDestination ?? "dist-local-pack");
const packages = await readPackageSet();

if (!options.dryRun) {
  await mkdir(destination, { recursive: true });
  for (const item of packages) {
    await execFileAsync(
      "corepack",
      ["pnpm", "--filter", item.name, "pack", "--pack-destination", destination],
      {
        cwd: process.cwd(),
        timeout: 120_000
      }
    );
    await assertPackedManifest(join(destination, item.tarball));
  }
}

printSummary(destination, packages);

function parseArgs(args) {
  const parsed = {
    dryRun: false,
    packDestination: undefined
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--pack-destination") {
      parsed.packDestination = args[index + 1];
      index += 1;
      continue;
    }
    if (arg?.startsWith("--pack-destination=")) {
      parsed.packDestination = arg.slice("--pack-destination=".length);
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return parsed;
}

async function assertPackedManifest(tarballPath) {
  const { stdout } = await execFileAsync("tar", ["-xOf", tarballPath, "package/package.json"], {
    timeout: 10_000
  });
  const manifest = JSON.parse(stdout);
  const serialized = JSON.stringify(manifest);

  if (serialized.includes("workspace:")) {
    throw new Error(`${basename(tarballPath)} still contains a workspace protocol dependency.`);
  }

  for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
    if (name.startsWith("@anlyx/") && version !== manifest.version) {
      throw new Error(
        `${basename(tarballPath)} depends on ${name}@${version}, expected ${manifest.version}.`
      );
    }
  }

  if (manifest.name === "anlyx" && manifest.bin?.anlyx !== "./dist/index.js") {
    throw new Error("Packed anlyx manifest must expose bin.anlyx as ./dist/index.js.");
  }
}

async function readPackageSet() {
  const result = [];

  for (const item of packageOrder) {
    const manifestPath = join(process.cwd(), item.packageDir, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

    result.push({
      ...item,
      version: manifest.version,
      tarball: `${item.name.replace(/^@/, "").replace("/", "-")}-${manifest.version}.tgz`
    });
  }

  return result;
}

function printSummary(packDestination, packagesToPrint) {
  const tarballs = packagesToPrint.map((item) => join(packDestination, item.tarball));

  process.stdout.write("Anlyx local package set\n");
  process.stdout.write(`pack destination: ${packDestination}\n\n`);
  process.stdout.write("packages:\n");

  for (const item of packagesToPrint) {
    process.stdout.write(`- ${item.name} -> ${join(packDestination, item.tarball)}\n`);
  }

  process.stdout.write("\nInstall command:\n");
  process.stdout.write(`npm install --save-dev ${tarballs.join(" ")}\n`);
}
