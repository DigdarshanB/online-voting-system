import React from 'react';
import { tokens } from './tokens';

const statusColors = {
  // Invite Statuses
  ISSUED:  { background: tokens.status.info.background, text: tokens.status.info.text },
  USED:    { background: tokens.status.success.background, text: tokens.status.success.text },
  REVOKED: { background: tokens.status.warning.background, text: tokens.status.warning.text },
  EXPIRED: { background: tokens.status.neutral.background, text: tokens.status.neutral.text },
  // Admin/Request Statuses
  PENDING: { background: tokens.status.warning.background, text: tokens.status.warning.text },
  ACTIVE:  { background: tokens.status.success.background, text: tokens.status.success.text },
  // Default
  DEFAULT: { background: tokens.status.neutral.background, text: tokens.status.neutral.text },
};

export default function StatusPill({ status }) {
  const { bg, text } = statusColors[status] || statusColors.DEFAULT;

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
    backgroundColor: bg,
    color: text,
  };

  const dotStyle = {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: text,
  };

  return (
    <div style={pillStyle}>
      <span style={dotStyle}></span>
      <span>{status}</span>
    </div>
  );
}
