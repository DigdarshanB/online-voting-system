import React from "react";

/**
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {string} props.title
 * @param {string} props.caption
 */
export default function DashboardPlaceholderChart({ icon, title, caption }) {
  return (
    <section className="dashboard-card-surface">
      <h3 className="dashboard-section-title">{title}</h3>
      <p className="dashboard-section-copy">{caption}</p>
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--dashboard-surface-muted)",
          borderRadius: 12,
          border: "1px dashed var(--dashboard-border)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div aria-hidden="true" style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--dashboard-text-muted)" }}>
            Chart placeholder
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>
            Integrating next phase
          </div>
        </div>
      </div>
    </section>
  );
}
