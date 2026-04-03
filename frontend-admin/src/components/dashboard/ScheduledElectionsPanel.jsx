import { Link } from "react-router-dom";
import { CalendarSearch } from "lucide-react";
import ElectionQueueItem from "./ElectionQueueItem";

const TOKENS = {
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  text: "#0F172A",
  textSoft: "#475569",
  textMuted: "#64748B",
  brand: "#173B72",
  brandBlue: "#2F6FED",
  brandBlueSoft: "#EAF2FF",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
};

function LoadingSkeletonRow({ index }) {
  return (
    <div
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        background: TOKENS.surface,
        border: "1px solid " + TOKENS.border,
        borderRadius: "20px",
        padding: "18px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
      }}
      aria-hidden="true"
      key={"skeleton-" + index}
    >
      <div style={{ minWidth: 0, flex: "1 1 auto", display: "flex", gap: "14px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            minWidth: "44px",
            borderRadius: "16px",
            border: "1px solid " + TOKENS.border,
            background: TOKENS.surfaceMuted,
          }}
        />
        <div style={{ minWidth: 0, width: "100%", display: "grid", gap: "8px" }}>
          <div
            style={{
              width: "68%",
              maxWidth: "360px",
              height: "12px",
              borderRadius: "999px",
              background: TOKENS.border,
            }}
          />
          <div
            style={{
              width: "52%",
              maxWidth: "260px",
              height: "10px",
              borderRadius: "999px",
              background: TOKENS.surfaceMuted,
              border: "1px solid " + TOKENS.border,
            }}
          />
        </div>
      </div>

      <div
        style={{
          width: "88px",
          height: "34px",
          borderRadius: "999px",
          background: TOKENS.surfaceMuted,
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
        borderRadius: "18px",
        border: "1px solid " + TOKENS.border,
        background: TOKENS.dangerSoft,
        padding: "20px",
        boxSizing: "border-box",
      }}
      role="alert"
      aria-live="polite"
    >
      <p
        style={{
          margin: 0,
          color: TOKENS.danger,
          fontSize: "15px",
          fontWeight: 800,
          lineHeight: 1.3,
        }}
      >
        Unable to load elections
      </p>
      <p
        style={{
          margin: "6px 0 0",
          color: TOKENS.textSoft,
          fontSize: "13px",
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        Please retry or check API connectivity.
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
        borderRadius: "18px",
        border: "1px dashed " + TOKENS.borderStrong,
        background: TOKENS.surfaceMuted,
        padding: "26px 20px",
        boxSizing: "border-box",
        display: "grid",
        justifyItems: "center",
        gap: "10px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "14px",
          background: TOKENS.brandBlueSoft,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid " + TOKENS.border,
        }}
      >
        <CalendarSearch size={22} color={TOKENS.brandBlue} strokeWidth={2.1} />
      </div>
      <p
        style={{
          margin: 0,
          color: TOKENS.text,
          fontSize: "15px",
          fontWeight: 800,
          lineHeight: 1.3,
        }}
      >
        No scheduled elections
      </p>
      <p
        style={{
          margin: 0,
          color: TOKENS.textMuted,
          fontSize: "13px",
          fontWeight: 600,
          lineHeight: 1.4,
          maxWidth: "460px",
        }}
      >
        Create or publish an election to populate this queue.
      </p>
    </div>
  );
}

export default function ScheduledElectionsPanel({
  items = [],
  loading = false,
  error = false,
  title = "Scheduled Elections",
  subtitle = "Upcoming and active election windows",
  viewAllHref = null,
}) {
  return (
    <section
      style={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
        background: TOKENS.surface,
        border: "1px solid " + TOKENS.border,
        borderRadius: "28px",
        boxShadow: "0 10px 34px rgba(15, 23, 42, 0.06)",
        padding: "24px 28px",
        gap: "18px",
      }}
    >
      <header
        style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, display: "grid", gap: "4px" }}>
          <h3
            style={{
              margin: 0,
              color: TOKENS.text,
              fontSize: "20px",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h3>
          <p
            style={{
              margin: 0,
              color: TOKENS.textMuted,
              fontSize: "13px",
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        </div>

        {viewAllHref ? (
          <Link
            to={viewAllHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "34px",
              padding: "0 12px",
              borderRadius: "999px",
              textDecoration: "none",
              background: TOKENS.brandBlueSoft,
              border: "1px solid " + TOKENS.border,
              color: TOKENS.brandBlue,
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            View All
          </Link>
        ) : null}
      </header>

      <div
        style={{
          width: "100%",
          minWidth: 0,
          display: "grid",
          gap: "14px",
          flex: 1,
          alignContent: "start",
        }}
      >
        {loading
          ? [0, 1, 2].map((index) => <LoadingSkeletonRow index={index} key={index} />)
          : null}

        {!loading && error ? <ErrorState /> : null}

        {!loading && !error && (!items || items.length === 0) ? <EmptyState /> : null}

        {!loading && !error && Array.isArray(items) && items.length > 0
          ? items.map((item, index) => (
              <ElectionQueueItem
                key={item?.id ?? "election-row-" + index}
                title={item?.title}
                governmentLevel={item?.governmentLevel}
                dateLabel={item?.dateLabel}
                status={item?.status}
                statusLabel={item?.statusLabel}
                relativeLabel={item?.relativeLabel}
                href={item?.href}
              />
            ))
          : null}
      </div>
    </section>
  );
}
