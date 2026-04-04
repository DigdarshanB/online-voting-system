import React from 'react';
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
  preferredMethod,
  onPreferredMethodChange,
  resultProps,
  summarySlot = null
}) {
  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacing.lg,
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
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderStrong}`,
    fontSize: 15,
    color: tokens.text.primary,
    backgroundColor: submitting ? tokens.pageBackground : tokens.cardBackground,
    boxSizing: "border-box",
    transition: "border-color 0.2s, background-color 0.2s",
  };

  const buttonStyle = {
    padding: "12px 24px",
    backgroundColor: tokens.brand,
    color: tokens.surface,
    border: "none",
    borderRadius: tokens.radius.md,
    fontWeight: 600,
    fontSize: 14,
    cursor: submitting || !recipientEmail ? "not-allowed" : "pointer",
    opacity: submitting || !recipientEmail ? 0.7 : 1,
    transition: "opacity 0.2s ease, background-color 0.2s ease",
  };

  return (
    <SectionCard>
      <SectionHeader
        title="Provision Administrator Access"
        description="Issue a new single-use invitation to a trusted individual."
        summary={summarySlot}
      />
      <form style={formStyle} onSubmit={onSubmit}>
        <div>
          <label htmlFor="recipient-email" style={inputLabelStyle}>
            Recipient Email Address
          </label>
          <input
            id="recipient-email"
            type="email"
            style={inputStyle}
            placeholder="e.g., new.admin@gov.np"
            value={recipientEmail}
            onChange={(e) => onRecipientEmailChange(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <InviteMethodSwitch preferredMethod={preferredMethod} onPreferredMethodChange={onPreferredMethodChange} />

        {error && (
          <div style={{
            backgroundColor: tokens.status.danger.background,
            color: tokens.status.danger.text,
            padding: tokens.spacing.md,
            borderRadius: tokens.borderRadius.medium,
            fontSize: 14,
            fontWeight: 500,
            border: `1px solid ${tokens.status.danger.text}`
          }}>
            {error}
          </div>
        )}

        {resultProps && resultProps.visible ? (
          <div style={{ marginTop: tokens.spacing.sm }}>
            <InviteResultCard {...resultProps} />
          </div>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: tokens.spacing.sm,
          }}>
            <button
              type="submit"
              disabled={submitting || !recipientEmail}
              style={buttonStyle}
            >
              {submitting ? "Creating Invite..." : "Create Invite"}
            </button>
          </div>
        )}
      </form>
    </SectionCard>
  );
}
