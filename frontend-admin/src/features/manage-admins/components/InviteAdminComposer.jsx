import React, { useState } from 'react';
import { tokens } from './tokens';
import { T } from '../../../components/ui/tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import InviteMethodSwitch from './InviteMethodSwitch';
import InviteResultCard from './InviteResultCard';
import { UserPlus, AlertCircle, Send, RotateCcw } from 'lucide-react';

export default function InviteAdminComposer({
  recipientEmail,
  onRecipientEmailChange,
  onSubmit,
  submitting = false,
  error = "",
  resultProps,
  onDismissResult,
}) {
  const [preferredMethod, setPreferredMethod] = useState("link");
  const [emailFocused, setEmailFocused] = useState(false);

  const hasResult = !!(resultProps?.visible);

  const inputLabelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: T.muted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "block",
    marginBottom: 6,
  };

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: T.radius.md,
    border: `1px solid ${error ? T.errorBorder : emailFocused ? T.accent : T.border}`,
    fontSize: 14,
    color: T.text,
    backgroundColor: (submitting || hasResult) ? T.surfaceAlt : T.surface,
    boxSizing: "border-box",
    transition: `border-color ${T.transitionFast}, box-shadow ${T.transitionFast}`,
    boxShadow: emailFocused ? T.focusRing : "none",
    outline: "none",
  };

  const isDisabled = submitting || !recipientEmail.trim();

  const primaryBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: T.space.sm,
    padding: "12px 24px",
    backgroundColor: isDisabled ? T.surfaceSubtle : T.navy,
    color: isDisabled ? T.muted : "#FFFFFF",
    border: isDisabled ? `1px solid ${T.border}` : "none",
    borderRadius: T.radius.md,
    fontWeight: 700,
    fontSize: 14,
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: T.transition,
    width: "100%",
    boxShadow: isDisabled ? "none" : T.shadow.sm,
  };

  const secondaryBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: T.space.sm,
    padding: "10px 24px",
    backgroundColor: "transparent",
    color: T.textSecondary,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius.md,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
    transition: T.transition,
    width: "100%",
  };

  return (
    <SectionCard accentColor={T.navy}>
      <SectionHeader
        icon={UserPlus}
        title="Provision New Administrator"
        description="Issue a secure, single-use invitation to a trusted candidate."
      />
      <form
        style={{ display: "flex", flexDirection: "column", gap: T.space.xl }}
        onSubmit={onSubmit}
        noValidate
      >
        {/* Email field — always rendered; disabled after result */}
        <div>
          <label htmlFor="recipient-email" style={inputLabelStyle}>
            Candidate Email Address
          </label>
          <input
            id="recipient-email"
            type="email"
            style={inputStyle}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            placeholder="candidate.name@gov.np"
            value={recipientEmail}
            onChange={(e) => onRecipientEmailChange(e.target.value)}
            disabled={submitting || hasResult}
            autoComplete="off"
            aria-describedby={error ? "email-error" : "email-helper"}
            aria-invalid={!!error}
          />
          {error ? (
            <div
              id="email-error"
              role="alert"
              style={{
                display: "flex", alignItems: "flex-start", gap: T.space.sm,
                marginTop: T.space.sm,
                color: T.error, fontSize: 12.5, lineHeight: 1.5,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          ) : (
            <p id="email-helper" style={{ fontSize: 12, color: T.muted, margin: "6px 0 0", lineHeight: 1.4 }}>
              This email becomes the administrator&rsquo;s login credential and cannot be changed post-activation.
            </p>
          )}
        </div>

        {/* Method switch — hidden once invite result is shown */}
        {!hasResult && (
          <InviteMethodSwitch
            preferredMethod={preferredMethod}
            onPreferredMethodChange={setPreferredMethod}
          />
        )}

        {/* Result card */}
        {hasResult && <InviteResultCard {...resultProps} />}

        {/* Primary CTA */}
        {hasResult ? (
          <button
            type="button"
            onClick={onDismissResult}
            style={secondaryBtnStyle}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.surfaceAlt)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <RotateCcw size={14} />
            Issue Another Invitation
          </button>
        ) : (
          <button
            type="submit"
            disabled={isDisabled}
            style={primaryBtnStyle}
            onMouseOver={(e) => { if (!isDisabled) e.currentTarget.style.backgroundColor = T.accentHover; }}
            onMouseOut={(e) => { if (!isDisabled) e.currentTarget.style.backgroundColor = T.navy; }}
          >
            <Send size={15} />
            {submitting ? "Issuing Invitation…" : "Issue Secure Invitation"}
          </button>
        )}
      </form>
    </SectionCard>
  );
}
