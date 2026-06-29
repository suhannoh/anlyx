import type { BrowserActionEvent, BrowserPageViewEvent, BrowserRequestEvent } from "@anlyx/core";

export type CaptureRuntimeOptions = {
  runtimeBaseUrl?: string;
  ingestPath?: string;
  actionWindowMs?: number;
  now?: () => number;
  fetchImpl?: typeof fetch;
};

declare global {
  interface Window {
    __ANLYX_CAPTURE_INSTALLED__?: boolean;
    __ANLYX_RUNTIME_BASE_URL__?: string;
  }
}

type RequestMetadata = {
  id: string;
  method: string;
  url: string;
  startedAt: number;
};

type CapturedAction = BrowserActionEvent & {
  capturedAt: number;
};

const DEFAULT_RUNTIME_BASE_URL = "http://localhost:4777";
const DEFAULT_INGEST_PATH = "/_anlyx/events";
const DEFAULT_ACTION_WINDOW_MS = 2_000;

let eventSequence = 0;

export function installAnlyxCaptureRuntime(options: CaptureRuntimeOptions = {}): () => void {
  const runtimeBaseUrl =
    options.runtimeBaseUrl ?? window.__ANLYX_RUNTIME_BASE_URL__ ?? DEFAULT_RUNTIME_BASE_URL;
  const ingestPath = options.ingestPath ?? DEFAULT_INGEST_PATH;
  const actionWindowMs = options.actionWindowMs ?? DEFAULT_ACTION_WINDOW_MS;
  const now = options.now ?? Date.now;
  const ingestUrl = new URL(ingestPath, runtimeBaseUrl).toString();
  const originalFetch = options.fetchImpl ?? window.fetch;
  const originalWindowFetch = window.fetch;
  const originalOpen = window.XMLHttpRequest?.prototype.open;
  const originalSend = window.XMLHttpRequest?.prototype.send;
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  const xhrMetadata = new WeakMap<XMLHttpRequest, RequestMetadata>();
  let latestAction: CapturedAction | undefined;
  let latestPagePath = "";

  function observeClick(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target : null;

    if (!target) {
      return;
    }

    const text = readableText(target);
    latestAction = {
      label: readableLabel(target, text),
      selector: selectorFor(target),
      observedAt: observedAt(now),
      capturedAt: now()
    };

    if (text) {
      latestAction.text = text;
    }
  }

  function postEvent(event: BrowserRequestEvent | BrowserPageViewEvent) {
    if (!originalFetch) {
      return;
    }

    void originalFetch(ingestUrl, {
      body: JSON.stringify(event),
      headers: { "content-type": "application/json" },
      keepalive: true,
      method: "POST"
    }).catch(() => {});
  }

  function observePageView() {
    const normalized = normalizeUrl(window.location.href);

    if (shouldIgnorePagePath(normalized.path) || normalized.path === latestPagePath) {
      return;
    }

    latestPagePath = normalized.path;
    postEvent({
      id: `page-view:${now()}:${++eventSequence}`,
      type: "page_view",
      url: normalized.href,
      path: normalized.path,
      title: document.title,
      observedAt: observedAt(now)
    });
  }

  function buildEvent(metadata: RequestMetadata, status?: number): BrowserRequestEvent | undefined {
    const normalized = normalizeUrl(metadata.url);

    if (shouldIgnoreUrl(normalized, ingestUrl, ingestPath)) {
      return undefined;
    }

    const event: BrowserRequestEvent = {
      id: metadata.id,
      type: "request",
      method: metadata.method.toUpperCase(),
      url: normalized.href,
      path: normalized.path,
      durationMs: Math.max(0, now() - metadata.startedAt),
      observedAt: observedAt(now)
    };

    if (status !== undefined) {
      event.status = status;
    }

    const action = consumeFreshAction(metadata.startedAt, normalized);

    if (action) {
      event.action = action;
    }

    return event;
  }

  function consumeFreshAction(
    startedAt: number,
    normalized: ReturnType<typeof normalizeUrl>
  ): BrowserActionEvent | undefined {
    if (!latestAction) {
      return undefined;
    }

    if (!isActionRequestTarget(normalized)) {
      return undefined;
    }

    const { capturedAt, ...action } = latestAction;

    if (startedAt - capturedAt > actionWindowMs) {
      latestAction = undefined;
      return undefined;
    }

    latestAction = undefined;
    return action;
  }

  function wrappedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const metadata = metadataFromFetchInput(input, init, now);
    const normalized = normalizeUrl(metadata.url);
    const requestInit = isActionRequestTarget(normalized)
      ? withAnlyxRequestHeader(init, metadata.id)
      : init;

    return originalFetch(input, requestInit)
      .then((response) => {
        const event = buildEvent(metadata, response.status);
        if (event) {
          postEvent(event);
        }

        return response;
      })
      .catch((error: unknown) => {
        const event = buildEvent(metadata);
        if (event) {
          postEvent(event);
        }

        throw error;
      });
  }

  function wrappedOpen(
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    xhrMetadata.set(this, {
      id: nextRequestId(now),
      method,
      url: String(url),
      startedAt: 0
    });

    return originalOpen.call(this, method, url, async ?? true, username, password);
  }

  function wrappedSend(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    const metadata = xhrMetadata.get(this);

    if (metadata) {
      metadata.startedAt = now();
      const normalized = normalizeUrl(metadata.url);

      if (isActionRequestTarget(normalized)) {
        try {
          this.setRequestHeader("X-Anlyx-Request-Id", metadata.id);
        } catch {
          // Some XHR states or environments can reject late header writes. Capture still continues.
        }
      }

      this.addEventListener(
        "loadend",
        () => {
          const event = buildEvent(metadata, this.status);
          if (event) {
            postEvent(event);
          }
        },
        { once: true }
      );
    }

    return originalSend.call(this, body);
  }

  function wrappedPushState(
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null
  ) {
    const result = originalPushState.call(this, data, unused, url);
    queuePageView();
    return result;
  }

  function wrappedReplaceState(
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null
  ) {
    const result = originalReplaceState.call(this, data, unused, url);
    queuePageView();
    return result;
  }

  function queuePageView() {
    window.setTimeout(observePageView, 0);
  }

  document.addEventListener("click", observeClick, true);
  window.addEventListener("popstate", queuePageView);
  window.fetch = wrappedFetch as typeof fetch;
  window.history.pushState = wrappedPushState as typeof window.history.pushState;
  window.history.replaceState = wrappedReplaceState as typeof window.history.replaceState;

  window.XMLHttpRequest.prototype.open = wrappedOpen as typeof XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.send = wrappedSend as typeof XMLHttpRequest.prototype.send;

  window.__ANLYX_CAPTURE_INSTALLED__ = true;
  queuePageView();

  return () => {
    document.removeEventListener("click", observeClick, true);
    window.removeEventListener("popstate", queuePageView);
    window.fetch = originalWindowFetch;
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;

    window.XMLHttpRequest.prototype.open = originalOpen;
    window.XMLHttpRequest.prototype.send = originalSend;

    window.__ANLYX_CAPTURE_INSTALLED__ = false;
  };
}

