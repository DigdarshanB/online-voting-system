import React, { useState, useEffect } from 'react';
import { T } from '../../../components/ui/tokens';
import StatusPill from './StatusPill';
import EmptyStateBlock from './EmptyStateBlock';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import { XCircle, Trash2, RefreshCw, X, Inbox, AlertTriangle, Search, FileText } from 'lucide-react';

function getTimeRemaining(expiryDate) {
  if (!expiryDate) return { text: 'No expiry', color: T.muted };
  const now = new Date();
  const expires = new Date(expiryDate);
  const diff = expires - now;
  if (diff <= 0) return { text: 'Expired', color: T.error };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 1) return { text: `in ${days} days`, color: T.muted };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 1) return { text: `in ${hours} hours`, color: T.warn };
  const minutes = Math.floor(diff / (1000 * 60));
  return { text: `in ${minutes} min`, color: T.error };
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "ISSUED", label: "Issued" },
  { value: "USED", label: "Used" },
  { value: "REVOKED", label: "Revoked" },
  { value: "EXPIRED", label: "Expired" },
];

export default function InvitationLedgerTable({
  items = [],
  isLoading = false,
  error = "",
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
  onRefresh,
  onRevoke,
  onDelete,
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const hasActiveFilters = searchValue || statusFilter !== "ALL";

  const renderContent = () => {
    if (isLoading) {
      return <EmptyStateBlock title="Loading Invitation Register…" description="Fetching records from the secure server." />;
    }
    if (error) {
      return <EmptyStateBlock icon={AlertTriangle} title="Error Loading Ledger" description={error} />;
    }
    if (items.length === 0) {
      return (
        <EmptyStateBlock
          icon={Inbox}
          title="No Invitations Found"
          description={hasActiveFilters
            ? "No invitations match your current filters."
            : "No administrator invitations have been issued yet."}
          {...(hasActiveFilters ? { action: onClearFilters, actionLabel: "Clear Filters" } : {})}
        />
      );
    }
    return isMobile ? (
      <MobileView items={items} onRevoke={onRevoke} onDelete={onDelete} />
    ) : (
      <TableView items={items} onRevoke={onRevoke} onDelete={onDelete} />
    );
  };

  return (
    <SectionCard>
      <SectionHeader
        icon={FileText}
        title="Invitation Register"
        description="Official record of all issued, used, and expired administrator invitations."
        count={items.length}
        actions={
          <button
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 12px", backgroundColor: "transparent",
              border: `1px solid ${T.border}`, borderRadius: T.radius.md,
              fontSize: 12.5, fontWeight: 600, color: T.textSecondary,
              cursor: "pointer", transition: T.transition,
            }}
            onClick={onRefresh}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.surfaceAlt)}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            title="Refresh Register"
            aria-label="Refresh invitation register"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />

      {/* Filter Toolbar */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center",
        gap: T.space.sm, marginBottom: T.space.lg,
        paddingBottom: T.space.md,
        borderBottom: `1px solid ${T.borderLight}`,
      }}>
        {/* Search */}
        <div style={{ flex: "1 1 200px", position: "relative", display: "flex", alignItems: "center" }}>
          <Search size={15} color={T.muted} style={{ position: "absolute", left: 12, pointerEvents: "none" }} />
          <input
            type="search"
            placeholder="Search by email…"
            style={{
              width: "100%", padding: "9px 12px 9px 36px",
              borderRadius: T.radius.md,
              border: `1px solid ${searchFocused ? T.accent : T.border}`,
              fontSize: 13, color: T.text,
              backgroundColor: T.surfaceAlt,
              boxShadow: searchFocused ? T.focusRing : "none",
              outline: "none",
              transition: `border-color ${T.transitionFast}, box-shadow ${T.transitionFast}`,
            }}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            aria-label="Search invitations by email"
          />
        </div>

        {/* Status filter pills */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {STATUS_OPTIONS.map(opt => {
            const isActive = statusFilter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onStatusFilterChange(opt.value)}
                style={{
                  padding: "6px 12px", fontSize: 12, fontWeight: 600,
                  borderRadius: 9999,
                  border: `1px solid ${isActive ? T.accent : T.border}`,
                  background: isActive ? T.accentLight : "transparent",
                  color: isActive ? T.accent : T.textSecondary,
                  cursor: "pointer",
                  transition: T.transition,
                  whiteSpace: "nowrap",
                }}
                aria-pressed={isActive}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "6px 10px", fontSize: 12, fontWeight: 600,
              color: T.muted, background: "transparent",
              border: "none", cursor: "pointer",
              transition: T.transition,
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = T.text)}
            onMouseOut={(e) => (e.currentTarget.style.color = T.muted)}
            title="Clear all filters"
            aria-label="Clear all filters"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {renderContent()}
    </SectionCard>
  );
}

