import React from 'react';
import { tokens } from './tokens';

const statusConfig = {
  // Invite Statuses
  ISSUED:  { background: tokens.status.info.background, text: tokens.status.info.text, label: "Issued" },
  SENT:    { background: tokens.status.info.background, text: tokens.status.info.text, label: "Sent" },
  USED:    { background: tokens.status.success.background, text: tokens.status.success.text, label: "Used" },
  REVOKED: { background: tokens.status.warning.background, text: tokens.status.warning.text, label: "Revoked" },
  EXPIRED: { background: tokens.status.neutral.background, text: tokens.status.neutral.text, label: "Expired" },
  
  // Admin/Request Statuses
  PENDING:          { background: tokens.status.warning.background, text: tokens.status.warning.text, label: "Pending" },
  PENDING_MFA:      { background: tokens.status.warning.background, text: tokens.status.warning.text, label: "Awaiting MFA" },
  PENDING_APPROVAL: { background: tokens.status.warning.background, text: tokens.status.warning.text, label: "Awaiting Approval" },
  ACTIVE:           { background: tokens.status.success.background, text: tokens.status.success.text, label: "Active" },
  DISABLED:         { background: tokens.status.danger.background, text: tokens.status.danger.text, label: "Disabled" },
  REJECTED:         { background: tokens.status.danger.background, text: tokens.status.danger.text, label: "Rejected" },

  // Admin Roles
  SUPER_ADMIN: { background: tokens.status.danger.background, text: tokens.status.danger.text, label: "Super Admin" },
  ADMIN:       { background: tokens.status.info.background, text: tokens.status.info.text, label: "Admin" },

  // 2FA Statuses
  TOTP_ENABLED:  { background: tokens.status.success.background, text: tokens.status.success.text, label: "Enabled" },
  TOTP_DISABLED: { background: tokens.status.warning.background, text: tokens.status.warning.text, label: "Disabled" },

  // Default
  DEFAULT: { background: tokens.status.neutral.background, text: tokens.status.neutral.text, label: "Unknown" },
};

export default function StatusPill({ status }) {
  const config = statusConfig[status] || statusConfig.DEFAULT;
  const { background, text, label } = config;
  const displayLabel = status && !statusConfig[status] ? status : label;

  const pillStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "2px 8px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: 600,
    lineHeight: "1.5",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    backgroundColor: background,
    color: text,
  };

  const dotStyle = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: text,
  };

  return (
    <div style={pillStyle} title={`Status: ${label}`}>
      <span style={dotStyle}></span>
      <span>{displayLabel}</span>
    </div>
  );
}
