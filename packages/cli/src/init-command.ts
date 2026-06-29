import { access, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export type InitCommandOptions = {
  cwd?: string;
  force?: boolean;
};

export type InitCommandResult = {
  created: boolean;
  path: string;
  skipped?: boolean;
};

const CONFIG_FILE_NAME = "anlyx.config.ts";

export function createDefaultConfigTemplate(): string {
  return `export default {
  projectName: "my-app",

  backend: {
    type: "openapi",
    openApiUrl: "about:blank"
  },

  frontend: {
    type: "manual",
    baseUrl: "http://localhost:4777",
    urls: []
  },

  server: {
    port: 4777,
    openBrowser: true,
    mode: "viewer"
  }
};
`;
}

export async function runInitCommand(options: InitCommandOptions = {}): Promise<InitCommandResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const configPath = join(cwd, CONFIG_FILE_NAME);

  if (!options.force && (await fileExists(configPath))) {
    return {
      created: false,
      path: configPath,
      skipped: true
    };
  }

  await writeFile(configPath, createDefaultConfigTemplate(), "utf8");

  return {
    created: true,
    path: configPath
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
