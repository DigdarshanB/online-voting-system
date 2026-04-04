import React from "react";
import { 
  ShieldAlert, ShieldCheck, XCircle, Mail, Clock, MapPin 
} from "lucide-react";

const PALETTE = {
  primary: "#173B72",
  accent: "#2F6FED",
  success: "#0F9F6E",
  danger: "#DC2626",
  warning: "#D97706",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textMuted: "#64748B",
  surface: "#FFFFFF",
  bg: "#F8FAFC",
};

export default function RecoveryQueueTable({ requests, onApprove, onReject, isLoading }) {
  return (
    <div
      style={{
        background: PALETTE.surface,
        borderRadius: 16,
        border: `1px solid ${PALETTE.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${PALETTE.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 8, background: "#FEE2E2", borderRadius: 10 }}>
            <ShieldAlert size={18} color={PALETTE.danger} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: PALETTE.textMain }}>
            2FA Recovery Requests
          </h3>
          <span style={{ 
            fontSize: 12, 
            fontWeight: 700, 
            color: PALETTE.danger, 
            background: "#FEE2E2", 
            padding: "2px 8px", 
            borderRadius: 6 
          }}>
            {requests.length} Pending
          </span>
        </div>
      </div>

      <div style={{ padding: "12px 24px", background: "#FFFBEB", borderBottom: `1px solid ${PALETTE.border}` }}>
        <p style={{ margin: 0, fontSize: 12, color: "#92400E", fontWeight: 600 }}>
          Warning: Approving a reset will disable the user's current TOTP and force them to re-enroll.
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${PALETTE.border}` }}>
              <th style={tableHeaderStyle}>Admin Email</th>
              <th style={tableHeaderStyle}>Requested At</th>
              <th style={tableHeaderStyle}>Request IP</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4" style={{ padding: 40, textAlign: "center" }}>
                  <div style={{ width: 24, height: 24, border: "3px solid #E2E8F0", borderTopColor: PALETTE.accent, borderRadius: "50%", display: "inline-block" }}></div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: 40, textAlign: "center", color: PALETTE.textMuted }}>
                  No pending 2FA recovery requests.
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${PALETTE.border}`, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={tableCellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ padding: 8, background: "#F1F5F9", borderRadius: 8 }}>
                        <Mail size={16} color={PALETTE.textMuted} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: PALETTE.textMain }}>{r.email}</span>
                        <span style={{ fontSize: 11, color: PALETTE.textMuted, textTransform: "uppercase", fontWeight: 700 }}>
                          ID #{r.id} / {r.role}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: PALETTE.textMain }}>
                      <Clock size={14} color={PALETTE.textMuted} />
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: PALETTE.textMain }}>
                      <MapPin size={14} color={PALETTE.textMuted} />
                      {r.requested_ip || "Unknown IP"}
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button 
                        onClick={() => onApprove(r.id, r.email)}
                        style={{
                          padding: "6px 14px",
                          background: PALETTE.accent,
                          color: "#FFF",
                          border: "none",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "opacity 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                      >
                        <ShieldCheck size={14} /> Reset 2FA
                      </button>
                      <button 
                        onClick={() => onReject(r.id, r.email)}
                        style={{
                          padding: "6px 14px",
                          background: "transparent",
                          color: PALETTE.textMuted,
                          border: `1px solid ${PALETTE.border}`,
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#FEE2E2"; e.currentTarget.style.color = PALETTE.danger; e.currentTarget.style.borderColor = PALETTE.danger; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = PALETTE.textMuted; e.currentTarget.style.borderColor = PALETTE.border; }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tableHeaderStyle = {
  padding: "16px 24px",
  fontSize: 12,
  fontWeight: 700,
  color: PALETTE.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em"
};

const tableCellStyle = {
  padding: "16px 24px"
};
