import React from "react";
import PremiumMetricCardSkeleton from "./PremiumMetricCardSkeleton";

const TOKENS = {
  surface: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textSoft: "#475569",
  textMuted: "#64748B",
  success: "#16A34A",
  successSoft: "#ECFDF3",
  warning: "#D97706",
  warningSoft: "#FFF7ED",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  info: "#2563EB",
  infoSoft: "#EFF6FF",
  neutral: "#475569",
  neutralSoft: "#F1F5F9",
};

function getToneStyles(tone = "neutral") {
  switch (tone) {
    case "success":
      return {
        badgeBg: TOKENS.successSoft,
        badgeText: TOKENS.success,
        chipBg: TOKENS.successSoft,
        chipText: TOKENS.success,
      };
    case "warning":
      return {
        badgeBg: TOKENS.warningSoft,
        badgeText: TOKENS.warning,
        chipBg: TOKENS.warningSoft,
        chipText: TOKENS.warning,
      };
    case "danger":
      return {
        badgeBg: TOKENS.dangerSoft,
        badgeText: TOKENS.danger,
        chipBg: TOKENS.dangerSoft,
        chipText: TOKENS.danger,
      };
    case "info":
      return {
        badgeBg: TOKENS.infoSoft,
        badgeText: TOKENS.info,
        chipBg: TOKENS.infoSoft,
        chipText: TOKENS.info,
      };
    default:
      return {
        badgeBg: TOKENS.neutralSoft,
        badgeText: TOKENS.neutral,
        chipBg: TOKENS.neutralSoft,
        chipText: TOKENS.neutral,
      };
  }
}

export default function PremiumMetricCard({
  title,
  value,
  helperText,
  statusLabel,
  statusTone = "neutral",
  icon,
  trendSlot = null,
  loading = false,
  error = false,
  empty = false,
  emptyMessage = "No data available",
}) {
  if (loading) {
    return <PremiumMetricCardSkeleton />;
  }

  const resolvedState = (() => {
    if (error) {
      return {
        displayValue: "—",
        displayHelper: "Metric temporarily unavailable",
        displayStatus: "Unable to load",
        displayTone: "danger",
      };
    }

    if (empty) {
      return {
        displayValue: "0",
        displayHelper: emptyMessage,
        displayStatus: "No data",
        displayTone: "neutral",
      };
    }

    return {
      displayValue: value ?? "0",
      displayHelper: helperText ?? "",
      displayStatus: statusLabel ?? "",
      displayTone: statusTone,
    };
  })();

  const toneStyles = getToneStyles(resolvedState.displayTone);

  return (
    <section
      aria-busy={loading ? "true" : "false"}
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 24,
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
        padding: 24,
        minHeight: 184,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition:
          "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 14px 36px rgba(15, 23, 42, 0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(15, 23, 42, 0.06)";
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: TOKENS.textMuted,
            }}
          >
            {title}
          </div>

          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: toneStyles.chipBg,
              color: toneStyles.chipText,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        </div>

        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            color: TOKENS.text,
            marginBottom: 16,
          }}
        >
          {resolvedState.displayValue}
        </div>

        {resolvedState.displayStatus ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 28,
              padding: "0 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: toneStyles.badgeBg,
              color: toneStyles.badgeText,
              marginBottom: 12,
            }}
          >
            {resolvedState.displayStatus}
          </div>
        ) : null}

        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: TOKENS.textSoft,
            marginTop: 12,
          }}
        >
          {resolvedState.displayHelper}
        </div>
      </div>

      {trendSlot ? <div style={{ marginTop: 16 }}>{trendSlot}</div> : null}
    </section>
  );
}