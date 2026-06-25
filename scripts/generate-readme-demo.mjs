import { access, readdir } from "node:fs/promises";
import http from "node:http";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const demoDir = resolve(rootDir, "apps/demo");
const requireFromCwd = createRequire(resolve(rootDir, "packages/capture/package.json"));
const { chromium } = requireFromCwd("playwright");

const port = 5179;
const demoUrl = `http://127.0.0.1:${port}/demo`;
const posterOutput = resolve(rootDir, "docs/assets/readme/anlyx-demo.png");
const findViteBin = async () => {
  const pnpmDir = resolve(rootDir, "node_modules/.pnpm");
  const entries = await readdir(pnpmDir);
  const viteEntry = entries.find((entry) => entry.startsWith("vite@"));
  if (!viteEntry) {
    throw new Error("Cannot find Vite under node_modules/.pnpm. Run corepack pnpm install first.");
  }
  return resolve(pnpmDir, viteEntry, "node_modules/vite/bin/vite.js");
};

const waitForServer = (url, timeoutMs = 10_000) =>
  new Promise((resolvePromise, reject) => {
    const startedAt = Date.now();
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolvePromise();
      });
      request.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        void delay(150).then(check);
      });
    };
    check();
  });

const vite = spawn(
  process.execPath,
  [await findViteBin(), "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    cwd: demoDir,
    stdio: ["ignore", "ignore", "inherit"]
  }
);

process.on("exit", () => {
  vite.kill();
});

const localChromeCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
];

const findLocalChrome = async () => {
  for (const executablePath of localChromeCandidates) {
    try {
      await access(executablePath);
      return executablePath;
    } catch {
      // Try the next common local browser path.
    }
  }
  return undefined;
};

await waitForServer(demoUrl);

const browser = await chromium.launch({
  headless: true,
  executablePath: await findLocalChrome()
});

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  await page.goto(demoUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".live-workspace");
  await page.waitForTimeout(500);
  await page.screenshot({
    path: posterOutput,
    fullPage: true
  });

  for (const selector of ['[data-anlyx-action="search"]', '[data-anlyx-action="save"]']) {
    await page.click(selector);
    await page.waitForSelector(".flow-event-card");
    await page.waitForTimeout(260);
  }

  await page.screenshot({
    path: posterOutput,
    fullPage: true
  });
} finally {
  await browser.close();
  vite.kill();
}

process.stdout.write(`Wrote ${posterOutput}\n`);
