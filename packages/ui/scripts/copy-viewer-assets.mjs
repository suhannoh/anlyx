import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const assets = [
  ["src/styles.css", "dist/styles.css"],
  ["src/viewer/viewer.html", "dist/viewer/viewer.html"]
];

for (const [from, to] of assets) {
  const destination = resolve(to);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(from), destination);
}
