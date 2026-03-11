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
import PendingAdmins from "./pages/PendingAdmins";
import ManageAdmins from "./pages/ManageAdmins";
import ManageVoters from "./pages/ManageVoters";
import ActivateInvitePage from "./pages/ActivateInvitePage";
import AdminEmailVerification from "./pages/AdminEmailVerification";
import AdminForgotPassword from "./pages/AdminForgotPassword";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminChangePassword from "./pages/AdminChangePassword";
import AdminTotpRecovery from "./pages/AdminTotpRecovery";

function PendingApprovalPage() {
  const navigate = React.useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("admin_mfa_ok");
    navigate("/", { replace: true });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: "100%",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 2px 16px rgba(0,0,0,.08)",
          padding: "40px 36px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#9203;</div>
        <h2 style={{ margin: "0 0 12px", color: "#1e293b" }}>Awaiting Approval</h2>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          Your account has been set up and your MFA authenticator is configured.
          A super admin must approve your account before you can access the dashboard.
          Please check back later.
        </p>
        <button
          onClick={handleLogout}
          style={{
            background: "#1e56c7",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 28px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

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
      {/* Shown after MFA setup when account is awaiting super-admin approval */}
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
    </Routes>
  );
}
