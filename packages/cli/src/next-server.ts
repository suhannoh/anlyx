import type { FrontendServerRequestEvent } from "@anlyx/core";

export type AnlyxNextServerRuntimeOptions = {
  runtimeUrl?: string;
  backendBaseUrl?: string;
};

const DEFAULT_RUNTIME_URL = "http://localhost:4777";
const INSTALL_KEY = Symbol.for("anlyx.nextServerRuntimeInstalled");
const STATE_KEY = Symbol.for("anlyx.nextServerRuntimeState");
const WRAPPED_KEY = Symbol.for("anlyx.nextServerRuntimeWrappedFetch");

type FetchLike = typeof fetch;
type FetchInput = Parameters<FetchLike>[0];
type FetchState = {
  runtimeUrl: string;
  backendBaseUrl?: string;
  delegate: FetchLike;
  active: FetchLike;
  captureDepth: number;
};

export function installAnlyxNextServerRuntime(options: AnlyxNextServerRuntimeOptions = {}): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const globalWithInstallState = globalThis as typeof globalThis & {
    [INSTALL_KEY]?: boolean;
    [STATE_KEY]?: FetchState;
    fetch?: FetchLike;
  };

  if (typeof globalWithInstallState.fetch !== "function") {
    return;
  }

  const runtimeUrl = normalizeBaseUrl(
    options.runtimeUrl ?? process.env.ANLYX_RUNTIME_URL ?? DEFAULT_RUNTIME_URL
  );
  const backendBaseUrl = options.backendBaseUrl ?? process.env.ANLYX_BACKEND_BASE_URL;

  if (globalWithInstallState[INSTALL_KEY] && globalWithInstallState[STATE_KEY]) {
    globalWithInstallState[STATE_KEY]!.runtimeUrl = runtimeUrl;
    if (backendBaseUrl) {
      globalWithInstallState[STATE_KEY]!.backendBaseUrl = backendBaseUrl;
    } else {
      delete globalWithInstallState[STATE_KEY]!.backendBaseUrl;
    }
    return;
  }

  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const initialDelegate = globalWithInstallState.fetch.bind(globalThis);
  const state: FetchState = {
    runtimeUrl,
    ...(backendBaseUrl ? { backendBaseUrl } : {}),
    delegate: initialDelegate,
    active: initialDelegate,
    captureDepth: 0
  };

  state.active = createObservedFetch(state, initialDelegate);
  globalWithInstallState[STATE_KEY] = state;
  globalWithInstallState[INSTALL_KEY] = true;

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    enumerable: originalDescriptor?.enumerable ?? true,
    get() {
      return state.active;
    },
    set(nextFetch: FetchLike) {
      if (typeof nextFetch !== "function") {
        return;
      }

      if (isAnlyxWrappedFetch(nextFetch)) {
        state.active = nextFetch;
        return;
      }

      const delegate = nextFetch.bind(globalThis);
      state.delegate = delegate;
      state.active = createObservedFetch(state, delegate, nextFetch);
    }
  });
}

function createObservedFetch(
  state: FetchState,
  delegate: FetchLike,
  sourceFetch?: FetchLike
): FetchLike {
  const observedFetch = (async (input: FetchInput | URL, init?: RequestInit) => {
    if (state.captureDepth > 0) {
      return delegate(input, init);
    }

    const metadata = getRequestMetadata(input, init, state.backendBaseUrl, state.runtimeUrl);

    if (!metadata) {
      return delegate(input, init);
    }

    const startedAt = now();

    state.captureDepth += 1;
    try {
      const observedInit = withAnlyxRequestHeader(input, init, metadata.id);
      const response = await delegate(input, observedInit);
      void postFrontendServerRequest(delegate, state.runtimeUrl, {
        id: metadata.id,
        type: "frontend_server_request",
        runtime: "next",
        method: metadata.method,
        url: metadata.url,
        path: metadata.path,
        status: response.status,
        durationMs: elapsedSince(startedAt),
        observedAt: new Date().toISOString()
      });
      return response;
    } catch (error) {
      void postFrontendServerRequest(delegate, state.runtimeUrl, {
        id: metadata.id,
        type: "frontend_server_request",
        runtime: "next",
        method: metadata.method,
        url: metadata.url,
        path: metadata.path,
        durationMs: elapsedSince(startedAt),
        observedAt: new Date().toISOString()
      });
      throw error;
    } finally {
      state.captureDepth -= 1;
    }
  }) as FetchLike;

  Object.defineProperty(observedFetch, WRAPPED_KEY, {
    value: true,
    configurable: false
  });

  copyFetchMetadata(sourceFetch, observedFetch);
  return observedFetch;
}

