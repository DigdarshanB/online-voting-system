import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * File: vite.config.js
 *
 * Purpose:
 *   Bind the admin portal dev server to a fixed port to ensure separation from the voter portal.
 *
 * Expected Outcome:
 *   The admin portal consistently runs on http://localhost:5174 during development.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
});
