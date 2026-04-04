import React from "react";
import { tokens } from "./tokens";
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

  const infoItemStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const labelStyle = {
    fontSize: tokens.fontSizes.xs,
    color: tokens.text.muted,
    fontWeight: 600,
    textTransform: "uppercase",
  };

  const valueStyle = {
    fontSize: tokens.fontSizes.sm,
    color: tokens.text.primary,
    fontWeight: 500,
  };

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
      background: tokens.cardBackground,
      border: `1px solid ${tokens.cardBorder}`,
      borderRadius: tokens.borderRadius.medium,
      boxShadow: tokens.shadows.lg,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      maxHeight: "calc(100vh - 120px)",
      overflow: "hidden"
    }}>
      {/* Panel Header */}
      <div style={{
        padding: tokens.spacing.lg,
        borderBottom: `1px solid ${tokens.colors.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fafafa"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing.md }}>
          <div style={{ 
            background: tokens.colors.accent, 
            color: "#fff", 
            width: 32, 
            height: 32, 
            borderRadius: tokens.borderRadius.small,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: tokens.fontSizes.base, fontWeight: 700, margin: 0 }}>Reviewing Application</h3>
            <p style={{ fontSize: tokens.fontSizes.xs, color: tokens.text.secondary, margin: 0 }}>ID: {voter.id}</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: tokens.text.muted,
            padding: 8,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s"
          }}
          onMouseEnter={(e) => e.target.style.background = "#f1f5f9"}
          onMouseLeave={(e) => e.target.style.background = "transparent"}
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: tokens.spacing.xl }}>
        {/* Voter Personal Info Grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: tokens.spacing.xl,
          marginBottom: tokens.spacing.xxl,
          padding: tokens.spacing.lg,
          background: tokens.pageBackground,
          borderRadius: tokens.borderRadius.medium,
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
              <Mail size={14} style={{ color: tokens.text.muted }} />
              <span style={valueStyle}>{voter.email}</span>
            </div>
          </div>
          <div style={infoItemStyle}>
            <span style={labelStyle}>Phone Number</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Phone size={14} style={{ color: tokens.text.muted }} />
              <span style={valueStyle}>{voter.phone_number}</span>
            </div>
          </div>
        </div>

        {/* Artifact Comparison */}
        <VerificationImagePanel userId={voter.id} />

        {/* Process Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: tokens.spacing.xl }}>
           <VerificationChecklist checklistItems={checklistItems} />
           <div style={{ fontSize: tokens.fontSizes.sm, color: tokens.text.secondary }}>
              <h4 style={{ fontWeight: 600, color: tokens.text.primary, marginBottom: tokens.spacing.sm }}>Adjudication Guidance</h4>
              <p>Verify that the photo on the citizenship document matches the live face capture. Ensure names and numbers are perfectly legible and match the submitted record.</p>
              <p style={{ marginTop: tokens.spacing.sm }}>Rejections should be accompanied by clear, actionable feedback for the voter.</p>
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
