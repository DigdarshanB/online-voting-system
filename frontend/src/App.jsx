import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import VoterAuthPage from "./pages/VoterAuthPage";
import VoterTotpSetup from "./pages/VoterTotpSetup";
import VoterStatus from "./pages/VoterStatus";
import VoterFaceVerification from "./pages/VoterFaceVerification";
import VoterEmailVerification from "./pages/VoterEmailVerification";
import VoterForgotPassword from "./pages/VoterForgotPassword";
import VoterResetPassword from "./pages/VoterResetPassword";
import VoterChangePassword from "./pages/VoterChangePassword";
import VoterTotpRecovery from "./pages/VoterTotpRecovery";

/**
 * File: App.jsx
 *
 * Purpose:
 *   Provide the top-level component for the voter portal.
 */

function ProtectedHome() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(null); // null = loading

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setAllowed(false);
      return;
    }
    axios
      .get("http://localhost:8000/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        if (!data.email_verified) {
          navigate("/verify-email", { replace: true });
        } else if (data.status === "ACTIVE" && data.totp_enabled) {
          setAllowed(true);
        } else if (data.status === "ACTIVE" && !data.totp_enabled) {
          navigate("/totp-setup", { replace: true });
        } else if (data.status === "PENDING_FACE") {
          navigate("/face-verification", { replace: true });
        } else {
          navigate("/status", { replace: true });
        }
      })
      .catch(() => {
        localStorage.removeItem("access_token");
        setAllowed(false);
      });
  }, [navigate]);

  if (allowed === null) return <div style={{ textAlign: "center", padding: 40 }}>Loading…</div>;
  if (allowed === false) return <Navigate to="/" replace />;
  return (
    <div style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 16 }}>Welcome, voter!</h1>
      <nav style={{ display: "flex", gap: 12 }}>
        <a
          href="/change-password"
          style={{ color: "#1e56c7", fontWeight: 700, textDecoration: "none" }}
        >
          Change Password
        </a>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VoterAuthPage />} />
        <Route path="/totp-setup" element={<VoterTotpSetup />} />
        <Route path="/status" element={<VoterStatus />} />
        <Route path="/face-verification" element={<VoterFaceVerification />} />
        <Route path="/verify-email" element={<VoterEmailVerification />} />
        <Route path="/forgot-password" element={<VoterForgotPassword />} />
        <Route path="/reset-password" element={<VoterResetPassword />} />
        <Route path="/totp-recovery" element={<VoterTotpRecovery />} />
        <Route path="/change-password" element={<VoterChangePassword />} />
        <Route path="/home" element={<ProtectedHome />} />
      </Routes>
    </BrowserRouter>
  );
}
