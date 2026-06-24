import { defineConfig } from "vite";

import { buildFlowRecordForCapture, matchDemoScenario, normalizePath } from "./src/anlyxDemoFlow";

import type { DemoCaptureEvent, DemoLiveEvent } from "./src/anlyxDemoFlow";
import type { BrowserRequestEvent } from "@anlyx/core";
import type { Connect } from "vite";
import type { ServerResponse } from "node:http";

const base = process.env.ANLYX_DEMO_BASE ?? (process.env.GITHUB_ACTIONS ? "/anlyx/" : "/");

export default defineConfig({
  base,
  plugins: [anlyxDemoServer()]
});

function anlyxDemoServer() {
  const clients = new Set<ServerResponse>();
  const recentEvents: DemoLiveEvent[] = [];

  return {
    name: "anlyx-demo-live-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
        const pathname = requestUrl.pathname;

        if (pathname === "/__anlyx/events/stream") {
          res.writeHead(200, {
            "content-type": "text/event-stream",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "access-control-allow-origin": "*"
          });
          res.write("\n");
          clients.add(res);

          for (const event of recentEvents) {
            writeSse(res, event);
          }

          req.on("close", () => clients.delete(res));
          return;
        }

        if (pathname === "/__anlyx/events" && req.method === "POST") {
          const browserEvent = await readJsonBody<BrowserRequestEvent>(req);
          const capture = browserRequestToDemoCapture(browserEvent);
          const liveEvent = toLiveEvent(capture);
          recentEvents.unshift(liveEvent);
          recentEvents.splice(20);

          for (const client of clients) {
            writeSse(client, liveEvent);
          }

          sendJson(res, 202, { ok: true, event: liveEvent });
          return;
        }

        if (pathname.startsWith("/api/")) {
          const scenario = matchDemoScenario(req.method ?? "GET", pathname);

          if (!scenario) {
            sendJson(res, 404, {
              error: "NOT_FOUND",
              message: `No Anlyx demo fixture for ${req.method ?? "GET"} ${pathname}`
            });
            return;
          }

          const body =
            scenario.key === "search"
              ? {
                  ...scenario.responseBody,
                  query: requestUrl.searchParams.get("query") ?? "coffee"
                }
              : scenario.responseBody;

          await delay(Math.min(80, Math.max(16, Math.round(scenario.totalDurationMs / 12))));
          sendJson(res, scenario.statusCode, body);
          return;
        }

        next();
      });
    }
  } satisfies import("vite").Plugin;
}

function browserRequestToDemoCapture(event: BrowserRequestEvent): DemoCaptureEvent {
  const endedAt = Date.parse(event.observedAt);
  const durationMs = event.durationMs ?? 0;
  const actionObservedAt = event.action?.observedAt
    ? Date.parse(event.action.observedAt)
    : endedAt - durationMs;

  return {
    id: event.id,
    method: event.method,
    path: normalizePath(event.path ?? event.url),
    status: event.status ?? 0,
    durationMs,
    startedAt: endedAt - durationMs,
    endedAt,
    ...(event.action
      ? {
          action: {
            label: event.action.label,
            timestamp: Number.isFinite(actionObservedAt) ? actionObservedAt : endedAt - durationMs,
            ...(event.action.selector ? { selector: event.action.selector } : {}),
            ...(event.action.text ? { text: event.action.text } : {})
          }
        }
      : {})
  };
}

function toLiveEvent(capture: DemoCaptureEvent): DemoLiveEvent {
  const scenario = matchDemoScenario(capture.method, normalizePath(capture.path));

  return {
    ...capture,
    scenarioKey: scenario?.key ?? "unknown",
    receivedAt: Date.now(),
    flow: buildFlowRecordForCapture(capture)
  };
}

function writeSse(res: ServerResponse, event: DemoLiveEvent): void {
  res.write(`event: flow\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function readJsonBody<T>(req: Connect.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}") as T);
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
