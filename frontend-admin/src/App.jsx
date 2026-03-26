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
import { Routes, Route, Navigate, Link } from "react-router-dom";
import AdminAuthPage from "./pages/AdminAuthPage";
import AdminTotpSetup from "./pages/AdminTotpSetup";
import SuperAdminInvitesPage from "./pages/SuperAdminInvitesPage";
import ManageAdmins from "./pages/ManageAdmins";
import ManageVoters from "./pages/ManageVoters";
import ManageVotersDashboard from "./pages/ManageVotersDashboard";
import ActivateInvitePage from "./pages/ActivateInvitePage";
import AdminEmailVerification from "./pages/AdminEmailVerification";
import AdminForgotPassword from "./pages/AdminForgotPassword";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminChangePassword from "./pages/AdminChangePassword";
import AdminTotpRecovery from "./pages/AdminTotpRecovery";
import ManageElections from "./pages/ManageElections";
import ManageCandidates from "./pages/ManageCandidates";
import PendingApprovalPage from "./pages/PendingApprovalPage";

function DashboardPage() {
  return (
    <div style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 16 }}>Welcome, admin!</h1>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/superadmin/manage-admins" style={{ color: "#1e56c7", fontWeight: 700 }}>
          Manage Admins
        </Link>
        <Link to="/admin/voter-verifications" style={{ color: "#1e56c7", fontWeight: 700 }}>
          Voter Verifications
        </Link>
        <Link to="/admin/manage-voters" style={{ color: "#1e56c7", fontWeight: 700 }}>
          Manage Voters
        </Link>
        <Link to="/admin/elections" style={{ color: "#1e56c7", fontWeight: 700 }}>
          Manage Elections
        </Link>
        <Link to="/admin/candidates" style={{ color: "#1e56c7", fontWeight: 700 }}>
          Manage Candidates
        </Link>
        <Link to="/change-password" style={{ color: "#1e56c7", fontWeight: 700 }}>
          Change Password
        </Link>
      </nav>
    </div>
  );
}

function RequireDashboardMfa({ children }) {
  const token = localStorage.getItem("access_token");
  const mfaOk = sessionStorage.getItem("admin_mfa_ok") === "1";

  if (!token) return <Navigate to="/" replace />;
  if (!mfaOk) return <Navigate to="/totp-setup" replace />;
  return children;
}

function getTokenRole(token) {
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return payload.role ?? null;
  } catch {
    return null;
  }
}

function RequireAdminOrSuperAdmin({ children }) {
  const token = localStorage.getItem("access_token");
  const mfaOk = sessionStorage.getItem("admin_mfa_ok") === "1";
  const role = getTokenRole(token);

  if (!token) return <Navigate to="/" replace />;
  if (!mfaOk) return <Navigate to="/totp-setup" replace />;
  if (role !== "admin" && role !== "super_admin") return <Navigate to="/" replace />;
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
      <Route
        path="/superadmin/invites"
        element={<Navigate to="/superadmin/manage-admins" replace />}
      />
      <Route
        path="/superadmin/pending-admins"
        element={<Navigate to="/superadmin/manage-admins" replace />}
      />
      <Route
        path="/superadmin/manage-admins"
        element={
          <RequireDashboardMfa>
            <ManageAdmins />
          </RequireDashboardMfa>
        }
      />
      {/* Public: no auth guard – the invited admin has no token yet */}
      <Route path="/activate-invite" element={<ActivateInvitePage />} />
      {/* Email verification: required before TOTP setup */}
      <Route path="/verify-email" element={<AdminEmailVerification />} />
      <Route path="/forgot-password" element={<AdminForgotPassword />} />
      <Route path="/reset-password" element={<AdminResetPassword />} />
      <Route path="/totp-recovery" element={<AdminTotpRecovery />} />
      <Route
        path="/change-password"
        element={
          <RequireDashboardMfa>
            <AdminChangePassword />
          </RequireDashboardMfa>
        }
      />
      {/* Voter verification queue — admin + super_admin */}
      <Route
        path="/admin/voter-verifications"
        element={
          <RequireDashboardMfa>
            <ManageVoters />
          </RequireDashboardMfa>
        }
      />
      <Route
        path="/admin/manage-voters"
        element={
          <RequireAdminOrSuperAdmin>
            <ManageVotersDashboard />
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/elections"
        element={
          <RequireAdminOrSuperAdmin>
            <ManageElections />
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/candidates"
        element={
          <RequireAdminOrSuperAdmin>
            <ManageCandidates />
          </RequireAdminOrSuperAdmin>
        }
      />
      {/* Shown after MFA setup when account is awaiting super-admin approval */}
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
    </Routes>
  );
}
