import React, { useState } from 'react';
import { T } from '../../../components/ui/tokens';
import { Users, Mail, ShieldQuestion, AlertTriangle } from 'lucide-react';

function SummaryCard({ label, count, description, accentColor, icon: Icon, isUrgent }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        backgroundColor: T.surface,
        border: `1px solid ${hovered ? T.borderStrong : T.border}`,
        borderTop: `3px solid ${accentColor}`,
        borderRadius: T.radius.lg,
        padding: `${T.space.lg}px ${T.space.xl}px`,
        display: "flex",
        alignItems: "flex-start",
        gap: T.space.lg,
        boxShadow: hovered ? T.shadow.md : T.shadow.sm,
        transition: `all ${T.transition}`,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        cursor: "default",
        minHeight: 110,
      }}
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: `${accentColor}14`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 2,
      }}>
        <Icon size={20} color={accentColor} strokeWidth={1.8} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: T.muted, textTransform: "uppercase",
          letterSpacing: "0.06em", lineHeight: 1,
        }}>{label}</div>
        <div style={{
          display: "flex", alignItems: "baseline", gap: T.space.sm,
          marginTop: 6,
        }}>
          <span style={{
            fontSize: 30, fontWeight: 800,
            color: T.text, lineHeight: 1, letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
          }}>{count}</span>
          {isUrgent && count > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 10, fontWeight: 700, color: T.warn,
              background: T.warnBg, padding: "2px 7px",
              borderRadius: 9999, textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}>
              <AlertTriangle size={10} />
              Action Needed
            </span>
          )}
        </div>
        <div style={{
          marginTop: 6, fontSize: 12.5, color: T.muted, lineHeight: 1.4,
        }}>{description}</div>
      </div>
    </div>
  );
}

export default function GovernanceSummaryStrip({
  activeAdminCount = 0,
  issuedInviteCount = 0,
  pendingRecoveryCount = 0,
}) {
  const items = [
    {
      label: "Active Administrators",
      count: activeAdminCount,
      description: "Accounts with active system access and privileges.",
      accentColor: T.success,
      icon: Users,
    },
    {
      label: "Pending Invitations",
      count: issuedInviteCount,
      description: "Unactivated invitations awaiting candidate action.",
      accentColor: T.info,
      icon: Mail,
    },
    {
      label: "Recovery Requests",
      count: pendingRecoveryCount,
      description: "MFA recovery requests requiring governance review.",
      accentColor: pendingRecoveryCount > 0 ? T.warn : T.muted,
      icon: ShieldQuestion,
      isUrgent: pendingRecoveryCount > 0,
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
      gap: T.space.lg,
      width: "100%",
    }}>
      {items.map((item, index) => (
        <SummaryCard key={index} {...item} />
      ))}
    </div>
  );
}
