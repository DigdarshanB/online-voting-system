import React, { useState } from "react";
import { T } from "../../../components/ui/tokens";
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
      marginTop: 0,
      padding: 20,
      background: T.surface,
      borderTop: `1px solid ${T.border}`,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: 12,
        background: T.warnBg,
        border: `1px solid ${T.warnBorder}`,
        borderRadius: T.radius.md,
        color: T.warn,
        fontSize: 13, fontWeight: 600,
      }}>
        <AlertTriangle size={18} />
        <span>Carefully verify all artifacts before making a decision. This action is auditable.</span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {!showRejectForm && (
          <button
            onClick={onApprove}
            disabled={isBusy}
            style={{
              padding: "12px 24px", borderRadius: T.radius.md,
              background: T.success, color: "#fff", border: "none",
              fontSize: 14, fontWeight: 700,
              cursor: isBusy ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: T.shadow.sm, opacity: isBusy ? 0.7 : 1,
              transition: T.transition,
            }}
          >
            {isBusy ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={18} />}
            Approve Voter
          </button>
        )}

        <button
          onClick={handleRejectClick}
          disabled={isBusy || (showRejectForm && !rejectReason.trim())}
          style={{
            padding: "12px 24px", borderRadius: T.radius.md,
            background: showRejectForm ? T.error : T.surface,
            color: showRejectForm ? "#fff" : T.error,
            border: `1px solid ${T.error}`,
            fontSize: 14, fontWeight: 700,
            cursor: (isBusy || (showRejectForm && !rejectReason.trim())) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: T.shadow.sm, opacity: isBusy ? 0.7 : 1,
            transition: T.transition,
          }}
        >
          {isBusy ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <XCircle size={18} />}
          {showRejectForm ? "Confirm Rejection" : "Reject Submission"}
        </button>

        {showRejectForm && (
          <button
            onClick={() => setShowRejectForm(false)}
            disabled={isBusy}
            style={{
              padding: "12px 24px", borderRadius: T.radius.md,
              background: "transparent", color: T.textSecondary, border: "none",
              fontSize: 14, fontWeight: 500,
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {showRejectForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            REASON FOR REJECTION (REQUIRED)
          </label>
          <textarea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Specify why this submission is being rejected..."
            style={{
              width: "100%", padding: 12, borderRadius: T.radius.md,
              border: `1.5px solid ${T.border}`, fontSize: 13.5,
              fontFamily: "inherit", outline: "none",
              boxSizing: "border-box", transition: T.transition,
            }}
          />
        </div>
      )}
    </div>
  );
}
