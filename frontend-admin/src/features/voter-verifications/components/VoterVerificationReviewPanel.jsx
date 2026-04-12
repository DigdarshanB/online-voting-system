import React from "react";
import { T } from "../../../components/ui/tokens";
import { X, User, Mail, Phone, Calendar, ShieldCheck, FileText } from "lucide-react";
import VerificationImagePanel from "./VerificationImagePanel";
import VerificationChecklist from "./VerificationChecklist";
import VerificationDecisionPanel from "./VerificationDecisionPanel";

export default function VoterVerificationReviewPanel({ 
  voter, 
  onClose, 
  onApprove, 
  onReject, 
  isBusy 
}) {
  if (!voter) return null;

  const infoItemStyle = { display: "flex", flexDirection: "column", gap: 4 };
  const labelStyle = { fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" };
  const valueStyle = { fontSize: 13.5, color: T.text, fontWeight: 500 };

  const checklistItems = [
    { label: "Citizenship document uploaded", ok: !!voter.document_uploaded_at },
    { label: "Live face photo uploaded", ok: !!voter.face_uploaded_at },
    { label: "Full face clearly visible", ok: null },
    { label: "Both ears visible", ok: null },
    { label: "Document photo matches live photo", ok: null },
    { label: "Submission data matches document", ok: null },
  ];

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius.xl,
      boxShadow: T.shadow.lg,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      maxHeight: "calc(100vh - 120px)",
      overflow: "hidden"
    }}>
      {/* Panel Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: T.surfaceAlt,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            background: `linear-gradient(135deg, ${T.accent}18, ${T.accent}08)`, 
            border: `1.5px solid ${T.accent}30`,
            color: T.accent, 
            width: 36, height: 36, 
            borderRadius: T.radius.md,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: T.text }}>Reviewing Application</h3>
            <p style={{ fontSize: 12, color: T.muted, margin: 0, fontWeight: 500 }}>ID: {voter.id}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: T.muted, padding: 8, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: T.transition,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceAlt; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {/* Voter Personal Info Grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: 20,
          marginBottom: 28,
          padding: 18,
          background: T.surfaceAlt,
          borderRadius: T.radius.lg,
          border: `1px solid ${T.borderLight}`,
        }}>
          <div style={infoItemStyle}>
            <span style={labelStyle}>Full Name</span>
            <span style={valueStyle}>{voter.full_name}</span>
          </div>
          <div style={infoItemStyle}>
            <span style={labelStyle}>Citizenship Number</span>
            <span style={{ ...valueStyle, fontFamily: "monospace", letterSpacing: "1px" }}>{voter.citizenship_no_normalized}</span>
          </div>
          <div style={infoItemStyle}>
            <span style={labelStyle}>Email Address</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Mail size={14} style={{ color: T.muted }} />
              <span style={valueStyle}>{voter.email}</span>
            </div>
          </div>
          <div style={infoItemStyle}>
            <span style={labelStyle}>Phone Number</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Phone size={14} style={{ color: T.muted }} />
              <span style={valueStyle}>{voter.phone_number}</span>
            </div>
          </div>
        </div>

        {/* Artifact Comparison */}
        <VerificationImagePanel userId={voter.id} />

        {/* Process Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
           <VerificationChecklist checklistItems={checklistItems} />
           <div style={{ fontSize: 13.5, color: T.textSecondary }}>
              <h4 style={{ fontWeight: 700, color: T.text, marginBottom: 8 }}>Adjudication Guidance</h4>
              <p>Verify that the photo on the citizenship document matches the live face capture. Ensure names and numbers are perfectly legible and match the submitted record.</p>
              <p style={{ marginTop: 8 }}>Rejections should be accompanied by clear, actionable feedback for the voter.</p>
           </div>
        </div>
      </div>

      {/* Action Footer */}
      <VerificationDecisionPanel 
        isBusy={isBusy}
        onApprove={() => onApprove(voter.id)}
        onReject={(reason) => onReject(voter.id, reason)}
      />
    </div>
  );
}
