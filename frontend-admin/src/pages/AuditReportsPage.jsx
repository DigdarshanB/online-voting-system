/**
 * AuditReportsPage.jsx
 *
 * Production-grade audit reports page for the Admin Portal.
 * Displays ONLY real backend-recorded audit data from auth_audit_logs.
 * Super-admin only access.
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  RefreshCw, FileJson, FileText, Camera,
  Search, Filter, X, ChevronLeft, ChevronRight,
  AlertTriangle, Shield, Users, Activity, Clock,
  Eye, ChevronDown, ChevronUp, Loader2, Info,
  Copy, Check, XCircle, ArrowRight, CheckCircle2,
} from "lucide-react";
import { T } from "../components/ui/tokens";
import {
  PageContainer, errMsg, formatDateTime,
  AdminKeyframes, AdminPortalHero, AdminHeroChip, ADMIN_HERO_TINTS,
} from "../components/ui/AdminUI";
import PremiumMetricCard from "../components/dashboard/PremiumMetricCard";
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
   KPI STRIP — PremiumMetricCard-based
   ══════════════════════════════════════════════════════════════ */

function KPIStrip({ summary, loading }) {
  const cards = [
    {
      title: "Total Events",
      value: (summary?.total_events ?? 0).toLocaleString(),
      icon: <Activity size={20} />,
      statusTone: "info",
      statusLabel: "auth_audit_logs recorded",
      helperText: "All recorded audit events",
    },
    {
      title: "Failed Events",
      value: (summary?.failed_events ?? 0).toLocaleString(),
      icon: <XCircle size={20} />,
      statusTone: "danger",
      statusLabel: "requires investigation",
      helperText: "Outcome = FAILURE",
    },
    {
      title: "Admin Actions",
      value: (summary?.admin_actions ?? 0).toLocaleString(),
      icon: <Shield size={20} />,
      statusTone: "neutral",
      statusLabel: "administrative",
      helperText: "Admin-initiated operations",
    },
    {
      title: "Security Events",
      value: (summary?.security_events ?? 0).toLocaleString(),
      icon: <AlertTriangle size={20} />,
      statusTone: "warning",
      statusLabel: "security category",
      helperText: "High-risk or anomalous events",
    },
    {
      title: "Affected Accounts",
      value: (summary?.affected_accounts ?? 0).toLocaleString(),
      icon: <Users size={20} />,
      statusTone: "neutral",
      statusLabel: "distinct users",
      helperText: "Unique users involved",
    },
    {
      title: "Today's Activity",
      value: (summary?.today_activity ?? 0).toLocaleString(),
      icon: <Clock size={20} />,
      statusTone: "success",
      statusLabel: "since midnight",
      helperText: "Events logged today",
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 14,
      marginBottom: 24,
    }}
      className="kpi-strip-grid"
    >
      {cards.map(c => (
        <PremiumMetricCard
          key={c.title}
          title={c.title}
          value={c.value}
          icon={c.icon}
          statusTone={c.statusTone}
          statusLabel={c.statusLabel}
          helperText={c.helperText}
          loading={loading}
        />
      ))}
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

  const activeSelectStyle = (val) => ({
    padding: "8px 12px", borderRadius: T.radius.md, fontSize: 12.5,
    border: `1px solid ${val ? T.accent : T.borderLight}`,
    borderLeft: val ? `3px solid ${T.accent}` : `1px solid ${T.borderLight}`,
    background: val ? T.accentLight : T.surfaceAlt,
    color: val ? T.accent : T.text, cursor: "pointer", fontFamily: "inherit",
    outline: "none", transition: `border-color ${T.transitionFast}, background ${T.transitionFast}`,
  });

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
          background: filters.search ? T.accentLight : T.surfaceAlt,
          borderRadius: T.radius.md,
          border: `1px solid ${filters.search ? T.accent : T.borderLight}`,
          borderLeft: filters.search ? `3px solid ${T.accent}` : `1px solid ${T.borderLight}`,
          padding: "0 12px",
          transition: `border-color ${T.transitionFast}, background ${T.transitionFast}`,
        }}>
          <Search size={16} color={filters.search ? T.accent : T.muted} />
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
          style={activeSelectStyle(filters.action)}
        >
          <option value="">All Actions</option>
          {availableActions.map(a => <option key={a} value={a}>{formatAction(a)}</option>)}
        </select>

        <select
          value={filters.category || ""}
          onChange={e => update("category", e.target.value || undefined)}
          style={activeSelectStyle(filters.category)}
        >
          <option value="">All Categories</option>
          {availableCategories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
        </select>

        <select
          value={filters.outcome || ""}
          onChange={e => update("outcome", e.target.value || undefined)}
          style={activeSelectStyle(filters.outcome)}
        >
          <option value="">All Outcomes</option>
          {availableOutcomes.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "8px 12px", borderRadius: T.radius.md, fontSize: 12,
            border: `1px solid ${expanded ? T.accent : T.borderLight}`,
            background: expanded ? T.accentLight : T.surfaceAlt,
            color: expanded ? T.accent : T.muted,
            cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
            transition: `all ${T.transitionFast}`,
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

      {/* Expanded filters — collapsible panel */}
      <div style={{
        overflow: "hidden",
        maxHeight: expanded ? 300 : 0,
        transition: "max-height 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
      }}>
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px solid ${T.borderLight}`,
          background: T.surfaceSubtle,
          borderRadius: T.radius.md,
          padding: "12px 14px",
          marginLeft: -4,
          marginRight: -4,
        }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Date From</label>
              <input
                type="date"
                value={filters.date_from || ""}
                onChange={e => update("date_from", e.target.value || undefined)}
                style={{
                  padding: "7px 10px", borderRadius: T.radius.md, fontSize: 12,
                  border: `1px solid ${filters.date_from ? T.accent : T.borderLight}`,
                  background: filters.date_from ? T.accentLight : T.surface,
                  color: T.text, fontFamily: "inherit", outline: "none",
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
                  border: `1px solid ${filters.date_to ? T.accent : T.borderLight}`,
                  background: filters.date_to ? T.accentLight : T.surface,
                  color: T.text, fontFamily: "inherit", outline: "none",
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
                  border: `1px solid ${T.borderLight}`, background: T.surface,
                  color: T.text, width: 100, fontFamily: "inherit", outline: "none",
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
                  border: `1px solid ${T.borderLight}`, background: T.surface,
                  color: T.text, width: 100, fontFamily: "inherit", outline: "none",
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
                  border: `1px solid ${T.borderLight}`, background: T.surface,
                  color: T.text, width: 140, fontFamily: "inherit", outline: "none",
                }}
              />
            </div>
            {/* High-Risk toggle pill */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, justifyContent: "flex-end" }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                padding: "7px 14px", borderRadius: 999,
                border: `1.5px solid ${filters.high_risk_only ? T.error : T.borderLight}`,
                background: filters.high_risk_only ? T.errorBg : T.surface,
                color: filters.high_risk_only ? T.error : T.muted,
                transition: `all ${T.transitionFast}`,
                userSelect: "none",
              }}>
                <input
                  type="checkbox"
                  checked={!!filters.high_risk_only}
                  onChange={e => update("high_risk_only", e.target.checked || undefined)}
                  style={{ accentColor: T.error, width: 13, height: 13 }}
                />
                High-Risk Only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Quick filter chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
        {QUICK_FILTERS.map((qf, i) => {
          const isActive = activeQuickFilter === i;
          const isHighRisk = qf.highRisk;
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
                border: `1.5px solid ${isActive ? (isHighRisk ? T.error : T.accent) : T.borderLight}`,
                background: isActive ? (isHighRisk ? T.errorBg : T.accentLight) : T.surfaceAlt,
                color: isActive ? (isHighRisk ? T.error : T.accent) : T.muted,
                cursor: "pointer",
                transition: `all ${T.transitionFast}`,
                fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {isHighRisk && isActive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.error, display: "inline-block" }} />}
              {qf.label}
              {isActive && !isHighRisk && <X size={11} style={{ marginLeft: 2 }} />}
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

function AuditTable({ data, loading, error, onRowClick, onClear, page, totalPages, onPageChange }) {
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
                <td colSpan={8} style={{ padding: "56px 24px", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <Shield size={36} color={T.subtle} />
                    <div style={{ fontWeight: 700, fontSize: 15, color: T.textSecondary }}>
                      No audit events match your filters
                    </div>
                    <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>
                      Try broadening your search criteria or removing active filters.
                    </div>
                    {onClear && (
                      <button
                        onClick={onClear}
                        style={{
                          padding: "7px 18px", borderRadius: T.radius.md, fontSize: 12.5,
                          border: `1px solid ${T.accent}`, background: T.accentLight,
                          color: T.accent, cursor: "pointer", fontWeight: 600, fontFamily: "inherit",
                        }}
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : items.map((row, idx) => {
              const isFailure = row.outcome === "FAILURE";
              const isEven = idx % 2 === 0;
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick(row)}
                  style={{
                    cursor: "pointer",
                    transition: `background ${T.transitionFast}`,
                    background: isEven ? T.surface : T.surfaceAlt,
                    borderLeft: isFailure ? `3px solid ${T.errorBorder}` : "3px solid transparent",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.accentLight; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isEven ? T.surface : T.surfaceAlt; }}
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
                  <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}`, fontSize: 12, fontFamily: "'JetBrains Mono','Fira Code',monospace", color: T.teal }}>
                    {row.ip_address || <span style={{ color: T.subtle, fontFamily: "inherit" }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderLight}` }}>
                    <button
                      onClick={e => { e.stopPropagation(); onRowClick(row); }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: T.radius.sm,
                        border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
                        fontSize: 11.5, fontWeight: 600, color: T.muted,
                        cursor: "pointer", fontFamily: "inherit",
                        transition: `all ${T.transitionFast}`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.accentLight; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderLight; e.currentTarget.style.color = T.muted; e.currentTarget.style.background = T.surfaceAlt; }}
                    >
                      Details <ArrowRight size={11} />
                    </button>
                  </td>
                </tr>
              );
            })}
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
            {(() => {
              const pageSize = 50;
              const start = ((page - 1) * pageSize + 1).toLocaleString();
              const end = Math.min(page * pageSize, data.total).toLocaleString();
              return `Showing ${start}–${end} of ${data.total.toLocaleString()} events · Page ${page} of ${totalPages}`;
            })()}
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
   DETAIL DRAWER — sub-components (declared outside)
   ══════════════════════════════════════════════════════════════ */

function DrawerDetail({ label, value, mono }) {
  return (
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
}

function DrawerSectionCard({ children, style: extraStyle }) {
  return (
    <div style={{
      background: T.surfaceAlt,
      borderRadius: T.radius.md,
      border: `1px solid ${T.borderLight}`,
      padding: "14px 16px",
      marginBottom: 14,
      ...extraStyle,
    }}>
      {children}
    </div>
  );
}

function DrawerSectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 800, color: T.muted,
      textTransform: "uppercase", letterSpacing: "0.08em",
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DETAIL DRAWER
   ══════════════════════════════════════════════════════════════ */

function DetailDrawer({ row, onClose }) {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [rawExpanded, setRawExpanded] = useState(false);
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
  const isSuccess = row.outcome === "SUCCESS";

  const copyJson = () => {
    const safe = { ...row };
    navigator.clipboard.writeText(JSON.stringify(safe, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyLogId = () => {
    navigator.clipboard.writeText(String(row.id)).then(() => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

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
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.muted }}>
              <span>Record #{row.id}</span>
              <button
                onClick={copyLogId}
                title="Copy Log ID"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 8px", borderRadius: T.radius.sm,
                  border: `1px solid ${T.borderLight}`, background: T.surfaceAlt,
                  fontSize: 11, fontWeight: 600, color: T.muted, cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {copiedId ? <Check size={11} color={T.success} /> : <Copy size={11} />}
                {copiedId ? "Copied" : "Copy ID"}
              </button>
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

        {/* Outcome Banner */}
        <div style={{
          padding: "12px 24px",
          background: isSuccess ? T.successBg : T.errorBg,
          borderBottom: `1px solid ${isSuccess ? T.successBorder : T.errorBorder}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          {isSuccess
            ? <CheckCircle2 size={22} color={T.success} />
            : <XCircle size={22} color={T.error} />}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: isSuccess ? T.success : T.error }}>
              {isSuccess ? "Success" : "Failure"}
            </div>
            <div style={{ fontSize: 12, color: isSuccess ? T.success : T.error, opacity: 0.75 }}>
              {formatAction(row.action)}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Event info */}
          <DrawerSectionLabel>Event</DrawerSectionLabel>
          <DrawerSectionCard>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
              <DrawerDetail label="Timestamp" value={formatDateTime(row.created_at)} />
              <DrawerDetail label="Action" value={formatAction(row.action)} />
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Category</div>
                <CategoryBadge category={row.category} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Outcome</div>
                <OutcomeBadge outcome={row.outcome} />
              </div>
            </div>
          </DrawerSectionCard>

          {/* Actor & Target */}
          <DrawerSectionLabel>Principals</DrawerSectionLabel>
          <DrawerSectionCard>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
              <DrawerDetail label="Actor" value={row.actor_name} />
              <DrawerDetail label="Actor Role" value={row.actor_role} />
              <DrawerDetail label="Target" value={row.target_name} />
              <DrawerDetail label="Target Role" value={row.target_role} />
            </div>
          </DrawerSectionCard>

          {/* Technical */}
          <DrawerSectionLabel>Technical</DrawerSectionLabel>
          <DrawerSectionCard>
            <DrawerDetail label="IP Address" value={row.ip_address} mono />
            <DrawerDetail label="User Agent" value={row.user_agent} />
          </DrawerSectionCard>

          {/* Metadata */}
          {metaEntries.length > 0 && (
            <>
              <DrawerSectionLabel>Metadata</DrawerSectionLabel>
              <DrawerSectionCard>
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
              </DrawerSectionCard>
            </>
          )}

          {/* Raw JSON — collapsible */}
          <div style={{ marginBottom: 4 }}>
            <button
              onClick={() => setRawExpanded(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "none", cursor: "pointer",
                fontSize: 11.5, fontWeight: 700, color: T.muted, padding: "4px 0",
                fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.06em",
              }}
            >
              {rawExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Show Raw Data
            </button>
          </div>
          {rawExpanded && (
            <div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
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
                  {copied ? "Copied" : "Copy JSON"}
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
          )}
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

  const generatedAt = new Date().toLocaleString("en-US", { dateStyle: "full", timeStyle: "medium" });
  const generatedDate = new Date().toLocaleDateString("en-US", { dateStyle: "long" });

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    win.document.write(`<html><head><title>Audit Report Snapshot — OVS</title><style>
      * { box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; margin: 0; }
      .letterhead { display: flex; align-items: center; gap: 14px; padding-bottom: 20px; border-bottom: 3px solid #2563EB; margin-bottom: 24px; }
      .letterhead-icon { width: 48px; height: 48px; background: #EBF2FF; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }
      .letterhead-title { font-size: 20px; font-weight: 800; color: #0C1222; margin: 0 0 2px; }
      .letterhead-sub { font-size: 12px; color: #64748B; margin: 0; }
      h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #5E6D85; margin: 24px 0 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 4px; }
      th, td { padding: 7px 12px; text-align: left; border: 1px solid #D8DEE9; font-size: 13px; }
      th { background: #2563EB; color: #fff; font-weight: 700; }
      tr:nth-child(even) td { background: #F6F8FB; }
      .chip { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #EBF2FF; color: #2563EB; margin: 2px 3px 2px 0; border: 1px solid #93B4F6; }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  if (!summary) return null;

  const activeFilters = Object.entries(filters).filter(([k, v]) => v && k !== "page" && k !== "page_size");

  const thStyle = {
    padding: "8px 12px", textAlign: "left", background: T.accent, color: "#FFF",
    fontWeight: 700, fontSize: 12, borderBottom: `2px solid ${T.accentHover}`,
  };
  const tdStyle = { padding: "7px 12px", fontSize: 13, color: T.text, borderBottom: `1px solid ${T.borderLight}` };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", zIndex: 999 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: "min(720px, 95vw)", maxHeight: "88vh",
        background: T.surface, borderRadius: T.radius.xl,
        boxShadow: T.shadow.xl, zIndex: 1000,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Report Snapshot</div>
            <div style={{ fontSize: 12, color: T.muted }}>Generated {generatedAt}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePrint} style={{
              padding: "7px 16px", borderRadius: T.radius.md, fontSize: 12.5, fontWeight: 700,
              background: T.accent, color: "#FFF", border: "none", cursor: "pointer", fontFamily: "inherit",
              boxShadow: T.shadow.sm,
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

        {/* Printable Content */}
        <div ref={printRef} style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* Letterhead */}
          <div className="letterhead" style={{
            display: "flex", alignItems: "center", gap: 14,
            paddingBottom: 18, borderBottom: `3px solid ${T.accent}`, marginBottom: 22,
          }}>
            <div style={{
              width: 48, height: 48, background: T.accentLight, borderRadius: T.radius.lg,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0,
            }}>
              🗳️
            </div>
            <div>
              <div className="letterhead-title" style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: "0 0 2px" }}>
                Audit Report — Online Voting System
              </div>
              <div className="letterhead-sub" style={{ fontSize: 12, color: T.muted }}>
                Election Commission of Nepal · Report date: {generatedDate}
              </div>
            </div>
          </div>

          {/* Active Filters chips */}
          {activeFilters.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Filters Applied
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {activeFilters.map(([k, v]) => (
                  <span key={k} className="chip" style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                    background: T.accentLight, color: T.accent,
                    border: `1px solid ${T.accentMuted}`,
                  }}>
                    <span style={{ opacity: 0.7 }}>{k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}:</span>
                    {" "}{String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary Totals */}
          <h2 style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
            Summary Totals
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={thStyle}>Metric</th>
                <th style={thStyle}>Count</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Total Events", summary.total_events],
                ["Failed Events", summary.failed_events],
                ["Admin Actions", summary.admin_actions],
                ["Security Events", summary.security_events],
                ["Affected Accounts", summary.affected_accounts],
                ["Today's Activity", summary.today_activity],
              ].map(([label, val], i) => (
                <tr key={label} style={{ background: i % 2 === 0 ? T.surface : T.surfaceAlt }}>
                  <td style={tdStyle}>{label}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{(val ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {summary.action_breakdown && Object.keys(summary.action_breakdown).length > 0 && (
            <>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>By Action</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                <thead><tr><th style={thStyle}>Action</th><th style={thStyle}>Count</th></tr></thead>
                <tbody>
                  {Object.entries(summary.action_breakdown).sort((a, b) => b[1] - a[1]).map(([a, c], i) => (
                    <tr key={a} style={{ background: i % 2 === 0 ? T.surface : T.surfaceAlt }}>
                      <td style={tdStyle}>{formatAction(a)}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{c.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {summary.outcome_breakdown && Object.keys(summary.outcome_breakdown).length > 0 && (
            <>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>By Outcome</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                <thead><tr><th style={thStyle}>Outcome</th><th style={thStyle}>Count</th></tr></thead>
                <tbody>
                  {Object.entries(summary.outcome_breakdown).map(([o, c], i) => (
                    <tr key={o} style={{ background: i % 2 === 0 ? T.surface : T.surfaceAlt }}>
                      <td style={tdStyle}>{o}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{c.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {summary.category_breakdown && Object.keys(summary.category_breakdown).length > 0 && (
            <>
              <h2 style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>By Category</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                <thead><tr><th style={thStyle}>Category</th><th style={thStyle}>Count</th></tr></thead>
                <tbody>
                  {Object.entries(summary.category_breakdown).map(([c, n], i) => (
                    <tr key={c} style={{ background: i % 2 === 0 ? T.surface : T.surfaceAlt }}>
                      <td style={tdStyle}>{CATEGORY_LABELS[c] || c}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{n.toLocaleString()}</td>
                    </tr>
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
  const [exportOpen, setExportOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const exportRef = useRef(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handler = e => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const isRefreshing = logsLoading || summaryLoading;

  const clearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const handleRefresh = useCallback(() => {
    refetch();
    setLastRefreshed(new Date());
  }, [refetch]);

  const handleExport = useCallback(async (format) => {
    setExporting(format);
    setExportOpen(false);
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
      <AdminKeyframes />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Page toolbar ─────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 8, marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.subtle, fontWeight: 500 }}>
          <Clock size={12} />
          Last updated: {formatDateTime(lastRefreshed.toISOString())}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={handleRefresh}
            title="Refresh data"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: T.radius.md,
              border: `1px solid ${T.border}`, background: T.surface,
              cursor: "pointer", boxShadow: T.shadow.sm, outline: "none",
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = T.focusRing; }}
            onBlur={e => { e.currentTarget.style.boxShadow = T.shadow.sm; }}
          >
            {isRefreshing
              ? <Loader2 size={15} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
              : <RefreshCw size={15} color={T.muted} />}
          </button>

          <div ref={exportRef} style={{ position: "relative" }}>
            <button
              onClick={() => setExportOpen(v => !v)}
              disabled={!!exporting}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: T.radius.md,
                border: `1px solid ${T.border}`, background: T.surface,
                fontSize: 12.5, fontWeight: 600, color: T.text,
                cursor: exporting ? "wait" : "pointer", boxShadow: T.shadow.sm,
                fontFamily: "inherit", outline: "none",
              }}
              onFocus={e => { e.currentTarget.style.boxShadow = T.focusRing; }}
              onBlur={e => { e.currentTarget.style.boxShadow = T.shadow.sm; }}
            >
              {exporting
                ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                : <FileText size={14} />}
              Export
              <ChevronDown size={13} style={{ opacity: 0.6, transition: `transform ${T.transitionFast}`, transform: exportOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>

            {exportOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: T.surface, borderRadius: T.radius.md,
                border: `1px solid ${T.border}`, boxShadow: T.shadow.lg,
                zIndex: 50, minWidth: 160, overflow: "hidden",
              }}>
                <button
                  onClick={() => handleExport("csv")}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "10px 14px", border: "none", background: "transparent",
                    fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left",
                    borderBottom: `1px solid ${T.borderLight}`,
                    transition: `background ${T.transitionFast}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <FileText size={14} color={T.muted} /> Export CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "10px 14px", border: "none", background: "transparent",
                    fontSize: 13, fontWeight: 600, color: T.text, cursor: "pointer",
                    fontFamily: "inherit", textAlign: "left",
                    transition: `background ${T.transitionFast}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.surfaceAlt; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <FileJson size={14} color={T.muted} /> Export JSON
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowReport(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px", borderRadius: T.radius.md,
              border: "none", background: T.accent,
              fontSize: 12.5, fontWeight: 700, color: "#FFF",
              cursor: "pointer", boxShadow: T.shadow.md, fontFamily: "inherit",
              outline: "none",
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = T.focusRing; }}
            onBlur={e => { e.currentTarget.style.boxShadow = T.shadow.md; }}
            onMouseEnter={e => { e.currentTarget.style.background = T.accentHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.accent; }}
          >
            <Camera size={14} />
            Report Snapshot
          </button>
        </div>
      </div>

      {/* ── Portal Hero ──────────────────────────────── */}
      <AdminPortalHero
        eyebrow="Security & Compliance"
        title="System Audit Trail"
        subtitle="Monitor authentication events, track administrative actions, review security incidents, and generate compliance reports across all portal operations."
        rightContent={<>
          <AdminHeroChip label="Authentication" tint={ADMIN_HERO_TINTS.info} />
          <AdminHeroChip label="Security" tint={ADMIN_HERO_TINTS.warn} />
          <AdminHeroChip label="Admin Actions" tint={ADMIN_HERO_TINTS.default} />
        </>}
      />

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
        onClear={clearFilters}
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

      {/* Global animations */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 900px) {
          .kpi-strip-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          .kpi-strip-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PageContainer>
  );
}
