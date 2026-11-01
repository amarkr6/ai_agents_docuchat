/**
 * FILE: vite.config.ts
 * PURPOSE: Vite dev-server + build configuration.
 *
 * The "proxy" forwards every /api request from the React dev server
 * (http://localhost:5173) to the Express backend (http://localhost:5000).
 * So in development the browser thinks both are the same origin -> no CORS issues.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
