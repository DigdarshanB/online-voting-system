import React from "react";
import { T } from "../../../components/ui/tokens";
import { Users, Clock, AlertCircle, FileText } from "lucide-react";

export default function VerificationSummaryStrip({ metrics }) {
  const cards = [
    { label: "Pending Submissions", value: metrics.pending || 0, icon: Clock, color: T.accent },
    { label: "Ready for Review", value: metrics.ready || 0, icon: Users, color: T.success },
    { label: "Missing Documents", value: metrics.missingDocs || 0, icon: FileText, color: T.warn },
    { label: "System Alerts", value: metrics.alerts || 0, icon: AlertCircle, color: T.error },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
      gap: T.space.lg,
      marginBottom: T.space.xl,
    }}>
      {cards.map((card) => (
        <div key={card.label} style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius.xl,
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: T.space.lg,
          boxShadow: T.shadow.sm,
          borderLeft: `3px solid ${card.color}`,
          transition: T.transition,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: `${card.color}14`,
            color: card.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <card.icon size={20} />
          </div>
          <div>
            <div style={{ 
              fontSize: 11, 
              color: T.muted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              {card.label}
            </div>
            <div style={{ 
              fontSize: 22, 
              fontWeight: 800,
              color: T.text,
              marginTop: 2,
              letterSpacing: "-0.02em",
            }}>
              {card.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
