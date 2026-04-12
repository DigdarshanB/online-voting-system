/**
 * AuditReportsPage.jsx
 *
 * Production-grade audit reports page for the Admin Portal.
 * Displays ONLY real backend-recorded audit data from auth_audit_logs.
 * Super-admin only access.
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  RefreshCw, Download, FileJson, FileText, Camera,
  Search, Filter, X, ChevronLeft, ChevronRight,
  AlertTriangle, Shield, Users, Activity, Clock,
  Eye, ChevronDown, ChevronUp, Loader2, Info,
  ExternalLink, Copy, Check, XCircle,
} from "lucide-react";
import { T } from "../components/ui/tokens";
import { PageContainer, errMsg, formatDateTime } from "../components/ui/AdminUI";
import { useAuditLogs, useAuditSummary } from "../features/audit/hooks/useAuditLogs";
import { fetchAuditExport } from "../features/audit/api/auditApi";

/* ══════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ══════════════════════════════════════════════════════════════ */

const ACTION_LABELS = {
  LOGIN_SUCCESS: "Login Success",
  LOGIN_FAILURE: "Login Failed",
  EMAIL_VERIFIED: "Email Verified",
  TOTP_ENROLLED: "TOTP Enrolled",
  TOTP_VERIFIED: "TOTP Verified",
  PASSWORD_CHANGED: "Password Changed",
  PASSWORD_RESET_REQUESTED: "Password Reset Requested",
  PASSWORD_RESET_COMPLETED: "Password Reset Completed",
  PASSWORD_RESET_REQUESTED_BY_ADMIN: "Admin Password Reset",
  TOTP_RESET: "TOTP Reset",
  TOTP_RESET_BY_ADMIN: "Admin TOTP Reset",
  TOTP_RECOVERY_APPROVED: "TOTP Recovery Approved",
  TOTP_RECOVERY_REJECTED: "TOTP Recovery Rejected",
  ADMIN_ACTIVATION_COMPLETED: "Admin Activated",
  ACCOUNT_APPROVED: "Account Approved",
  ACCOUNT_REJECTED: "Account Rejected",
  ACCOUNT_SUSPENDED: "Account Suspended",
  ACCOUNT_REACTIVATED: "Account Reactivated",
  ACCOUNT_DEACTIVATED: "Account Deactivated",
  ACCOUNT_DELETED: "Account Deleted",
  ACCOUNT_UPDATED: "Account Updated",
  ACCOUNT_DISABLED: "Account Disabled",
  ACCOUNT_RECORD_REMOVED: "Record Removed",
  BULK_VOTER_ACTION: "Bulk Voter Action",
  election_created: "Election Created",
  "election_open-nomination": "Nominations Opened",
  "election_close-nomination": "Nominations Closed",
  election_publish: "Election Published",
  candidate_created: "Candidate Created",
};

const CATEGORY_LABELS = {
  authentication: "Authentication",
  security: "Security",
  account_management: "Account Management",
  admin_lifecycle: "Admin Lifecycle",
  election_management: "Election Management",
  candidate_management: "Candidate Management",
  other: "Other",
};

