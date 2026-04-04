import React, { useState } from 'react';
import { tokens } from './tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import InviteMethodSwitch from './InviteMethodSwitch';
import InviteResultCard from './InviteResultCard';

export default function InviteAdminComposer({
  recipientEmail,
  onRecipientEmailChange,
  onSubmit,
  submitting = false,
  error = "",
  resultProps,
}) {
  const [preferredMethod, setPreferredMethod] = useState("link");

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacing.xl,
  };

  const inputLabelStyle = {
    fontSize: "13px",
    fontWeight: 600,
    color: tokens.text.primary,
    display: "block",
    marginBottom: "8px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: tokens.borderRadius.medium,
    border: `1px solid ${error ? tokens.status.danger.border : tokens.cardBorder}`,
    fontSize: 15,
    color: tokens.text.primary,
    backgroundColor: submitting ? tokens.pageBackground : tokens.cardBackground,
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };
  
  const inputFocusStyle = {
    outline: 'none',
    borderColor: tokens.brand.primary,
    boxShadow: `0 0 0 3px ${tokens.brand.focusRing}`,
  };

  const helperTextStyle = {
    fontSize: 13,
    color: tokens.text.muted,
    margin: `${tokens.spacing.sm}px 0 0 0`,
  };

  const buttonStyle = {
    padding: "14px 24px",
    backgroundColor: tokens.button.primary.background,
    color: tokens.button.primary.text,
    border: "none",
    borderRadius: tokens.borderRadius.medium,
    fontWeight: 600,
    fontSize: 15,
    cursor: submitting || !recipientEmail ? "not-allowed" : "pointer",
    opacity: submitting || !recipientEmail ? 0.6 : 1,
    transition: "opacity 0.2s ease, background-color 0.2s ease",
    width: '100%',
  };

  return (
    <SectionCard>
      <SectionHeader
        title="Provision New Administrator"
        description="Issue a single-use invitation to a trusted candidate. This action is logged for audit purposes."
      />
      <form style={formStyle} onSubmit={onSubmit}>
        <div>
          <label htmlFor="recipient-email" style={inputLabelStyle}>
            Candidate Email Address
          </label>
          <input
            id="recipient-email"
            type="email"
            style={inputStyle}
            onFocus={(e) => {
              Object.assign(e.target.style, inputFocusStyle);
            }}
            onBlur={(e) => {
              // Reset styles on blur, except for border
              e.target.style.boxShadow = 'none';
              e.target.style.borderColor = error ? tokens.status.danger.border : tokens.cardBorder;
            }}
            placeholder="candidate.name@gov.np"
            value={recipientEmail}
            onChange={(e) => onRecipientEmailChange(e.target.value)}
            disabled={submitting}
            required
            aria-describedby="email-helper-text"
          />
          <p id="email-helper-text" style={helperTextStyle}>The recipient will use this email to log in.</p>
        </div>

        <InviteMethodSwitch 
          preferredMethod={preferredMethod} 
          onPreferredMethodChange={setPreferredMethod} 
        />

        {error && (
          <div style={{
            backgroundColor: tokens.status.danger.background,
            color: tokens.status.danger.text,
            padding: tokens.spacing.md,
            borderRadius: tokens.borderRadius.medium,
            fontSize: 14,
            fontWeight: 500,
            border: `1px solid ${tokens.status.danger.border}`
          }}>
            <strong>Invitation Failed:</strong> {error}
          </div>
        )}

        {resultProps && resultProps.visible ? (
          <div style={{ marginTop: tokens.spacing.sm }}>
            <InviteResultCard {...resultProps} />
          </div>
        ) : (
          <button
            type="submit"
            disabled={submitting || !recipientEmail}
            style={buttonStyle}
          >
            {submitting ? "Issuing Invitation..." : "Issue Secure Invitation"}
          </button>
        )}
      </form>
    </SectionCard>
  );
}
