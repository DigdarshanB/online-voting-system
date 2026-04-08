import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import VoterHome from "./pages/VoterHome";

/**
 * File: App.jsx
 *
 * Purpose:
 *   Provide the top-level component for the voter portal.
 */

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VoterAuthPage />} />
        <Route path="/registration-verify" element={<VoterRegistrationVerify />} />
        <Route path="/totp-setup" element={<VoterTotpSetup />} />
        <Route path="/status" element={<VoterStatus />} />
        <Route path="/face-verification" element={<VoterFaceVerification />} />
        <Route path="/verify-email" element={<VoterEmailVerification />} />
        <Route path="/forgot-password" element={<VoterForgotPassword />} />
        <Route path="/reset-password" element={<VoterResetPassword />} />
        <Route path="/totp-recovery" element={<VoterTotpRecovery />} />
        <Route path="/change-password" element={<VoterChangePassword />} />
        <Route path="/home" element={<VoterHome />} />
      </Routes>
    </BrowserRouter>
  );
}

