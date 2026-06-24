import { resolve } from "node:path";

const packageRoot = process.cwd();

export default {
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  },
  esbuild: {
    jsxDev: false
  },
  build: {
    cssCodeSplit: false,
    emptyOutDir: false,
    lib: {
      entry: resolve(packageRoot, "src/capture/capture-entry.ts"),
      fileName: () => "capture.js",
      formats: ["iife"],
      name: "AnlyxCaptureRuntime"
    },
    outDir: "dist/overlay"
  }
};
