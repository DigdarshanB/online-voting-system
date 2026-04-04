import React from "react";
import { Trash2, Clock, Mail, ExternalLink } from "lucide-react";

const PALETTE = {
  primary: "#173B72",
  accent: "#2F6FED",
  danger: "#DC2626",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textMuted: "#64748B",
  surface: "#FFFFFF",
};

const tableHeaderStyle = {
  padding: "16px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: "700",
  color: PALETTE.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: `2px solid ${PALETTE.border}`,
};

const tableCellStyle = {
  padding: "16px",
  fontSize: "14px",
  color: PALETTE.textMain,
  borderBottom: `1px solid ${PALETTE.border}`,
};

const StatusBadge = ({ status }) => {
  const styles = {
    ISSUED: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
    REVOKED: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
    USED: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
    EXPIRED: { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" },
  };
  const config = styles[status] || styles.EXPIRED;
  return (
    <span style={{ 
      padding: "4px 10px", 
      borderRadius: "6px", 
      fontSize: "11px", 
      fontWeight: "800", 
      background: config.bg, 
      color: config.text,
      border: `1px solid ${config.border}`,
      textTransform: "uppercase"
    }}>
      {status}
    </span>
  );
};

export default function InvitesListTable({ invites, onRevoke, isLoading }) {
  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: PALETTE.textMuted }}>Loading invitations...</div>;
  }

  if (!invites || invites.length === 0) {
    return (
      <div style={{ 
        padding: "48px", 
        textAlign: "center", 
        background: PALETTE.surface, 
        borderRadius: "16px", 
        border: `1px solid ${PALETTE.border}` 
      }}>
        <Mail size={40} color={PALETTE.textMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
        <h3 style={{ margin: 0, color: PALETTE.textMain }}>No Outstanding Invites</h3>
        <p style={{ color: PALETTE.textMuted, fontSize: 14, marginTop: 8 }}>Issue a new invite to see it listed here.</p>
      </div>
    );
  }

  return (
    <div style={{ background: PALETTE.surface, borderRadius: "16px", border: `1px solid ${PALETTE.border}`, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${PALETTE.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: PALETTE.textMain }}>Invitations Log</h2>
        <span style={{ fontSize: "13px", color: PALETTE.textMuted, fontWeight: "600" }}>{invites.length} Records</span>
      </div>
      
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              <th style={tableHeaderStyle}>Recipient</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>Created</th>
              <th style={tableHeaderStyle}>Expires</th>
              <th style={tableHeaderStyle} role="presentation"></th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => (
              <tr key={inv.id} style={{ transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                <td style={tableCellStyle}>
                  <div style={{ fontWeight: "700", color: PALETTE.primary }}>{inv.recipient_identifier}</div>
                </td>
                <td style={tableCellStyle}>
                  <StatusBadge status={inv.status} />
                </td>
                <td style={tableCellStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "13px", color: PALETTE.textMuted }}>
                    <Clock size={14} />
                    {new Date(inv.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td style={tableCellStyle}>
                  <div style={{ fontSize: "13px", color: PALETTE.textMuted }}>
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>
                  {inv.status === "ISSUED" && (
                    <button 
                      onClick={() => onRevoke(inv.id)}
                      style={{ 
                        background: "transparent", 
                        border: "none", 
                        color: PALETTE.danger, 
                        cursor: "pointer",
                        padding: "8px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "13px",
                        fontWeight: "700",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#FEE2E2";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <Trash2 size={16} />
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
