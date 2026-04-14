import React, { useState } from 'react';
import { T } from '../../../components/ui/tokens';
import { CheckCircle, AlertTriangle, Copy, Check, ExternalLink, Key, Link2, Clock, User } from 'lucide-react';

/** Copy button — MUST have type="button" to prevent form submission */
function CopyButton({ valueToCopy, label }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(valueToCopy).catch(() => {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = valueToCopy;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: copied ? T.successBg : T.surfaceAlt,
        border: `1px solid ${copied ? T.successBorder : T.border}`,
        borderRadius: T.radius.sm,
        padding: '5px 10px',
        fontSize: 12.5,
        fontWeight: 600,
        color: copied ? T.success : T.textSecondary,
        cursor: 'pointer',
        transition: T.transition,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function InviteResultCard({
  visible,
  recipientIdentifier,
  expiresAt,
  inviteCode,
  activationUrl,
  message,
}) {
  if (!visible) return null;

  const isDeliveryWarning = !!(
    message?.toLowerCase().includes('delivery failed') ||
    message?.toLowerCase().includes('manually')
  );

  const theme = isDeliveryWarning
    ? { bg: T.warnBg, border: T.warnBorder, iconColor: T.warn, Icon: AlertTriangle, heading: 'Invite Created — Manual Delivery Required' }
    : { bg: T.successBg, border: T.successBorder, iconColor: T.success, Icon: CheckCircle, heading: 'Invitation Issued Successfully' };

  const { Icon, iconColor, heading } = theme;

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const hasArtifacts = !!(inviteCode || activationUrl);

  return (
    <div style={{
      backgroundColor: theme.bg,
      border: `1px solid ${theme.border}`,
      borderRadius: T.radius.lg,
      overflow: 'hidden',
    }}>
      {/* Status header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: T.space.md,
        padding: `${T.space.md}px ${T.space.lg}px`,
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <Icon size={17} color={iconColor} strokeWidth={2.2} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{heading}</span>
      </div>

      <div style={{ padding: T.space.lg, display: 'flex', flexDirection: 'column', gap: T.space.lg }}>
        {/* API message */}
        <p style={{ margin: 0, fontSize: 13, color: T.textSecondary, lineHeight: 1.6 }}>{message}</p>

        {/* Metadata row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto 1fr',
          gap: `${T.space.sm}px ${T.space.lg}px`,
          alignItems: 'center',
          padding: `${T.space.sm}px ${T.space.md}px`,
          background: `${iconColor}08`,
          borderRadius: T.radius.md,
          border: `1px solid ${theme.border}`,
        }}>
          <User size={13} color={T.muted} />
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Recipient</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginTop: 1 }}>{recipientIdentifier}</div>
          </div>
          <Clock size={13} color={T.muted} />
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Valid until</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textSecondary, marginTop: 1 }}>{formattedExpiry}</div>
          </div>
        </div>

        {/* Activation artifacts — only present in non-production */}
        {hasArtifacts && (
          <div style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius.md,
            overflow: 'hidden',
          }}>
            {/* Artifact panel header */}
            <div style={{
              padding: `${T.space.sm}px ${T.space.md}px`,
              background: T.surfaceAlt,
              borderBottom: `1px solid ${T.borderLight}`,
              fontSize: 10.5, fontWeight: 700, color: T.muted,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Manual Activation Artifacts
            </div>

            <div style={{ padding: T.space.lg, display: 'flex', flexDirection: 'column', gap: T.space.xl }}>
              {/* Activation URL */}
              {activationUrl && (
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 10.5, fontWeight: 700, color: T.muted,
                    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
                  }}>
                    <Link2 size={11} />
                    Activation URL
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: T.space.sm }}>
                    {/* URL display — wraps, monospace, readable */}
                    <div style={{
                      flex: 1,
                      fontFamily: 'ui-monospace, SFMono-Regular, "Courier New", monospace',
                      fontSize: 11.5,
                      color: T.textSecondary,
                      background: T.surfaceAlt,
                      border: `1px solid ${T.border}`,
                      borderRadius: T.radius.sm,
                      padding: '7px 10px',
                      wordBreak: 'break-all',
                      lineHeight: 1.7,
                      minWidth: 0,
                    }}>
                      {activationUrl}
                    </div>
                    {/* Action buttons stacked */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <CopyButton valueToCopy={activationUrl} label="activation URL" />
                      <a
                        href={activationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: T.accentLight, border: `1px solid ${T.accent}30`,
                          borderRadius: T.radius.sm, padding: '5px 10px',
                          fontSize: 12.5, fontWeight: 600, color: T.accent,
                          textDecoration: 'none', cursor: 'pointer',
                          transition: T.transition, whiteSpace: 'nowrap',
                        }}
                        title="Open the activation page in a new tab to verify"
                      >
                        <ExternalLink size={12} />
                        Open
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Invite code */}
              {inviteCode && (
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 10.5, fontWeight: 700, color: T.muted,
                    textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
                  }}>
                    <Key size={11} />
                    Invite Code
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: T.space.sm }}>
                    <div style={{
                      flex: 1,
                      fontFamily: 'ui-monospace, SFMono-Regular, "Courier New", monospace',
                      fontSize: 20,
                      fontWeight: 800,
                      color: T.text,
                      letterSpacing: '0.18em',
                      background: T.surfaceAlt,
                      border: `1px solid ${T.border}`,
                      borderRadius: T.radius.sm,
                      padding: '10px 14px',
                      textAlign: 'center',
                    }}>
                      {inviteCode}
                    </div>
                    <CopyButton valueToCopy={inviteCode} label="invite code" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
