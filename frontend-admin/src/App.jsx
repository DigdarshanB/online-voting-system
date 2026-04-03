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
import { 
  UserCircle2, 
  ShieldCheck, 
  LockKeyhole, 
  BadgeCheck,
  Activity 
} from "lucide-react";
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
import DashboardPageView from "./pages/DashboardPage";

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

/* ─────────────────────────────────────────────────────────────────────────────
   AccountCenterPage — Manage profile, security, and sessions
───────────────────────────────────────────────────────────────────────────── */

const AC_PALETTE = {
  primary: "#173B72",
  accent: "#2F6FED",
  success: "#0F9F6E",
  successBg: "#EAFBF4",
  border: "#DCE3EC",
  textMain: "#0F172A",
  textMuted: "#64748B",
  surface: "#FFFFFF",
  bg: "#F5F7FB",
};

const SIMPLE_PAGE_PALETTE = {
  appBg: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F9FBFD",
  border: "#DCE3EC",
  borderStrong: "#C9D4E3",
  textMain: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#64748B",
  accent: "#2F6FED",
  accentSoft: "#EAF2FF",
  success: "#0F9F6E",
  successSoft: "#EAFBF4",
  warning: "#D97706",
  warningSoft: "#FFF7E8",
  danger: "#DC2626",
  dangerSoft: "#FEECEC",
};

