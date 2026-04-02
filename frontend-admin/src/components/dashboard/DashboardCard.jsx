import React from "react";

/**
 * @param {Object} props
 * @param {string=} props.title
 * @param {string=} props.subtitle
 * @param {React.ReactNode=} props.actions
 * @param {React.ReactNode} props.children
 * @param {React.CSSProperties=} props.style
 */
export default function DashboardCard({ title, subtitle, actions, children, style }) {
  const showHeader = Boolean(title || subtitle || actions);

  return (
    <section className="dashboard-card-surface" style={style}>
      {showHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            {title && (
              <h3
                className="dashboard-section-title"
                style={{ marginBottom: subtitle ? 4 : 0 }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="dashboard-section-copy" style={{ marginBottom: 0 }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
