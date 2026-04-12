import React from "react";
import { T } from "../../../components/ui/tokens";

export default function EmptyStateBlock({ icon: Icon, title, description, action, actionLabel, height }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", textAlign: "center",
      padding: `${T.space["2xl"]}px ${T.space.xl}px`,
      borderRadius: T.radius.lg,
      border: `1px dashed ${T.borderLight}`,
      backgroundColor: T.surfaceAlt,
      minHeight: height || "auto",
    }}>
      {Icon && (
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: `${T.muted}10`, display: "flex",
          alignItems: "center", justifyContent: "center",
          marginBottom: T.space.md,
        }}>
          <Icon size={22} strokeWidth={1.5} color={T.muted} />
        </div>
      )}
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{title}</h3>
      {description && <p style={{ margin: `${T.space.sm}px 0 0`, fontSize: 13, color: T.muted, maxWidth: "40ch", lineHeight: 1.5 }}>{description}</p>}
      {action && (
        <button
          onClick={action}
          style={{
            marginTop: T.space.lg, padding: "8px 16px",
            fontSize: 13, fontWeight: 600, color: T.accent,
            background: T.accentLight, border: `1px solid ${T.accent}20`,
            borderRadius: T.radius.md, cursor: "pointer",
            transition: T.transition,
          }}
        >
          {actionLabel || "Try again"}
        </button>
      )}
    </div>
  );
}
