/**
 * File: App.jsx
 *
 * Purpose:
 *   Top-level route declarations for the admin portal.
 *   All route-guard logic lives in lib/routeGuards.jsx.
 *   All token/session helpers live in lib/auth.js.
 */

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AdminShell from "./AdminShell";
import AdminAuthPage from "./pages/AdminAuthPage";
import AdminTotpSetup from "./pages/AdminTotpSetup";
import ManageAdmins from "./pages/ManageAdmins";
import ManageVoters from "./pages/ManageVoters";
import ManageVotersDashboard from "./pages/ManageVotersDashboard";
import ActivateInvitePage from "./pages/ActivateInvitePage";
import AdminEmailVerification from "./pages/AdminEmailVerification";
import AdminForgotPassword from "./pages/AdminForgotPassword";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminChangePassword from "./pages/AdminChangePassword";
import AdminTotpRecovery from "./pages/AdminTotpRecovery";
import PendingApprovalPage from "./pages/PendingApprovalPage";
import DashboardPageView from "./pages/DashboardPage";
import AccountCenterPage from "./pages/AccountCenterPage";
import ManageElectionsPage from "./pages/ManageElectionsPage";
import ManageCandidatesPage from "./pages/ManageCandidatesPage";
import VoterAssignmentsPage from "./pages/VoterAssignmentsPage";
import ResultsPage from "./pages/ResultsPage";

import {
  RequireDashboardMfa,
  RequireAuthForTotp,
  RequireSuperAdmin,
  RequireAdminOrSuperAdmin,
} from "./lib/routeGuards";

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
        element={
          <RequireSuperAdmin>
            <Navigate to="/superadmin/manage-admins" replace />
          </RequireSuperAdmin>
        }
      />
      <Route
        path="/superadmin/pending-admins"
        element={
          <RequireSuperAdmin>
            <Navigate to="/superadmin/manage-admins" replace />
          </RequireSuperAdmin>
        }
      />
      <Route
        path="/superadmin/manage-admins"
        element={
          <RequireSuperAdmin>
            <AdminShell title="Manage Admins" subtitle="Issue invites and review administrator requests">
              <ManageAdmins />
            </AdminShell>
          </RequireSuperAdmin>
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
      {/* Manage Elections — admin + super_admin */}
      <Route
        path="/admin/manage-elections"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Manage Elections" subtitle="Create and configure federal election structures">
              <ManageElectionsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      {/* Manage Candidates — admin + super_admin */}
      <Route
        path="/admin/manage-candidates"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Manage Candidates" subtitle="Manage parties, candidate profiles, nominations, and PR lists">
              <ManageCandidatesPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      {/* Voter Assignments — admin + super_admin */}
      <Route
        path="/admin/voter-assignments"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Voter Assignments" subtitle="Assign voters to federal constituencies for election eligibility">
              <VoterAssignmentsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      {/* Results — admin + super_admin */}
      <Route
        path="/admin/results"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Election Results" subtitle="Count ballots, view results, finalize and lock elections">
              <ResultsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
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
      {/* Shown after MFA setup when account is awaiting super-admin approval */}
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
    </Routes>
  );
}
