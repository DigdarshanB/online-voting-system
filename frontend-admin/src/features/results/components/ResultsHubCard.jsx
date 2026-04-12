import React from "react";
import { ArrowRight, ChevronRight } from "lucide-react";

const T = {
  surface: "#FFFFFF",
  border: "#D8DEE9",
  borderLight: "#E8ECF2",
  text: "#0C1222",
  textSecondary: "#3B4963",
  muted: "#5E6D85",
  subtle: "#8896AB",
  surfaceSubtle: "#EEF1F6",
  radius: { xl: 14, lg: 12 },
  shadow: {
    sm: "0 1px 2px rgba(12,18,34,0.04)",
    md: "0 2px 8px rgba(12,18,34,0.07), 0 1px 3px rgba(12,18,34,0.04)",
    lg: "0 8px 24px rgba(12,18,34,0.10), 0 2px 6px rgba(12,18,34,0.04)",
    xl: "0 12px 36px rgba(12,18,34,0.12), 0 4px 12px rgba(12,18,34,0.06)",
  },
  transition: "0.18s ease",
  transitionSlow: "0.28s cubic-bezier(0.22, 1, 0.36, 1)",
  focusRing: "0 0 0 3px rgba(37,99,235,0.35)",
};

export default function ResultsHubCard({ level, onClick }) {
  const Icon = level.icon;

  return (
    <button
      onClick={onClick}
      className="results-hub-card"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        padding: 0,
        borderRadius: 16,
        border: `1.5px solid ${T.border}`,
        borderLeft: `4px solid ${level.color}`,
        background: T.surface,
        cursor: "pointer",
        textAlign: "left",
        overflow: "hidden",
        boxShadow: T.shadow.sm,
        transition: `transform ${T.transitionSlow}, border-color ${T.transition}, box-shadow ${T.transitionSlow}`,
        outline: "none",
        minHeight: 200,
      }}
    >
      <div style={{ padding: "28px 28px 16px", flex: 1 }}>
        {/* Icon + title */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: T.radius.lg,
              background: level.bg,
              border: `1px solid ${level.color}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={24} color={level.color} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: "block", fontSize: 18, fontWeight: 800,
              color: T.text, lineHeight: 1.2, letterSpacing: "-0.01em",
            }}>
              {level.label}
            </span>
          </div>
        </div>

        {/* Description */}
        <p style={{
          margin: "0 0 14px", fontSize: 14, color: T.textSecondary,
          lineHeight: 1.55, maxWidth: 380,
        }}>
          {level.description}
        </p>

        {/* Chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {level.chips.map((chip) => (
            <span key={chip} style={{
              padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
              color: level.color, background: level.bg,
              border: `1px solid ${level.color}18`,
            }}>
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{
        display: "flex", alignItems: "center", padding: "14px 28px",
        borderTop: `1px solid ${T.borderLight}`, background: "#FAFBFE",
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 14, fontWeight: 700, color: level.color,
          background: level.color, WebkitBackgroundClip: "text",
          flex: 1,
        }}>
          <span style={{ color: level.color }}>View Results</span>
          <ArrowRight size={15} color={level.color} className="results-hub-arrow" style={{ transition: `transform ${T.transition}` }} />
        </span>
        <ChevronRight size={16} color={T.subtle} />
      </div>
    </button>
  );
}
