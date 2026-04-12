import React, { useState } from 'react';
import { tokens } from './tokens';
import { T } from '../../../components/ui/tokens';
import { CheckCircle, AlertTriangle, Copy, ExternalLink } from 'lucide-react';

function CopyButton({ onCopy, valueToCopy }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(valueToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    background: 'transparent',
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.medium,
    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.text.secondary,
    cursor: 'pointer',
    transition: 'background-color 0.2s, color 0.2s',
  };

  const buttonHoverStyle = {
    backgroundColor: tokens.pageBackground,
    color: tokens.text.primary,
  };

  return (
    <button
      style={buttonStyle}
      onClick={handleClick}
      onMouseOver={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
      onMouseOut={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent', color: tokens.text.secondary })}
    >
      {copied ? <CheckCircle size={16} color={tokens.status.success.text} /> : <Copy size={16} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
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

  const isDeliveryFailure = message?.includes('delivery failed');
  const Icon = isDeliveryFailure ? AlertTriangle : CheckCircle;
  const iconColor = isDeliveryFailure ? tokens.status.warning.text : tokens.status.success.text;
  const backgroundColor = isDeliveryFailure ? tokens.status.warning.background : tokens.status.success.background;
  const borderColor = isDeliveryFailure ? tokens.status.warning.border : tokens.status.success.border;

  const containerStyle = {
    backgroundColor,
    border: `1px solid ${borderColor}`,
    borderRadius: tokens.borderRadius.large,
    padding: tokens.spacing.xl,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacing.lg,
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacing.md,
    fontSize: 16,
    fontWeight: 600,
    color: iconColor,
  };

  const infoGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'max-content 1fr',
    gap: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
    alignItems: 'center',
  };

  const labelStyle = {
    fontWeight: 500,
    color: tokens.text.secondary,
    fontSize: 13,
  };

  const valueStyle = {
    fontWeight: 600,
    color: tokens.text.primary,
    fontSize: 14,
  };

  const artifactContainer = {
    marginTop: tokens.spacing.sm,
    padding: tokens.spacing.lg,
    backgroundColor: tokens.cardBackground,
    borderRadius: tokens.borderRadius.medium,
    border: `1px solid ${tokens.cardBorder}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  };

  const artifactRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.lg,
  };

  const artifactValue = {
    fontFamily: 'monospace',
    fontSize: 14,
    color: tokens.text.primary,
    backgroundColor: tokens.pageBackground,
    padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
    borderRadius: tokens.borderRadius.small,
    border: `1px solid ${tokens.cardBorder}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <Icon size={22} />
        <span>{isDeliveryFailure ? 'Invite Created with Warning' : 'Invite Issued Successfully'}</span>
      </div>
      
      <p style={{ margin: 0, color: tokens.text.secondary, fontSize: 14 }}>{message}</p>

      <div style={infoGridStyle}>
        <span style={labelStyle}>Recipient:</span>
        <span style={valueStyle}>{recipientIdentifier}</span>
        <span style={labelStyle}>Expires:</span>
        <span style={valueStyle}>{new Date(expiresAt).toLocaleString()}</span>
      </div>

      {(inviteCode || activationUrl) && (
        <div style={artifactContainer}>
          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: tokens.text.primary }}>
            Manual Activation Artifacts
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: tokens.text.muted }}>
            If email delivery failed or you need to provide credentials out-of-band, use the following.
          </p>
          
          {activationUrl && (
            <div style={artifactRow}>
              <span style={artifactValue}>{activationUrl}</span>
              <CopyButton valueToCopy={activationUrl} />
            </div>
          )}
          
          {inviteCode && (
            <div style={artifactRow}>
              <span style={{...artifactValue, fontWeight: 700}}>{inviteCode}</span>
              <CopyButton valueToCopy={inviteCode} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
