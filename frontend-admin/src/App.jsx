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
import ManageElectionsHubPage from "./pages/ManageElectionsHubPage";
import ManageFederalElectionsPage from "./pages/ManageFederalElectionsPage";
import ManageProvincialElectionsPage from "./pages/ManageProvincialElectionsPage";
import ManageLocalElectionsPage from "./pages/ManageLocalElectionsPage";
import ManageCandidatesPage from "./pages/ManageCandidatesPage";
import ManageFederalCandidatesPage from "./pages/ManageFederalCandidatesPage";
import ManageProvincialCandidatesPage from "./pages/ManageProvincialCandidatesPage";
import ManageLocalCandidatesPage from "./pages/ManageLocalCandidatesPage";
import VoterAssignmentsPage from "./pages/VoterAssignmentsPage";
import ProvincialVoterAssignmentsPage from "./pages/ProvincialVoterAssignmentsPage";
import LocalVoterAssignmentsPage from "./pages/LocalVoterAssignmentsPage";
import ResultsHubPage from "./pages/ResultsHubPage";
import FederalResultsPage from "./pages/FederalResultsPage";
import ProvincialResultsPage from "./pages/ProvincialResultsPage";
import LocalResultsPage from "./pages/LocalResultsPage";
import AuditReportsPage from "./pages/AuditReportsPage";

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
      {/* Canonical activation path — matches backend-generated invite URLs */}
      <Route path="/activate-admin" element={<ActivateInvitePage />} />
      {/* Legacy alias — backward-compatible with any existing /activate-invite links */}
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
      {/* Manage Elections — hub + level pages */}
      <Route
        path="/admin/manage-elections"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Manage Elections" subtitle="Select a government level to manage its elections">
              <ManageElectionsHubPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/manage-elections/federal"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Federal Elections" subtitle="Create and configure federal election structures">
              <ManageFederalElectionsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/manage-elections/provincial"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Provincial Elections" subtitle="Provincial Assembly election management">
              <ManageProvincialElectionsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/manage-elections/local"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Local Elections" subtitle="Municipal and Rural Municipal election management">
              <ManageLocalElectionsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      {/* Manage Candidates — hub + level pages */}
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
      <Route
        path="/admin/manage-candidates/federal"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Federal Candidates" subtitle="Candidate profiles, nominations, and PR lists for federal elections">
              <ManageFederalCandidatesPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/manage-candidates/provincial"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Provincial Candidates" subtitle="Provincial Assembly candidate management">
              <ManageProvincialCandidatesPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/manage-candidates/local"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Local Candidates" subtitle="Municipal and Rural Municipal candidate management">
              <ManageLocalCandidatesPage />
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
      <Route
        path="/admin/voter-assignments/provincial"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Provincial Voter Assignments" subtitle="Assign voters to provincial assembly areas">
              <ProvincialVoterAssignmentsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/voter-assignments/local"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Local Voter Assignments" subtitle="Assign voters to wards within local bodies">
              <LocalVoterAssignmentsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      {/* Results — admin + super_admin */}
      <Route
        path="/admin/results"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Election Results" subtitle="Select a government level to view and manage election results">
              <ResultsHubPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/results/federal"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Federal Results" subtitle="House of Representatives counting and results">
              <FederalResultsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/results/provincial"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Provincial Results" subtitle="Provincial Assembly counting and results">
              <ProvincialResultsPage />
            </AdminShell>
          </RequireAdminOrSuperAdmin>
        }
      />
      <Route
        path="/admin/results/local"
        element={
          <RequireAdminOrSuperAdmin>
            <AdminShell title="Local Results" subtitle="Municipal and Rural Municipal election results">
              <LocalResultsPage />
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
      {/* Audit Reports — super_admin only */}
      <Route
        path="/admin/audit-reports"
        element={
          <RequireSuperAdmin>
            <AdminShell title="Audit Reports" subtitle="Review system audit trail and security events">
              <AuditReportsPage />
            </AdminShell>
          </RequireSuperAdmin>
        }
      />
      {/* Shown after MFA setup when account is awaiting super-admin approval */}
      <Route path="/pending-approval" element={<PendingApprovalPage />} />
    </Routes>
  );
}
