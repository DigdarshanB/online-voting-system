import React from 'react';
import { tokens } from './tokens';

export default function GovernanceSummaryStrip({
  activeAdminCount = 0,
  issuedInviteCount = 0,
  pendingRecoveryCount = 0
}) {
  const items = [
    {
      label: "Active Admins",
      count: activeAdminCount,
      description: "Governing active privileged access",
      color: tokens.status.info.text,
    },
    {
      label: "Issued Invites",
      count: issuedInviteCount,
      description: "Pending activation links and codes",
      color: tokens.text.secondary,
    },
    {
      label: "Recovery Requests",
      count: pendingRecoveryCount,
      description: "Pending TOTP resets requiring review",
      color: pendingRecoveryCount > 0 ? tokens.status.warning.text : tokens.status.success.text,
    }
  ];

  const stripStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
    gap: tokens.spacing.lg,
    width: "100%",
  };

  return (
    <div style={stripStyle}>
      {items.map((item, index) => (
        <div key={index} style={{
          backgroundColor: tokens.cardBackground,
          border: `1px solid ${tokens.cardBorder}`,
          borderRadius: tokens.borderRadius.large,
          padding: tokens.spacing.lg,
          display: "flex",
          flexDirection: "column",
          gap: tokens.spacing.xs,
          boxShadow: tokens.boxShadow.small,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: tokens.text.secondary,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            {item.label}
          </h3>
          <div style={{
            fontSize: 32,
            fontWeight: 800,
            color: item.color,
            lineHeight: 1
          }}>
            {item.count}
          </div>
          <p style={{
            margin: 0,
            fontSize: 13,
            color: tokens.text.muted
          }}>
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
