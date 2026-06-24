import { installAnlyxCaptureRuntime } from "./capture-runtime.js";

declare global {
  interface Window {
    __ANLYX_CAPTURE_UNINSTALL__?: () => void;
  }
}

if (!window.__ANLYX_CAPTURE_INSTALLED__) {
  window.__ANLYX_CAPTURE_UNINSTALL__ = installAnlyxCaptureRuntime();
}