const CATEGORY_COLORS = {
  authentication: { bg: "#DBEAFE", color: "#1E40AF", border: "#93C5FD" },
  security: { bg: "#FEF3C7", color: "#92400E", border: "#FCD34D" },
  account_management: { bg: "#D1FAE5", color: "#065F46", border: "#6EE7B7" },
  admin_lifecycle: { bg: "#E0E7FF", color: "#3730A3", border: "#A5B4FC" },
  election_management: { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" },
  candidate_management: { bg: "#ECFEFF", color: "#0E7490", border: "#A5F3FC" },
  other: { bg: "#F3F4F6", color: "#374151", border: "#D1D5DB" },
};

const OUTCOME_COLORS = {
  SUCCESS: { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  FAILURE: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
};

const QUICK_FILTERS = [
  { label: "Failed Logins", action: "LOGIN_FAILURE" },
  { label: "Password Resets", category: "security" },
  { label: "Account Approvals", action: "ACCOUNT_APPROVED" },
  { label: "Account Rejections", action: "ACCOUNT_REJECTED" },
  { label: "Suspensions", action: "ACCOUNT_SUSPENDED" },
  { label: "Security Events", category: "security" },
  { label: "High-Risk Only", highRisk: true },
];

function formatAction(action) {
  return ACTION_LABELS[action] || action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function truncate(str, len = 40) {
  if (!str) return "—";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

function downloadFile(data, filename, type) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function convertToCSV(items) {
  if (!items.length) return "";
  const headers = ["ID", "Timestamp", "Action", "Category", "Outcome", "Actor ID", "Actor Name", "Target ID", "Target Name", "IP Address", "User Agent"];
  const rows = items.map(i => [
    i.id,
    i.timestamp,
    i.action,
    i.category,
    i.outcome,
    i.actor_id ?? "",
    (i.actor_name || "").replace(/"/g, '""'),
    i.target_id ?? "",
    (i.target_name || "").replace(/"/g, '""'),
    i.ip_address || "",
    (i.user_agent || "").replace(/"/g, '""'),
  ]);
  return [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
}

/* ══════════════════════════════════════════════════════════════
   BADGE COMPONENTS
   ══════════════════════════════════════════════════════════════ */

function Badge({ label, colors, small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: small ? "1px 6px" : "2px 8px",
      borderRadius: 6,
      fontSize: small ? 10.5 : 11.5,
      fontWeight: 600,
      background: colors.bg,
      color: colors.color,
      border: `1px solid ${colors.border}`,
      whiteSpace: "nowrap",
      letterSpacing: "0.01em",
      lineHeight: 1.6,
    }}>
      {label}
    </span>
  );
}

function OutcomeBadge({ outcome }) {
  const c = OUTCOME_COLORS[outcome] || OUTCOME_COLORS.SUCCESS;
  return <Badge label={outcome} colors={c} />;
}

function CategoryBadge({ category }) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  return <Badge label={CATEGORY_LABELS[category] || category} colors={c} />;
}

/* ══════════════════════════════════════════════════════════════
   KPI CARDS
   ══════════════════════════════════════════════════════════════ */

function KPICard({ icon: Icon, label, value, color, loading }) {
  return (
    <div style={{
      background: T.surface,
      borderRadius: T.radius.lg,
      border: `1px solid ${T.border}`,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      minWidth: 0,
      boxShadow: T.shadow.sm,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: color + "14",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 21, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>
          {loading ? <Loader2 size={18} className="spin" style={{ animation: "spin 1s linear infinite" }} /> : (value ?? 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.muted, marginTop: 1, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function KPIStrip({ summary, loading }) {
  const cards = [
    { icon: Activity, label: "Total Events", value: summary?.total_events, color: T.accent },
    { icon: XCircle, label: "Failed Events", value: summary?.failed_events, color: T.error },
    { icon: Shield, label: "Admin Actions", value: summary?.admin_actions, color: T.purple },
    { icon: AlertTriangle, label: "Security Events", value: summary?.security_events, color: T.warn },
    { icon: Users, label: "Affected Accounts", value: summary?.affected_accounts, color: T.teal || "#0D9488" },
    { icon: Clock, label: "Today's Activity", value: summary?.today_activity, color: T.success },
  ];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
      gap: 12,
      marginBottom: 20,
    }}>
      {cards.map(c => <KPICard key={c.label} {...c} loading={loading} />)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   FILTER BAR
   ══════════════════════════════════════════════════════════════ */

function FilterBar({ filters, setFilters, summary, onClear }) {
  const [expanded, setExpanded] = useState(false);

  const availableActions = summary?.available_actions || [];
  const availableOutcomes = summary?.available_outcomes || [];
  const availableCategories = summary?.available_categories || [];

  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val, page: 1 }));

  const activeQuickFilter = QUICK_FILTERS.findIndex(qf => {
    if (qf.highRisk) return filters.high_risk_only;
    if (qf.action) return filters.action === qf.action;
    if (qf.category) return filters.category === qf.category;
    return false;
  });

  const hasFilters = filters.search || filters.action || filters.category || filters.outcome ||
    filters.date_from || filters.date_to || filters.actor_id || filters.target_id ||
    filters.ip_address || filters.high_risk_only;

  return (
    <div style={{
      background: T.surface,
      borderRadius: T.radius.lg,
      border: `1px solid ${T.border}`,
      padding: "16px 20px",
      marginBottom: 16,
      boxShadow: T.shadow.sm,
    }}>
      {/* Search & primary filters row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{
          flex: "1 1 260px", display: "flex", alignItems: "center",
          background: T.surfaceAlt, borderRadius: T.radius.md,
          border: `1px solid ${T.borderLight}`, padding: "0 12px",
        }}>
          <Search size={16} color={T.muted} />
          <input
            type="text"
            placeholder="Search actions, IPs, metadata…"
            value={filters.search || ""}
            onChange={e => update("search", e.target.value || undefined)}
            style={{
              border: "none", background: "transparent", outline: "none",
              padding: "8px 10px", fontSize: 13, color: T.text, width: "100%",
              fontFamily: "inherit",
            }}
          />
          {filters.search && (
            <button onClick={() => update("search", undefined)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              <X size={14} color={T.muted} />
            </button>
          )}
        </div>

        <select
          value={filters.action || ""}
          onChange={e => update("action", e.target.value || undefined)}
          style={{
            padding: "8px 12px", borderRadius: T.radius.md, fontSize: 12.5,
            border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
            color: T.text, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <option value="">All Actions</option>
          {availableActions.map(a => <option key={a} value={a}>{formatAction(a)}</option>)}
        </select>

        <select
          value={filters.category || ""}
          onChange={e => update("category", e.target.value || undefined)}
          style={{
            padding: "8px 12px", borderRadius: T.radius.md, fontSize: 12.5,
            border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
            color: T.text, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <option value="">All Categories</option>
          {availableCategories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
        </select>

        <select
          value={filters.outcome || ""}
          onChange={e => update("outcome", e.target.value || undefined)}
          style={{
            padding: "8px 12px", borderRadius: T.radius.md, fontSize: 12.5,
            border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
            color: T.text, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <option value="">All Outcomes</option>
          {availableOutcomes.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "8px 12px", borderRadius: T.radius.md, fontSize: 12,
            border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
            color: T.muted, cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
          }}
        >
          <Filter size={14} />
          {expanded ? "Less" : "More"}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {hasFilters && (
          <button
            onClick={onClear}
            style={{
              padding: "8px 14px", borderRadius: T.radius.md, fontSize: 12,
              border: `1px solid ${T.errorBorder}`, background: T.errorBg,
              color: T.error, cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderLight}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Date From</label>
            <input
              type="date"
              value={filters.date_from || ""}
              onChange={e => update("date_from", e.target.value || undefined)}
              style={{
                padding: "7px 10px", borderRadius: T.radius.md, fontSize: 12,
                border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
                color: T.text, fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Date To</label>
            <input
              type="date"
              value={filters.date_to || ""}
              onChange={e => update("date_to", e.target.value || undefined)}
              style={{
                padding: "7px 10px", borderRadius: T.radius.md, fontSize: 12,
                border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
                color: T.text, fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actor ID</label>
            <input
              type="number"
              placeholder="User ID"
              value={filters.actor_id ?? ""}
              onChange={e => update("actor_id", e.target.value ? Number(e.target.value) : undefined)}
              style={{
                padding: "7px 10px", borderRadius: T.radius.md, fontSize: 12,
                border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
                color: T.text, width: 100, fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Target ID</label>
            <input
              type="number"
              placeholder="User ID"
              value={filters.target_id ?? ""}
              onChange={e => update("target_id", e.target.value ? Number(e.target.value) : undefined)}
              style={{
                padding: "7px 10px", borderRadius: T.radius.md, fontSize: 12,
                border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
                color: T.text, width: 100, fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <label style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>IP Address</label>
            <input
              type="text"
              placeholder="e.g. 127.0.0.1"
              value={filters.ip_address || ""}
              onChange={e => update("ip_address", e.target.value || undefined)}
              style={{
                padding: "7px 10px", borderRadius: T.radius.md, fontSize: 12,
                border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
                color: T.text, width: 140, fontFamily: "inherit",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, justifyContent: "flex-end" }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 600, color: T.error, cursor: "pointer",
              padding: "7px 0",
            }}>
              <input
                type="checkbox"
                checked={!!filters.high_risk_only}
                onChange={e => update("high_risk_only", e.target.checked || undefined)}
                style={{ accentColor: T.error }}
              />
              High-Risk Only
            </label>
          </div>
        </div>
      )}

      {/* Quick filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
        {QUICK_FILTERS.map((qf, i) => {
          const isActive = activeQuickFilter === i;
          return (
            <button
              key={qf.label}
              onClick={() => {
                if (isActive) {
                  setFilters(prev => {
                    const next = { ...prev, page: 1 };
                    if (qf.highRisk) delete next.high_risk_only;
                    if (qf.action) delete next.action;
                    if (qf.category) delete next.category;
                    return next;
                  });
                } else {
                  setFilters(prev => {
                    const next = { ...prev, page: 1 };
                    delete next.action;
                    delete next.category;
                    delete next.high_risk_only;
                    if (qf.action) next.action = qf.action;
                    if (qf.category) next.category = qf.category;
                    if (qf.highRisk) next.high_risk_only = true;
                    return next;
                  });
                }
              }}
              style={{
                padding: "4px 12px",
                borderRadius: 16,
                fontSize: 11.5,
                fontWeight: 600,
                border: `1px solid ${isActive ? T.accent : T.borderLight}`,
                background: isActive ? T.accentLight : T.surfaceAlt,
                color: isActive ? T.accent : T.muted,
                cursor: "pointer",
                transition: T.transitionFast,
                fontFamily: "inherit",
              }}
            >
              {qf.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AUDIT TABLE
   ══════════════════════════════════════════════════════════════ */

function AuditTable({ data, loading, error, onRowClick, page, totalPages, onPageChange }) {
  if (error) {
    return (
      <div style={{
        background: T.errorBg, border: `1px solid ${T.errorBorder}`, borderRadius: T.radius.lg,
        padding: "32px 24px", textAlign: "center", color: T.error,
      }}>
        <AlertTriangle size={28} style={{ marginBottom: 8 }} />
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Failed to load audit logs</div>
        <div style={{ fontSize: 13, color: T.muted }}>{errMsg(error)}</div>
      </div>
    );
  }

  const items = data?.items || [];

  return (
    <div style={{
      background: T.surface,
      borderRadius: T.radius.lg,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow.sm,
      overflow: "hidden",
    }}>
      {/* Table wrapper */}
      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          minWidth: 900,
        }}>
          <thead>
            <tr style={{ background: T.surfaceAlt }}>
              {["Timestamp", "Action", "Category", "Outcome", "Actor", "Target", "IP Address", ""].map((h, i) => (
                <th key={i} style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontSize: 11,
                  fontWeight: 800,
                  color: T.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  borderBottom: `1px solid ${T.border}`,
                  position: "sticky",
                  top: 0,
                  background: T.surfaceAlt,
                  zIndex: 1,
                  whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !items.length ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} style={{ padding: "12px 14px", borderBottom: `1px solid ${T.borderLight}` }}>
                      <div style={{
                        height: 14,
                        borderRadius: 4,
                        background: `linear-gradient(90deg, ${T.surfaceAlt} 25%, ${T.surfaceSubtle} 50%, ${T.surfaceAlt} 75%)`,
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.5s ease-in-out infinite",
                        width: j === 0 ? 130 : j < 6 ? 90 : 60,
                      }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "48px 24px", textAlign: "center" }}>
                  <Info size={32} color={T.subtle} style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: 15, color: T.textSecondary, marginBottom: 4 }}>
                    No audit events found
                  </div>
                  <div style={{ fontSize: 13, color: T.muted }}>
                    Adjust your filters or date range to view audit records.
                  </div>
                </td>
              </tr>
            ) : items.map(row => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row)}
                style={{ cursor: "pointer", transition: T.transitionFast }}
                onMouseEnter={e => e.currentTarget.style.background = T.surfaceAlt}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, whiteSpace: "nowrap", fontSize: 12, color: T.textSecondary }}>
                  {formatDateTime(row.created_at)}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, fontWeight: 600, color: T.text }}>
                  {formatAction(row.action)}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}>
                  <CategoryBadge category={row.category} />
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}>
                  <OutcomeBadge outcome={row.outcome} />
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, fontSize: 12.5, color: T.textSecondary }}>
                  {row.actor_name ? truncate(row.actor_name, 24) : <span style={{ color: T.subtle }}>—</span>}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, fontSize: 12.5, color: T.textSecondary }}>
                  {row.target_name ? truncate(row.target_name, 24) : <span style={{ color: T.subtle }}>—</span>}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, fontSize: 12, fontFamily: "monospace", color: T.muted }}>
                  {row.ip_address || "—"}
                </td>
                <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}>
                  <Eye size={15} color={T.subtle} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(data?.total ?? 0) > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderTop: `1px solid ${T.borderLight}`,
          background: T.surfaceAlt,
          fontSize: 12.5,
          color: T.muted,
          flexWrap: "wrap",
          gap: 8,
        }}>
          <span style={{ fontWeight: 600 }}>
            {data.total.toLocaleString()} total events · Page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              style={{
                padding: "6px 10px", borderRadius: T.radius.sm,
                border: `1px solid ${T.borderLight}`,
                background: page <= 1 ? T.surfaceSubtle : T.surface,
                color: page <= 1 ? T.subtle : T.text,
                cursor: page <= 1 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", fontFamily: "inherit",
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              style={{
                padding: "6px 10px", borderRadius: T.radius.sm,
                border: `1px solid ${T.borderLight}`,
                background: page >= totalPages ? T.surfaceSubtle : T.surface,
                color: page >= totalPages ? T.subtle : T.text,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", fontFamily: "inherit",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DETAIL DRAWER
   ══════════════════════════════════════════════════════════════ */

function DetailDrawer({ row, onClose }) {
  const [copied, setCopied] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    const handleKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (drawerRef.current) drawerRef.current.focus();
  }, []);

  if (!row) return null;

  const meta = row.metadata || {};
  const metaEntries = Object.entries(meta).filter(([k]) => k !== "raw");

  const copyJson = () => {
    const safe = { ...row };
    navigator.clipboard.writeText(JSON.stringify(safe, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const Detail = ({ label, value, mono }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, color: value ? T.text : T.subtle, fontWeight: 500,
        fontFamily: mono ? "'JetBrains Mono', 'Fira Code', monospace" : "inherit",
        wordBreak: "break-all",
      }}>
        {value || "—"}
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(2px)", zIndex: 999,
        }}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(520px, 100vw - 24px)",
          background: T.surface,
          boxShadow: T.shadow.xl,
          zIndex: 1000,
          display: "flex", flexDirection: "column",
          outline: "none",
          animation: "slideIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 4 }}>
              Audit Event Detail
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>
              Record #{row.id}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
              borderRadius: T.radius.sm, padding: 6, cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={16} color={T.muted} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Primary info */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 20px",
          }}>
            <Detail label="Timestamp" value={formatDateTime(row.created_at)} />
            <Detail label="Action" value={formatAction(row.action)} />
            <div><div style={{ fontSize: 10.5, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Category</div><CategoryBadge category={row.category} /></div>
            <div><div style={{ fontSize: 10.5, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Outcome</div><OutcomeBadge outcome={row.outcome} /></div>
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: T.borderLight, margin: "16px 0" }} />

          {/* Actor & target */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            <Detail label="Actor" value={row.actor_name} />
            <Detail label="Actor Role" value={row.actor_role} />
            <Detail label="Target" value={row.target_name} />
            <Detail label="Target Role" value={row.target_role} />
          </div>

          <div style={{ height: 1, background: T.borderLight, margin: "16px 0" }} />

          {/* Technical */}
          <Detail label="IP Address" value={row.ip_address} mono />
          <Detail label="User Agent" value={row.user_agent} />

          {/* Metadata */}
          {metaEntries.length > 0 && (
            <>
              <div style={{ height: 1, background: T.borderLight, margin: "16px 0" }} />
              <div style={{ fontSize: 12, fontWeight: 800, color: T.textSecondary, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Metadata
              </div>
              <div style={{
                background: T.surfaceAlt,
                borderRadius: T.radius.md,
                border: `1px solid ${T.borderLight}`,
                padding: 12,
              }}>
                {metaEntries.map(([k, v]) => (
                  <div key={k} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12.5 }}>
                    <span style={{ fontWeight: 700, color: T.muted, minWidth: 120, flexShrink: 0 }}>{k}</span>
                    <span style={{
                      color: v === "***REDACTED***" ? T.error : T.text,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      wordBreak: "break-all",
                    }}>
                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Raw JSON */}
          <div style={{ height: 1, background: T.borderLight, margin: "16px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Raw Record (Sanitized)
            </div>
            <button
              onClick={copyJson}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "4px 10px", borderRadius: T.radius.sm,
                border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
                fontSize: 11, fontWeight: 600, color: T.muted, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {copied ? <Check size={12} color={T.success} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre style={{
            background: "#0F172A",
            color: "#E2E8F0",
            borderRadius: T.radius.md,
            padding: 14,
            fontSize: 11.5,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: 1.6,
            overflow: "auto",
            maxHeight: 300,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}>
            {JSON.stringify(row, null, 2)}
          </pre>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   REPORT SNAPSHOT MODAL
   ══════════════════════════════════════════════════════════════ */

function ReportSnapshot({ summary, filters, onClose }) {
  const printRef = useRef(null);

  useEffect(() => {
    const handleKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    win.document.write(`<html><head><title>Audit Report Snapshot</title><style>
      body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; }
      h1 { font-size: 22px; } h2 { font-size: 16px; margin-top: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { padding: 6px 12px; text-align: left; border: 1px solid #ddd; font-size: 13px; }
      th { background: #f5f7fb; font-weight: 700; }
      .meta { color: #64748b; font-size: 12px; }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  if (!summary) return null;

  const activeFilters = Object.entries(filters).filter(([k, v]) => v && k !== "page" && k !== "page_size");

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 999 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "min(680px, 95vw)", maxHeight: "85vh",
        background: T.surface, borderRadius: T.radius.xl,
        boxShadow: T.shadow.xl, zIndex: 1000,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Report Snapshot</div>
            <div style={{ fontSize: 12, color: T.muted }}>Generated {new Date().toLocaleString()}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePrint} style={{
              padding: "7px 14px", borderRadius: T.radius.md, fontSize: 12, fontWeight: 600,
              background: T.accent, color: "#FFF", border: "none", cursor: "pointer", fontFamily: "inherit",
            }}>
              Print / Save PDF
            </button>
            <button onClick={onClose} style={{
              background: T.surfaceAlt, border: `1px solid ${T.borderLight}`,
              borderRadius: T.radius.sm, padding: 6, cursor: "pointer", display: "flex",
            }}>
              <X size={16} color={T.muted} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div ref={printRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>Audit Report — Online Voting System</h1>
          <p className="meta" style={{ color: T.muted, fontSize: 12, margin: "0 0 20px" }}>
            Report date: {new Date().toLocaleDateString()} · Election Commission of Nepal
          </p>

          {activeFilters.length > 0 && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Active Filters</h2>
              <table>
                <tbody>
                  {activeFilters.map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ fontWeight: 600, width: "30%" }}>{k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</td>
                      <td>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, marginTop: 20 }}>Summary Totals</h2>
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Total Events</td><td>{summary.total_events?.toLocaleString()}</td></tr>
              <tr><td>Failed Events</td><td>{summary.failed_events?.toLocaleString()}</td></tr>
              <tr><td>Admin Actions</td><td>{summary.admin_actions?.toLocaleString()}</td></tr>
              <tr><td>Security Events</td><td>{summary.security_events?.toLocaleString()}</td></tr>
              <tr><td>Affected Accounts</td><td>{summary.affected_accounts?.toLocaleString()}</td></tr>
              <tr><td>Today&apos;s Activity</td><td>{summary.today_activity?.toLocaleString()}</td></tr>
            </tbody>
          </table>

          {summary.action_breakdown && Object.keys(summary.action_breakdown).length > 0 && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, marginTop: 20 }}>By Action</h2>
              <table>
                <thead><tr><th>Action</th><th>Count</th></tr></thead>
                <tbody>
                  {Object.entries(summary.action_breakdown).sort((a, b) => b[1] - a[1]).map(([a, c]) => (
                    <tr key={a}><td>{formatAction(a)}</td><td>{c.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {summary.outcome_breakdown && Object.keys(summary.outcome_breakdown).length > 0 && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, marginTop: 20 }}>By Outcome</h2>
              <table>
                <thead><tr><th>Outcome</th><th>Count</th></tr></thead>
                <tbody>
                  {Object.entries(summary.outcome_breakdown).map(([o, c]) => (
                    <tr key={o}><td>{o}</td><td>{c.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {summary.category_breakdown && Object.keys(summary.category_breakdown).length > 0 && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, marginTop: 20 }}>By Category</h2>
              <table>
                <thead><tr><th>Category</th><th>Count</th></tr></thead>
                <tbody>
                  {Object.entries(summary.category_breakdown).map(([c, n]) => (
                    <tr key={c}><td>{CATEGORY_LABELS[c] || c}</td><td>{n.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */

const INITIAL_FILTERS = { page: 1, page_size: 50 };

export default function AuditReportsPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [exporting, setExporting] = useState(null);

  // Build query params from filters
  const queryParams = useMemo(() => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== false) p[k] = v;
    });
    return p;
  }, [filters]);

  // Summary uses same filters except pagination
  const summaryParams = useMemo(() => {
    const p = { ...queryParams };
    delete p.page;
    delete p.page_size;
    delete p.sort_by;
    delete p.sort_dir;
    return p;
  }, [queryParams]);

  const { data: logsData, isLoading: logsLoading, error: logsError, refetch } = useAuditLogs(queryParams);
  const { data: summaryData, isLoading: summaryLoading } = useAuditSummary(summaryParams);

  const clearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const handleExport = useCallback(async (format) => {
    setExporting(format);
    try {
      const params = { ...summaryParams };
      const data = await fetchAuditExport(params);

      if (format === "json") {
        downloadFile(JSON.stringify(data, null, 2), `audit-export-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
      } else {
        const csv = convertToCSV(data);
        downloadFile(csv, `audit-export-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  }, [summaryParams]);

  return (
    <PageContainer>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: "-0.02em" }}>
            Audit Reports
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: T.muted, fontWeight: 500 }}>
            Review system audit trail, security events, and administrative actions
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => refetch()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: T.radius.md,
              border: `1px solid ${T.border}`, background: T.surface,
              fontSize: 12.5, fontWeight: 600, color: T.text,
              cursor: "pointer", boxShadow: T.shadow.sm, fontFamily: "inherit",
            }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={() => handleExport("csv")}
            disabled={!!exporting}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: T.radius.md,
              border: `1px solid ${T.border}`, background: T.surface,
              fontSize: 12.5, fontWeight: 600, color: T.text,
              cursor: exporting ? "wait" : "pointer", boxShadow: T.shadow.sm,
              fontFamily: "inherit",
            }}
          >
            <FileText size={14} />
            {exporting === "csv" ? "Exporting…" : "Export CSV"}
          </button>
          <button
            onClick={() => handleExport("json")}
            disabled={!!exporting}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: T.radius.md,
              border: `1px solid ${T.border}`, background: T.surface,
              fontSize: 12.5, fontWeight: 600, color: T.text,
              cursor: exporting ? "wait" : "pointer", boxShadow: T.shadow.sm,
              fontFamily: "inherit",
            }}
          >
            <FileJson size={14} />
            {exporting === "json" ? "Exporting…" : "Export JSON"}
          </button>
          <button
            onClick={() => setShowReport(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: T.radius.md,
              border: "none", background: T.accent,
              fontSize: 12.5, fontWeight: 600, color: "#FFF",
              cursor: "pointer", boxShadow: T.shadow.sm, fontFamily: "inherit",
            }}
          >
            <Camera size={14} />
            Report Snapshot
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <KPIStrip summary={summaryData} loading={summaryLoading} />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        summary={summaryData}
        onClear={clearFilters}
      />

      {/* Table */}
      <AuditTable
        data={logsData}
        loading={logsLoading}
        error={logsError}
        onRowClick={setSelectedRow}
        page={filters.page || 1}
        totalPages={logsData?.total_pages || 1}
        onPageChange={p => setFilters(prev => ({ ...prev, page: p }))}
      />

      {/* Detail Drawer */}
      {selectedRow && (
        <DetailDrawer
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {/* Report Snapshot Modal */}
      {showReport && (
        <ReportSnapshot
          summary={summaryData}
          filters={filters}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Global shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  );
}