function AccountCenterPage() {
  const token = localStorage.getItem("access_token");
  const mfaOk = sessionStorage.getItem("admin_mfa_ok") === "1";
  
  let userData = {
    fullName: "Administrator",
    role: "System Admin",
    email: "admin@election.gov.np",
    adminId: "ADMIN-001",
    phone: "+977 1-XXXXXXX",
    status: "Active"
  };

  if (token) {
    try {
      const payloadBase64 = token.split(".")[1];
      const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
      const payload = JSON.parse(payloadJson);
      userData = {
        fullName: payload.full_name || payload.name || "Administrator",
        role: payload.role || "Admin",
        email: payload.email || "admin@election.gov.np",
        adminId: payload.sub || "ADMIN-001",
        phone: payload.phone_number || "+977 XXXXXXXX",
        status: "Active"
      };
    } catch (e) {}
  }

  const initials = userData.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      {/* Profile Header Card */}
      <div style={{ 
        background: AC_PALETTE.surface, 
        borderRadius: 20, 
        padding: "32px", 
        border: `1px solid ${AC_PALETTE.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        display: "flex",
        alignItems: "center",
        gap: 24,
        marginBottom: 32
      }}>
        <div style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 20, 
          background: AC_PALETTE.primary, 
          color: "#FFF", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          fontSize: 28,
          fontWeight: 800,
          boxShadow: "0 8px 16px rgba(23,59,114,0.2)"
        }}>
          {initials}
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: AC_PALETTE.textMain }}>{userData.fullName}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ 
              padding: "4px 10px", 
              borderRadius: 6, 
              background: AC_PALETTE.bg, 
              fontSize: 12, 
              fontWeight: 700, 
              color: AC_PALETTE.primary,
              textTransform: "uppercase"
            }}>
              {userData.role}
            </span>
            <span style={{ fontSize: 13, color: AC_PALETTE.textMuted }}>Official Administrator Account</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <section>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: AC_PALETTE.textMain, marginBottom: 16 }}>Account Information</h3>
          <div style={{ 
            background: AC_PALETTE.surface, 
            borderRadius: 16, 
            padding: "24px", 
            border: `1px solid ${AC_PALETTE.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 20
          }}>
            {[
              { label: "Admin ID", value: userData.adminId },
              { label: "Email Address", value: userData.email },
              { label: "Phone Number", value: userData.phone },
              { label: "Account Status", value: userData.status, badge: true },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontSize: 12, fontWeight: 600, color: AC_PALETTE.textMuted, textTransform: "uppercase", marginBottom: 4 }}>{item.label}</div>
                {item.badge ? (
                  <span style={{ 
                    padding: "4px 10px", 
                    borderRadius: 6, 
                    background: AC_PALETTE.successBg, 
                    fontSize: 13, 
                    fontWeight: 700, 
                    color: AC_PALETTE.success 
                  }}>
                    {item.value}
                  </span>
                ) : (
                  <div style={{ fontSize: 15, fontWeight: 500, color: AC_PALETTE.textMain }}>{item.value}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: AC_PALETTE.textMain, marginBottom: 16 }}>Security & Access</h3>
          <div style={{ 
            background: AC_PALETTE.surface, 
            borderRadius: 16, 
            padding: "24px", 
            border: `1px solid ${AC_PALETTE.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 24
          }}>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ padding: 10, borderRadius: 12, background: AC_PALETTE.successBg, height: "fit-content" }}>
                <ShieldCheck size={24} color={AC_PALETTE.success} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: AC_PALETTE.textMain }}>Multi-Factor Authentication</div>
                <div style={{ fontSize: 13, color: AC_PALETTE.textMuted, marginTop: 2 }}>
                  {mfaOk ? "MFA is currently active for this session." : "MFA setup required for full access."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ padding: 10, borderRadius: 12, background: "#EAF2FF", height: "fit-content" }}>
                <Activity size={24} color={AC_PALETTE.accent} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: AC_PALETTE.textMain }}>Current Session</div>
                <div style={{ fontSize: 13, color: AC_PALETTE.textMuted, marginTop: 2 }}>
                  Securely connected. Last activity: Just now.
                </div>
              </div>
            </div>

            <div style={{ 
              marginTop: 8, 
              paddingTop: 24, 
              borderTop: `1px solid ${AC_PALETTE.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}>
              <div style={{ fontSize: 14, color: AC_PALETTE.textMain, fontWeight: 600 }}>Access Control</div>
              <Link 
                to="/change-password" 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: AC_PALETTE.bg,
                  textDecoration: "none",
                  border: `1px solid ${AC_PALETTE.border}`,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = AC_PALETTE.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = AC_PALETTE.border}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <LockKeyhole size={18} color={AC_PALETTE.primary} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: AC_PALETTE.primary }}>Update Password</span>
                </div>
                <span style={{ fontSize: 18, color: AC_PALETTE.textMuted }}>→</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResultsPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px" }}>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: SIMPLE_PAGE_PALETTE.textMain }}>Results</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: SIMPLE_PAGE_PALETTE.textSecondary, fontWeight: 500 }}>
          View election outcomes, vote totals, and turnout summaries
        </p>
      </header>

      <section
        style={{
          background: SIMPLE_PAGE_PALETTE.surface,
          borderRadius: 16,
          padding: "24px",
          border: `1px solid ${SIMPLE_PAGE_PALETTE.border}`,
          boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { title: "Election Results Overview", meta: "Latest certified outcomes" },
            { title: "Turnout Summary", meta: "Participation rate snapshot" },
            { title: "Published Results", meta: "Official releases and PDFs" },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                background: SIMPLE_PAGE_PALETTE.surfaceAlt,
                border: `1px solid ${SIMPLE_PAGE_PALETTE.border}`,
                borderRadius: 12,
                padding: "16px",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: SIMPLE_PAGE_PALETTE.textMain }}>{card.title}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: SIMPLE_PAGE_PALETTE.textMuted }}>{card.meta}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {[
            { label: "Total Votes", value: "--" },
            { label: "Turnout Rate", value: "--" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: `1px dashed ${SIMPLE_PAGE_PALETTE.borderStrong}`,
                background: SIMPLE_PAGE_PALETTE.surface,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: SIMPLE_PAGE_PALETTE.textMuted }}>{stat.label}</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: SIMPLE_PAGE_PALETTE.textMain }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AuditLogsPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px" }}>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: SIMPLE_PAGE_PALETTE.textMain }}>Audit Logs</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: SIMPLE_PAGE_PALETTE.textSecondary, fontWeight: 500 }}>
          Review important administrative actions and system activity
        </p>
      </header>

      <section
        style={{
          background: SIMPLE_PAGE_PALETTE.surface,
          borderRadius: 16,
          padding: "24px",
          border: `1px solid ${SIMPLE_PAGE_PALETTE.border}`,
          boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { title: "Recent Activity", meta: "Latest admin actions" },
            { title: "Security Events", meta: "Critical access updates" },
            { title: "Admin Actions", meta: "Approvals and changes" },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                background: SIMPLE_PAGE_PALETTE.surfaceAlt,
                border: `1px solid ${SIMPLE_PAGE_PALETTE.border}`,
                borderRadius: 12,
                padding: "16px",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: SIMPLE_PAGE_PALETTE.textMain }}>{card.title}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: SIMPLE_PAGE_PALETTE.textMuted }}>{card.meta}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            padding: "18px",
            borderRadius: 12,
            border: `1px dashed ${SIMPLE_PAGE_PALETTE.borderStrong}`,
            background: SIMPLE_PAGE_PALETTE.surface,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: SIMPLE_PAGE_PALETTE.textMain }}>Audit Log Feed</div>
          <div style={{ marginTop: 6, fontSize: 12, color: SIMPLE_PAGE_PALETTE.textMuted }}>
            A structured timeline or table of administrative events will appear here.
          </div>
        </div>
      </section>
    </div>
  );
}

function ReportsPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px" }}>
      <header style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: SIMPLE_PAGE_PALETTE.textMain }}>Reports</h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: SIMPLE_PAGE_PALETTE.textSecondary, fontWeight: 500 }}>
          Generate and review administrative and election reports
        </p>
      </header>

      <section
        style={{
          background: SIMPLE_PAGE_PALETTE.surface,
          borderRadius: 16,
          padding: "24px",
          border: `1px solid ${SIMPLE_PAGE_PALETTE.border}`,
          boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {[
            { title: "Available Reports", meta: "Election, voter, and security" },
            { title: "Export Center", meta: "PDF, CSV, and audit bundles" },
            { title: "Recent Reports", meta: "Latest generated files" },
          ].map((card) => (
            <div
              key={card.title}
              style={{
                background: SIMPLE_PAGE_PALETTE.surfaceAlt,
                border: `1px solid ${SIMPLE_PAGE_PALETTE.border}`,
                borderRadius: 12,
                padding: "16px",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: SIMPLE_PAGE_PALETTE.textMain }}>{card.title}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: SIMPLE_PAGE_PALETTE.textMuted }}>{card.meta}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {[
            { label: "Scheduled Exports", note: "No schedules yet" },
            { label: "Delivery Destinations", note: "Configure destinations" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: `1px dashed ${SIMPLE_PAGE_PALETTE.borderStrong}`,
                background: SIMPLE_PAGE_PALETTE.surface,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: SIMPLE_PAGE_PALETTE.textMuted }}>{item.label}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: SIMPLE_PAGE_PALETTE.textSecondary }}>{item.note}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
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
              <DashboardPageView />
            </AdminShell>
          </RequireDashboardMfa>
        }
      />
      <Route
        path="/account-center"
        element={
          <RequireDashboardMfa>
            <AdminShell title="Account Center" subtitle="Manage your profile, security, and current session">
              <AccountCenterPage />
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
      <Route
        path="/admin/results"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Results" subtitle="View election outcomes, vote totals, and turnout summaries">
              <ResultsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Audit Logs" subtitle="Review important administrative actions and system activity">
              <AuditLogsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Reports" subtitle="Generate and review administrative and election reports">
              <ReportsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      {/* Shown after MFA setup when account is awaiting super-admin approval */}
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
    </Routes>
  );
}
