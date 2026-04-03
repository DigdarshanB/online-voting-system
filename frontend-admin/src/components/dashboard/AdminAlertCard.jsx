import { Link } from "react-router-dom";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";

const TOKENS = {
  text: "#0F172A",
  textMuted: "#64748B",
};

const TONE_STYLES = {
  danger: {
    bg: "#FEF2F2",
    border: "#FECACA",
    title: "#B91C1C",
    body: "#7F1D1D",
    icon: "#B91C1C",
    IconComponent: ShieldAlert,
  },
  warning: {
    bg: "#FFF7ED",
    border: "#FED7AA",
    title: "#B45309",
    body: "#92400E",
    icon: "#B45309",
    IconComponent: ShieldAlert,
  },
  success: {
    bg: "#ECFDF3",
    border: "#BBF7D0",
    title: "#15803D",
    body: "#166534",
    icon: "#15803D",
    IconComponent: ShieldCheck,
  },
  neutral: {
    bg: "#F8FAFC",
    border: "#E2E8F0",
    title: "#334155",
    body: "#475569",
    icon: "#334155",
    IconComponent: Shield,
  },
};

function getTonePalette(tone) {
  const normalizedTone = String(tone || "danger").trim().toLowerCase();
  return TONE_STYLES[normalizedTone] || TONE_STYLES.danger;
}

export default function AdminAlertCard({
  title,
  message,
  tone = "danger",
  actionLabel = "",
  actionHref = null,
}) {
  const palette = getTonePalette(tone);
  const Icon = palette.IconComponent;

  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        borderRadius: "18px",
        border: "1px solid " + palette.border,
        background: palette.bg,
        padding: "18px 20px",
        display: "flex",
        alignItems: "flex-start",
        gap: "14px",
      }}
      role="alert"
      aria-live="polite"
    >
      <div
        aria-hidden="true"
        style={{
          width: "38px",
          height: "38px",
          minWidth: "38px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.7)",
          border: "1px solid " + palette.border,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: palette.icon,
        }}
      >
        <Icon size={19} strokeWidth={2.2} />
      </div>

      <div style={{ minWidth: 0, flex: "1 1 auto", display: "grid", gap: "8px" }}>
        <h4
          style={{
            margin: 0,
            minWidth: 0,
            color: palette.title,
            fontSize: "14px",
            fontWeight: 800,
            lineHeight: 1.3,
            overflowWrap: "anywhere",
          }}
        >
          {title || "Administrative alert"}
        </h4>

        <p
          style={{
            margin: 0,
            minWidth: 0,
            color: palette.body,
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: 1.55,
            overflowWrap: "anywhere",
          }}
        >
          {message || "No alert details provided."}
        </p>

        {actionLabel && actionHref ? (
          <Link
            to={actionHref}
            style={{
              justifySelf: "start",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "30px",
              padding: "0 12px",
              borderRadius: "999px",
              border: "1px solid " + palette.border,
              background: "rgba(255, 255, 255, 0.85)",
              color: TOKENS.text,
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