function TableView({ items, onRevoke, onDelete }) {
  const thStyle = {
    padding: `10px ${T.space.lg}px`,
    color: T.muted, fontSize: 11, textTransform: "uppercase",
    letterSpacing: "0.06em", fontWeight: 700,
    borderBottom: `1px solid ${T.border}`,
    background: T.surfaceAlt,
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: `${T.space.md}px ${T.space.lg}px`,
    verticalAlign: "middle", fontSize: 13.5,
    borderBottom: `1px solid ${T.borderLight}`,
  };

  return (
    <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: T.radius.lg }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }} role="grid" aria-label="Invitation register">
        <caption style={{ captionSide: "bottom", textAlign: "left", padding: `${T.space.md}px ${T.space.lg}px`, fontSize: 12, color: T.muted }}>
          Official record of all issued administrator invitations. Actions are logged.
        </caption>
        <thead>
          <tr>
            <th style={thStyle}>Recipient</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Issued</th>
            <th style={thStyle}>Expires / Used</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const expiryInfo = getTimeRemaining(item.expires_at);
            return (
              <tr
                key={item.id}
                style={{
                  transition: T.transitionFast,
                  backgroundColor: idx % 2 === 1 ? T.surfaceAlt : "transparent",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.surfaceSubtle)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 1 ? T.surfaceAlt : "transparent")}
              >
                <td style={tdStyle}>
                  <span style={{ fontWeight: 600, color: T.text }}>{item.recipient_identifier}</span>
                </td>
                <td style={tdStyle}>
                  <StatusPill status={item.status} size="small" />
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 13, color: T.textSecondary }}>{formatDate(item.created_at)}</span>
                </td>
                <td style={tdStyle}>
                  {item.status === 'USED'
                    ? <span style={{ fontSize: 13, color: T.textSecondary }}>{formatDate(item.used_at)}</span>
                    : <span style={{ fontSize: 13, color: expiryInfo.color, fontWeight: 500 }}>{expiryInfo.text}</span>
                  }
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: T.space.sm }}>
                    {item.status === "ISSUED" && (
                      <button
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "5px 10px", backgroundColor: "transparent",
                          border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                          fontSize: 12.5, fontWeight: 600, color: T.warn,
                          cursor: "pointer", transition: T.transition,
                        }}
                        onClick={() => onRevoke(item)}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.warnBg)}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        title="Revoke Invitation"
                        aria-label={`Revoke invitation for ${item.recipient_identifier}`}
                      >
                        <XCircle size={14} /> Revoke
                      </button>
                    )}
                    {(item.status === "EXPIRED" || item.status === "REVOKED") && (
                      <button
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "5px 10px", backgroundColor: "transparent",
                          border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                          fontSize: 12.5, fontWeight: 600, color: T.error,
                          cursor: "pointer", transition: T.transition,
                        }}
                        onClick={() => onDelete(item)}
                        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.errorBg)}
                        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        title="Remove Record from Ledger"
                        aria-label={`Remove record for ${item.recipient_identifier}`}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MobileView({ items, onRevoke, onDelete }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space.md }}>
      {items.map(item => {
        const expiryInfo = getTimeRemaining(item.expires_at);
        return (
          <div key={item.id} style={{
            padding: T.space.lg, border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg, background: T.surface,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontWeight: 600, color: T.text, fontSize: 14, wordBreak: "break-all" }}>
                {item.recipient_identifier}
              </span>
              <StatusPill status={item.status} size="small" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: T.space.md, marginTop: T.space.md }}>
              <div>
                <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 600 }}>Issued</div>
                <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 2 }}>{formatDate(item.created_at)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 600 }}>
                  {item.status === 'USED' ? 'Used' : 'Expires'}
                </div>
                <div style={{ fontSize: 13, color: item.status === 'USED' ? T.textSecondary : expiryInfo.color, marginTop: 2 }}>
                  {item.status === 'USED' ? formatDate(item.used_at) : expiryInfo.text}
                </div>
              </div>
            </div>

            {(item.status === 'ISSUED' || item.status === 'EXPIRED' || item.status === 'REVOKED') && (
              <div style={{
                marginTop: T.space.md, paddingTop: T.space.md,
                borderTop: `1px solid ${T.borderLight}`,
                display: "flex", justifyContent: "flex-end", gap: T.space.sm,
              }}>
                {item.status === 'ISSUED' && (
                  <button
                    onClick={() => onRevoke(item)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "6px 12px", fontSize: 13, fontWeight: 600,
                      color: T.warn, background: "transparent",
                      border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                      cursor: "pointer",
                    }}
                    title="Revoke Invitation"
                  >
                    <XCircle size={14} /> Revoke
                  </button>
                )}
                {(item.status === "EXPIRED" || item.status === "REVOKED") && (
                  <button
                    onClick={() => onDelete(item)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "6px 12px", fontSize: 13, fontWeight: 600,
                      color: T.error, background: "transparent",
                      border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                      cursor: "pointer",
                    }}
                    title="Remove Record"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
