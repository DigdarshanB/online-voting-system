/**
 * File: App.jsx
 *
 * Purpose:
 *   Top-level route declarations for the voter portal.
 *   All route-guard logic lives in lib/routeGuards.jsx.
 *   All token/session helpers live in lib/authStorage.js.
 *
 * Architecture mirrors frontend-admin/src/App.jsx:
 *   - BrowserRouter lives in main.jsx
 *   - Public routes (auth, verification flow) are unguarded
 *   - Protected routes use RequireActiveVoter + VoterShell
 *   - VoterShell provides sidebar/topbar/footer layout
 */

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import VoterShell from "./VoterShell";
import VoterAuthPage from "./pages/VoterAuthPage";
import VoterRegistrationVerify from "./pages/VoterRegistrationVerify";
import VoterTotpSetup from "./pages/VoterTotpSetup";
import VoterStatus from "./pages/VoterStatus";
import VoterFaceVerification from "./pages/VoterFaceVerification";
import VoterEmailVerification from "./pages/VoterEmailVerification";
import VoterForgotPassword from "./pages/VoterForgotPassword";
import VoterResetPassword from "./pages/VoterResetPassword";
import VoterChangePassword from "./pages/VoterChangePassword";
import VoterTotpRecovery from "./pages/VoterTotpRecovery";
import VoterDashboard from "./pages/VoterDashboard";
import VoterElectionsHub from "./pages/VoterElectionsHub";
import VoterElectionsLevel from "./pages/VoterElectionsLevel";
import VoterBallot from "./pages/VoterBallot";
import VoterResults from "./pages/VoterResults";
import VoterResultsHub from "./pages/VoterResultsHub";
import VoterResultsLevel from "./pages/VoterResultsLevel";
import VoterReceipt from "./pages/VoterReceipt";
import VoterAccount from "./pages/VoterAccount";
import VoterCandidates from "./pages/VoterCandidates";
import VoterCandidatesByFamily from "./pages/VoterCandidatesByFamily";
import VoterGuide from "./pages/VoterGuide";

import { RequireActiveVoter, RequireAuth } from "./lib/routeGuards";

