import React, { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Reusable confirmation dialog for destructive actions.
 *
 * Props:
 *   open      — boolean, controls visibility
 *   onClose   — called when user cancels / clicks backdrop / presses Escape
 *   onConfirm — called when user clicks the primary action
 *   title     — dialog title string
 *   body      — descriptive text (string or node)
 *   confirmLabel  — text on the primary button (default "Confirm")
 *   cancelLabel   — text on the cancel button  (default "Cancel")
 *   variant       — "danger" | "warn" | "primary" (default "danger")
 *   loading       — disables buttons and shows spinner on confirm
 */

const VARIANTS = {
  danger: { bg: "#DC2626", hoverBg: "#B91C1C", iconColor: "#DC2626", iconBg: "#FEE2E2" },
  warn:   { bg: "#D97706", hoverBg: "#B45309", iconColor: "#D97706", iconBg: "#FEF3C7" },
  primary:{ bg: "#2F6FED", hoverBg: "#1D4ED8", iconColor: "#2F6FED", iconBg: "#DBEAFE" },
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  body = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}) {
  const confirmRef = useRef(null);
  const v = VARIANTS[variant] || VARIANTS.danger;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const timer = setTimeout(() => confirmRef.current?.focus(), 50);
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (prev && prev.focus) prev.focus();
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={() => { if (!loading) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)",
        animation: "cdFadeIn 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF", borderRadius: 14, padding: 0,
          width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          animation: "cdSlideIn 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "24px 24px 0" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: v.iconBg, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertTriangle size={20} color={v.iconColor} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>{title}</h3>
            {body && (
              <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "#64748B", lineHeight: 1.5 }}>{body}</p>
            )}
          </div>
          <button
            onClick={() => { if (!loading) onClose(); }}
            style={{
              background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer",
              padding: 4, borderRadius: 6, color: "#94A3B8", flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Actions */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "20px 24px", marginTop: 8,
          borderTop: "1px solid #F1F5F9",
        }}>
          <button
            onClick={() => { if (!loading) onClose(); }}
            disabled={loading}
            style={{
              padding: "9px 18px", borderRadius: 8, border: "1px solid #E2E8F0",
              background: "#FFFFFF", color: "#475569", fontSize: 13, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s",
            }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "9px 18px", borderRadius: 8, border: "none",
              background: loading ? "#94A3B8" : v.bg, color: "#FFFFFF",
              fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 6,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && (
              <span style={{
                display: "inline-block", width: 14, height: 14,
                border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff",
                borderRadius: "50%", animation: "cdSpin 0.6s linear infinite",
              }} />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cdFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cdSlideIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes cdSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
