import React, { useState, useEffect, useMemo } from 'react';
import { T } from '../../../components/ui/tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import StatusPill from './StatusPill';
import EmptyStateBlock from './EmptyStateBlock';
import { ShieldCheck, RefreshCw, XCircle, UserCheck, Search, Users } from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function Monogram({ name }) {
  const colors = ['#2563EB', '#7C3AED', '#047857', '#B45309', '#DC2626', '#0E7490', '#6D28D9', '#C2410C'];
  const initials = (name || "?").split(" ").slice(0, 2).map(s => s[0]).join("").toUpperCase();
  const idx = (name || "").charCodeAt(0) % colors.length;
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: `${colors[idx]}14`, color: colors[idx],
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, flexShrink: 0,
      letterSpacing: "0.02em",
    }}>{initials}</div>
  );
}

export default function ActiveAdminsTable({
  items = [],
  isLoading = false,
  error = "",
  searchValue: externalSearch,
  onSearchChange: externalOnSearch,
  onRefresh,
  onDisableAdmin,
}) {
  // Use internal state if external search props aren't provided
  const [internalSearch, setInternalSearch] = useState("");
  const searchValue = externalSearch !== undefined ? externalSearch : internalSearch;
  const onSearchChange = externalOnSearch || setInternalSearch;

  const [isMobile, setIsMobile] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchValue) return items;
    const q = searchValue.toLowerCase();
    return items.filter(i =>
      (i.full_name || "").toLowerCase().includes(q) ||
      (i.email || "").toLowerCase().includes(q)
    );
  }, [items, searchValue]);

  const renderContent = () => {
    if (isLoading) {
      return <EmptyStateBlock title="Loading Active Administrators…" description="Please wait while records are loaded." height={180} />;
    }
    if (error) {
      return <EmptyStateBlock icon={XCircle} title="Error Loading Data" description={error} height={180} />;
    }
    if (filteredItems.length === 0) {
      return (
        <EmptyStateBlock
          icon={UserCheck}
          title={searchValue ? "No Matching Administrators" : "No Active Administrators"}
          description={searchValue ? "No admins match your search criteria. Try a different query." : "No administrators have been approved and activated yet."}
          height={180}
          {...(searchValue ? { action: () => onSearchChange(""), actionLabel: "Clear Search" } : {})}
        />
      );
    }
    return isMobile ? (
      <MobileView items={filteredItems} onDisableAdmin={onDisableAdmin} />
    ) : (
      <TableView items={filteredItems} onDisableAdmin={onDisableAdmin} />
    );
  };

  return (
    <SectionCard>
      <SectionHeader
        icon={Users}
        title="Active Administrator Roster"
        description="Verified administrators with active system access."
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
            title="Refresh roster"
            aria-label="Refresh administrator roster"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        }
      />

      {/* Search toolbar */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: T.space.sm, marginBottom: T.space.md,
      }}>
        <div style={{
          flex: 1, position: "relative", display: "flex", alignItems: "center",
        }}>
          <Search size={15} color={T.muted} style={{
            position: "absolute", left: 12, pointerEvents: "none",
          }} />
          <input
            type="search"
            placeholder="Search by name or email…"
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
            aria-label="Search active administrators"
          />
        </div>
        {searchValue && (
          <span style={{ fontSize: 12, color: T.muted, whiteSpace: "nowrap" }}>
            {filteredItems.length} of {items.length}
          </span>
        )}
      </div>

      {renderContent()}
    </SectionCard>
  );
}

function TableView({ items, onDisableAdmin }) {
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
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }} role="grid" aria-label="Active administrator roster">
        <thead>
          <tr>
            <th style={thStyle}>Administrator</th>
            <th style={thStyle}>Approved</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>2FA</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
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
                <div style={{ display: "flex", alignItems: "center", gap: T.space.md }}>
                  <Monogram name={item.full_name} />
                  <div>
                    <div style={{ fontWeight: 600, color: T.text, fontSize: 13.5 }}>{item.full_name}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 1 }}>{item.email}</div>
                  </div>
                </div>
              </td>
              <td style={tdStyle}>
                <span style={{ fontSize: 13, color: T.textSecondary }}>{formatDate(item.approved_at)}</span>
              </td>
              <td style={tdStyle}>
                {item.role ? <StatusPill status={item.role} size="small" /> : "—"}
              </td>
              <td style={tdStyle}>
                {item.totp_enabled_at
                  ? <StatusPill status="TOTP_ENABLED" size="small" />
                  : <StatusPill status="TOTP_DISABLED" size="small" />
                }
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <button
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 10px", backgroundColor: "transparent",
                    border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                    fontSize: 12.5, fontWeight: 600, color: T.error,
                    cursor: "pointer", transition: T.transition,
                  }}
                  onClick={() => onDisableAdmin(item)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = T.errorBg;
                    e.currentTarget.style.borderColor = T.errorBorder;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = T.border;
                  }}
                  title="Disable Administrator Access"
                  aria-label={`Disable access for ${item.full_name}`}
                >
                  <XCircle size={14} />
                  Disable
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileView({ items, onDisableAdmin }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: T.space.md }}>
      {items.map(item => (
        <div key={item.id} style={{
          padding: T.space.lg, border: `1px solid ${T.border}`,
          borderRadius: T.radius.lg, background: T.surface,
          display: "flex", flexDirection: "column", gap: T.space.md,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: T.space.md }}>
            <Monogram name={item.full_name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{item.full_name || "—"}</div>
              <div style={{ fontSize: 12.5, color: T.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{item.email || "—"}</div>
            </div>
            {item.role && <StatusPill status={item.role} size="small" />}
          </div>

          {/* Info row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: T.space.md }}>
            <div>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>2FA</div>
              <div style={{ marginTop: 3 }}>
                {item.totp_enabled_at ? <StatusPill status="TOTP_ENABLED" size="small" /> : <StatusPill status="TOTP_DISABLED" size="small" />}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em" }}>Approved</div>
              <div style={{ fontSize: 13, color: T.textSecondary, marginTop: 3 }}>{formatDate(item.approved_at)}</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            paddingTop: T.space.md, borderTop: `1px solid ${T.borderLight}`,
            display: "flex", justifyContent: "flex-end",
          }}>
            <button
              onClick={() => onDisableAdmin(item)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "6px 12px", background: "transparent",
                border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                fontWeight: 600, fontSize: 13, cursor: "pointer", color: T.error,
              }}
              title="Disable Administrator Access"
            >
              <XCircle size={14} /> Disable Access
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
