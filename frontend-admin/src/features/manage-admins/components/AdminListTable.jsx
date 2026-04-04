import React, { useState } from "react";
import { 
  Users, Search, ShieldCheck, Mail, Phone, Calendar, 
  MoreVertical, ShieldAlert, Trash2, ShieldX, CheckCircle2 
} from "lucide-react";

const PALETTE = {
  primary: "#173B72",
  accent: "#2F6FED",
  success: "#0F9F6E",
  danger: "#DC2626",
  border: "#E2E8F0",
  textMain: "#0F172A",
  textMuted: "#64748B",
  surface: "#FFFFFF",
  bg: "#F8FAFC",
};

export default function AdminListTable({ admins, onDelete, onReset2FA, isLoading }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [openMenu, setOpenMenu] = useState(null);

  const filteredAdmins = admins.filter(admin => 
    (admin.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMenu = (id) => {
    setOpenMenu(openMenu === id ? null : id);
  };

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
      {/* Header & Search */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${PALETTE.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 8, background: "#EAF2FF", borderRadius: 10 }}>
            <Users size={18} color={PALETTE.accent} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: PALETTE.textMain }}>
            Active Administrators
          </h3>
          <span style={{ fontSize: 13, color: PALETTE.textMuted }}>{admins.length} total</span>
        </div>

        <div style={{ position: "relative", minWidth: 260 }}>
          <Search size={16} color={PALETTE.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 36px",
              borderRadius: 8,
              border: `1px solid ${PALETTE.border}`,
              fontSize: 14,
              outline: "none",
              background: PALETTE.bg
            }}
          />
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${PALETTE.border}` }}>
              <th style={tableHeaderStyle}>Admin Detail</th>
              <th style={tableHeaderStyle}>Role</th>
              <th style={tableHeaderStyle}>Citizenship / Contact</th>
              <th style={tableHeaderStyle}>2FA Status</th>
              <th style={tableHeaderStyle}>Approved Date</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ padding: 40, textAlign: "center" }}>
                  <div className="spinner" style={{ width: 24, height: 24, border: "3px solid #E2E8F0", borderTopColor: PALETTE.accent, borderRadius: "50%", display: "inline-block", animation: "spin 1s linear infinite" }}></div>
                </td>
              </tr>
            ) : filteredAdmins.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 40, textAlign: "center", color: PALETTE.textMuted }}>
                  No administrators found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredAdmins.map((admin) => (
                <tr key={admin.id} style={{ borderBottom: `1px solid ${PALETTE.border}`, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={tableCellStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: PALETTE.primary, color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                        {admin.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: PALETTE.textMain }}>{admin.full_name || "Unknown Admin"}</span>
                        <span style={{ fontSize: 12, color: PALETTE.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                          <Mail size={12} /> {admin.email || "No email"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: 6, 
                      fontSize: 12, 
                      fontWeight: 600, 
                      background: admin.role === "super_admin" ? "#FEF3C7" : "#F1F5F9",
                      color: admin.role === "super_admin" ? "#92400E" : "#475569",
                      textTransform: "capitalize"
                    }}>
                      {admin.role?.replace("_", " ")}
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
                    {admin.totp_enabled_at ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: PALETTE.success, fontSize: 13, fontWeight: 600 }}>
                        <CheckCircle2 size={16} /> 2FA Active
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#F59E0B", fontSize: 13, fontWeight: 600 }}>
                        <ShieldAlert size={16} /> Not Configured
                      </div>
                    )}
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ fontSize: 13, color: PALETTE.textMain }}>
                      {admin.approved_at ? new Date(admin.approved_at).toLocaleDateString() : "—"}
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, textAlign: "right" }}>
                    <div style={{ position: "relative" }}>
                      <button 
                        onClick={() => toggleMenu(admin.id)}
                        style={{ 
                          padding: 6, background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: PALETTE.textMuted 
                        }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {openMenu === admin.id && (
                        <div style={{ 
                          position: "absolute", top: "100%", right: 0, zIndex: 10, background: "#FFF", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", border: `1px solid ${PALETTE.border}`, width: 160, padding: 4 
                        }}>
                          {admin.totp_enabled_at && (
                            <button 
                              onClick={() => { onReset2FA(admin.id, admin.email); setOpenMenu(null); }}
                              style={menuItemStyle}
                            >
                              <ShieldX size={16} /> Reset 2FA
                            </button>
                          )}
                          <button 
                            onClick={() => { onDelete(admin.id, admin.full_name); setOpenMenu(null); }}
                            style={{ ...menuItemStyle, color: PALETTE.danger }}
                          >
                            <Trash2 size={16} /> Delete Admin
                          </button>
                        </div>
                      )}
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
  padding: "16px 24px",
  verticalAlign: "middle"
};

const menuItemStyle = {
  width: "100%",
  padding: "8px 12px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 13,
  fontWeight: 600,
  color: PALETTE.textMain,
  background: "transparent",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  textAlign: "left"
};
