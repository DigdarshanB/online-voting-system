import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { T } from '../../../components/ui/tokens';

export default function SecurityWorkflowBanner({ count = 0, onJumpToQueue }) {
  if (count === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: T.space.lg,
      backgroundColor: T.warnBg, border: `1px solid ${T.warnBorder}`,
      borderRadius: T.radius.lg, padding: `${T.space.md}px ${T.space.lg}px`,
      marginBottom: T.space.xl,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: `${T.warn}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <AlertTriangle size={18} color={T.warn} />
      </div>
      <p style={{ margin: 0, fontSize: 14, color: T.text, flexGrow: 1, lineHeight: 1.5, fontWeight: 500 }}>
        There {count === 1 ? "is 1 pending" : `are ${count} pending`} TOTP recovery request
        {count === 1 ? "" : "s"} requiring review.
      </p>
      <button
        style={{
          flexShrink: 0, padding: "8px 16px", fontSize: 13, fontWeight: 700,
          border: `1px solid ${T.warn}`, borderRadius: T.radius.md,
          backgroundColor: "transparent", color: T.warn,
          cursor: "pointer", transition: T.transition,
        }}
        onClick={onJumpToQueue}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = T.warn;
          e.currentTarget.style.color = "#FFF";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = T.warn;
        }}
      >
        Review Queue
      </button>
    </div>
  );
}
