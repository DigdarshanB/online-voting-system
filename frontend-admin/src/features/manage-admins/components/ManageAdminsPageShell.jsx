import React from 'react';
import { tokens } from './tokens';

export default function ManageAdminsPageShell({ children }) {
  const shellStyle = {
    padding: `${tokens.spacing.xxl}px ${tokens.spacing.xl}px`,
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
  };

  const headerStyle = {
    marginBottom: tokens.spacing.xxl,
    borderBottom: `1px solid ${tokens.cardBorder}`,
    paddingBottom: tokens.spacing.xl,
  };

  const titleStyle = {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
    color: tokens.text.primary,
    lineHeight: '1.2',
  };

  const subtitleStyle = {
    margin: `${tokens.spacing.sm}px 0 0 0`,
    fontSize: "16px",
    color: tokens.text.secondary,
    maxWidth: '75ch',
  };
  
  const contentStyle = {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacing.xxxl,
  };

  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>
          Administrator Access Governance
        </h1>
        <p style={subtitleStyle}>
          Manage administrative accounts, pending enrollments, and security credentials for the system.
        </p>
      </header>
      <main style={contentStyle}>
        {children}
      </main>
    </div>
  );
}
