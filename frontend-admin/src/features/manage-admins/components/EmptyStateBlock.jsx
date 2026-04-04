import React from "react";
import { tokens } from "./tokens";

export default function EmptyStateBlock({ icon: Icon, title, description }) {
  const containerStyle = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    textAlign: "left",
    padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
    borderRadius: tokens.borderRadius.medium,
    border: `1px solid ${tokens.cardBorder}`,
    backgroundColor: tokens.cardBackground,
  };

  const iconStyle = {
    color: tokens.text.muted,
    marginRight: tokens.spacing.md,
    flexShrink: 0,
  };

  const titleStyle = {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: tokens.text.primary,
  };

  const descriptionStyle = {
    margin: 0,
    fontSize: 13,
    color: tokens.text.secondary,
    marginTop: tokens.spacing.xs,
  };

  return (
    <div style={containerStyle}>
      {Icon && (
        <div style={iconStyle}>
          <Icon size={20} strokeWidth={1.5} />
        </div>
      )}
      <div>
        <h3 style={titleStyle}>{title}</h3>
        {description && <p style={descriptionStyle}>{description}</p>}
      </div>
    </div>
  );
}
