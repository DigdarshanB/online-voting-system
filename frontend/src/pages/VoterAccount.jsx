/**
 * VoterAccount.jsx
 *
 * Account & Security page for the voter portal.
 * Shows voter profile info, security status, and account management actions.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserCircle2,
  ShieldCheck,
  KeyRound,
  Mail,
  BadgeCheck,
  Smartphone,
  LogOut,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { getToken, clearToken } from "../lib/authStorage";
import { fetchMe } from "../features/auth/api/authApi";

const PALETTE = {
  navy: "#173B72",
  accentBlue: "#2F6FED",
  mutedText: "#64748B",
  surface: "#FFFFFF",
  success: "#0F9F6E",
  nepalRed: "#D42C3A",
};

export default function VoterAccount() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMe()
      .then((data) => setUser(data))
      .catch(() => setError("Unable to load account details."))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    clearToken();
    sessionStorage.removeItem("voter_mfa_ok");
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: PALETTE.mutedText, fontSize: 15, fontWeight: 500 }}>
        Loading account…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "32px", maxWidth: 700, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            background: "#FEF2F2",
            borderRadius: 10,
            border: "1px solid #FECACA",
            color: "#DC2626",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 32px 48px", maxWidth: 700, margin: "0 auto" }}>
      {/* Profile Card */}
      <div
        style={{
          background: PALETTE.surface,
          borderRadius: 16,
          border: "1px solid #E2E8F0",
          padding: "28px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#EAF2FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <UserCircle2 size={28} color={PALETTE.accentBlue} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: PALETTE.navy }}>
              {user?.full_name || "Voter"}
            </div>
            <div style={{ fontSize: 13, color: PALETTE.mutedText, fontWeight: 500, marginTop: 2 }}>
              Citizenship ID: {user?.citizenship_number || "—"}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <InfoRow
            icon={<Mail size={16} color={PALETTE.accentBlue} />}
            label="Email"
            value={user?.email || "—"}
          />
          <InfoRow
            icon={<BadgeCheck size={16} color={PALETTE.success} />}
            label="Status"
            value={user?.status || "—"}
            valueColor={user?.status === "ACTIVE" ? PALETTE.success : PALETTE.mutedText}
          />
          <InfoRow
            icon={<Smartphone size={16} color={PALETTE.accentBlue} />}
            label="Two-Factor Auth"
            value={user?.totp_enabled ? "Enabled" : "Not Setup"}
            valueColor={user?.totp_enabled ? PALETTE.success : PALETTE.nepalRed}
          />
          <InfoRow
            icon={<ShieldCheck size={16} color={PALETTE.success} />}
            label="Email Verified"
            value={user?.email_verified ? "Yes" : "No"}
            valueColor={user?.email_verified ? PALETTE.success : PALETTE.nepalRed}
          />
        </div>
      </div>

      {/* Security Actions */}
      <h3
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: PALETTE.navy,
          marginBottom: 12,
          letterSpacing: "-0.01em",
        }}
      >
        Security & Actions
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        <ActionRow
          to="/change-password"
          icon={<KeyRound size={18} color={PALETTE.accentBlue} />}
          label="Change Password"
          description="Update your account password"
        />
        <ActionRow
          to="/totp-recovery"
          icon={<Smartphone size={18} color={PALETTE.accentBlue} />}
          label="Authenticator Recovery"
          description="Recover access to your two-factor authentication"
        />
      </div>

      {/* Sign Out */}
      <button
        onClick={handleLogout}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "14px 20px",
          borderRadius: 12,
          border: "1px solid #FECACA",
          background: "#FEF2F2",
          color: PALETTE.nepalRed,
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          transition: "all 0.2s ease",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#FEE2E2";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#FEF2F2";
        }}
      >
        <LogOut size={18} />
        Sign Out of Voter Portal
      </button>
    </div>
  );
}

function InfoRow({ icon, label, value, valueColor }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "#F8FAFC",
        borderRadius: 8,
        border: "1px solid #F1F5F9",
      }}
    >
      {icon}
      <div>
        <div style={{ fontSize: 11, color: PALETTE.mutedText, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: valueColor || PALETTE.navy, marginTop: 1 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function ActionRow({ to, icon, label, description }) {
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderRadius: 12,
        border: "1px solid #E2E8F0",
        background: PALETTE.surface,
        textDecoration: "none",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = PALETTE.accentBlue;
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(47,111,237,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E2E8F0";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "#EAF2FF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: PALETTE.navy }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: PALETTE.mutedText, fontWeight: 500, marginTop: 1 }}>
          {description}
        </div>
      </div>
      <ChevronRight size={18} color={PALETTE.mutedText} style={{ flexShrink: 0 }} />
    </Link>
  );
}
