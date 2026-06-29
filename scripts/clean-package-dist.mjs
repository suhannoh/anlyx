import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = resolve(process.argv[2] ?? ".");

await rm(resolve(packageRoot, "dist"), { recursive: true, force: true });
await rm(resolve(packageRoot, "tsconfig.build.tsbuildinfo"), { force: true });
