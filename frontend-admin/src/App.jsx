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
import { Routes, Route } from "react-router-dom";
import AdminAuthPage from "./pages/AdminAuthPage";

function DashboardPage() {
  return <div>Welcome, admin!</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminAuthPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}
