import { access, mkdir, readdir, rm } from "node:fs/promises";
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
const frameDir = resolve(rootDir, ".tmp/readme-demo-frames");
const output = resolve(rootDir, "docs/assets/readme/anlyx-demo.gif");
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

await rm(frameDir, { recursive: true, force: true });
await mkdir(frameDir, { recursive: true });

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

  let frame = 0;
  const capture = async (count) => {
    for (let i = 0; i < count; i += 1) {
      await page.screenshot({
        path: resolve(frameDir, `frame-${String(frame).padStart(3, "0")}.png`),
        fullPage: true
      });
      frame += 1;
      await page.waitForTimeout(130);
    }
  };

  await capture(8);

  for (const selector of [
    '[data-anlyx-action="search"]',
    '[data-anlyx-action="save"]',
    '[data-anlyx-action="admin"]'
  ]) {
    await page.click(selector);
    await page.waitForSelector(".flow-event-card");
    await page.waitForTimeout(260);
    await capture(10);
  }
} finally {
  await browser.close();
  vite.kill();
}

const ffmpegArgs = [
  "-y",
  "-framerate",
  "8",
  "-i",
  resolve(frameDir, "frame-%03d.png"),
  "-vf",
  "scale=1100:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3",
  "-loop",
  "0",
  output
];

await new Promise((resolvePromise, reject) => {
  const child = spawn("ffmpeg", ffmpegArgs, { stdio: "inherit" });
  child.on("exit", (code) => {
    if (code === 0) {
      resolvePromise();
      return;
    }
    reject(new Error(`ffmpeg exited with code ${code}`));
  });
});

process.stdout.write(`Wrote ${output}\n`);
process.stdout.write(`Wrote ${posterOutput}\n`);
