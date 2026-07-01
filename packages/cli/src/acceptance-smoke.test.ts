import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseProjectData, type ProjectData } from "@anlyx/core";
import { describe, expect, it } from "vitest";

import { runCli } from "./index.js";

async function withTempDir<T>(callback: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "anlyx-acceptance-"));

  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("Project JSON acceptance smoke", () => {
  it("validates, imports, and serves Project JSON from the local viewer", async () => {
    await withTempDir(async (dir) => {
      const writes: string[] = [];
      await writeFile(
        join(dir, "source.project.json"),
        JSON.stringify(createAcceptanceProjectFile(), null, 2),
        "utf8"
      );

      const validateExitCode = await runCli(["validate", "source.project.json"], {
        cwd: dir,
        write: (message) => writes.push(message)
      });
      const importExitCode = await runCli(["import", "source.project.json"], {
        cwd: dir,
        write: (message) => writes.push(message)
      });

      expect(validateExitCode, writes.join("\n")).toBe(0);
      expect(importExitCode, writes.join("\n")).toBe(0);

      const projectDataPath = join(dir, "anlyx.project.json");
      const projectData = parseProjectData(
        JSON.parse(await readFile(projectDataPath, "utf8")) as unknown
      );

      expect(projectData.project.name).toBe("Anlyx Project Acceptance");
      expect(projectData.pages.map((page) => page.path)).toEqual(["/orders"]);
      expect(projectData.requests.map((request) => request.path)).toEqual(["/api/orders"]);
      expect(projectData.flows[0]?.layerIds).toEqual(["layer.api.orders", "layer.service.orders"]);

      const devPorts: number[] = [];
      const devExitCode = await runCli(["dev", "--no-open", "--port", "4777"], {
        cwd: dir,
        write: (message) => writes.push(message),
        dependencies: {
          async createLocalUiServer({ port }) {
            devPorts.push(port);
            return { url: `http://localhost:${port}` };
          },
          async openBrowser() {
            throw new Error("Browser must not open during acceptance smoke.");
          }
        }
      });

      expect(devExitCode).toBe(0);
      expect(devPorts).toEqual([4777]);
      expect(writes.join("\n")).toContain("Valid Project JSON: source.project.json");
      expect(writes.join("\n")).toContain("Imported Project JSON:");
      expect(writes.join("\n")).toContain("Started Anlyx UI at http://localhost:4777");
    });
  });
});

function createAcceptanceProjectFile(): ProjectData {
  return {
    schemaVersion: "0.2.0",
    project: {
      id: "project.acceptance",
      name: "Anlyx Project Acceptance",
      analyzedAt: "2026-06-26T01:02:03.000Z",
      frameworkNotes: [],
      generatedBy: {
        kind: "agent",
        name: "Codex"
      }
    },
    areas: [
      {
        id: "area.public",
        name: "Public",
        order: 1,
        evidenceIds: []
      }
    ],
    pages: [
      {
        id: "page.orders",
        path: "/orders",
        title: "Orders",
        areaId: "area.public",
        description: "Shows an order list backed by a source-matched API flow.",
        featureIds: ["feature.orders"],
        evidenceIds: ["ev.orders.source"],
        confidence: "high"
      }
    ],
    features: [
      {
        id: "feature.orders",
        pageId: "page.orders",
        name: "Order list",
        requestIds: ["request.orders"],
        requests: [],
        evidenceIds: ["ev.orders.source"],
        confidence: "high"
      }
    ],
    requests: [
      {
        id: "request.orders",
        method: "GET",
        path: "/api/orders",
        role: "primary",
        purpose: "data-load",
        flowId: "flow.orders",
        evidenceIds: ["ev.orders.source"],
        confidence: "high"
      }
    ],
    flows: [
      {
        id: "flow.orders",
        requestId: "request.orders",
        name: "Order list flow",
        layerIds: ["layer.api.orders", "layer.service.orders"],
        layers: [
          {
            id: "layer.api.orders",
            kind: "api",
            label: "GET /api/orders",
            status: "source-matched",
            evidenceIds: ["ev.orders.source"],
            confidence: "high"
          },
          {
            id: "layer.service.orders",
            kind: "service",
            label: "OrderService.list",
            status: "agent-inferred",
            evidenceIds: [],
            confidence: "medium"
          }
        ],
        evidenceIds: ["ev.orders.source"],
        confidence: "high"
      }
    ],
    architecture: {
      nodes: [
        {
          id: "node.api.orders",
          kind: "api",
          label: "GET /api/orders",
          evidenceIds: ["ev.orders.source"],
          confidence: "high"
        },
        {
          id: "node.service.orders",
          kind: "service",
          label: "OrderService.list",
          evidenceIds: [],
          confidence: "medium"
        }
      ],
      edges: [
        {
          id: "edge.orders",
          source: "node.api.orders",
          target: "node.service.orders",
          role: "primary",
          evidenceIds: ["ev.orders.source"],
          confidence: "medium"
        }
      ]
    },
    evidence: [
      {
        id: "ev.orders.source",
        status: "source-matched",
        label: "Orders route source",
        targetIds: ["request.orders", "layer.api.orders", "node.api.orders"],
        confidence: "high"
      }
    ],
    measurements: [],
    dictionary: {
      defaultLanguage: "en",
      terms: []
    },
    overview: {
      actors: [],
      coreEntities: [],
      mainAreas: [],
      implementation: [],
      suggestedReadingPath: [],
      evidenceIds: []
    },
    capabilities: [],
    dataLifecycles: [],
    impactMaps: []
  };
}
