import type { Endpoint, EndpointFlow, PageStoryboard } from "@anlyx/core";

export type OverlayAction = {
  id?: string;
  type?: string;
  label?: string;
  selector?: string;
};

export type OverlayApiEvent = {
  id: string;
  method: string;
  path: string;
  status: string | number;
  durationMs: number;
  count?: number;
  lastSeenAt?: number;
  source?: "action" | "background" | "health";
  triggeredBy?: OverlayAction | null;
  matchedEndpoint?: Endpoint | null;
  matchedFlow?: EndpointFlow | null;
  matchedPages?: PageStoryboard[];
};

export type OverlayScannedHint = {
  pageRoute: string;
  pageFilePath?: string;
  method: string;
  path: string;
  endpointId?: string;
  endpointLabel?: string;
  evidence: "scanned-page" | "capture";
};

export type FlowDrawerProps = {
  selectedEvent: OverlayApiEvent | null;
  events: OverlayApiEvent[];
  latestAction?: OverlayAction | null;
  scannedHints?: OverlayScannedHint[];
  loadError?: string | null;
  runtimeBaseUrl?: string;
};
