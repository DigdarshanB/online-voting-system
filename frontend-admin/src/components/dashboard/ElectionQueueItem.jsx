import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Landmark,
  MapPinned,
} from "lucide-react";
import ElectionStatusBadge from "./ElectionStatusBadge";

const TOKENS = {
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  text: "#0F172A",
  textSoft: "#475569",
  textMuted: "#64748B",
  brand: "#173B72",
  shadowSoft: "0 12px 26px rgba(15, 23, 42, 0.08)",
};

const ICON_BY_LEVEL = {
  federal: Landmark,
  provincial: Building2,
  local: MapPinned,
};

function buildMetadata(governmentLevel, dateLabel) {
  const left = String(governmentLevel || "").trim();
  const right = String(dateLabel || "").trim();

  if (left && right) {
    return left + " · " + right;
  }

  return left || right;
}

export default function ElectionQueueItem({
  title,
  governmentLevel,
  dateLabel,
  status,
  statusLabel,
  href = null,
  relativeLabel = "",
  onClick = null,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const normalizedLevel = String(governmentLevel || "").trim().toLowerCase();
  const Icon = ICON_BY_LEVEL[normalizedLevel] || CalendarDays;
  const metadata = buildMetadata(governmentLevel, dateLabel);
  const isInteractive = Boolean(href || onClick);

  const rootStyle = {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
    padding: "18px 20px",
    borderRadius: "20px",
    border: "1px solid " + (isHovered && isInteractive ? TOKENS.borderStrong : TOKENS.border),
    background: TOKENS.surface,
    transform: isHovered && isInteractive ? "translateY(-1px)" : "translateY(0)",
    boxShadow: isHovered && isInteractive ? TOKENS.shadowSoft : "none",
    transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
    textAlign: "left",
    textDecoration: "none",
    color: "inherit",
    cursor: isInteractive ? "pointer" : "default",
  };

  const content = (
    <>
      <div
        style={{
          minWidth: 0,
          flex: "1 1 300px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "44px",
            height: "44px",
            minWidth: "44px",
            borderRadius: "16px",
            background: TOKENS.surfaceMuted,
            border: "1px solid " + TOKENS.border,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} color={TOKENS.brand} strokeWidth={2.2} />
        </div>

        <div style={{ minWidth: 0, display: "grid", gap: "4px" }}>
          <h4
            style={{
              margin: 0,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: TOKENS.text,
              fontSize: "16px",
              fontWeight: 800,
              lineHeight: 1.25,
            }}
          >
            {title || "Untitled election"}
          </h4>

          <p
            style={{
              margin: 0,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: TOKENS.textSoft,
              fontSize: "13px",
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {metadata || "Election window"}
          </p>

          {relativeLabel ? (
            <p
              style={{
                margin: 0,
                color: TOKENS.textMuted,
                fontSize: "12px",
                fontWeight: 600,
                lineHeight: 1.35,
              }}
            >
              {relativeLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div
        style={{
          minWidth: 0,
          marginLeft: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          flex: "0 1 auto",
          flexWrap: "nowrap",
        }}
      >
        <ElectionStatusBadge status={status} label={statusLabel} />
        {isInteractive ? (
          <ChevronRight
            size={18}
            color={TOKENS.textMuted}
            strokeWidth={2.2}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </>
  );

  const hoverHandlers = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  if (href) {
    return (
      <Link to={href} style={rootStyle} {...hoverHandlers}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={rootStyle} {...hoverHandlers}>
        {content}
      </button>
    );
  }

  return (
    <div style={rootStyle}>
      {content}
    </div>
  );
}
