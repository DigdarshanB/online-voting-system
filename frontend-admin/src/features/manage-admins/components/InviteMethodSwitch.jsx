import React from 'react';
import { tokens } from './tokens';

const containerStyle = {
  border: `1px solid ${tokens.cardBorder}`,
  borderRadius: tokens.borderRadius.large,
  backgroundColor: tokens.cardBackground,
};

const baseButtonStyle = {
  flex: 1,
  width: '50%',
  border: "none",
  background: "transparent",
  color: tokens.text.secondary,
  fontWeight: 500,
  padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
  borderRadius: tokens.borderRadius.medium,
  fontSize: 14,
  cursor: "pointer",
  transition: "background-color 0.2s ease, color 0.2s ease",
  textAlign: 'center',
};

const activeButtonStyle = {
  ...baseButtonStyle,
  backgroundColor: tokens.pageBackground,
  color: tokens.text.primary,
  fontWeight: 600,
};

const switchContainerStyle = {
  display: "flex",
  padding: tokens.spacing.xs,
  borderRadius: tokens.borderRadius.large,
  backgroundColor: tokens.pageBackground,
  border: `1px solid ${tokens.cardBorder}`,
};

const descriptionStyle = {
  fontSize: 13,
  color: tokens.text.muted,
  padding: `0 ${tokens.spacing.lg}px ${tokens.spacing.md}px`,
  margin: 0,
  marginTop: `-${tokens.spacing.xs}px`,
  lineHeight: 1.5,
};

export default function InviteMethodSwitch({ preferredMethod, onPreferredMethodChange }) {
  const descriptions = {
    link: "Sends a secure, single-use URL to the recipient's email. This is the standard, recommended method.",
    code: "Generates a short-lived alphanumeric code. You must transmit this code to the recipient via a secure, out-of-band channel."
  };

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: tokens.text.primary, display: "block", marginBottom: 8 }}>
        Activation Method
      </label>
      <div style={containerStyle}>
        <div style={switchContainerStyle} role="radiogroup">
          <button
            style={preferredMethod === "link" ? activeButtonStyle : baseButtonStyle}
            onClick={() => onPreferredMethodChange("link")}
            role="radio"
            aria-checked={preferredMethod === "link"}
          >
            Secure Link
          </button>
          <button
            style={preferredMethod === "code" ? activeButtonStyle : baseButtonStyle}
            onClick={() => onPreferredMethodChange("code")}
            role="radio"
            aria-checked={preferredMethod === "code"}
          >
            Manual Code
          </button>
        </div>
        <p style={descriptionStyle}>
          {descriptions[preferredMethod]}
        </p>
      </div>
    </div>
  );
}
