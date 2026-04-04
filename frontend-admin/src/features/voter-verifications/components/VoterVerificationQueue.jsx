import React from "react";
import { tokens } from "./tokens";
import { Search, Filter, ArrowRight, CheckCircle, XCircle, Clock } from "lucide-react";
import StatusPill from "./StatusPill"; // Assuming we can reuse it, or we'll create a local one

export default function VoterVerificationQueue({ 
  items, 
  isLoading, 
  onSelectVoter, 
  selectedVoterId,
  searchTerm,
  onSearchChange
}) {
  const tableHeaderStyle = {
    textAlign: "left",
    padding: tokens.spacing.md,
    fontSize: tokens.fontSizes.xs,
    fontWeight: 600,
    color: tokens.text.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: `2px solid ${tokens.colors.border}`,
  };

  const tableCellStyle = {
    padding: tokens.spacing.lg,
    fontSize: tokens.fontSizes.sm,
    color: tokens.text.primary,
    borderBottom: `1px solid ${tokens.colors.border}`,
    verticalAlign: "middle",
  };

  if (isLoading) {
    return (
      <div style={{ padding: tokens.spacing.xxl, textAlign: "center", color: tokens.text.secondary }}>
        <div className="animate-pulse">Loading verification queue...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: tokens.cardBackground,
      border: `1px solid ${tokens.cardBorder}`,
      borderRadius: tokens.borderRadius.medium,
      boxShadow: tokens.shadows.md,
      overflow: "hidden",
    }}>
      <div style={{
        padding: tokens.spacing.lg,
        borderBottom: `1px solid ${tokens.colors.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fafafa"
      }}>
        <div style={{ position: "relative", width: "320px" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: tokens.text.muted }} />
          <input 
            type="text" 
            placeholder="Search by name or citizenship ID..." 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 36px",
              borderRadius: tokens.borderRadius.small,
              border: `1px solid ${tokens.input.border}`,
              fontSize: tokens.fontSizes.sm,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: tokens.spacing.md }}>
           <button style={{ 
             display: "flex", 
             alignItems: "center", 
             gap: 8, 
             padding: "8px 16px", 
             borderRadius: tokens.borderRadius.small,
             border: `1px solid ${tokens.colors.border}`,
             background: tokens.colors.surface,
             fontSize: tokens.fontSizes.sm,
             fontWeight: 500,
             cursor: "pointer"
           }}>
             <Filter size={16} /> Filters
           </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={tableHeaderStyle}>Voter Identity</th>
              <th style={tableHeaderStyle}>Citizenship #</th>
              <th style={tableHeaderStyle}>Artifacts</th>
              <th style={tableHeaderStyle}>Submitted</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={{ ...tableHeaderStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((voter) => (
              <tr 
                key={voter.id}
                style={{ 
                  background: selectedVoterId === voter.id ? "#f1f5f9" : "transparent",
                  cursor: "pointer",
                  transition: "background 0.2s ease"
                }}
                onClick={() => onSelectVoter(voter)}
              >
                <td style={tableCellStyle}>
                  <div style={{ fontWeight: 600 }}>{voter.full_name}</div>
                  <div style={{ fontSize: tokens.fontSizes.xs, color: tokens.text.secondary }}>{voter.email}</div>
                </td>
                <td style={tableCellStyle}>
                  <code style={{ background: "#f1f5f9", padding: "2px 4px", borderRadius: 4, fontSize: 12 }}>
                    {voter.citizenship_no_normalized}
                  </code>
                </td>
                <td style={tableCellStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div title="Document" style={{ color: voter.document_uploaded_at ? tokens.colors.success : tokens.colors.muted }}>
                      <FileText size={18} />
                    </div>
                    <div title="Face Photo" style={{ color: voter.face_uploaded_at ? tokens.colors.success : tokens.colors.muted }}>
                      <Users size={18} />
                    </div>
                  </div>
                </td>
                <td style={tableCellStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                    <Clock size={14} style={{ color: tokens.text.muted }} />
                    {new Date(voter.submitted_at || voter.document_uploaded_at).toLocaleDateString()}
                  </div>
                </td>
                <td style={tableCellStyle}>
                   <StatusPill status={voter.status} />
                </td>
                <td style={{ ...tableCellStyle, textAlign: "right" }}>
                  <button style={{
                    padding: "6px 12px",
                    borderRadius: tokens.borderRadius.small,
                    background: tokens.colors.accent,
                    color: "#fff",
                    border: "none",
                    fontSize: tokens.fontSizes.xs,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4
                  }}>
                    Review <ArrowRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
