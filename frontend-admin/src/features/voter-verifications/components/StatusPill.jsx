import React from 'react';
import { tokens } from './tokens';

const statusConfig = {
  // Voter Statuses
  PENDING_REVIEW: { background: tokens.status.warning.background, text: tokens.status.warning.text, label: "Pending Review" },
  ACTIVE:         { background: tokens.status.success.background, text: tokens.status.success.text, label: "Verified" },
  REJECTED:       { background: tokens.status.danger.background, text: tokens.status.danger.text, label: "Rejected" },
  DISABLED:       { background: tokens.status.danger.background, text: tokens.status.danger.text, label: "Disabled" },

  // Default
  DEFAULT: { background: tokens.status.info.background, text: tokens.status.info.text, label: "Unknown" },
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
    fontSize: "11px",
    fontWeight: 700,
    lineHeight: "1.5",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    backgroundColor: background,
    color: text,
    whiteSpace: "nowrap"
  };

  const dotStyle = {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    backgroundColor: text,
  };

  return (
    <div style={pillStyle} title={`Status: ${displayLabel}`}>
      <span style={dotStyle}></span>
      <span>{displayLabel}</span>
    </div>
  );
}
