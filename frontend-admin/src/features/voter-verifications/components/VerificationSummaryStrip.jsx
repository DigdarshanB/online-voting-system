import React from "react";
import { T } from "../../../components/ui/tokens";
import { Users, Clock, AlertCircle, FileText } from "lucide-react";

const PRIMARY = [
  {
    label: "Pending Submissions",
    helper: "Awaiting admin action",
    key: "pending",
    icon: Clock,
    color: T.accent,
    bg: T.accentLight,
  },
  {
    label: "Ready for Review",
    helper: "Complete artifact set",
    key: "ready",
    icon: Users,
    color: T.success,
    bg: T.successBg,
  },
];

const SECONDARY = [
  {
    label: "Missing Documents",
    helper: "Submission incomplete",
    key: "missingDocs",
    icon: FileText,
    color: T.warn,
    bg: T.warnBg,
  },
  {
    label: "System Alerts",
    helper: "Requires manual attention",
    key: "alerts",
    icon: AlertCircle,
    color: T.error,
    bg: T.errorBg,
  },
];

function MetricCard({ card, metrics, variant }) {
  const value = metrics[card.key] || 0;
  const isPrimary = variant === "primary";

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius.xl,
      padding: isPrimary ? "22px 20px" : "16px 18px",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 0,
      boxShadow: isPrimary ? T.shadow.md : T.shadow.sm,
      borderTop: `3px solid ${card.color}`,
      transition: T.transition,
      minHeight: isPrimary ? 110 : 90,
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
      }}>
        <div style={{
          width: isPrimary ? 34 : 28,
          height: isPrimary ? 34 : 28,
          borderRadius: T.radius.md,
          background: card.bg,
          color: card.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <card.icon size={isPrimary ? 17 : 14} />
        </div>
        <span style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: T.muted,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          lineHeight: 1.2,
        }}>
          {card.label}
        </span>
      </div>

      <div style={{
        fontSize: isPrimary ? 28 : 22,
        fontWeight: 800,
        color: value === 0 ? T.subtle : T.text,
        letterSpacing: "-0.03em",
        lineHeight: 1,
        marginBottom: 5,
      }}>
        {value}
      </div>

      <div style={{
        fontSize: 11,
        color: T.muted,
        fontWeight: 500,
      }}>
        {card.helper}
      </div>
    </div>
  );
}

export default function VerificationSummaryStrip({ metrics }) {
  return (
    <div style={{ marginBottom: T.space.xl }}>
      {/* Primary metrics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: T.space.lg,
        marginBottom: T.space.md,
      }}>
        {PRIMARY.map(card => (
          <MetricCard key={card.key} card={card} metrics={metrics} variant="primary" />
        ))}
      </div>

      {/* Secondary metrics */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: T.space.lg,
      }}>
        {SECONDARY.map(card => (
          <MetricCard key={card.key} card={card} metrics={metrics} variant="secondary" />
        ))}
      </div>
    </div>
  );
}
