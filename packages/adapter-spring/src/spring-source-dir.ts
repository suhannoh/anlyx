import { stat } from "node:fs/promises";
import { join, normalize } from "node:path";

export async function resolveSpringJavaSourceDir(sourceDir: string): Promise<string> {
  const normalized = normalize(sourceDir);
  const candidates = [
    ...(normalized.endsWith(join("src", "main", "java")) ? [sourceDir] : []),
    join(sourceDir, "src", "main", "java"),
    sourceDir
  ];

  for (const candidate of candidates) {
    if (await isDirectory(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Spring source directory not found. Checked: ${candidates.join(", ")}`);
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const pathStat = await stat(path);

    return pathStat.isDirectory();
  } catch {
    return false;
  }
}
