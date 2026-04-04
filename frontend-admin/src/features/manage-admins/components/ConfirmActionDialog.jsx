import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';
import { AlertTriangle } from 'lucide-react';

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
  reasonPlaceholder = "Provide a justification for the audit log...",
  children,
}) {
  const [reason, setReason] = useState('');
  const [canConfirm, setCanConfirm] = useState(!requiresReason);

  useEffect(() => {
    if (requiresReason) {
      setCanConfirm(reason.trim().length > 0);
    }
  }, [reason, requiresReason]);

  useEffect(() => {
    // Reset reason when dialog is opened/closed
    if (open) {
      setReason('');
      setCanConfirm(!requiresReason);
    }
  }, [open, requiresReason]);

  if (!open) return null;

  const backdropStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const dialogStyle = {
    backgroundColor: tokens.cardBackground,
    borderRadius: tokens.borderRadius.large,
    padding: tokens.spacing.xxl,
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    border: `1px solid ${tokens.cardBorder}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg,
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.md,
  };

  const titleStyle = {
    fontSize: 18,
    fontWeight: 600,
    color: isDestructive ? tokens.status.danger.text : tokens.text.primary,
  };

  const descriptionStyle = {
    fontSize: 14,
    color: tokens.text.secondary,
    lineHeight: 1.6,
  };

  const reasonInputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.medium,
    backgroundColor: tokens.input.background,
    color: tokens.text.primary,
    marginTop: tokens.spacing.md,
  };

  const footerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.lg,
  };

  const buttonBaseStyle = {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 600,
    borderRadius: tokens.borderRadius.medium,
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s, opacity 0.2s',
  };

  const confirmButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: isDestructive ? tokens.status.danger.background : tokens.button.primary.background,
    color: isDestructive ? tokens.status.danger.text : '#FFFFFF',
  };
  
  const disabledConfirmStyle = {
    ...confirmButtonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  const cancelButtonStyle = {
    ...buttonBaseStyle,
    backgroundColor: tokens.input.background,
    color: tokens.text.secondary,
    border: `1px solid ${tokens.cardBorder}`,
  };

  const handleConfirm = () => {
    if (requiresReason) {
      onConfirm(reason);
    } else {
      onConfirm();
    }
  };

  return (
    <div style={backdropStyle} onClick={onCancel}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          {isDestructive && <AlertTriangle size={24} color={tokens.status.danger.text} />}
          <h2 style={titleStyle}>{title}</h2>
        </div>
        <p style={descriptionStyle}>{description}</p>
        
        {children}

        {requiresReason && (
          <div>
            <label htmlFor="action-reason" style={{ fontSize: 13, fontWeight: 500, color: tokens.text.secondary }}>
              {reasonLabel}
            </label>
            <textarea
              id="action-reason"
              rows="3"
              style={reasonInputStyle}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div style={footerStyle}>
          <button style={cancelButtonStyle} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button 
            style={canConfirm ? confirmButtonStyle : disabledConfirmStyle} 
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
