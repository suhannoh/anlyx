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
    type: "spring",
    sourceDir: "./backend",
    baseUrl: "http://localhost:8080",
    maxMainDepth: 4,
    maxSubDepth: 1,
    includeUtilities: false
  },

  frontend: {
    type: "next",
    sourceDir: "./frontend",
    baseUrl: "http://localhost:3000",
    router: "app",

    viewport: {
      width: 1440,
      height: 900
    },

    capture: {
      mode: "segments",
      segmentHeight: 900
    },

    // Add sampleParams when your App Router pages include dynamic segments.
    // sampleParams: {
    //   "/items/[id]": { id: "123" }
    // }
  },

  server: {
    port: 4777,
    openBrowser: true,
    mode: "inject"
  },

  dev: {
    command: "npm run dev"
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
