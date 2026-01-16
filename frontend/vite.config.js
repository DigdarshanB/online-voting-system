import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * File: vite.config.js
 *
 * Purpose:
 *   Bind the voter portal dev server to a fixed port to prevent accidental port drift.
 *
 * Expected Outcome:
 *   The voter portal consistently runs on http://localhost:5173 during development.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
