import React from 'react';
import { T } from '../../../components/ui/tokens';

const statusConfig = {
  PENDING_REVIEW: { background: T.warnBg, text: T.warn, label: "Pending Review" },
  ACTIVE:         { background: T.successBg, text: T.success, label: "Verified" },
  REJECTED:       { background: T.errorBg, text: T.error, label: "Rejected" },
  DISABLED:       { background: T.errorBg, text: T.error, label: "Disabled" },
  DEFAULT:        { background: T.infoBg, text: T.info, label: "Unknown" },
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
