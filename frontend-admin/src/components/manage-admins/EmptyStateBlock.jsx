import React from "react";
import { tokens } from "./tokens";

export default function EmptyStateBlock({ icon: Icon, title, description, height = 120 }) {
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "24px",
    borderRadius: tokens.borderRadius.medium,
    border: `1px dashed ${tokens.cardBorder}`,
    backgroundColor: tokens.pageBackground,
    height: `${height}px`,
    boxSizing: "border-box",
  };

  const iconStyle = {
    color: tokens.text.muted,
    marginBottom: tokens.spacing.md,
  };

  const titleStyle = {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: tokens.text.primary,
  };

  const descriptionStyle = {
    margin: 0,
    fontSize: 14,
    color: tokens.text.secondary,
    maxWidth: 400,
    marginTop: tokens.spacing.xs,
  };

  return (
    <div style={containerStyle}>
      {Icon && (
        <div style={iconStyle}>
          <Icon size={32} strokeWidth={1.5} />
        </div>
      )}
      <div>
        <h3 style={titleStyle}>{title}</h3>
        {description && <p style={descriptionStyle}>{description}</p>}
      </div>
    </div>
  );
}
