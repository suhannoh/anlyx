import { afterEach, describe, expect, it, vi } from "vitest";

import { installAnlyxNextServerRuntime } from "./next-server.js";

const installKey = Symbol.for("anlyx.nextServerRuntimeInstalled");
const stateKey = Symbol.for("anlyx.nextServerRuntimeState");
const originalFetch = globalThis.fetch;
const originalFetchDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
const originalNodeEnv = process.env.NODE_ENV;

describe("installAnlyxNextServerRuntime", () => {
  afterEach(() => {
    if (originalFetchDescriptor) {
      Object.defineProperty(globalThis, "fetch", originalFetchDescriptor);
    } else {
      (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch;
    }
    delete (globalThis as typeof globalThis & { [installKey]?: boolean })[installKey];
    delete (globalThis as typeof globalThis & { [stateKey]?: unknown })[stateKey];
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it("reports Next server fetch status and duration to the Anlyx runtime", async () => {
    process.env.NODE_ENV = "development";
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      calls.push({ url: String(input), init });

      return new Response(null, {
        status: String(input).includes("/_anlyx/events") ? 202 : 200
      });
    });
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    installAnlyxNextServerRuntime({
      runtimeUrl: "http://localhost:4777",
      backendBaseUrl: "http://localhost:8080"
    });

    await fetch("http://localhost:8080/api/public/home");
    await vi.waitFor(() => {
      expect(calls.some((call) => call.url === "http://localhost:4777/_anlyx/events")).toBe(true);
    });

    const reportCall = calls.find((call) => call.url === "http://localhost:4777/_anlyx/events");
    const body = JSON.parse(String(reportCall?.init?.body));

    expect(body).toMatchObject({
      type: "frontend_server_request",
      runtime: "next",
      method: "GET",
      url: "http://localhost:8080/api/public/home",
      path: "/api/public/home",
      status: 200
    });
    expect(body.durationMs).toEqual(expect.any(Number));
    expect(calls[0]?.init?.headers).toBeInstanceOf(Headers);
    expect((calls[0]?.init?.headers as Headers).get("X-Anlyx-Request-Id")).toBe(body.id);
  });

  it("does not report Anlyx runtime posts back to itself", async () => {
    process.env.NODE_ENV = "development";
    const calls: string[] = [];
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      calls.push(String(input));
      return new Response(null, { status: 202 });
    });
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    installAnlyxNextServerRuntime({ runtimeUrl: "http://localhost:4777" });

    await fetch("http://localhost:4777/_anlyx/events", { method: "POST" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toEqual(["http://localhost:4777/_anlyx/events"]);
  });

  it("keeps reporting after Next replaces global fetch", async () => {
    process.env.NODE_ENV = "development";
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response(null, {
        status: String(input).includes("/_anlyx/events") ? 202 : 200
      });
    });
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    installAnlyxNextServerRuntime({
      runtimeUrl: "http://localhost:4777",
      backendBaseUrl: "http://localhost:8080"
    });

    const nextPatchedFetch = Object.assign(
      vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
        fetchMock(input, init)
      ),
      { __nextPatched: true }
    ) as typeof fetch & { __nextPatched: boolean };

    globalThis.fetch = nextPatchedFetch;
    await fetch("http://localhost:8080/api/public/home");

    await vi.waitFor(() => {
      expect(calls.some((call) => call.url === "http://localhost:4777/_anlyx/events")).toBe(true);
    });

    const reportCall = calls.find((call) => call.url === "http://localhost:4777/_anlyx/events");
    const body = JSON.parse(String(reportCall?.init?.body));

    expect(nextPatchedFetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/public/home",
      expect.objectContaining({
        headers: expect.any(Headers)
      })
    );
    expect(body).toMatchObject({
      type: "frontend_server_request",
      method: "GET",
      path: "/api/public/home",
      status: 200
    });
    expect((calls[0]?.init?.headers as Headers).get("X-Anlyx-Request-Id")).toBe(body.id);
    expect((globalThis.fetch as typeof fetch & { __nextPatched?: boolean }).__nextPatched).toBe(
      true
    );
  });
});
