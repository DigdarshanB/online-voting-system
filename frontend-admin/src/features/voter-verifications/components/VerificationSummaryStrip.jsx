import React from "react";
import { tokens } from "./tokens";
import { Users, Clock, AlertCircle, FileText } from "lucide-react";

export default function VerificationSummaryStrip({ metrics }) {
  const cards = [
    {
      label: "Pending Submissions",
      value: metrics.pending || 0,
      icon: Clock,
      color: tokens.colors.accent,
    },
    {
      label: "Ready for Review",
      value: metrics.ready || 0,
      icon: Users,
      color: tokens.colors.success,
    },
    {
      label: "Missing Documents",
      value: metrics.missingDocs || 0,
      icon: FileText,
      color: tokens.colors.warning,
    },
    {
      label: "System Alerts",
      value: metrics.alerts || 0,
      icon: AlertCircle,
      color: tokens.colors.danger,
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: tokens.spacing.lg,
      marginBottom: tokens.spacing.xl,
    }}>
      {cards.map((card) => (
        <div key={card.label} style={{
          background: tokens.cardBackground,
          border: `1px solid ${tokens.cardBorder}`,
          borderRadius: tokens.borderRadius.medium,
          padding: tokens.spacing.lg,
          display: "flex",
          alignItems: "center",
          gap: tokens.spacing.lg,
          boxShadow: tokens.shadows.sm,
        }}>
          <div style={{
            background: `${card.color}15`,
            color: card.color,
            padding: tokens.spacing.md,
            borderRadius: tokens.borderRadius.small,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <card.icon size={20} />
          </div>
          <div>
            <div style={{ 
              fontSize: tokens.fontSizes.xs, 
              color: tokens.text.secondary,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.025em"
            }}>
              {card.label}
            </div>
            <div style={{ 
              fontSize: tokens.fontSizes.xl, 
              fontWeight: 700,
              color: tokens.text.primary,
              marginTop: "2px"
            }}>
              {card.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
