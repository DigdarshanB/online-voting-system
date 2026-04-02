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
  warningAmber: "#D97706",
  warningBg:   "#FFF7E8",
  dangerRed:   "#DC2626",
  dangerBg:    "#FEECEC",
};

function DashboardPage() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 64px" }}>
      {/* ── 1. Command Header ─────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 32,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: DB_PALETTE.primaryText, letterSpacing: "-0.02em" }}>
              Election Command Center
            </h2>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                background: DB_PALETTE.successBg,
                color: DB_PALETTE.successGreen,
                fontSize: 12.5,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: DB_PALETTE.successGreen }} />
              Operational
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: DB_PALETTE.secondaryText, fontWeight: 500 }}>
            {dateStr} &nbsp;·&nbsp; System Status: <span style={{ color: DB_PALETTE.successGreen }}>Normal</span>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link
            to="/admin/elections"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: DB_PALETTE.accentBlue,
              color: "#FFF",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(47,111,237,0.2)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            Create Election
          </Link>
          <Link
            to="/admin/voter-verifications"
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              background: "#FFF",
              color: DB_PALETTE.primaryText,
              border: `1px solid ${DB_PALETTE.border}`,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(15,23,42,0.04)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = DB_PALETTE.hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFF")}
          >
            Review Queue
          </Link>
        </div>
      </header>

      {/* ── 2. KPI Cards ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 20,
          marginBottom: 32,
        }}
      >
        {[
          { label: "Active Elections", val: "3", sub: "2 Federal · 1 Local", icon: "🗳️" },
          { label: "Registered Voters", val: "142,850", sub: "+124 this week", icon: "👥" },
          { label: "Pending Verification", val: "1,240", sub: "Needs urgent review", icon: "⏳", warn: true },
          { label: "Total Votes Cast", val: "582,410", sub: "72.4% avg turnout", icon: "📊" },
        ].map((kpi, i) => (
          <div
            key={i}
            style={{
              background: "#FFF",
              padding: "24px",
              borderRadius: 16,
              border: `1px solid ${DB_PALETTE.border}`,
              boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: DB_PALETTE.mutedText }}>{kpi.label}</span>
              <span style={{ fontSize: 20 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: DB_PALETTE.primaryText, letterSpacing: "-0.03em" }}>{kpi.val}</div>
            <div
              style={{
                fontSize: 12,
                marginTop: 6,
                fontWeight: 500,
                color: kpi.warn ? DB_PALETTE.warningAmber : DB_PALETTE.secondaryText,
                padding: kpi.warn ? "2px 8px" : "0",
                background: kpi.warn ? DB_PALETTE.warningBg : "transparent",
                borderRadius: 4,
                display: "inline-block",
              }}
            >
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Charts & Analytics Section ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        {/* Placeholder: Election Distribution */}
        <div
          style={{
            background: "#FFF",
            padding: "28px",
            borderRadius: 16,
            border: `1px solid ${DB_PALETTE.border}`,
            boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
          }}
        >
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: DB_PALETTE.primaryText }}>Election Status Distribution</h3>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: DB_PALETTE.mutedText }}>Global overview of electoral events</p>
          
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB", borderRadius: 12, border: `1px dashed ${DB_PALETTE.border}` }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🍩</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: DB_PALETTE.mutedText }}>Distribution Analysis Chart</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Integrating next phase</div>
            </div>
          </div>
        </div>

        {/* Placeholder: Voter Trend */}
        <div
          style={{
            background: "#FFF",
            padding: "28px",
            borderRadius: 16,
            border: `1px solid ${DB_PALETTE.border}`,
            boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
          }}
        >
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: DB_PALETTE.primaryText }}>Registration Activity</h3>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: DB_PALETTE.mutedText }}>New registrations per month (Last 6 Months)</p>
          
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB", borderRadius: 12, border: `1px dashed ${DB_PALETTE.border}` }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: DB_PALETTE.mutedText }}>Voter Trend Analytics</div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Integrating next phase</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Operational Panels ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 24,
        }}
      >
        {/* Upcoming Elections */}
        <div
          style={{
            background: "#FFF",
            padding: "28px",
            borderRadius: 16,
            border: `1px solid ${DB_PALETTE.border}`,
            boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: DB_PALETTE.primaryText }}>Scheduled Elections</h3>
            <Link to="/admin/elections" style={{ fontSize: 13, fontWeight: 600, color: DB_PALETTE.accentBlue, textDecoration: "none" }}>View All</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { name: "2026 Federal General", date: "Nov 04, 2026", type: "Federal", status: "Active" },
              { name: "Provincial Assembly (Bagmati)", date: "Dec 12, 2026", type: "Provincial", status: "Draft" },
              { name: "Local Government (Kathmandu)", date: "Jan 15, 2027", type: "Local", status: "Scheduled" },
            ].map((el, i) => (
              <div key={i} style={{ padding: "14px", borderRadius: 12, border: `1px solid ${DB_PALETTE.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DB_PALETTE.primaryText }}>{el.name}</div>
                  <div style={{ fontSize: 12, color: DB_PALETTE.mutedText, marginTop: 2 }}>{el.type} · {el.date}</div>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    background: el.status === "Active" ? DB_PALETTE.successBg : DB_PALETTE.hoverBg,
                    color: el.status === "Active" ? DB_PALETTE.successGreen : DB_PALETTE.secondaryText,
                  }}
                >
                  {el.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Admin Actions */}
        <div
          style={{
            background: "#FFF",
            padding: "28px",
            borderRadius: 16,
            border: `1px solid ${DB_PALETTE.border}`,
            boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
          }}
        >
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: DB_PALETTE.primaryText }}>Core Administration</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { to: "/admin/manage-voters", label: "Manage Voters", color: DB_PALETTE.accentBlue, bg: DB_PALETTE.activeBg, icon: "👤" },
              { to: "/admin/candidates", label: "Candidates", color: "#10B981", bg: "#ECFDF5", icon: "⭐" },
              { to: "/admin/voter-verifications", label: "Review Queue", color: "#F59E0B", bg: "#FFFBEB", icon: "🔍" },
              { to: "/superadmin/manage-admins", label: "Admin Staff", color: "#6366F1", bg: "#F5F3FF", icon: "🛡️" },
            ].map((action, i) => (
              <Link
                key={i}
                to={action.to}
                style={{
                  padding: "16px",
                  borderRadius: 12,
                  background: action.bg,
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <span style={{ fontSize: 24 }}>{action.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: action.color }}>{action.label}</span>
              </Link>
            ))}
          </div>
          
          <div
            style={{
              marginTop: 24,
              padding: "16px",
              borderRadius: 12,
              background: DB_PALETTE.dangerBg,
              border: `1px solid ${DB_PALETTE.dangerRed}22`,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: DB_PALETTE.dangerRed, marginBottom: 4 }}>Security Alert</div>
            <div style={{ fontSize: 12, color: DB_PALETTE.dangerRed, opacity: 0.8, lineHeight: 1.5 }}>
              There are 12 unassigned security logs from the last 24 hours. Administrator review is required.
            </div>
          </div>
        </div>
      </div>

      <footer style={{ marginTop: 48, textAlign: "center", fontSize: 13, color: DB_PALETTE.mutedText }}>
        Election Control System &nbsp;·&nbsp; Deployment v2.4a &nbsp;·&nbsp; Secure Instance
      </footer>
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
