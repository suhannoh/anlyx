import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import type { ApiCall, PageStoryboard, ScreenshotSegment, Viewport } from "@anlyx/core";

import {
  calculateScreenshotSegments,
  dedupeApiCalls,
  normalizeApiCall,
  resolvePageRouteToUrl
} from "./route-resolver.js";

export type CaptureAdapterOptions = {
  baseUrl: string;
  outputDir?: string;
  viewport?: {
    width?: number;
    height?: number;
  };
  capture?: {
    mode?: "segments";
    segmentHeight?: number;
    storageState?: string;
    timeoutMs?: number;
  };
  sampleParams?: Record<string, Record<string, string>>;
};

export type CaptureAdapter = {
  name: string;
  capturePages(pages: PageStoryboard[]): Promise<PageStoryboard[]>;
};

export type CaptureDriver = {
  capturePage(options: CaptureDriverPageOptions): Promise<CaptureDriverPageResult>;
};

export type CaptureDriverPageOptions = {
  page: PageStoryboard;
  url: string;
  outputDir: string;
  viewport: Viewport;
  segmentHeight: number;
  timeoutMs?: number;
  storageState?: string;
};

export type CaptureDriverPageResult = {
  screenshots: ScreenshotSegment[];
  apiCalls: ApiCall[];
};

const DEFAULT_OUTPUT_DIR = ".anlyx/screenshots";
const DEFAULT_VIEWPORT: Viewport = { width: 1440, height: 900 };

export async function capturePages(
  pages: PageStoryboard[],
  options: CaptureAdapterOptions,
  driver: CaptureDriver = createPlaywrightCaptureDriver()
): Promise<PageStoryboard[]> {
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
  const viewport = normalizeViewport(options.viewport);
  const segmentHeight = options.capture?.segmentHeight ?? viewport.height;
  const timeoutMs = options.capture?.timeoutMs;
  const storageState = options.capture?.storageState;
  const capturedPages: PageStoryboard[] = [];

  for (const page of pages) {
    const resolved = resolvePageRouteToUrl({
      baseUrl: options.baseUrl,
      route: page.route,
      ...(options.sampleParams ? { sampleParams: options.sampleParams } : {})
    });

    if (!resolved.ok) {
      capturedPages.push({
        ...page,
        screenshots: [],
        apiCalls: [],
        captureStatus: "pending",
        errorMessage: resolved.reason
      });
      continue;
    }

    try {
      const driverResult = await driver.capturePage({
        page,
        url: resolved.url,
        outputDir,
        viewport,
        segmentHeight,
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        ...(storageState !== undefined ? { storageState } : {})
      });

      capturedPages.push({
        ...page,
        screenshots: driverResult.screenshots,
        apiCalls: dedupeApiCalls(driverResult.apiCalls),
        captureStatus: "success"
      });
    } catch (error) {
      capturedPages.push({
        ...page,
        screenshots: [],
        apiCalls: [],
        captureStatus: "failed",
        errorMessage: error instanceof Error ? error.message : "Capture failed"
      });
    }
  }

  return capturedPages;
}

export function createCaptureAdapter(
  options: CaptureAdapterOptions,
  driver?: CaptureDriver
): CaptureAdapter {
  return {
    name: "capture",
    async capturePages(pages: PageStoryboard[]) {
      return capturePages(pages, options, driver);
    }
  };
}

export function createPlaywrightCaptureDriver(): CaptureDriver {
  return {
    async capturePage(options) {
      const { chromium } = await import("playwright");
      const browser = await chromium.launch({ headless: true });
      const apiCalls: ApiCall[] = [];

      try {
        const contextOptions = {
          viewport: options.viewport,
          ...(options.storageState !== undefined ? { storageState: options.storageState } : {})
        };
        const context = await browser.newContext(contextOptions);
        const page = await context.newPage();

        page.on("response", (response) => {
          const request = response.request();
          const apiCall = normalizeApiCall({
            method: request.method(),
            url: request.url(),
            resourceType: request.resourceType(),
            status: response.status()
          });

          if (apiCall) {
            apiCalls.push(apiCall);
          }
        });

        await page.goto(options.url, {
          waitUntil: "networkidle",
          ...(options.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {})
        });

        const scrollHeight = await page.evaluate(() =>
          Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
        );
        const screenshots = calculateScreenshotSegments({
          pageId: options.page.id,
          outputDir: options.outputDir,
          scrollHeight,
          segmentHeight: options.segmentHeight,
          viewport: options.viewport
        });

        for (const screenshot of screenshots) {
          const screenshotPath = screenshot.path;

          if (!screenshotPath) {
            continue;
          }

          await mkdir(dirname(screenshotPath), { recursive: true });

          await page.evaluate((scrollY) => window.scrollTo(0, scrollY), screenshot.scrollY);
          await page.screenshot({
            path: screenshotPath,
            fullPage: false
          });
        }

        await context.close();

        return {
          screenshots,
          apiCalls: dedupeApiCalls(apiCalls)
        };
      } finally {
        await browser.close();
      }
    }
  };
}

function normalizeViewport(viewport: CaptureAdapterOptions["viewport"]): Viewport {
  return {
    width: viewport?.width ?? DEFAULT_VIEWPORT.width,
    height: viewport?.height ?? DEFAULT_VIEWPORT.height
  };
}
