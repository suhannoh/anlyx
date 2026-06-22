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
  triggeredBy?: OverlayAction | null;
  matchedEndpoint?: Endpoint | null;
  matchedFlow?: EndpointFlow | null;
  matchedPages?: PageStoryboard[];
};

export type FlowDrawerProps = {
  selectedEvent: OverlayApiEvent | null;
  events: OverlayApiEvent[];
  loadError?: string | null;
  runtimeBaseUrl?: string;
};
