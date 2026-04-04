import React from 'react';
import { tokens } from './tokens';
import { CheckCircle, Link as LinkIcon, Copy } from 'lucide-react';

export default function InviteResultCard({
  visible,
  activationUrl,
  inviteCode,
  expiresAt,
  onCopyLink,
  onCopyCode,
  copiedState = ""
}) {
  if (!visible) return null;

  const containerStyle = {
    backgroundColor: tokens.status.success.background,
    border: `1px solid ${tokens.status.success.text}`,
    borderRadius: tokens.borderRadius.large,
    padding: tokens.spacing.lg,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacing.md
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.sm,
    fontSize: 14,
    fontWeight: 600,
    color: tokens.status.success.text,
  };

  const descriptionStyle = {
    margin: 0,
    fontSize: 14,
    color: tokens.text.secondary,
  };

  const artifactBaseStyle = {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.sm,
    backgroundColor: tokens.cardBackground,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    borderRadius: tokens.borderRadius.medium,
    border: `1px solid ${tokens.cardBorder}`,
  };

  const artifactTextStyle = {
    margin: 0,
    fontSize: 13,
    fontFamily: "monospace",
    color: tokens.text.primary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  };

  const copyButtonStyle = {
    marginLeft: "auto",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: "4px 8px",
    backgroundColor: "transparent",
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.small,
    fontSize: 12,
    fontWeight: 600,
    color: tokens.status.success.text,
    cursor: "pointer",
    transition: "background-color 0.2s",
  };

  const expiresStyle = {
    marginTop: tokens.spacing.xs,
    fontSize: 12,
    color: tokens.text.muted,
    textAlign: "center",
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <CheckCircle size={18} />
        <span>Invite Issued Successfully</span>
      </div>
      <p style={descriptionStyle}>
        The recipient has been sent an email. You can also share the sensitive activation link or code directly.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={artifactBaseStyle}>
          <LinkIcon size={16} style={{ color: tokens.status.success.text, flexShrink: 0 }} />
          <span style={artifactTextStyle}>{activationUrl}</span>
          <button
            style={copyButtonStyle}
            onClick={onCopyLink}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.8)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {copiedState === "link" ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copiedState === "link" ? "Copied" : "Copy Link"}
          </button>
        </div>

        <div style={artifactBaseStyle}>
          <span style={{ ...artifactTextStyle, flexGrow: 0, fontWeight: 700 }}>{inviteCode}</span>
          <div style={{ flexGrow: 1 }}></div>
          <button
            style={copyButtonStyle}
            onClick={onCopyCode}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.8)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {copiedState === "code" ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copiedState === "code" ? "Copied" : "Copy Code"}
          </button>
        </div>
      </div>

      {expiresAt && <div style={expiresStyle}>Expires: {expiresAt}</div>}
    </div>
  );
}
