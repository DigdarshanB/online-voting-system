import React, { useState } from "react";
import { UserPlus, Mail, Link as LinkIcon, Key, Info } from "lucide-react";

/**
 * PALETTE consistent with AdminShell redesign
 */
const PALETTE = {
  primary: "#173B72",
  accent: "#2F6FED",
  success: "#0F9F6E",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textMuted: "#64748B",
  surface: "#FFFFFF",
  bg: "#F8FAFC",
};

export default function InviteAdminForm({ onInvite, isLoading }) {
  const [email, setEmail] = useState("");
  const [inviteType, setInviteType] = useState("link"); // 'link' or 'code'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || isLoading) return;
    // Pass the inviteType back to the parent to handle properly
    onInvite(email.trim().toLowerCase(), inviteType === "link");
    setEmail("");
  };

  return (
    <div
      style={{
        background: PALETTE.surface,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${PALETTE.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ padding: 10, background: "#EAF2FF", borderRadius: 12 }}>
          <UserPlus size={20} color={PALETTE.accent} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: PALETTE.textMain }}>Invite Admin</h3>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: PALETTE.textMuted }}>
            Add a new administrator to the system
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="admin-email"
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              color: PALETTE.textMain,
              marginBottom: 8,
            }}
          >
            Email Address
          </label>
          <div style={{ position: "relative" }}>
            <Mail
              size={18}
              color={PALETTE.textMuted}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              id="admin-email"
              type="email"
              placeholder="e.g. official@election.gov.np"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 12px 12px 42px",
                borderRadius: 10,
                border: `1px solid ${PALETTE.border}`,
                fontSize: 14,
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = PALETTE.accent)}
              onBlur={(e) => (e.target.style.borderColor = PALETTE.border)}
            />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 600,
              color: PALETTE.textMain,
              marginBottom: 12,
            }}
          >
            Invitation Method
          </label>
          <div style={{ display: "flex", gap: 16 }}>
            <label
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${inviteType === "link" ? PALETTE.accent : PALETTE.border}`,
                background: inviteType === "link" ? "#F5F9FF" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <input
                type="radio"
                name="inviteType"
                value="link"
                checked={inviteType === "link"}
                onChange={() => setInviteType("link")}
                style={{ cursor: "pointer" }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: PALETTE.textMain, display: "flex", alignItems: "center", gap: 6 }}>
                  <LinkIcon size={14} /> Email Link
                </span>
                <span style={{ fontSize: 12, color: PALETTE.textMuted }}>Direct invitation via email</span>
              </div>
            </label>

            <label
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${inviteType === "code" ? PALETTE.accent : PALETTE.border}`,
                background: inviteType === "code" ? "#F5F9FF" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <input
                type="radio"
                name="inviteType"
                value="code"
                checked={inviteType === "code"}
                onChange={() => setInviteType("code")}
                style={{ cursor: "pointer" }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: PALETTE.textMain, display: "flex", alignItems: "center", gap: 6 }}>
                  <Key size={14} /> Activation Code
                </span>
                <span style={{ fontSize: 12, color: PALETTE.textMuted }}>Generate a one-time code</span>
              </div>
            </label>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: 12,
            background: "#FFFBEB",
            borderRadius: 8,
            border: "1px solid #FEF3C7",
            marginBottom: 24,
          }}
        >
          <Info size={16} color="#B45309" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
            {inviteType === "link"
              ? "The invitation link will be sent directly to the provided email and expires after 24 hours."
              : "Generate a code that you can share manually. The code can be redeemed on the Register Admin page."}
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          style={{
            width: "100%",
            padding: "12px",
            background: PALETTE.accent,
            color: "#FFF",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: isLoading || !email.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            opacity: isLoading ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {inviteType === "link" ? "Send Invitation" : "Generate Activation Code"}
        </button>
      </form>
    </div>
  );
}