function metadataFromFetchInput(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  now: () => number
): RequestMetadata {
  if (input instanceof Request) {
    return {
      id: nextRequestId(now),
      method: init?.method ?? input.method ?? "GET",
      url: input.url,
      startedAt: now()
    };
  }

  return {
    id: nextRequestId(now),
    method: init?.method ?? "GET",
    url: String(input),
    startedAt: now()
  };
}

function nextRequestId(now: () => number): string {
  return `browser-request:${now()}:${++eventSequence}`;
}

function withAnlyxRequestHeader(init: RequestInit | undefined, requestId: string): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set("X-Anlyx-Request-Id", requestId);

  return {
    ...init,
    headers
  };
}

function normalizeUrl(urlOrPath: string) {
  const url = new URL(urlOrPath, window.location.href);

  return {
    href: url.toString(),
    path: `${url.pathname}${url.search}`
  };
}

function shouldIgnoreUrl(
  normalized: ReturnType<typeof normalizeUrl>,
  ingestUrl: string,
  ingestPath: string
) {
  if (normalized.href === ingestUrl || normalized.path === ingestPath) {
    return true;
  }

  if (normalized.path.includes("/_anlyx")) {
    return true;
  }

  if (
    normalized.path.startsWith("/@vite") ||
    normalized.path.startsWith("/@react-refresh") ||
    normalized.path.startsWith("/__vite") ||
    normalized.path.startsWith("/node_modules/")
  ) {
    return true;
  }

  if (normalized.path === "/favicon.ico") {
    return true;
  }

  if (new URL(normalized.href).searchParams.has("_rsc")) {
    return true;
  }

  return /\.(?:avif|css|eot|gif|ico|jpe?g|js|map|mjs|png|svg|ts|tsx|ttf|webp|woff2?)($|\?)/i.test(
    normalized.path
  );
}

function shouldIgnorePagePath(path: string) {
  return (
    path.includes("/_anlyx") ||
    path.startsWith("/@vite") ||
    path.startsWith("/@react-refresh") ||
    path.startsWith("/__vite") ||
    path.startsWith("/node_modules/") ||
    /\.(?:avif|css|eot|gif|ico|jpe?g|js|map|mjs|png|svg|ts|tsx|ttf|webp|woff2?)($|\?)/i.test(path)
  );
}

function isActionRequestTarget(normalized: ReturnType<typeof normalizeUrl>) {
  return normalized.path.startsWith("/api/");
}

function observedAt(now: () => number) {
  return new Date(now()).toISOString();
}

function readableText(element: Element) {
  return element.textContent?.replace(/\s+/g, " ").trim() || undefined;
}

function readableLabel(element: Element, text?: string) {
  return (
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.getAttribute("alt") ||
    valueFor(element) ||
    text ||
    element.tagName.toLowerCase()
  );
}

function valueFor(element: Element) {
  if (element instanceof HTMLInputElement || element instanceof HTMLButtonElement) {
    return element.value || undefined;
  }

  return undefined;
}

function selectorFor(element: Element) {
  const id = element.getAttribute("id");
  if (id) {
    return `#${cssIdentifierEscape(id)}`;
  }

  const testId = element.getAttribute("data-testid");
  if (testId) {
    return `[data-testid="${cssStringEscape(testId)}"]`;
  }

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body && parts.length < 4) {
    const tagName = current.tagName.toLowerCase();
    const className = Array.from(current.classList)
      .slice(0, 2)
      .map((name) => `.${cssIdentifierEscape(name)}`);
    parts.unshift(`${tagName}${className.join("")}`);
    current = current.parentElement;
  }

  return parts.length > 0 ? parts.join(" > ") : element.tagName.toLowerCase();
}

function cssStringEscape(value: string) {
  return value.replace(/["\\]/g, "\\$&");
}

function cssIdentifierEscape(value: string) {
  return globalThis.CSS?.escape
    ? globalThis.CSS.escape(value)
    : value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
