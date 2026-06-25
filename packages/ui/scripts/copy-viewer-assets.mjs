import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const assets = [
  ["src/styles.css", "dist/styles.css"],
  ["src/styles.css", "dist/viewer/styles.css"],
  ["src/workspace/workspace.css", "dist/workspace/workspace.css"],
  ["src/workspace/workspace.css", "dist/viewer/workspace/workspace.css"],
  [
    "../../docs/assets/brand/anlyx-logo-transparent.png",
    "dist/viewer/workspace/anlyx-logo-transparent.png"
  ],
  ["src/viewer/viewer.html", "dist/viewer/viewer.html"],
  ["src/viewer/docs.html", "dist/viewer/docs.html"]
];

for (const [from, to] of assets) {
  const destination = resolve(to);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(from), destination);
}
