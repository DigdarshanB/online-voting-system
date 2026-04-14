import React, { useState, useEffect, useRef } from "react";
import AdminAlertCard from "./AdminAlertCard";
import AdminCommandTile from "./AdminCommandTile";

const TOKENS = {
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  border: "#E2E8F0",
  text: "#0F172A",
  textSoft: "#475569",
  textMuted: "#64748B",
  dangerSoft: "#FEF2F2",
  danger: "#DC2626",
};

function SkeletonTile({ index }) {
  return (
    <div
      key={"tile-skeleton-" + index}
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        minHeight: "140px",
        boxSizing: "border-box",
        borderRadius: "20px",
        border: "1px solid " + TOKENS.border,
        background: TOKENS.surface,
        padding: "20px",
        display: "grid",
        gap: "14px",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          background: TOKENS.surfaceMuted,
          border: "1px solid " + TOKENS.border,
        }}
      />
      <div style={{ display: "grid", gap: "8px" }}>
        <div
          style={{
            width: "68%",
            height: "12px",
            borderRadius: "999px",
            background: TOKENS.border,
          }}
        />
        <div
          style={{
            width: "92%",
            height: "10px",
            borderRadius: "999px",
            background: TOKENS.surfaceMuted,
            border: "1px solid " + TOKENS.border,
          }}
        />
        <div
          style={{
            width: "76%",
            height: "10px",
            borderRadius: "999px",
            background: TOKENS.surfaceMuted,
            border: "1px solid " + TOKENS.border,
          }}
        />
      </div>
    </div>
  );
}

function SkeletonAlert() {
  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        borderRadius: "20px",
        border: "1px solid " + TOKENS.border,
        background: TOKENS.surfaceMuted,
        padding: "20px",
        display: "grid",
        gap: "10px",
      }}
      aria-hidden="true"
    >
      <div
        style={{
          width: "42%",
          height: "12px",
          borderRadius: "999px",
          background: TOKENS.border,
        }}
      />
      <div
        style={{
          width: "86%",
          height: "10px",
          borderRadius: "999px",
          background: TOKENS.surface,
          border: "1px solid " + TOKENS.border,
        }}
      />
    </div>
  );
}

function ErrorState() {
  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        borderRadius: "16px",
        border: "1px solid " + TOKENS.border,
        background: TOKENS.dangerSoft,
        padding: "18px",
      }}
      role="alert"
      aria-live="polite"
    >
      <p
        style={{
          margin: 0,
          color: TOKENS.danger,
          fontSize: "14px",
          fontWeight: 800,
          lineHeight: 1.35,
        }}
      >
        Unable to load administrative actions
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        borderRadius: "16px",
        border: "1px dashed " + TOKENS.border,
        background: TOKENS.surfaceMuted,
        padding: "22px",
      }}
    >
      <p
        style={{
          margin: 0,
          color: TOKENS.textSoft,
          fontSize: "14px",
          fontWeight: 700,
          lineHeight: 1.4,
        }}
      >
        No administrative actions available
      </p>
    </div>
  );
}

export default function CoreAdministrationPanel({
  items = [],
  alert = null,
  loading = false,
  error = false,
  title = "Core Administration",
  subtitle = "Primary administrative workflows",
}) {
  const hasItems = Array.isArray(items) && items.length > 0;
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Responsive columns based on container width
  const cols = containerWidth < 400 ? 1 : containerWidth < 700 ? 2 : 3;

  const gridStyle = {
    display: "grid",
    gap: "14px",
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  };

  return (
    <section
      ref={containerRef}
      style={{
        background: TOKENS.surface,
        border: "1px solid " + TOKENS.border,
        borderRadius: "16px",
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
        padding: "24px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
        gap: "16px",
      }}
    >
      <header style={{ width: "100%", minWidth: 0, display: "grid", gap: "4px" }}>
        <h3
          style={{
            margin: 0,
            color: TOKENS.text,
            fontSize: "16px",
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            color: TOKENS.textMuted,
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      </header>

      <div style={{ width: "100%", minWidth: 0, display: "grid", gap: "14px" }}>
        {loading ? (
          <>
            <div style={gridStyle}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <SkeletonTile key={index} index={index} />
              ))}
            </div>
            <SkeletonAlert />
          </>
        ) : null}

        {!loading && error ? <ErrorState /> : null}

        {!loading && !error && !hasItems ? <EmptyState /> : null}

        {!loading && !error && hasItems ? (
          <>
            <div style={gridStyle}>
              {items.map((item, index) => (
                <AdminCommandTile
                  key={item?.id ?? "admin-command-" + index}
                  title={item?.title}
                  description={item?.description}
                  href={item?.href}
                  icon={item?.icon}
                  tone={item?.tone}
                  badgeText={item?.badgeText}
                />
              ))}
            </div>

            {alert ? (
              <AdminAlertCard
                title={alert?.title}
                message={alert?.message}
                tone={alert?.tone}
                actionLabel={alert?.actionLabel}
                actionHref={alert?.actionHref}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
