import React, { useState, useEffect, useRef } from 'react';
import { T } from '../../../components/ui/tokens';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ConfirmActionDialog({
  open,
  title,
  description,
  isDestructive = false,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  requiresReason = false,
  reasonLabel = "Reason for Action",
  reasonPlaceholder = "Provide a justification for the audit log…",
  children,
}) {
  const [reason, setReason] = useState('');
  const [canConfirm, setCanConfirm] = useState(!requiresReason);
  const [reasonFocused, setReasonFocused] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (requiresReason) {
      setCanConfirm(reason.trim().length > 0);
    }
  }, [reason, requiresReason]);

  useEffect(() => {
    if (open) {
      setReason('');
      setCanConfirm(!requiresReason);
    }
  }, [open, requiresReason]);

  // Trap focus & escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const accentColor = isDestructive ? T.error : T.navy;
  const accentBg = isDestructive ? T.errorBg : `${T.navy}0D`;
  const Icon = isDestructive ? AlertTriangle : ShieldCheck;

  const handleConfirm = () => {
    if (requiresReason) {
      onConfirm(reason);
    } else {
      onConfirm();
    }
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: T.surface,
          borderRadius: T.radius.xl,
          width: '100%', maxWidth: 480,
          boxShadow: T.shadow.xl,
          border: `1px solid ${T.border}`,
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* Accent header band */}
        <div style={{
          padding: `${T.space.lg}px ${T.space["2xl"]}px`,
          display: 'flex', alignItems: 'center', gap: T.space.md,
          borderBottom: `1px solid ${T.borderLight}`,
          background: accentBg,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: T.radius.lg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: `${accentColor}18`,
          }}>
            <Icon size={18} color={accentColor} />
          </div>
          <h2 id="confirm-dialog-title" style={{
            fontSize: 17, fontWeight: 700, color: T.text, margin: 0,
          }}>
            {title}
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: T.space["2xl"], display: 'flex', flexDirection: 'column', gap: T.space.lg }}>
          <p id="confirm-dialog-desc" style={{
            fontSize: 14, color: T.textSecondary, lineHeight: 1.65, margin: 0,
          }}>
            {description}
          </p>

          {children}

          {requiresReason && (
            <div>
              <label htmlFor="action-reason" style={{
                display: 'block', fontSize: 12.5, fontWeight: 600,
                color: T.textSecondary, marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {reasonLabel}
              </label>
              <textarea
                id="action-reason"
                rows="3"
                style={{
                  width: '100%', padding: '10px 12px',
                  fontSize: 14, color: T.text,
                  border: `1px solid ${reasonFocused ? accentColor : T.border}`,
                  borderRadius: T.radius.md,
                  backgroundColor: T.surfaceAlt,
                  boxShadow: reasonFocused ? `0 0 0 3px ${accentColor}1A` : 'none',
                  outline: 'none', resize: 'vertical',
                  transition: `border-color ${T.transitionFast}, box-shadow ${T.transitionFast}`,
                  lineHeight: 1.5,
                  boxSizing: 'border-box',
                }}
                placeholder={reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onFocus={() => setReasonFocused(true)}
                onBlur={() => setReasonFocused(false)}
              />
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end',
            gap: T.space.md, paddingTop: T.space.md,
            borderTop: `1px solid ${T.borderLight}`,
          }}>
            <button
              onClick={onCancel}
              style={{
                padding: '9px 18px', fontSize: 13.5, fontWeight: 600,
                borderRadius: T.radius.md,
                border: `1px solid ${T.border}`,
                backgroundColor: 'transparent', color: T.textSecondary,
                cursor: 'pointer', transition: T.transition,
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.surfaceAlt)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              style={{
                padding: '9px 18px', fontSize: 13.5, fontWeight: 600,
                borderRadius: T.radius.md, border: 'none',
                backgroundColor: canConfirm ? (isDestructive ? T.error : T.navy) : T.border,
                color: canConfirm ? '#FFFFFF' : T.muted,
                cursor: canConfirm ? 'pointer' : 'not-allowed',
                transition: T.transition,
                boxShadow: canConfirm ? T.shadow.sm : 'none',
              }}
              onMouseOver={(e) => { if (canConfirm) e.currentTarget.style.opacity = '0.9'; }}
              onMouseOut={(e) => { if (canConfirm) e.currentTarget.style.opacity = '1'; }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