export default function App() {
  return (
    <Routes>
      {/* ── Public / pre-login routes ───────────────────────── */}
      <Route path="/" element={<VoterAuthPage />} />
      <Route path="/registration-verify" element={<VoterRegistrationVerify />} />
      <Route path="/verify-email" element={<VoterEmailVerification />} />
      <Route path="/forgot-password" element={<VoterForgotPassword />} />
      <Route path="/reset-password" element={<VoterResetPassword />} />
      <Route path="/totp-recovery" element={<VoterTotpRecovery />} />

      {/* ── Auth-required verification flow (not yet fully active) ── */}
      <Route
        path="/totp-setup"
        element={
          <RequireAuth>
            <VoterTotpSetup />
          </RequireAuth>
        }
      />
      <Route
        path="/face-verification"
        element={
          <RequireAuth>
            <VoterFaceVerification />
          </RequireAuth>
        }
      />
      <Route
        path="/status"
        element={
          <RequireAuth>
            <VoterStatus />
          </RequireAuth>
        }
      />

      {/* ── Protected voter portal (shell layout) ──────────── */}
      <Route
        path="/dashboard"
        element={
          <RequireActiveVoter>
            {({ user }) => (
              <VoterShell title="Voter Dashboard" subtitle="Overview of your voting activity and upcoming elections">
                <VoterDashboard user={user} />
              </VoterShell>
            )}
          </RequireActiveVoter>
        }
      />
      <Route
        path="/candidates"
        element={
          <RequireActiveVoter>
            <VoterShell title="Nominated Candidates" subtitle="View candidates nominated for your eligible elections">
              <VoterCandidates />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      <Route
        path="/candidates/:family"
        element={
          <RequireActiveVoter>
            <VoterShell title="Nominated Candidates" subtitle="View candidates nominated for your eligible elections">
              <VoterCandidatesByFamily />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      {/* ── Elections hub ────────────────────────────────── */}
      <Route
        path="/elections"
        element={
          <RequireActiveVoter>
            <VoterShell title="My Elections" subtitle="Nepal's three-tier elections you are eligible to vote in">
              <VoterElectionsHub />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      {/* ── Elections level list (federal | provincial | local) */}
      <Route
        path="/elections/federal"
        element={
          <RequireActiveVoter>
            <VoterShell title="Federal Elections" subtitle="House of Representatives elections">
              <VoterElectionsLevel level="federal" />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      <Route
        path="/elections/provincial"
        element={
          <RequireActiveVoter>
            <VoterShell title="Provincial Elections" subtitle="Provincial Assembly elections">
              <VoterElectionsLevel level="provincial" />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      <Route
        path="/elections/local"
        element={
          <RequireActiveVoter>
            <VoterShell title="Local Elections" subtitle="Municipal and rural municipal elections">
              <VoterElectionsLevel level="local" />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      {/* ── Ballot (must be before :electionId catch-all) ─── */}
      <Route
        path="/elections/:electionId/ballot"
        element={
          <RequireActiveVoter>
            <VoterShell title="Cast Your Vote" subtitle="Review candidates and submit your ballot">
              <VoterBallot />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      {/* ── Results hub ──────────────────────────────────── */}
      <Route
        path="/results"
        element={
          <RequireActiveVoter>
            <VoterShell title="Election Results" subtitle="Published results across Nepal's three-tier elections">
              <VoterResultsHub />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      {/* ── Results level list (federal | provincial | local) */}
      <Route
        path="/results/federal"
        element={
          <RequireActiveVoter>
            <VoterShell title="Federal Results" subtitle="Parliamentary election results">
              <VoterResultsLevel level="federal" />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      <Route
        path="/results/provincial"
        element={
          <RequireActiveVoter>
            <VoterShell title="Provincial Results" subtitle="Provincial Assembly election results">
              <VoterResultsLevel level="provincial" />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      <Route
        path="/results/local"
        element={
          <RequireActiveVoter>
            <VoterShell title="Local Results" subtitle="Municipal and rural municipal results">
              <VoterResultsLevel level="local" />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      {/* ── Results detail (numeric electionId) ─────────── */}
      <Route
        path="/results/:electionId"
        element={
          <RequireActiveVoter>
            <VoterShell title="Election Results" subtitle="Detailed results for this election">
              <VoterResults />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      {/* ── Legacy alias ─────────────────────────────────── */}
      <Route
        path="/elections/:electionId/results"
        element={
          <RequireActiveVoter>
            <VoterShell title="Election Results" subtitle="Detailed results for this election">
              <VoterResults />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      <Route
        path="/receipt"
        element={
          <RequireActiveVoter>
            <VoterShell title="Vote Receipt" subtitle="View and verify your vote confirmations">
              <VoterReceipt />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      <Route
        path="/account"
        element={
          <RequireActiveVoter>
            <VoterShell title="Account & Security" subtitle="Manage your profile, password, and security settings">
              <VoterAccount />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      <Route
        path="/change-password"
        element={
          <RequireActiveVoter>
            <VoterShell title="Change Password" subtitle="Update your account password">
              <VoterChangePassword />
            </VoterShell>
          </RequireActiveVoter>
        }
      />
      <Route
        path="/guide"
        element={
          <RequireActiveVoter>
            <VoterShell title="Voter Guide & Help" subtitle="Step-by-step instructions for using the voter portal">
              <VoterGuide />
            </VoterShell>
          </RequireActiveVoter>
        }
      />

      {/* ── Backward compatibility: /home → /dashboard ─────── */}
      <Route path="/home" element={<Navigate to="/dashboard" replace />} />

      {/* ── Catch-all → login ──────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

