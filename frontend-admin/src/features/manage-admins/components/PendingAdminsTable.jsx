import React from "react";
import { 
  UserCheck, ShieldAlert, CheckCircle2, XCircle, Trash2, 
  Mail, Phone, Calendar 
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

export default function PendingAdminsTable({ pendingAdmins, onApprove, onReject, onDelete, isLoading }) {
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
          <div style={{ padding: 8, background: "#FEF3C7", borderRadius: 10 }}>
            <UserCheck size={18} color={PALETTE.warning} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: PALETTE.textMain }}>
            Pending Approvals
          </h3>
          <span style={{ 
            fontSize: 12, 
            fontWeight: 700, 
            color: "#92400E", 
            background: "#FEF3C7", 
            padding: "2px 8px", 
            borderRadius: 6 
          }}>
            {pendingAdmins.length} Requests
          </span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${PALETTE.border}` }}>
              <th style={tableHeaderStyle}>Admin Detail</th>
              <th style={tableHeaderStyle}>Role</th>
              <th style={tableHeaderStyle}>Citizenship / Contact</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>MFA Setup</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ padding: 40, textAlign: "center" }}>
                  <div className="spinner" style={{ width: 24, height: 24, border: "3px solid #E2E8F0", borderTopColor: PALETTE.accent, borderRadius: "50%", display: "inline-block" }}></div>
                </td>
              </tr>
            ) : pendingAdmins.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 40, textAlign: "center", color: PALETTE.textMuted }}>
                  No pending admin requests at this time.
                </td>
              </tr>
            ) : (
              pendingAdmins.map((admin) => (
                <tr key={admin.id} style={{ borderBottom: `1px solid ${PALETTE.border}`, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={tableCellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E2E8F0", color: PALETTE.textMain, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                        {admin.full_name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: PALETTE.textMain }}>{admin.full_name || "Unknown"}</span>
                        <span style={{ fontSize: 12, color: PALETTE.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                          <Mail size={12} /> {admin.email || "—"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ 
                      padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, 
                      background: "#F1F5F9", color: "#475569", textTransform: "uppercase"
                    }}>
                      {admin.role}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 13, color: PALETTE.textMain }}>{admin.citizenship_no_normalized || "—"}</span>
                      <span style={{ fontSize: 12, color: PALETTE.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                        <Phone size={12} /> {admin.phone_number || "—"}
                      </span>
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ 
                      padding: "4px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600, 
                      background: admin.status === "PENDING_APPROVAL" ? "#DBEAFE" : "#FEE2E2", 
                      color: admin.status === "PENDING_APPROVAL" ? "#1E40AF" : "#991B1B"
                    }}>
                      {admin.status.replace("_", " ")}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    {admin.totp_enabled_at ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: PALETTE.success, fontSize: 12, fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> Completed
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: PALETTE.warning, fontSize: 12, fontWeight: 600 }}>
                        <ShieldAlert size={14} /> Required
                      </div>
                    )}
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      {admin.status === "PENDING_APPROVAL" && (
                        <button 
                          onClick={() => onApprove(admin.id, admin.full_name)}
                          style={actionButtonStyle(PALETTE.success)}
                        >
                          Approve
                        </button>
                      )}
                      <button 
                        onClick={() => onReject(admin.id, admin.full_name)}
                        style={actionButtonStyle(PALETTE.warning)}
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => onDelete(admin.id, admin.citizenship_no_normalized)}
                        style={actionButtonStyle(PALETTE.danger)}
                      >
                        <Trash2 size={14} />
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

const actionButtonStyle = (color) => ({
  padding: "6px 12px",
  background: "#FFF",
  color: color,
  border: `1px solid ${color}`,
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s",
  display: "flex",
  alignItems: "center",
  gap: 6
});
