import React from "react";
import { Navigate } from "react-router-dom";
import useAuthGuard from "../hooks/useAuthGuard";

export default function VoterHome() {
  const { loading, user } = useAuthGuard();

  if (loading) {
    return <div style={{ textAlign: "center", padding: 40 }}>Loading…</div>;
  }

  if (!user) return <Navigate to="/" replace />;

  // Redirect based on verification state
  if (!user.email_verified) return <Navigate to="/verify-email" replace />;
  if (user.status === "ACTIVE" && !user.totp_enabled) return <Navigate to="/totp-setup" replace />;
  if (user.status === "PENDING_FACE") return <Navigate to="/face-verification" replace />;
  if (!(user.status === "ACTIVE" && user.totp_enabled)) return <Navigate to="/status" replace />;

  return (
    <div style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 16 }}>Welcome, voter!</h1>
      <nav style={{ display: "flex", gap: 12 }}>
        <a
          href="/elections"
          style={{ color: "#1e56c7", fontWeight: 700, textDecoration: "none" }}
        >
          Elections & Voting
        </a>
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
