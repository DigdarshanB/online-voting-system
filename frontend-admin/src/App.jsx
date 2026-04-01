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
import AdminShell from "./AdminShell";
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

/* ─────────────────────────────────────────────────────────────────────────────
   DashboardPage — polished admin landing page
   All link destinations are unchanged. Refactored to fit inside AdminShell.
───────────────────────────────────────────────────────────────────────────── */

const DB_PALETTE = {
  pageBg:      "#F6F8FB",
  surface:     "#FFFFFF",
  navSurface:  "#FBFCFE",
  border:      "#E6EAF0",
  primaryText: "#0F172A",
  secondaryText:"#475569",
  mutedText:   "#64748B",
  deepNavy:    "#163B73",
  accentBlue:  "#2F6FED",
  activeBg:    "#EAF2FF",
  hoverBg:     "#F2F7FF",
  successGreen:"#0F9F6E",
  successBg:   "#EAFBF4",
};

const DB_NAV_ITEMS = [
  {
    to: "/superadmin/manage-admins",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.accentBlue} strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6 5.87v-2a4 4 0 00-3-3.87m0 0a4 4 0 10-6 0m9 0a4 4 0 116 0" />
      </svg>
    ),
    label: "Manage Admins",
    desc: "Create, suspend, and oversee administrator accounts",
  },
  {
    to: "/admin/voter-verifications",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.accentBlue} strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: "Voter Verifications",
    desc: "Review and approve pending voter identity requests",
  },
  {
    to: "/admin/manage-voters",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.accentBlue} strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 11a4 4 0 100-8 4 4 0 000 8zm0 0v9m0-9H4a4 4 0 00-4 4v2h9" />
      </svg>
    ),
    label: "Manage Voters",
    desc: "Search, view, and manage registered voter profiles",
  },
  {
    to: "/admin/elections",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.accentBlue} strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: "Manage Elections",
    desc: "Configure, schedule, and publish electoral events",
  },
  {
    to: "/admin/candidates",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.accentBlue} strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    label: "Manage Candidates",
    desc: "Add, edit, and organise electoral candidates",
  },
  {
    to: "/change-password",
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.accentBlue} strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    label: "Change Password",
    desc: "Update your administrator account credentials",
  },
];

const DB_SUMMARY_CARDS = [
  {
    label: "System Status",
    value: "Operational",
    sub: "All services running",
    accent: DB_PALETTE.successGreen,
    bg: DB_PALETTE.successBg,
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.successGreen} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    label: "Portal",
    value: "Admin",
    sub: "Secure authenticated session",
    accent: DB_PALETTE.accentBlue,
    bg: DB_PALETTE.activeBg,
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.accentBlue} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    label: "Voting System",
    value: "Online Voting",
    sub: "Electoral management platform",
    accent: DB_PALETTE.deepNavy,
    bg: "#EEF3FB",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.deepNavy} strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
];

function DashboardNavCard({ item }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <Link
      to={item.to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "18px 20px",
        borderRadius: 12,
        border: `1.5px solid ${hovered ? DB_PALETTE.accentBlue : DB_PALETTE.border}`,
        background: hovered ? DB_PALETTE.hoverBg : DB_PALETTE.navSurface,
        textDecoration: "none",
        transition: "all 0.18s ease",
        boxShadow: hovered
          ? "0 4px 18px rgba(47,111,237,0.10)"
          : "0 1px 4px rgba(15,23,42,0.04)",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 42,
          borderRadius: 10,
          background: hovered ? DB_PALETTE.activeBg : "#F0F4FB",
          flexShrink: 0,
          transition: "background 0.18s ease",
        }}
      >
        {item.icon}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span
          style={{
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 14.5,
            color: hovered ? DB_PALETTE.accentBlue : DB_PALETTE.primaryText,
            letterSpacing: "-0.01em",
            transition: "color 0.18s ease",
          }}
        >
          {item.label}
        </span>
        <span
          style={{
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            fontSize: 12.5,
            color: DB_PALETTE.mutedText,
            lineHeight: 1.5,
          }}
        >
          {item.desc}
        </span>
      </span>
    </Link>
  );
}

function DashboardPage() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "40px 32px 64px" }}>
      {/* ── Welcome heading ─────────────────────────────────────────────── */}
      <div
        style={{
          background: DB_PALETTE.surface,
          border: `1px solid ${DB_PALETTE.border}`,
          borderRadius: 16,
          padding: "32px 36px",
          marginBottom: 28,
          boxShadow: "0 2px 12px rgba(15,23,42,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                color: DB_PALETTE.primaryText,
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
              }}
            >
              Welcome back, Administrator
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 14,
                color: DB_PALETTE.mutedText,
              }}
            >
              {dateStr}
            </p>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 16px",
              borderRadius: 24,
              background: DB_PALETTE.successBg,
              border: `1px solid ${DB_PALETTE.successGreen}22`,
              color: DB_PALETTE.successGreen,
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={DB_PALETTE.successGreen} strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            All Systems Operational
          </span>
        </div>
      </div>

      {/* ── Summary stat cards ──────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {DB_SUMMARY_CARDS.map((card) => (
          <div
            key={card.label}
            style={{
              background: card.bg,
              border: `1.5px solid ${card.accent}22`,
              borderRadius: 14,
              padding: "20px 22px",
              boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: DB_PALETTE.surface,
                  boxShadow: "0 1px 4px rgba(15,23,42,0.07)",
                }}
              >
                {card.icon}
              </span>
              <span style={{ fontSize: 12, color: card.accent, fontWeight: 600, letterSpacing: "0.02em" }}>
                {card.label}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: DB_PALETTE.primaryText, letterSpacing: "-0.02em" }}>
              {card.value}
            </div>
            <div style={{ fontSize: 12, color: DB_PALETTE.mutedText, marginTop: 3 }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Navigation section ──────────────────────────────────────────── */}
      <div
        style={{
          background: DB_PALETTE.surface,
          border: `1px solid ${DB_PALETTE.border}`,
          borderRadius: 16,
          padding: "28px 32px",
          boxShadow: "0 2px 12px rgba(15,23,42,0.05)",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: DB_PALETTE.primaryText,
              letterSpacing: "-0.02em",
            }}
          >
            Administration
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: DB_PALETTE.mutedText }}>
            Select a module to manage
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {DB_NAV_ITEMS.map((item) => (
            <DashboardNavCard key={item.to} item={item} />
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 36,
          textAlign: "center",
          fontSize: 12,
          color: DB_PALETTE.mutedText,
        }}
      >
        Online Voting System &nbsp;·&nbsp; Admin Portal &nbsp;·&nbsp; All rights reserved
      </div>
    </main>
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
            <AdminShell title="Dashboard" subtitle="Overview and quick access">
              <DashboardPage />
            </AdminShell>
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
            <AdminShell title="Manage Admins" subtitle="Issue invites and review administrator requests">
              <ManageAdmins />
            </AdminShell>
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
            <AdminShell title="Voter Verifications" subtitle="Review and approve pending voter identity requests">
              <ManageVoters />
            </AdminShell>
          </RequireDashboardMfa>
        }
      />
      <Route
        path="/admin/manage-voters"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Manage Voters" subtitle="Search and manage registered voter profiles">
              <ManageVotersDashboard />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/elections"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Manage Elections" subtitle="Configure, schedule, and publish electoral events">
              <ManageElections />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/candidates"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Manage Candidates" subtitle="Add, edit, and organise electoral candidates">
              <ManageCandidates />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      {/* Shown after MFA setup when account is awaiting super-admin approval */}
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
    </Routes>
  );
}
