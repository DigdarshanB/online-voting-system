import React from "react";

/**
 * Simple skeleton loader block.
 *
 * Props:
 *   width  — CSS width (default "100%")
 *   height — CSS height (default 16)
 *   radius — border radius (default 6)
 *   style  — additional inline styles
 */
export default function Skeleton({ width = "100%", height = 16, radius = 6, style }) {
  return (
    <div
      style={{
        width, height, borderRadius: radius,
        background: "linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)",
        backgroundSize: "200% 100%",
        animation: "skeletonShimmer 1.5s ease-in-out infinite",
        ...style,
      }}
    >
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

/**
 * Table skeleton — renders N rows of shimmer blocks.
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0" }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} height={14} width={`${Math.floor(60 + Math.random() * 40)}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}
