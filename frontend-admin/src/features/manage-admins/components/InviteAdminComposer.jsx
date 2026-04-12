import React, { useState } from 'react';
import { tokens } from './tokens';
import { T } from '../../../components/ui/tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import InviteMethodSwitch from './InviteMethodSwitch';
import InviteResultCard from './InviteResultCard';
import { UserPlus, AlertCircle, Send } from 'lucide-react';

export default function InviteAdminComposer({
  recipientEmail,
  onRecipientEmailChange,
  onSubmit,
  submitting = false,
  error = "",
  resultProps,
}) {
  const [preferredMethod, setPreferredMethod] = useState("link");
  const [emailFocused, setEmailFocused] = useState(false);

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: T.space.xl,
  };

  const inputLabelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: T.text,
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
    backgroundColor: submitting ? T.surfaceAlt : T.surface,
    boxSizing: "border-box",
    transition: `border-color ${T.transitionFast}, box-shadow ${T.transitionFast}`,
    boxShadow: emailFocused ? T.focusRing : "none",
    outline: "none",
  };

  const helperTextStyle = {
    fontSize: 12,
    color: T.muted,
    margin: `6px 0 0 0`,
    lineHeight: 1.4,
  };

  const isDisabled = submitting || !recipientEmail;

  const buttonStyle = {
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
    width: '100%',
    boxShadow: isDisabled ? "none" : T.shadow.sm,
  };

  return (
    <SectionCard accentColor={T.navy}>
      <SectionHeader
        icon={UserPlus}
        title="Provision New Administrator"
        description="Issue a secure, single-use invitation to a trusted candidate."
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
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            placeholder="candidate.name@gov.np"
            value={recipientEmail}
            onChange={(e) => onRecipientEmailChange(e.target.value)}
            disabled={submitting}
            required
            aria-describedby="email-helper-text"
            aria-invalid={!!error}
          />
          <p id="email-helper-text" style={helperTextStyle}>
            This email becomes the administrator's login credential.
          </p>
        </div>

        <InviteMethodSwitch 
          preferredMethod={preferredMethod} 
          onPreferredMethodChange={setPreferredMethod} 
        />

        {error && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: T.space.md,
            backgroundColor: T.errorBg,
            color: T.error,
            padding: `${T.space.md}px ${T.space.lg}px`,
            borderRadius: T.radius.md,
            fontSize: 13,
            fontWeight: 500,
            border: `1px solid ${T.errorBorder}`,
            lineHeight: 1.5,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div><strong>Invitation Failed:</strong> {error}</div>
          </div>
        )}

        {resultProps && resultProps.visible ? (
          <div style={{ marginTop: T.space.xs }}>
            <InviteResultCard {...resultProps} />
          </div>
        ) : (
          <button
            type="submit"
            disabled={isDisabled}
            style={buttonStyle}
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
