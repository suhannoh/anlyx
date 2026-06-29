import { installAnlyxCaptureRuntime } from "@anlyx/ui/capture-runtime";

const INGEST_PATH = "/__anlyx/events";
const STREAM_PATH = "/__anlyx/events/stream";

export function installAnlyxDemoRuntime(): () => void {
  return installAnlyxCaptureRuntime({
    ingestPath: INGEST_PATH,
    runtimeBaseUrl: window.location.origin
  });
}

export function createAnlyxEventSource(): EventSource {
  return new EventSource(STREAM_PATH);
}
