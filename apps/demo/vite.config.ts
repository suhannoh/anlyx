import { defineConfig } from "vite";

const base = process.env.ANLYX_DEMO_BASE ?? (process.env.GITHUB_ACTIONS ? "/anlyx/" : "/");

export default defineConfig({
  base
});
