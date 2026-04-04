import React from 'react';
import { tokens } from './tokens';

const baseButtonStyle = {
  flex: 1,
  border: "none",
  background: "transparent",
  color: tokens.text.secondary,
  fontWeight: 500,
  padding: "6px 12px",
  borderRadius: tokens.borderRadius.small,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "none",
  transition: "all 0.2s ease"
};

const activeButtonStyle = {
  ...baseButtonStyle,
  backgroundColor: tokens.cardBackground,
  color: tokens.text.primary,
  boxShadow: tokens.boxShadow.small,
};

const containerStyle = {
  display: "flex",
  padding: "4px",
  borderRadius: tokens.borderRadius.medium,
  backgroundColor: tokens.pageBackground,
  border: `1px solid ${tokens.cardBorder}`,
  maxWidth: "fit-content",
};

export default function InviteMethodSwitch({ preferredMethod, onPreferredMethodChange }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: tokens.text.primary, display: "block", marginBottom: 8 }}>
        Activation Method
      </label>
      <div style={containerStyle} role="radiogroup">
        <button
          style={preferredMethod === "link" ? activeButtonStyle : baseButtonStyle}
          onClick={() => onPreferredMethodChange("link")}
          role="radio"
          aria-checked={preferredMethod === "link"}
        >
          Activation Link
        </button>
        <button
          style={preferredMethod === "code" ? activeButtonStyle : baseButtonStyle}
          onClick={() => onPreferredMethodChange("code")}
          role="radio"
          aria-checked={preferredMethod === "code"}
        >
          Invite Code
        </button>
      </div>
    </div>
  );
}
