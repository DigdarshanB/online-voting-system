import React from 'react';
import { T } from '../../../components/ui/tokens';

export default function SectionHeader({ title, description, icon: Icon, actions, summary, count }) {
  return (
    <header style={{
      display: "flex", flexWrap: "wrap",
      justifyContent: "space-between", alignItems: "flex-start",
      gap: T.space.md, paddingBottom: T.space.lg,
      borderBottom: `1px solid ${T.borderLight}`,
      marginBottom: T.space.lg,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: T.space.md, minWidth: 0, flex: 1 }}>
        {Icon && (
          <div style={{
            width: 36, height: 36, borderRadius: T.radius.md,
            background: T.surfaceAlt, display: "flex",
            alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 2,
          }}>
            <Icon size={18} color={T.textSecondary} strokeWidth={1.8} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: T.space.sm }}>
            <h2 style={{
              margin: 0, fontSize: 18, fontWeight: 700,
              color: T.text, lineHeight: 1.3, letterSpacing: "-0.01em",
            }}>{title}</h2>
            {typeof count === "number" && (
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minWidth: 22, height: 22, borderRadius: 11,
                background: count > 0 ? T.accentLight : T.surfaceAlt,
                color: count > 0 ? T.accent : T.muted,
                fontSize: 11, fontWeight: 700, padding: "0 6px",
              }}>{count}</span>
            )}
          </div>
          {description && <p style={{
            margin: 0, fontSize: 13, color: T.muted, maxWidth: "60ch", lineHeight: 1.5,
          }}>{description}</p>}
        </div>
      </div>
      {(actions || summary) && (
        <div style={{ display: "flex", alignItems: "center", gap: T.space.sm, flexShrink: 0 }}>
          {summary}
          {actions}
        </div>
      )}
    </header>
  );
}
