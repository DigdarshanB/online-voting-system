import React from "react";
import { T } from "../../../components/ui/tokens";
import { Clock, CheckCircle, FileText, AlertCircle } from "lucide-react";

const CARDS = [
  {
    label: "Pending Review",
    helper: "Awaiting admin decision",
    key: "pending",
    icon: Clock,
    color: T.accent,
    bg: T.accentLight,
    border: `${T.accent}30`,
  },
  {
    label: "Ready to Approve",
    helper: "All artifacts present",
    key: "ready",
    icon: CheckCircle,
    color: T.success,
    bg: T.successBg,
    border: T.successBorder,
  },
  {
    label: "Missing Artifacts",
    helper: "Document or face absent",
    key: "missingDocs",
    icon: FileText,
    color: T.warn,
    bg: T.warnBg,
    border: T.warnBorder,
  },
  {
    label: "Flagged",
    helper: "Requires manual attention",
    key: "alerts",
    icon: AlertCircle,
    color: T.error,
    bg: T.errorBg,
    border: T.errorBorder,
  },
];

function MetricCard({ card, value }) {
  const isEmpty = value === 0;
  const Icon = card.icon;

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderLeft: `4px solid ${isEmpty ? T.borderLight : card.color}`,
      borderRadius: T.radius.lg,
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: T.shadow.sm,
      transition: T.transition,
      minHeight: 88,
    }}>
      <div style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: isEmpty ? T.surfaceAlt : card.bg,
        border: `1.5px solid ${isEmpty ? T.borderLight : card.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: T.transition,
      }}>
        <Icon size={18} color={isEmpty ? T.subtle : card.color} />
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 26,
          fontWeight: 800,
          color: isEmpty ? T.subtle : T.text,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          marginBottom: 4,
          transition: T.transition,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: 12.5,
          fontWeight: 700,
          color: isEmpty ? T.subtle : T.textSecondary,
          lineHeight: 1.2,
          marginBottom: 2,
        }}>
          {card.label}
        </div>
        <div style={{ fontSize: 11, color: T.subtle, fontWeight: 400 }}>
          {card.helper}
        </div>
      </div>
    </div>
  );
}

export default function VerificationSummaryStrip({ metrics }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: 14,
      marginBottom: T.space.xl,
    }}>
      {CARDS.map(card => (
        <MetricCard key={card.key} card={card} value={metrics[card.key] || 0} />
      ))}
    </div>
  );
}
