// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installAnlyxCaptureRuntime } from "./capture-runtime.js";

type PostedRequest = {
  url: string;
  init: RequestInit | undefined;
};

const fixedNow = 1_735_689_600_000;

function createFetchMock(posts: PostedRequest[] = []) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);

    if (url.includes("/_anlyx/events")) {
      posts.push({ url, init });
      return new Response(null, { status: 204 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
      status: 201
    });
  });
}

function postedEvents(posts: PostedRequest[], type?: string) {
  const events = posts.map((post) => JSON.parse(String(post.init?.body)));
  return type ? events.filter((event) => event.type === type) : events;
}

function postedRequestEvent(posts: PostedRequest[], index = 0) {
  return postedEvents(posts, "request")[index];
}

function headersObject(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }

  return Object.fromEntries(new Headers(headers).entries());
}

describe("capture runtime", () => {
  const originalFetch = window.fetch;
  const originalXMLHttpRequest = window.XMLHttpRequest;
  const uninstallers: Array<() => void> = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
    delete window.__ANLYX_RUNTIME_BASE_URL__;
    delete window.__ANLYX_CAPTURE_INSTALLED__;
  });

  afterEach(() => {
    for (const uninstall of uninstallers.splice(0)) {
      uninstall();
    }

    window.fetch = originalFetch;
    window.XMLHttpRequest = originalXMLHttpRequest;
    delete window.__ANLYX_RUNTIME_BASE_URL__;
    delete window.__ANLYX_CAPTURE_INSTALLED__;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("posts a page_view event on install", async () => {
    const posts: PostedRequest[] = [];
    window.fetch = createFetchMock(posts) as typeof fetch;
    window.history.replaceState(null, "", "/benefits");

    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));
    await vi.runAllTimersAsync();

    expect(postedEvents(posts, "page_view")).toEqual([
      expect.objectContaining({
        type: "page_view",
        url: "http://localhost:3000/benefits",
        path: "/benefits",
        observedAt: "2025-01-01T00:00:00.000Z"
      })
    ]);
  });

  it("attaches click context to the next fetch event", async () => {
    const posts: PostedRequest[] = [];
    window.fetch = createFetchMock(posts) as typeof fetch;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    const button = document.createElement("button");
    button.id = "save-benefit";
    button.textContent = "Save benefit";
    document.body.append(button);
    button.click();

    await window.fetch("/api/public/benefits");
    await vi.runAllTimersAsync();

    expect(postedRequestEvent(posts)).toMatchObject({
      type: "request",
      method: "GET",
      path: "/api/public/benefits",
      status: 201,
      action: {
        label: "Save benefit",
        selector: "#save-benefit",
        text: "Save benefit",
        observedAt: "2025-01-01T00:00:00.000Z"
      }
    });
  });

  it("uses click context only for the first request after the action", async () => {
    const posts: PostedRequest[] = [];
    window.fetch = createFetchMock(posts) as typeof fetch;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    const button = document.createElement("button");
    button.textContent = "Save perk";
    document.body.append(button);
    button.click();

    await window.fetch("/api/account/saved-benefit", { method: "POST" });
    await window.fetch("/api/session/ping");
    await vi.runAllTimersAsync();

    expect(postedRequestEvent(posts, 0).action).toMatchObject({ label: "Save perk" });
    expect(postedRequestEvent(posts, 1).action).toBeUndefined();
  });

  it("keeps click context for the next API request when a Next.js RSC request happens first", async () => {
    const posts: PostedRequest[] = [];
    window.fetch = createFetchMock(posts) as typeof fetch;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    const link = document.createElement("a");
    link.textContent = "Open benefit";
    document.body.append(link);
    link.click();

    await window.fetch("/benefit/coffee?_rsc=abc123");
    await window.fetch("/api/public/benefits/123");
    await vi.runAllTimersAsync();

    expect(postedEvents(posts, "request")).toHaveLength(1);
    expect(postedRequestEvent(posts)).toMatchObject({
      path: "/api/public/benefits/123",
      action: {
        label: "Open benefit",
        text: "Open benefit"
      }
    });
  });

  it("does not consume click context for non-API browser requests", async () => {
    const posts: PostedRequest[] = [];
    window.fetch = createFetchMock(posts) as typeof fetch;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    const link = document.createElement("a");
    link.textContent = "Open page";
    document.body.append(link);
    link.click();

    await window.fetch("/benefit/coffee");
    await window.fetch("/api/public/benefits/123");
    await vi.runAllTimersAsync();

    expect(postedRequestEvent(posts, 0).action).toBeUndefined();
    expect(postedRequestEvent(posts, 1).action).toMatchObject({ label: "Open page" });
  });

  it("does not attach stale click context to later background requests", async () => {
    const posts: PostedRequest[] = [];
    let currentNow = fixedNow;
    window.fetch = createFetchMock(posts) as typeof fetch;
    uninstallers.push(
      installAnlyxCaptureRuntime({
        actionWindowMs: 250,
        now: () => currentNow
      })
    );

    const button = document.createElement("button");
    button.textContent = "Open detail";
    document.body.append(button);
    button.click();

    currentNow += 500;
    await window.fetch("/api/public/benefits/123");
    await vi.runAllTimersAsync();

    expect(postedRequestEvent(posts).action).toBeUndefined();
  });

  it("posts one fetch request event to /_anlyx/events and returns the original response", async () => {
    const posts: PostedRequest[] = [];
    window.fetch = createFetchMock(posts) as typeof fetch;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    const response = await window.fetch("/api/public/benefits");
    await vi.runAllTimersAsync();

    expect(response.status).toBe(201);
    expect(postedEvents(posts, "request")).toHaveLength(1);
    expect(posts[0]?.url).toBe("http://localhost:4777/_anlyx/events");
    expect(postedRequestEvent(posts)).toMatchObject({
      type: "request",
      method: "GET",
      url: "http://localhost:3000/api/public/benefits",
      path: "/api/public/benefits",
      status: 201,
      durationMs: 0,
      observedAt: "2025-01-01T00:00:00.000Z"
    });
  });

  it("adds the browser request id header to API fetch requests", async () => {
    const posts: PostedRequest[] = [];
    const apiCalls: PostedRequest[] = [];
    window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);

      if (url.includes("/_anlyx/events")) {
        posts.push({ url, init });
        return new Response(null, { status: 204 });
      }

      apiCalls.push({ url, init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    await window.fetch("/api/public/benefits", {
      headers: {
        accept: "application/json"
      }
    });
    await vi.runAllTimersAsync();

    const requestId = postedRequestEvent(posts).id;
    expect(headersObject(apiCalls[0]?.init?.headers)).toMatchObject({
      accept: "application/json",
      "x-anlyx-request-id": requestId
    });
  });

  it("does not add the browser request id header to non-API fetch requests", async () => {
    const posts: PostedRequest[] = [];
    const pageCalls: PostedRequest[] = [];
    window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);

      if (url.includes("/_anlyx/events")) {
        posts.push({ url, init });
        return new Response(null, { status: 204 });
      }

      pageCalls.push({ url, init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as typeof fetch;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    await window.fetch("/benefit/coffee");
    await vi.runAllTimersAsync();

    expect(postedEvents(posts, "request")).toHaveLength(1);
    expect(headersObject(pageCalls[0]?.init?.headers)).not.toHaveProperty("x-anlyx-request-id");
  });

  it("posts a fetch request event when the original request rejects and preserves the rejection", async () => {
    const posts: PostedRequest[] = [];
    const error = new Error("network down");
    window.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);

      if (url.includes("/_anlyx/events")) {
        posts.push({ url, init });
        return new Response(null, { status: 204 });
      }

      throw error;
    }) as typeof fetch;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    await expect(window.fetch("/api/public/benefits")).rejects.toThrow(error);
    await vi.runAllTimersAsync();

    expect(postedEvents(posts, "request")).toHaveLength(1);
    expect(postedRequestEvent(posts)).toMatchObject({
      type: "request",
      method: "GET",
      path: "/api/public/benefits",
      durationMs: 0,
      observedAt: "2025-01-01T00:00:00.000Z"
    });
    expect(postedRequestEvent(posts).status).toBeUndefined();
  });

  it("posts one XHR request event after loadend", async () => {
    const posts: PostedRequest[] = [];
    window.fetch = createFetchMock(posts) as typeof fetch;

    class FakeXMLHttpRequest extends EventTarget {
      method = "";
      requestUrl = "";
      status = 202;

      open(method: string, url: string | URL) {
        this.method = method;
        this.requestUrl = String(url);
      }

      send() {
        this.dispatchEvent(new Event("loadend"));
      }
    }

    window.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    const xhr = new window.XMLHttpRequest();
    xhr.open("POST", "/api/account/saved-benefit");
    xhr.send();
    await vi.runAllTimersAsync();

    expect(postedEvents(posts, "request")).toHaveLength(1);
    expect(postedRequestEvent(posts)).toMatchObject({
      type: "request",
      method: "POST",
      url: "http://localhost:3000/api/account/saved-benefit",
      path: "/api/account/saved-benefit",
      status: 202,
      durationMs: 0
    });
  });

  it("adds the browser request id header to API XHR requests", async () => {
    const posts: PostedRequest[] = [];
    window.fetch = createFetchMock(posts) as typeof fetch;
    const requestHeaders = new Map<string, string>();

    class FakeXMLHttpRequest extends EventTarget {
      method = "";
      requestUrl = "";
      status = 202;

      open(method: string, url: string | URL) {
        this.method = method;
        this.requestUrl = String(url);
      }

      setRequestHeader(name: string, value: string) {
        requestHeaders.set(name.toLowerCase(), value);
      }

      send() {
        this.dispatchEvent(new Event("loadend"));
      }
    }

    window.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof XMLHttpRequest;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    const xhr = new window.XMLHttpRequest();
    xhr.open("POST", "/api/account/saved-benefit");
    xhr.send();
    await vi.runAllTimersAsync();

    expect(requestHeaders.get("x-anlyx-request-id")).toBe(postedRequestEvent(posts).id);
  });

  it("ignores internal, Vite, static, favicon, and ingest paths", async () => {
    const posts: PostedRequest[] = [];
    window.fetch = createFetchMock(posts) as typeof fetch;
    uninstallers.push(installAnlyxCaptureRuntime({ now: () => fixedNow }));

    await window.fetch("/_anlyx/events", { method: "POST" });
    await window.fetch("/_anlyx/workspace");
    await window.fetch("/@vite/client");
    await window.fetch("/src/main.tsx?t=1");
    await window.fetch("/favicon.ico");
    await window.fetch("/benefit/coffee?_rsc=abc");
    await window.fetch("http://localhost:4777/_anlyx/events", { method: "POST" });
    await vi.runAllTimersAsync();

    expect(
      posts.filter((post) => String(post.init?.body ?? "").includes("browser-request:"))
    ).toHaveLength(0);
  });

  it("restores original globals on uninstall", () => {
    const originalWindowFetch = createFetchMock() as typeof fetch;
    const originalWindowXHR = window.XMLHttpRequest;
    window.fetch = originalWindowFetch;

    const uninstall = installAnlyxCaptureRuntime({ now: () => fixedNow });
    uninstallers.push(uninstall);

    expect(window.fetch).not.toBe(originalWindowFetch);
    expect(window.__ANLYX_CAPTURE_INSTALLED__).toBe(true);

    uninstall();

    expect(window.fetch).toBe(originalWindowFetch);
    expect(window.XMLHttpRequest).toBe(originalWindowXHR);
    expect(window.__ANLYX_CAPTURE_INSTALLED__).toBe(false);
  });

  it("auto-installs once from the capture entry and exposes uninstall", async () => {
    const originalWindowFetch = createFetchMock() as typeof fetch;
    window.fetch = originalWindowFetch;
    vi.resetModules();

    await import("./capture-entry.js");
    const installedFetch = window.fetch;

    expect(window.__ANLYX_CAPTURE_INSTALLED__).toBe(true);
    expect(typeof window.__ANLYX_CAPTURE_UNINSTALL__).toBe("function");

    await import("./capture-entry.js");
    expect(window.fetch).toBe(installedFetch);

    window.__ANLYX_CAPTURE_UNINSTALL__?.();

    expect(window.fetch).toBe(originalWindowFetch);
    expect(window.__ANLYX_CAPTURE_INSTALLED__).toBe(false);
  });
});
