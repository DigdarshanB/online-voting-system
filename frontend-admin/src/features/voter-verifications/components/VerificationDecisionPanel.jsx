import React, { useState } from "react";
import { tokens } from "./tokens";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function VerificationDecisionPanel({ onApprove, onReject, isBusy }) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleRejectClick = () => {
    if (!showRejectForm) {
      setShowRejectForm(true);
    } else if (rejectReason.trim()) {
      onReject(rejectReason.trim());
    }
  };

  return (
    <div style={{
      marginTop: tokens.spacing.xl,
      padding: tokens.spacing.xl,
      background: "#fff",
      borderTop: `1px solid ${tokens.colors.border}`,
      display: "flex",
      flexDirection: "column",
      gap: tokens.spacing.lg
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: tokens.spacing.md,
        padding: tokens.spacing.md,
        background: tokens.status.warning.background,
        border: `1px solid ${tokens.status.warning.border}`,
        borderRadius: tokens.borderRadius.small,
        color: tokens.status.warning.text,
        fontSize: tokens.fontSizes.sm
      }}>
        <AlertTriangle size={18} />
        <span>Carefully verify all artifacts before making a decision. This action is auditable.</span>
      </div>

      <div style={{ display: "flex", gap: tokens.spacing.md, flexWrap: "wrap" }}>
        {!showRejectForm && (
          <button
            onClick={onApprove}
            disabled={isBusy}
            style={{
              padding: "12px 24px",
              borderRadius: tokens.borderRadius.medium,
              background: tokens.colors.success,
              color: "#fff",
              border: "none",
              fontSize: tokens.fontSizes.base,
              fontWeight: 600,
              cursor: isBusy ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: tokens.shadows.sm,
              opacity: isBusy ? 0.7 : 1
            }}
          >
            {isBusy ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            Approve Voter
          </button>
        )}

        <button
          onClick={handleRejectClick}
          disabled={isBusy || (showRejectForm && !rejectReason.trim())}
          style={{
            padding: "12px 24px",
            borderRadius: tokens.borderRadius.medium,
            background: showRejectForm ? tokens.colors.danger : tokens.colors.surface,
            color: showRejectForm ? "#fff" : tokens.colors.danger,
            border: `1px solid ${tokens.colors.danger}`,
            fontSize: tokens.fontSizes.base,
            fontWeight: 600,
            cursor: (isBusy || (showRejectForm && !rejectReason.trim())) ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: tokens.shadows.sm,
            opacity: isBusy ? 0.7 : 1
          }}
        >
          {isBusy ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
          {showRejectForm ? "Confirm Rejection" : "Reject Submission"}
        </button>

        {showRejectForm && (
          <button
            onClick={() => setShowRejectForm(false)}
            disabled={isBusy}
            style={{
              padding: "12px 24px",
              borderRadius: tokens.borderRadius.medium,
              background: "transparent",
              color: tokens.text.secondary,
              border: "none",
              fontSize: tokens.fontSizes.base,
              fontWeight: 500,
              cursor: isBusy ? "not-allowed" : "pointer"
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {showRejectForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: tokens.spacing.sm }}>
          <label style={{ fontSize: tokens.fontSizes.xs, fontWeight: 600, color: tokens.text.secondary }}>
            REASON FOR REJECTION (REQUIRED)
          </label>
          <textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Specify why this submission is being rejected..."
            style={{
              width: "100%",
              padding: tokens.spacing.md,
              borderRadius: tokens.borderRadius.small,
              border: `1px solid ${tokens.input.border}`,
              fontSize: tokens.fontSizes.sm,
              fontFamily: "inherit"
            }}
          />
        </div>
      )}
    </div>
  );
}
