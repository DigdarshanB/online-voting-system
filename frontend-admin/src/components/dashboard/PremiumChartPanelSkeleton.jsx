export default function PremiumChartPanelSkeleton() {
  const shimmerStyle = {
    background: "linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%)",
    backgroundSize: "220% 100%",
    animation: "premium-chart-skeleton-shimmer 1.35s ease-in-out infinite",
  };

  return (
    <section
      aria-hidden="true"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 28,
        boxShadow: "0 10px 34px rgba(15, 23, 42, 0.06)",
        padding: 28,
        minHeight: 420,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes premium-chart-skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .premium-chart-skeleton-block {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="premium-chart-skeleton-block"
        style={{
          ...shimmerStyle,
          width: 180,
          height: 18,
          borderRadius: 8,
        }}
      />
      <div
        className="premium-chart-skeleton-block"
        style={{
          ...shimmerStyle,
          width: 280,
          height: 14,
          borderRadius: 7,
          marginTop: 10,
        }}
      />

      <div
        className="premium-chart-skeleton-block"
        style={{
          ...shimmerStyle,
          marginTop: 24,
          width: "100%",
          flex: 1,
          minHeight: 250,
          borderRadius: 18,
        }}
      />

      <div style={{ display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className="premium-chart-skeleton-block"
            style={{
              ...shimmerStyle,
              width: 92,
              height: 12,
              borderRadius: 999,
            }}
          />
        ))}
      </div>
    </section>
  );
}
