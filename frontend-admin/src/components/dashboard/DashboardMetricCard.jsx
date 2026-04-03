import React from "react";

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {string} props.meta
 * @param {React.ReactNode=} props.icon
 * @param {"default" | "success" | "warning" | "danger"=} props.tone
 */
function DashboardMetricCard({ label, value, meta, icon, tone = "default" }) {
  const toneMap = {
    default: {
      color: "var(--dashboard-text-soft)",
      background: "transparent",
    },
    success: {
      color: "var(--dashboard-success)",
      background: "var(--dashboard-success-soft)",
    },
    warning: {
      color: "var(--dashboard-warning)",
      background: "var(--dashboard-warning-soft)",
    },
    danger: {
      color: "var(--dashboard-danger)",
      background: "var(--dashboard-danger-soft)",
    },
  };

  const toneStyle = toneMap[tone] ?? toneMap.default;

  return (
    <section className="dashboard-card-surface" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--dashboard-text-muted)" }}>{label}</span>
        {icon && <span aria-hidden="true" style={{ fontSize: 20 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "var(--dashboard-text)", letterSpacing: "-0.03em" }}>{value}</div>
      <span
        style={{
          display: "inline-block",
          marginTop: 8,
          fontSize: 12,
          fontWeight: 600,
          color: toneStyle.color,
          background: toneStyle.background,
          padding: tone === "default" ? 0 : "2px 8px",
          borderRadius: 6,
        }}
      >
        {meta}
      </span>
    </section>
  );
}

export default React.memo(DashboardMetricCard);
