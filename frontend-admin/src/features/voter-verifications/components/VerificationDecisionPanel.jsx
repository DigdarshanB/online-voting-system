import React, { useState } from "react";
import { T } from "../../../components/ui/tokens";
import { CheckCircle, XCircle, AlertTriangle, Loader2, ChevronDown } from "lucide-react";

const PRESET_REASONS = [
  "Unreadable document",
  "Face mismatch",
  "Incomplete submission",
  "Invalid citizenship number",
];

function ConfirmModal({ onConfirm, onCancel, reason, isBusy }) {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(12,18,34,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.xl,
        boxShadow: T.shadow.xl,
        padding: 28,
        maxWidth: 420,
        width: "100%",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: T.errorBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.error,
            flexShrink: 0,
          }}>
            <XCircle size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: T.text }}>Confirm Rejection</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: T.muted }}>This action will be permanently recorded in the audit log.</p>
          </div>
        </div>

        <div style={{
          background: T.errorBg,
          border: `1px solid ${T.errorBorder}`,
          borderRadius: T.radius.md,
          padding: "10px 14px",
          marginBottom: 20,
          fontSize: 13,
          color: T.error,
          fontWeight: 500,
        }}>
          <strong>Reason:</strong> {reason}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={isBusy}
            style={{
              padding: "9px 20px",
              borderRadius: T.radius.md,
              border: `1px solid ${T.border}`,
              background: T.surface,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: T.textSecondary,
              transition: T.transitionFast,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isBusy}
            style={{
              padding: "9px 20px",
              borderRadius: T.radius.md,
              background: T.error,
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: isBusy ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: isBusy ? 0.7 : 1,
              transition: T.transitionFast,
            }}
          >
            {isBusy && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
            Reject Submission
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerificationDecisionPanel({ onApprove, onReject, isBusy }) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customReason, setCustomReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const effectiveReason = customReason.trim() || selectedPreset || "";

  const handleRejectRequest = () => {
    if (!effectiveReason) return;
    setShowConfirm(true);
  };

  const handleConfirmedReject = () => {
    onReject(effectiveReason);
  };

  const handleCancel = () => {
    setShowRejectBox(false);
    setSelectedPreset(null);
    setCustomReason("");
    setShowConfirm(false);
  };

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          reason={effectiveReason}
          isBusy={isBusy}
          onConfirm={handleConfirmedReject}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        padding: 20,
        background: T.surface,
        borderTop: `1px solid ${T.border}`,
        boxShadow: "0 -2px 8px rgba(12,18,34,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "sticky",
        bottom: 0,
        zIndex: 10,
      }}>
        {/* Audit notice */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: T.warnBg,
          border: `1px solid ${T.warnBorder}`,
          borderRadius: T.radius.md,
          color: T.warn,
          fontSize: 12.5,
          fontWeight: 600,
        }}>
          <AlertTriangle size={16} />
          <span>Carefully verify all artifacts before deciding. This action is permanently auditable.</span>
        </div>

        {/* Primary action row */}
        {!showRejectBox && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onApprove}
              disabled={isBusy}
              style={{
                flex: 1,
                padding: "12px 20px",
                borderRadius: T.radius.md,
                background: T.success,
                color: "#fff",
                border: "none",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isBusy ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: T.shadow.sm,
                opacity: isBusy ? 0.7 : 1,
                transition: T.transition,
              }}
            >
              {isBusy
                ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} />
                : <CheckCircle size={17} />
              }
              Approve Voter
            </button>

            <button
              onClick={() => setShowRejectBox(true)}
              disabled={isBusy}
              style={{
                padding: "12px 20px",
                borderRadius: T.radius.md,
                background: T.surface,
                color: T.error,
                border: `1.5px solid ${T.errorBorder}`,
                fontSize: 13.5,
                fontWeight: 700,
                cursor: isBusy ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: T.transition,
                opacity: isBusy ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!isBusy) e.currentTarget.style.background = T.errorBg; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.surface; }}
            >
              <XCircle size={17} />
              Reject
              <ChevronDown size={14} />
            </button>
          </div>
        )}

        {/* Reject box */}
        {showRejectBox && (
          <div style={{
            border: `1.5px solid ${T.errorBorder}`,
            borderRadius: T.radius.lg,
            overflow: "hidden",
            background: T.errorBg,
          }}>
            <div style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${T.errorBorder}`,
              fontSize: 11.5,
              fontWeight: 700,
              color: T.error,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}>
              Rejection Reason
            </div>

            <div style={{ padding: "12px 14px" }}>
              {/* Preset chips */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 10,
              }}>
                {PRESET_REASONS.map(reason => (
                  <button
                    key={reason}
                    onClick={() => {
                      setSelectedPreset(prev => prev === reason ? null : reason);
                      setCustomReason("");
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 9999,
                      border: `1.5px solid ${selectedPreset === reason ? T.error : T.errorBorder}`,
                      background: selectedPreset === reason ? T.error : T.surface,
                      color: selectedPreset === reason ? "#fff" : T.error,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: T.transitionFast,
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {/* Custom reason textarea */}
              <textarea
                rows={3}
                value={customReason}
                onChange={e => {
                  setCustomReason(e.target.value);
                  if (e.target.value.trim()) setSelectedPreset(null);
                }}
                placeholder="Or enter a custom rejection reason…"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: T.radius.md,
                  border: `1.5px solid ${T.errorBorder}`,
                  fontSize: 12.5,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                  resize: "none",
                  background: T.surface,
                  color: T.text,
                  transition: T.transition,
                  marginBottom: 12,
                }}
                onFocus={e => { e.target.style.borderColor = T.error; }}
                onBlur={e => { e.target.style.borderColor = T.errorBorder; }}
              />

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={handleCancel}
                  style={{
                    padding: "8px 18px",
                    borderRadius: T.radius.md,
                    border: `1px solid ${T.border}`,
                    background: T.surface,
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: T.textSecondary,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectRequest}
                  disabled={!effectiveReason || isBusy}
                  style={{
                    padding: "8px 18px",
                    borderRadius: T.radius.md,
                    background: !effectiveReason ? T.surfaceAlt : T.error,
                    color: !effectiveReason ? T.muted : "#fff",
                    border: "none",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: !effectiveReason || isBusy ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: T.transitionFast,
                    opacity: isBusy ? 0.7 : 1,
                  }}
                >
                  {isBusy && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
