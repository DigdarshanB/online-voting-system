import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Info,
  Pause,
  Users,
  Vote,
} from "lucide-react";

const TOKENS = {
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
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
  brand: "#173B72",
  brandSoft: "#EAF2FF",
};

const OVERALL_META = {
  healthy: {
    label: "All Systems Operational",
    icon: CheckCircle2,
    color: TOKENS.success,
    bg: TOKENS.successSoft,
  },
  attention: {
    label: "Attention Required",
    icon: AlertTriangle,
    color: TOKENS.warning,
    bg: TOKENS.warningSoft,
  },
  idle: {
    label: "Idle — No Active Operations",
    icon: Pause,
    color: TOKENS.textMuted,
    bg: TOKENS.surfaceMuted,
  },
};

function StatusIndicator({ status }) {
  const meta = OVERALL_META[status] || OVERALL_META.idle;
  const Icon = meta.icon;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 12,
        background: meta.bg,
        border: `1px solid ${meta.color}20`,
      }}
    >
      <Icon size={16} color={meta.color} strokeWidth={2.2} />
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: meta.color,
        }}
      >
        {meta.label}
      </span>
    </div>
  );
}

function MetricRow({ icon, label, value, tone = "neutral" }) {
  const colorMap = {
    success: TOKENS.success,
    warning: TOKENS.warning,
    danger: TOKENS.danger,
    info: TOKENS.info,
    neutral: TOKENS.textSoft,
  };
  const bgMap = {
    success: TOKENS.successSoft,
    warning: TOKENS.warningSoft,
    danger: TOKENS.dangerSoft,
    info: TOKENS.infoSoft,
    neutral: TOKENS.surfaceMuted,
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 10,
        background: TOKENS.surfaceMuted,
        border: `1px solid ${TOKENS.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: bgMap[tone],
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: TOKENS.textSoft,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: colorMap[tone],
          flexShrink: 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function AlertRow({ type, message }) {
  const isWarning = type === "warning";
  const Icon = isWarning ? AlertTriangle : Info;
  const color = isWarning ? TOKENS.warning : TOKENS.info;
  const bg = isWarning ? TOKENS.warningSoft : TOKENS.infoSoft;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        background: bg,
        border: `1px solid ${color}20`,
      }}
      role="alert"
    >
      <Icon size={15} color={color} strokeWidth={2.2} style={{ marginTop: 1, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: TOKENS.text, lineHeight: 1.45 }}>
        {message}
      </span>
    </div>
  );
}

function SkeletonState() {
  return (
    <section
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 16,
        boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
        padding: 24,
        display: "grid",
        gap: 14,
      }}
      aria-hidden="true"
    >
      <div style={{ width: "50%", height: 14, borderRadius: 999, background: TOKENS.border }} />
      <div style={{ width: "70%", height: 10, borderRadius: 999, background: TOKENS.surfaceMuted, border: `1px solid ${TOKENS.border}` }} />
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ height: 50, borderRadius: 10, background: TOKENS.surfaceMuted, border: `1px solid ${TOKENS.border}` }} />
      ))}
    </section>
  );
}

export default function SystemStatusPanel({
  data = null,
  loading = false,
  error = false,
}) {
  if (loading) return <SkeletonState />;

  if (error || !data) {
    return (
      <section
        style={{
          background: TOKENS.surface,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: 16,
          boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
          padding: 24,
        }}
        role="alert"
      >
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TOKENS.text }}>
          System Status
        </h3>
        <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: TOKENS.danger }}>
          Unable to load system status
        </p>
      </section>
    );
  }

  const metrics = [
    {
      icon: <Vote size={14} color={TOKENS.success} strokeWidth={2.2} />,
      label: "Active elections (polling)",
      value: data.active_elections,
      tone: data.active_elections > 0 ? "success" : "neutral",
    },
    {
      icon: <Clock size={14} color={TOKENS.info} strokeWidth={2.2} />,
      label: "Configured (ready to launch)",
      value: data.configured_elections,
      tone: data.configured_elections > 0 ? "info" : "neutral",
    },
    {
      icon: <BarChart3 size={14} color={TOKENS.warning} strokeWidth={2.2} />,
      label: "Counting in progress",
      value: data.counting_elections,
      tone: data.counting_elections > 0 ? "warning" : "neutral",
    },
    {
      icon: <Users size={14} color={TOKENS.info} strokeWidth={2.2} />,
      label: "Pending verifications",
      value: data.pending_verifications,
      tone: data.pending_verifications > 0 ? "warning" : "success",
    },
    {
      icon: <CheckCircle2 size={14} color={TOKENS.success} strokeWidth={2.2} />,
      label: "Finalized elections",
      value: data.finalized_elections,
      tone: "success",
    },
    {
      icon: <Activity size={14} color={TOKENS.textMuted} strokeWidth={2.2} />,
      label: "Total ballots cast",
      value: data.total_ballots?.toLocaleString("en-US") ?? "0",
      tone: "neutral",
    },
  ];

  return (
    <section
      style={{
        background: TOKENS.surface,
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 16,
        boxShadow: "0 2px 10px rgba(15,23,42,0.03)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: TOKENS.text,
            lineHeight: 1.2,
          }}
        >
          System Status
        </h3>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            fontWeight: 500,
            color: TOKENS.textMuted,
          }}
        >
          Real-time operational overview
        </p>
      </div>

      <StatusIndicator status={data.overall} />

      <div style={{ display: "grid", gap: 8 }}>
        {metrics.map((m, i) => (
          <MetricRow key={i} {...m} />
        ))}
      </div>

      {data.alerts && data.alerts.length > 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: TOKENS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Alerts
          </span>
          {data.alerts.map((alert, i) => (
            <AlertRow key={i} type={alert.type} message={alert.message} />
          ))}
        </div>
      )}
    </section>
  );
}
