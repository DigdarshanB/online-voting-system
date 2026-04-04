import React from 'react';
import { tokens } from './tokens';

export default function SectionHeader({ title, description, actions, summary }) {
  const headerStyle = {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
    borderBottom: `1px solid ${tokens.cardBorder}`,
    marginBottom: tokens.spacing.lg,
  };

  const textWrapperStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  };

  const titleStyle = {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: tokens.text.primary,
    lineHeight: 1.3,
  };

  const descriptionStyle = {
    margin: 0,
    fontSize: 14,
    color: tokens.text.secondary,
    maxWidth: "60ch",
  };

  return (
    <header style={headerStyle}>
      <div style={textWrapperStyle}>
        <h2 style={titleStyle}>{title}</h2>
        {description && <p style={descriptionStyle}>{description}</p>}
      </div>
      {(actions || summary) && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          {summary}
          {actions}
        </div>
      )}
    </header>
  );
}
