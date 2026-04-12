import React from "react";
import { T } from "../../../components/ui/tokens";
import { Search, Filter, ArrowRight, CheckCircle, XCircle, Clock, FileText, Users, Loader2 } from "lucide-react";
import StatusPill from "./StatusPill";

const thStyle = {
  textAlign: "left",
  padding: "11px 14px",
  fontSize: 11,
  fontWeight: 700,
  color: T.muted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: `1px solid ${T.border}`,
  background: T.surfaceAlt,
};

const tdStyle = {
  padding: "12px 14px",
  fontSize: 13.5,
  color: T.text,
  borderBottom: `1px solid ${T.borderLight}`,
  verticalAlign: "middle",
};

export default function VoterVerificationQueue({ 
  items, 
  isLoading, 
  onSelectVoter, 
  selectedVoterId,
  searchTerm,
  onSearchChange
}) {
  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: T.muted }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
        <div style={{ fontWeight: 600 }}>Loading verification queue…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius.xl,
      boxShadow: T.shadow.md,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 18px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: T.surfaceAlt,
      }}>
        <div style={{ position: "relative", width: 340 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
          <input 
            type="text" 
            placeholder="Search by name or citizenship ID…" 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 38px",
              borderRadius: T.radius.md,
              border: `1.5px solid ${T.border}`,
              fontSize: 13.5,
              outline: "none",
              transition: T.transition,
              boxSizing: "border-box",
            }}
            onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = T.focusRing; }}
            onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = "none"; }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
           <button style={{ 
             display: "flex", alignItems: "center", gap: 8, 
             padding: "8px 16px", borderRadius: T.radius.md,
             border: `1px solid ${T.border}`, background: T.surface,
             fontSize: 13, fontWeight: 600, cursor: "pointer", transition: T.transition,
           }}>
             <Filter size={15} /> Filters
           </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={thStyle}>Voter Identity</th>
              <th style={thStyle}>Citizenship #</th>
              <th style={thStyle}>Artifacts</th>
              <th style={thStyle}>Submitted</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((voter, idx) => (
              <tr 
                key={voter.id}
                style={{ 
                  background: selectedVoterId === voter.id ? T.accentLight : idx % 2 === 0 ? T.surface : T.surfaceAlt,
                  cursor: "pointer",
                  transition: T.transitionFast,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.accentLight; }}
                onMouseLeave={e => { e.currentTarget.style.background = selectedVoterId === voter.id ? T.accentLight : idx % 2 === 0 ? T.surface : T.surfaceAlt; }}
                onClick={() => onSelectVoter(voter)}
              >
                <td style={tdStyle}>
                  <div style={{ fontWeight: 700, color: T.text }}>{voter.full_name}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{voter.email}</div>
                </td>
                <td style={tdStyle}>
                  <code style={{ background: T.surfaceAlt, padding: "2px 8px", borderRadius: T.radius.sm, fontSize: 12, fontWeight: 600, color: T.textSecondary, border: `1px solid ${T.borderLight}`, fontFamily: "monospace" }}>
                    {voter.citizenship_no_normalized}
                  </code>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div title="Document" style={{ color: voter.document_uploaded_at ? T.success : T.border }}>
                      <FileText size={18} />
                    </div>
                    <div title="Face Photo" style={{ color: voter.face_uploaded_at ? T.success : T.border }}>
                      <Users size={18} />
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.muted }}>
                    <Clock size={14} />
                    {new Date(voter.submitted_at || voter.document_uploaded_at).toLocaleDateString()}
                  </div>
                </td>
                <td style={tdStyle}>
                   <StatusPill status={voter.status} />
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button style={{
                    padding: "6px 14px", borderRadius: T.radius.md,
                    background: T.accent, color: "#fff", border: "none",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 4,
                    boxShadow: T.shadow.sm, transition: T.transition,
                  }}>
                    Review <ArrowRight size={13} />
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
