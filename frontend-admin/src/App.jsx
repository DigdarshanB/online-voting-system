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
import { Routes, Route, Navigate } from "react-router-dom";
import AdminAuthPage from "./pages/AdminAuthPage";
import AdminTotpSetup from "./pages/AdminTotpSetup";

function DashboardPage() {
  return <div>Welcome, admin!</div>;
}

function RequireDashboardMfa({ children }) {
  const token = localStorage.getItem("access_token");
  const mfaOk = sessionStorage.getItem("admin_mfa_ok") === "1";

  if (!token) return <Navigate to="/" replace />;
  if (!mfaOk) return <Navigate to="/totp-setup" replace />;
  return children;
}

function RequireAuthForTotp({ children }) {
  const token = localStorage.getItem("access_token");
  const mfaOk = sessionStorage.getItem("admin_mfa_ok") === "1";

  if (!token) return <Navigate to="/" replace />;
  if (mfaOk) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminAuthPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireDashboardMfa>
            <DashboardPage />
          </RequireDashboardMfa>
        }
      />
      <Route
        path="/totp-setup"
        element={
          <RequireAuthForTotp>
            <AdminTotpSetup />
          </RequireAuthForTotp>
        }
      />
    </Routes>
  );
}
