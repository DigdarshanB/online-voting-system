import React from "react";
import { T } from "../../../components/ui/tokens";
import { RefreshCw, Clock } from "lucide-react";

export default function VerificationOverviewCard({ onRefresh, isRefreshing, lastRefreshed }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: T.radius.xl,
      padding: "18px 24px",
      marginBottom: T.space.xl,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 20,
      boxShadow: T.shadow.sm,
    }}>
      <div>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.muted,
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          marginBottom: 5,
        }}>
          Identity Review Workspace
        </div>
        <p style={{
          margin: 0,
          fontSize: 13.5,
          color: T.textSecondary,
          lineHeight: 1.5,
          maxWidth: 540,
        }}>
          Review pending submissions, inspect voter artifacts, and approve or reject applications.
        </p>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}>
        {lastRefreshed && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: T.muted,
            fontWeight: 500,
          }}>
            <Clock size={12} />
            <span>Updated {lastRefreshed}</span>
          </div>
        )}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: T.radius.md,
            border: `1px solid ${T.border}`,
            background: T.surface,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: isRefreshing ? "not-allowed" : "pointer",
            color: T.textSecondary,
            transition: T.transition,
            opacity: isRefreshing ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
          onMouseEnter={e => {
            if (!isRefreshing) {
              e.currentTarget.style.background = T.surfaceAlt;
              e.currentTarget.style.borderColor = T.borderStrong;
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = T.surface;
            e.currentTarget.style.borderColor = T.border;
          }}
        >
          <RefreshCw
            size={13}
            style={isRefreshing ? { animation: "spin 1s linear infinite" } : {}}
          />
          Refresh Queue
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
