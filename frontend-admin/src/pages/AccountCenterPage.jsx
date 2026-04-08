/**
 * AccountCenterPage — Manage profile, security, and sessions.
 * Extracted from App.jsx into its own page file.
 */

import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  LockKeyhole,
  Activity,
} from "lucide-react";
import { getToken, isMfaVerified, getTokenUserData } from "../lib/auth";

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

export default function AccountCenterPage() {
  const token = getToken();
  const mfaOk = isMfaVerified();
  const userData = getTokenUserData(token);

  const initials = userData.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      {/* Profile Header Card */}
      <div
        style={{
          background: AC_PALETTE.surface,
          borderRadius: 20,
          padding: "32px",
          border: `1px solid ${AC_PALETTE.border}`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div
          style={{
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
            boxShadow: "0 8px 16px rgba(23,59,114,0.2)",
          }}
        >
          {initials}
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              color: AC_PALETTE.textMain,
            }}
          >
            {userData.fullName}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
          >
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                background: AC_PALETTE.bg,
                fontSize: 12,
                fontWeight: 700,
                color: AC_PALETTE.primary,
                textTransform: "uppercase",
              }}
            >
              {userData.role}
            </span>
            <span style={{ fontSize: 13, color: AC_PALETTE.textMuted }}>
              Official Administrator Account
            </span>
          </div>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}
      >
        <section>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: AC_PALETTE.textMain,
              marginBottom: 16,
            }}
          >
            Account Information
          </h3>
          <div
            style={{
              background: AC_PALETTE.surface,
              borderRadius: 16,
              padding: "24px",
              border: `1px solid ${AC_PALETTE.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {[
              { label: "Admin ID", value: userData.adminId },
              { label: "Email Address", value: userData.email },
              { label: "Phone Number", value: userData.phone },
              {
                label: "Account Status",
                value: userData.status,
                badge: true,
              },
            ].map((item, i) => (
              <div key={i}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: AC_PALETTE.textMuted,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {item.label}
                </div>
                {item.badge ? (
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: AC_PALETTE.successBg,
                      fontSize: 13,
                      fontWeight: 700,
                      color: AC_PALETTE.success,
                    }}
                  >
                    {item.value}
                  </span>
                ) : (
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: AC_PALETTE.textMain,
                    }}
                  >
                    {item.value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: AC_PALETTE.textMain,
              marginBottom: 16,
            }}
          >
            Security &amp; Access
          </h3>
          <div
            style={{
              background: AC_PALETTE.surface,
              borderRadius: 16,
              padding: "24px",
              border: `1px solid ${AC_PALETTE.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: AC_PALETTE.successBg,
                  height: "fit-content",
                }}
              >
                <ShieldCheck size={24} color={AC_PALETTE.success} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: AC_PALETTE.textMain,
                  }}
                >
                  Multi-Factor Authentication
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: AC_PALETTE.textMuted,
                    marginTop: 2,
                  }}
                >
                  {mfaOk
                    ? "MFA is currently active for this session."
                    : "MFA setup required for full access."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: "#EAF2FF",
                  height: "fit-content",
                }}
              >
                <Activity size={24} color={AC_PALETTE.accent} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: AC_PALETTE.textMain,
                  }}
                >
                  Current Session
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: AC_PALETTE.textMuted,
                    marginTop: 2,
                  }}
                >
                  Securely connected. Last activity: Just now.
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 8,
                paddingTop: 24,
                borderTop: `1px solid ${AC_PALETTE.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  color: AC_PALETTE.textMain,
                  fontWeight: 600,
                }}
              >
                Access Control
              </div>
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
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = AC_PALETTE.accent)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = AC_PALETTE.border)
                }
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
                  <LockKeyhole size={18} color={AC_PALETTE.primary} />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: AC_PALETTE.primary,
                    }}
                  >
                    Update Password
                  </span>
                </div>
                <span style={{ fontSize: 18, color: AC_PALETTE.textMuted }}>
                  →
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
