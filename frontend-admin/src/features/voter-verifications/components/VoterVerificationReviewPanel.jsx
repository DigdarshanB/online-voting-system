import React from "react";
import { T } from "../../../components/ui/tokens";
import { X, Mail, Phone, ShieldCheck, Calendar } from "lucide-react";
import VerificationImagePanel from "./VerificationImagePanel";
import VerificationChecklist from "./VerificationChecklist";
import VerificationDecisionPanel from "./VerificationDecisionPanel";
import StatusPill from "./StatusPill";

const SectionDivider = ({ label }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    marginTop: 4,
  }}>
    <span style={{
      fontSize: 10.5,
      fontWeight: 700,
      color: T.muted,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
    <div style={{ flex: 1, height: 1, background: T.borderLight }} />
  </div>
);

export default function VoterVerificationReviewPanel({
  voter,
  onClose,
  onApprove,
  onReject,
  isBusy,
}) {
  if (!voter) return null;

  const infoLabel = {
    fontSize: 10.5,
    color: T.muted,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 3,
  };
  const infoValue = {
    fontSize: 13,
    color: T.text,
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
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius.xl,
      boxShadow: T.shadow.lg,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      maxHeight: "calc(100vh - 100px)",
      overflow: "hidden",
    }}>
      {/* Panel header */}
      <div style={{
        padding: "14px 20px",
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: T.surfaceAlt,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: `linear-gradient(135deg, ${T.accent}18, ${T.accent}08)`,
            border: `1.5px solid ${T.accent}30`,
            color: T.accent,
            width: 34, height: 34,
            borderRadius: T.radius.md,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: T.text, letterSpacing: "-0.02em" }}>
                {voter.full_name}
              </h3>
              <StatusPill status={voter.status} />
            </div>
            <p style={{ fontSize: 11, color: T.muted, margin: 0, fontWeight: 400 }}>
              #{voter.citizenship_no_normalized || voter.id}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: T.muted, padding: 8, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: T.transitionFast,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = T.surfaceSubtle; e.currentTarget.style.color = T.text; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.muted; }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "22px 22px 0" }}>

        {/* Section: Applicant Summary */}
        <SectionDivider label="Applicant Summary" />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 28,
          padding: 16,
          background: T.surfaceAlt,
          borderRadius: T.radius.lg,
          border: `1px solid ${T.borderLight}`,
        }}>
          <div>
            <div style={infoLabel}>Full Name</div>
            <div style={{ ...infoValue, fontWeight: 700, fontSize: 13.5 }}>{voter.full_name}</div>
          </div>
          <div>
            <div style={infoLabel}>Citizenship Number</div>
            <div style={{ ...infoValue, fontFamily: "monospace", letterSpacing: "1px", fontSize: 13 }}>
              {voter.citizenship_no_normalized}
            </div>
          </div>
          <div>
            <div style={infoLabel}>Email Address</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Mail size={12} style={{ color: T.muted, flexShrink: 0 }} />
              <span style={{ ...infoValue, fontSize: 12.5 }}>{voter.email}</span>
            </div>
          </div>
          <div>
            <div style={infoLabel}>Phone Number</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Phone size={12} style={{ color: T.muted, flexShrink: 0 }} />
              <span style={{ ...infoValue, fontSize: 12.5 }}>{voter.phone_number || "—"}</span>
            </div>
          </div>
          {(voter.submitted_at || voter.document_uploaded_at) && (
            <div>
              <div style={infoLabel}>Submitted</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar size={12} style={{ color: T.muted, flexShrink: 0 }} />
                <span style={{ ...infoValue, fontSize: 12.5 }}>
                  {new Date(voter.submitted_at || voter.document_uploaded_at).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section: Submitted Artifacts */}
        <SectionDivider label="Submitted Artifacts" />
        <VerificationImagePanel userId={voter.id} />

        {/* Section: Verification Checklist */}
        <SectionDivider label="Verification Checklist" />
        <VerificationChecklist checklistItems={checklistItems} />

        {/* Section: Adjudication Guidance */}
        <SectionDivider label="Adjudication Guidance" />
        <div style={{
          background: T.infoBg,
          border: `1px solid ${T.infoBorder}`,
          borderRadius: T.radius.lg,
          padding: "14px 16px",
          marginBottom: 22,
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, color: T.info, lineHeight: 1.6 }}>
            Verify that the photo on the citizenship document matches the live face capture. Ensure names and numbers are perfectly legible and match the submitted record.
          </p>
          <p style={{ margin: 0, fontSize: 12.5, color: T.info, lineHeight: 1.6, opacity: 0.8 }}>
            Rejections must be accompanied by clear, actionable feedback for the voter. Use preset reasons where applicable.
          </p>
        </div>
      </div>

      {/* Sticky decision footer */}
      <div style={{ flexShrink: 0 }}>
        <VerificationDecisionPanel
          isBusy={isBusy}
          onApprove={() => onApprove(voter.id)}
          onReject={(reason) => onReject(voter.id, reason)}
        />
      </div>
    </div>
  );
}