function isAnlyxWrappedFetch(value: FetchLike): boolean {
  return Boolean((value as FetchLike & { [WRAPPED_KEY]?: boolean })[WRAPPED_KEY]);
}

function copyFetchMetadata(sourceFetch: FetchLike | undefined, targetFetch: FetchLike): void {
  if (!sourceFetch) {
    return;
  }

  for (const key of ["__nextPatched", "__nextGetStaticStore", "_nextOriginalFetch"] as const) {
    if (!(key in sourceFetch)) {
      continue;
    }

    Object.defineProperty(targetFetch, key, {
      value: (sourceFetch as FetchLike & Record<typeof key, unknown>)[key],
      configurable: true
    });
  }
}

type RequestMetadata = {
  id: string;
  method: string;
  url: string;
  path: string;
};

function getRequestMetadata(
  input: FetchInput | URL,
  init: RequestInit | undefined,
  backendBaseUrl: string | undefined,
  runtimeUrl: string
): RequestMetadata | undefined {
  const url = getRequestUrl(input);

  if (!url) {
    return undefined;
  }

  const parsed = parseUrl(url);

  if (!parsed || isRuntimeUrl(parsed, runtimeUrl) || !isApiRequest(parsed, backendBaseUrl)) {
    return undefined;
  }

  const method = getRequestMethod(input, init);
  const id = `next:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;

  return {
    id,
    method,
    url: parsed.href,
    path: `${parsed.pathname}${parsed.search}`
  };
}

function getRequestUrl(input: FetchInput | URL): string | undefined {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }

  return undefined;
}

function getRequestMethod(input: FetchInput | URL, init: RequestInit | undefined): string {
  const initMethod = init?.method;

  if (typeof initMethod === "string") {
    return initMethod.toUpperCase();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function withAnlyxRequestHeader(
  input: FetchInput | URL,
  init: RequestInit | undefined,
  requestId: string
): RequestInit {
  const headers = new Headers(init?.headers ?? getRequestHeaders(input));
  headers.set("X-Anlyx-Request-Id", requestId);

  return {
    ...init,
    headers
  };
}

function getRequestHeaders(input: FetchInput | URL): HeadersInit | undefined {
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.headers;
  }

  return undefined;
}

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url, "http://localhost");
  } catch {
    return undefined;
  }
}

function isApiRequest(url: URL, backendBaseUrl: string | undefined): boolean {
  if (url.pathname.startsWith("/api/")) {
    return true;
  }

  if (!backendBaseUrl) {
    return false;
  }

  try {
    return url.origin === new URL(backendBaseUrl).origin && url.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function isRuntimeUrl(url: URL, runtimeUrl: string): boolean {
  try {
    const runtime = new URL(runtimeUrl);
    return url.origin === runtime.origin && url.pathname.startsWith("/_anlyx/");
  } catch {
    return false;
  }
}

async function postFrontendServerRequest(
  fetchImpl: FetchLike,
  runtimeUrl: string,
  event: FrontendServerRequestEvent
): Promise<void> {
  try {
    await fetchImpl(`${runtimeUrl}/_anlyx/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event)
    });
  } catch {
    // Runtime reporting must never break the user's Next server render.
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function now(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function elapsedSince(startedAt: number): number {
  return Math.max(0, Math.round(now() - startedAt));
}
