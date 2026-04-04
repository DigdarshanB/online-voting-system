import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { tokens } from "./tokens";

const backdropStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(15, 23, 42, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: tokens.spacing.lg,
  zIndex: 9999,
};

const buttonBaseStyle = {
  padding: "8px 16px",
  fontSize: "14px",
  fontWeight: 600,
  borderRadius: tokens.borderRadius.medium,
  border: "none",
  cursor: "pointer",
  transition: "background-color 0.2s, border-color 0.2s",
};

export default function ConfirmDangerDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "",
  isDestructive = true,
}) {
  const [reason, setReason] = useState("");
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    if (open) {
      setReason(""); // Reset reason on open
      if (confirmButtonRef.current) {
        confirmButtonRef.current.focus();
      }
    }
  }, [open]);

  if (!open) return null;

  const Icon = isDestructive ? AlertTriangle : CheckCircle;
  const iconColor = isDestructive ? tokens.status.danger.text : tokens.status.success.text;
  const iconBg = isDestructive ? tokens.status.danger.background : tokens.status.success.background;

  const confirmButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: isDestructive ? tokens.button.danger.background : tokens.button.primary.background,
    color: isDestructive ? tokens.button.danger.text : tokens.button.primary.text,
  };

  const cancelButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: tokens.button.secondary.background,
    color: tokens.button.secondary.text,
    border: `1px solid ${tokens.button.secondary.border}`,
  };

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      // Maybe show an error message
      return;
    }
    onConfirm(reason);
  };

  return (
    <div
      style={backdropStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div style={dialogStyle}>
        <div style={{ ...iconWrapperStyle, backgroundColor: iconBg }}>
          <Icon style={{ color: iconColor }} size={22} />
        </div>
        <div style={contentStyle}>
          <h2 id="dialog-title" style={titleStyle}>
            {title}
          </h2>
          <p id="dialog-description" style={descriptionStyle}>
            {description}
          </p>

          {requireReason && (
            <div>
              <label htmlFor="reason-input" style={reasonLabelStyle}>
                {reasonLabel}
              </label>
              <textarea
                id="reason-input"
                style={reasonTextareaStyle}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
              />
            </div>
          )}

          <footer style={footerStyle}>
            <button style={cancelButtonStyle} onClick={onCancel}>
              {cancelLabel}
            </button>
            <button ref={confirmButtonRef} style={confirmButtonStyle} onClick={handleConfirm} disabled={requireReason && !reason.trim()}>
              {confirmLabel}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
