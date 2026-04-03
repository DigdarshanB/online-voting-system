import { useState } from "react";
import PremiumChartPanelSkeleton from "./PremiumChartPanelSkeleton";

export default function PremiumChartPanel({
  title,
  subtitle,
  actions = null,
  children,
  loading = false,
  error = false,
  empty = false,
  emptyMessage = "No data available",
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (loading) {
    return <PremiumChartPanelSkeleton />;
  }

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 28,
        boxShadow: isHovered
          ? "0 14px 40px rgba(15, 23, 42, 0.1)"
          : "0 10px 34px rgba(15, 23, 42, 0.06)",
        padding: 28,
        minHeight: 420,
        transition: "transform 180ms ease, box-shadow 180ms ease",
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              color: "#0F172A",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              fontWeight: 500,
              color: "#64748B",
            }}
          >
            {subtitle}
          </p>
        </div>

        {actions ? <div>{actions}</div> : null}
      </div>

      {error ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 24,
            borderRadius: 16,
            border: "1px dashed #E2E8F0",
            background: "#F8FAFC",
            color: "#475569",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Unable to load chart data
        </div>
      ) : empty ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 24,
            borderRadius: 16,
            border: "1px dashed #E2E8F0",
            background: "#F8FAFC",
            color: "#475569",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "center",
            padding: 16,
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div
          style={{
            marginTop: 24,
            flex: 1,
            minHeight: 280,
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      )}
    </section>
  );
}
