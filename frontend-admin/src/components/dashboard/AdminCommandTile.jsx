import { useState } from "react";
import { Link } from "react-router-dom";

const TOKENS = {
  surface: "#FFFFFF",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  text: "#0F172A",
  textSoft: "#475569",
  textMuted: "#64748B",
  neutralSoft: "#F1F5F9",
  shadowSoft: "0 12px 26px rgba(15, 23, 42, 0.08)",
};

const TONE_STYLES = {
  info: {
    chipBg: "#EFF6FF",
    chipIcon: "#2563EB",
  },
  success: {
    chipBg: "#ECFDF3",
    chipIcon: "#16A34A",
  },
  warning: {
    chipBg: "#FFF7ED",
    chipIcon: "#D97706",
  },
  danger: {
    chipBg: "#FEF2F2",
    chipIcon: "#DC2626",
  },
  neutral: {
    chipBg: "#F1F5F9",
    chipIcon: "#475569",
  },
};

function getTonePalette(tone) {
  const normalizedTone = String(tone || "neutral").trim().toLowerCase();
  return TONE_STYLES[normalizedTone] || TONE_STYLES.neutral;
}

export default function AdminCommandTile({
  title,
  description,
  href = null,
  icon,
  tone = "neutral",
  badgeText = "",
}) {
  const [isHovered, setIsHovered] = useState(false);
  const palette = getTonePalette(tone);

  const rootStyle = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    minHeight: "132px",
    boxSizing: "border-box",
    background: TOKENS.surface,
    border: "1px solid " + (isHovered ? TOKENS.borderStrong : TOKENS.border),
    borderRadius: "18px",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "12px",
    transform: isHovered ? "translateY(-1px)" : "translateY(0)",
    boxShadow: isHovered ? TOKENS.shadowSoft : "none",
    transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
    textDecoration: "none",
    color: "inherit",
  };

  const sharedHandlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  const tileBody = (
    <>
      <div
        style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "40px",
            height: "40px",
            minWidth: "40px",
            borderRadius: "14px",
            background: palette.chipBg,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: palette.chipIcon,
          }}
        >
          {icon || null}
        </div>

        {badgeText ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "24px",
              padding: "0 10px",
              borderRadius: "999px",
              background: TOKENS.neutralSoft,
              color: TOKENS.textSoft,
              fontSize: "12px",
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {badgeText}
          </span>
        ) : null}
      </div>

      <div style={{ minWidth: 0, display: "grid", gap: "8px" }}>
        <h4
          style={{
            margin: 0,
            minWidth: 0,
            color: TOKENS.text,
            fontSize: "15px",
            fontWeight: 700,
            lineHeight: 1.3,
            overflowWrap: "anywhere",
          }}
        >
          {title || "Administrative action"}
        </h4>

        <p
          style={{
            margin: 0,
            minWidth: 0,
            color: TOKENS.textMuted,
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: 1.45,
            overflowWrap: "anywhere",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description || "No description provided."}
        </p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link to={href} style={rootStyle} {...sharedHandlers}>
        {tileBody}
      </Link>
    );
  }

  return (
    <div style={rootStyle} {...sharedHandlers}>
      {tileBody}
    </div>
  );
}
