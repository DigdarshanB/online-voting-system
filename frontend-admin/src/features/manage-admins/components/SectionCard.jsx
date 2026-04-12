import React from "react";
import { T } from "../../../components/ui/tokens";

export default function SectionCard({ children, padding, style, accentColor }) {
  const cardStyle = {
    width: "100%",
    backgroundColor: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius.xl,
    boxShadow: T.shadow.sm,
    padding: padding ?? `${T.space.xl}px ${T.space.xl}px`,
    boxSizing: "border-box",
    transition: T.transition,
    ...(accentColor ? { borderTop: `3px solid ${accentColor}` } : {}),
    ...style,
  };

  return (
    <section style={cardStyle}>
      {children}
    </section>
  );
}
