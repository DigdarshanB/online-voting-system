import React from "react";
import { tokens } from "./tokens";

/**
 * A foundational container component for all major sections on a page.
 * It provides consistent padding, border, radius, and shadow to create a
 * unified, institutional look and feel.
 */
export default function SectionCard({ children, padding, style }) {

  const cardStyle = {
    width: "100%",
    backgroundColor: tokens.cardBackground,
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.xlarge, // Using the new, larger radius
    boxShadow: tokens.boxShadow.md, // Using the standard medium shadow
    padding: padding ?? tokens.spacing.xl, // Defaulting to the new 'xl' spacing
    boxSizing: "border-box",
    // Removed hover effects to create a more static, institutional feel.
    // Interactions should be explicit on controls inside the card, not the card itself.
    transition: "box-shadow 0.2s ease-in-out",
    ...style, // Allow for style overrides if absolutely necessary
  };

  return (
    <div style={cardStyle}>
      {children}
    </div>
  );
}
