import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import VoterAuthPage from "./pages/VoterAuthPage";
import VoterTotpSetup from "./pages/VoterTotpSetup";
import VoterStatus from "./pages/VoterStatus";
import VoterFaceVerification from "./pages/VoterFaceVerification";

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
        if (data.status === "ACTIVE" && data.totp_enabled) {
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
  return <div>Welcome, voter!</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VoterAuthPage />} />
        <Route path="/totp-setup" element={<VoterTotpSetup />} />
        <Route path="/status" element={<VoterStatus />} />
        <Route path="/face-verification" element={<VoterFaceVerification />} />
        <Route path="/home" element={<ProtectedHome />} />
      </Routes>
    </BrowserRouter>
  );
}
