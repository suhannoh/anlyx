import { access } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import { normalizeConfig, type NormalizedAnlyxConfig } from "@anlyx/core";
import { createJiti } from "jiti";

const CONFIG_FILE_NAMES = [
  "anlyx.config.ts",
  "anlyx.config.mjs",
  "anlyx.config.js",
  "anlyx.config.cjs"
] as const;

export type LoadConfigOptions = {
  cwd?: string;
  configPath?: string;
};

export async function findConfigFile(cwd: string): Promise<string | null> {
  for (const fileName of CONFIG_FILE_NAMES) {
    const candidate = join(cwd, fileName);

    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<NormalizedAnlyxConfig> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = options.configPath
    ? resolveConfigPath(cwd, options.configPath)
    : await findConfigFile(cwd);

  if (!configPath) {
    throw new Error(`Anlyx config file not found in ${cwd}`);
  }

  if (!(await fileExists(configPath))) {
    throw new Error(`Anlyx config file not found: ${configPath}`);
  }

  const loadedConfig = await importConfigFile(configPath);
  return normalizeConfig(loadedConfig);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function resolveConfigPath(cwd: string, configPath: string): string {
  return isAbsolute(configPath) ? configPath : resolve(cwd, configPath);
}

async function importConfigFile(configPath: string): Promise<unknown> {
  const jiti = createJiti(import.meta.url, {
    fsCache: false,
    moduleCache: false
  });

  return jiti.import(configPath, { default: true });
}
