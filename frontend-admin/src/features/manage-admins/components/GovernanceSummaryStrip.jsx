import React from 'react';
import { tokens } from './tokens';

function SummaryCard({ label, count, description, countColor }) {
  const cardStyle = {
    backgroundColor: tokens.cardBackground,
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.medium,
    padding: `${tokens.spacing.lg}px ${tokens.spacing.xl}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
    boxShadow: tokens.boxShadow.xs,
  };

  const labelStyle = {
    margin: 0,
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const countStyle = {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: countColor || tokens.text.primary,
    lineHeight: 1,
  };

  const descriptionStyle = {
    margin: 0,
    fontSize: '13px',
    color: tokens.text.muted,
    minHeight: '2.5em', // Reserve space for 2 lines
  };

  return (
    <div style={cardStyle}>
      <h3 style={labelStyle}>{label}</h3>
      <p style={countStyle}>{count}</p>
      <p style={descriptionStyle}>{description}</p>
    </div>
  );
}

export default function GovernanceSummaryStrip({
  activeAdminCount = 0,
  issuedInviteCount = 0,
  pendingRecoveryCount = 0
}) {
  const items = [
    {
      label: "Active Admins",
      count: activeAdminCount,
      description: "Accounts with active system access.",
      color: tokens.text.primary,
    },
    {
      label: "Issued Invites",
      count: issuedInviteCount,
      description: "Unactivated invitations sent to candidates.",
      color: tokens.text.primary,
    },
    {
      label: "Recovery Requests",
      count: pendingRecoveryCount,
      description: "Requests for multi-factor auth reset.",
      color: pendingRecoveryCount > 0 ? tokens.status.warning.text : tokens.text.primary,
    }
  ];

  const stripStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
    gap: tokens.spacing.lg,
    width: "100%",
  };

  return (
    <div style={stripStyle}>
      {items.map((item, index) => (
        <SummaryCard
          key={index}
          label={item.label}
          count={item.count}
          description={item.description}
          countColor={item.color}
        />
      ))}
    </div>
  );
}
