/**
 * File: App.jsx
 *
 * Purpose:
 *   Define the top-level component for the admin portal and render the admin
 *   authentication interface as the initial view.
 *
 * Rationale:
 *   A single-entry component reduces routing complexity during UI stabilization and
 *   ensures that only the admin authentication page is exposed by this portal.
 */

import React from "react";
import AdminAuthPage from "./pages/AdminAuthPage";

export default function App() {
  return <AdminAuthPage />;
}
