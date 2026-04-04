import React, { useState } from "react";
import { tokens } from "./tokens";

export default function SectionCard({ children, padding, hoverEffect = false }) {
  const [isHovered, setIsHovered] = useState(false);

  const cardStyle = {
    width: "100%",
    backgroundColor: tokens.cardBackground,
    border: `1px solid ${tokens.cardBorder}`,
    borderRadius: tokens.borderRadius.large,
    boxShadow: isHovered ? tokens.boxShadow.medium : tokens.boxShadow.small,
    padding: padding ?? "24px",
    boxSizing: "border-box",
    transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
    transform: isHovered ? "translateY(-2px)" : "translateY(0)",
  };

  const handleMouseEnter = () => {
    if (hoverEffect) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverEffect) setIsHovered(false);
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}
