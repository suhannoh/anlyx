import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));

export default {
  build: {
    cssCodeSplit: false,
    emptyOutDir: false,
    lib: {
      entry: resolve(packageRoot, "src/overlay/overlay-entry.tsx"),
      fileName: () => "overlay-ui.js",
      formats: ["iife"],
      name: "AnlyxOverlayUi"
    },
    outDir: "dist/overlay",
    rollupOptions: {
      output: {
        assetFileNames: "overlay-ui[extname]"
      }
    }
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production")
  }
};
