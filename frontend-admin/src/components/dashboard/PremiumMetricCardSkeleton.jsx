export default function PremiumMetricCardSkeleton() {
  const cardStyle = {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 24,
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
    padding: 24,
    minHeight: 184,
    display: "flex",
    flexDirection: "column",
  };

  const rowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const shimmerBase = {
    background: "linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%)",
    backgroundSize: "200% 100%",
    animation: "premium-metric-skeleton-shimmer 1.4s ease-in-out infinite",
  };

  return (
    <section aria-hidden="true" style={cardStyle}>
      <style>{`
        @keyframes premium-metric-skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .premium-metric-skeleton-block {
            animation: none !important;
          }
        }
      `}</style>

      <div style={rowStyle}>
        <div
          className="premium-metric-skeleton-block"
          style={{
            ...shimmerBase,
            width: 96,
            height: 14,
            borderRadius: 6,
          }}
        />
        <div
          className="premium-metric-skeleton-block"
          style={{
            ...shimmerBase,
            width: 44,
            height: 44,
            borderRadius: 16,
          }}
        />
      </div>

      <div
        className="premium-metric-skeleton-block"
        style={{
          ...shimmerBase,
          width: 88,
          height: 40,
          borderRadius: 10,
          marginTop: 18,
        }}
      />

      <div
        className="premium-metric-skeleton-block"
        style={{
          ...shimmerBase,
          width: 110,
          height: 24,
          borderRadius: 999,
          marginTop: 14,
        }}
      />

      <div
        className="premium-metric-skeleton-block"
        style={{
          ...shimmerBase,
          width: 140,
          height: 12,
          borderRadius: 6,
          marginTop: 12,
        }}
      />
    </section>
  );
}
