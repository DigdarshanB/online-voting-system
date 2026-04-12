import React from 'react';
import { T } from '../../../components/ui/tokens';

const statusConfig = {
  // Invite Statuses
  ISSUED:  { background: T.infoBg, text: T.info, label: "Issued" },
  SENT:    { background: T.infoBg, text: T.info, label: "Sent" },
  USED:    { background: T.successBg, text: T.success, label: "Used" },
  REVOKED: { background: T.warnBg, text: T.warn, label: "Revoked" },
  EXPIRED: { background: T.surfaceAlt, text: T.muted, label: "Expired" },
  
  // Admin/Request Statuses
  PENDING:          { background: T.warnBg, text: T.warn, label: "Pending" },
  PENDING_MFA:      { background: T.warnBg, text: T.warn, label: "Awaiting MFA" },
  PENDING_APPROVAL: { background: T.warnBg, text: T.warn, label: "Awaiting Approval" },
  ACTIVE:           { background: T.successBg, text: T.success, label: "Active" },
  DISABLED:         { background: T.errorBg, text: T.error, label: "Disabled" },
  REJECTED:         { background: T.errorBg, text: T.error, label: "Rejected" },

  // Admin Roles
  super_admin: { background: `${T.navy}12`, text: T.navy, label: "Super Admin" },
  admin:       { background: T.infoBg, text: T.info, label: "Admin" },
  SUPER_ADMIN: { background: `${T.navy}12`, text: T.navy, label: "Super Admin" },
  ADMIN:       { background: T.infoBg, text: T.info, label: "Admin" },

  // 2FA Statuses
  TOTP_ENABLED:  { background: T.successBg, text: T.success, label: "Enabled" },
  TOTP_DISABLED: { background: T.warnBg, text: T.warn, label: "Not Set Up" },

  // Default
  DEFAULT: { background: T.surfaceAlt, text: T.muted, label: "Unknown" },
};

export default function StatusPill({ status, size = "default" }) {
  const config = statusConfig[status] || statusConfig.DEFAULT;
  const { background, text, label } = config;
  const displayLabel = status && !statusConfig[status] ? status : label;

  const isSmall = size === "small";

  const pillStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: isSmall ? "4px" : "5px",
    padding: isSmall ? "1px 6px" : "3px 10px",
    borderRadius: "9999px",
    fontSize: isSmall ? "10px" : "11px",
    fontWeight: 600,
    lineHeight: "1.5",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    backgroundColor: background,
    color: text,
    whiteSpace: "nowrap",
    border: `1px solid ${text}18`,
  };

  const dotStyle = {
    width: isSmall ? "5px" : "6px",
    height: isSmall ? "5px" : "6px",
    borderRadius: "50%",
    backgroundColor: text,
    flexShrink: 0,
  };

  return (
    <span style={pillStyle} title={`Status: ${label}`}>
      <span style={dotStyle} />
      <span>{displayLabel}</span>
    </span>
  );
}
