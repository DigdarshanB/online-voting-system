import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { tokens } from './tokens';

export default function SecurityWorkflowBanner({ count = 0, onJumpToQueue }) {
  if (count === 0) return null;

  const bannerStyle = {
    display: "flex",
    alignItems: "flex-start",
    gap: tokens.spacing.lg,
    backgroundColor: tokens.status.warning.background,
    border: `1px solid ${tokens.status.warning.text}`,
    borderRadius: tokens.borderRadius.large,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.xl,
  };

  const textStyle = {
    margin: 0,
    fontSize: 14,
    color: tokens.text.primary,
    flexGrow: 1,
    lineHeight: 1.5,
  };

  const buttonStyle = {
    flexShrink: 0,
    padding: "6px 12px",
    fontSize: "13px",
    fontWeight: 600,
    border: `1px solid ${tokens.status.warning.text}`,
    borderRadius: tokens.borderRadius.small,
    backgroundColor: "transparent",
    color: tokens.status.warning.text,
    cursor: "pointer",
    transition: "background-color 0.2s, color 0.2s",
  };

  return (
    <div style={bannerStyle}>
      <AlertTriangle size={20} color={tokens.status.warning.text} style={{ marginTop: 2 }} />
      <p style={textStyle}>
        There {count === 1 ? "is 1 pending" : `are ${count} pending`} TOTP recovery request
        {count === 1 ? "" : "s"} requiring review.
      </p>
      <button
        style={buttonStyle}
        onClick={onJumpToQueue}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = tokens.status.warning.text;
          e.currentTarget.style.color = tokens.status.warning.background;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = tokens.status.warning.text;
        }}
      >
        Review Queue
      </button>
    </div>
  );
}
