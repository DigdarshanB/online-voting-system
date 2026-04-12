import React, { useState, useEffect } from 'react';
import { tokens } from './tokens';
import { T } from '../../../components/ui/tokens';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import EmptyStateBlock from './EmptyStateBlock';
import { Check, X, RefreshCw, ShieldQuestion, Loader, AlertTriangle, KeyRound } from 'lucide-react';

function GovernanceTable({ items, onApprove, onReject }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: T.space.md }}>
        {items.map(item => (
          <div key={item.id} style={{
            padding: T.space.lg, border: `1px solid ${T.border}`,
            borderRadius: T.radius.lg, borderLeft: `3px solid ${T.warn}`,
            background: T.surface,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{item.name}</div>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{item.email}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: T.space.sm }}>
              Requested: {new Date(item.createdAt).toLocaleString()}
            </div>
            <div style={{ display: "flex", gap: T.space.sm, marginTop: T.space.md, justifyContent: "flex-end" }}>
              <button
                onClick={() => onReject(item)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "6px 12px", fontSize: 13, fontWeight: 600,
                  color: T.error, background: "transparent",
                  border: `1px solid ${T.border}`, borderRadius: T.radius.md,
                  cursor: "pointer",
                }}
                title="Reject Request"
              >
                <X size={14} /> Reject
              </button>
              <button
                onClick={() => onApprove(item)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "6px 12px", fontSize: 13, fontWeight: 600,
                  color: T.success, background: T.successBg,
                  border: `1px solid ${T.successBorder}`, borderRadius: T.radius.md,
                  cursor: "pointer",
                }}
                title="Approve Request"
              >
                <Check size={14} /> Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const tableStyle = { width: "100%", borderCollapse: "collapse", textAlign: "left" };
  const thStyle = {
    padding: `10px ${T.space.lg}px`,
    color: T.muted, fontSize: 11, textTransform: "uppercase",
    letterSpacing: "0.06em", fontWeight: 700,
    borderBottom: `1px solid ${T.border}`,
    background: T.surfaceAlt,
  };
  const tdStyle = {
    padding: `${T.space.md}px ${T.space.lg}px`,
    verticalAlign: "middle", fontSize: 13.5,
    borderBottom: `1px solid ${T.borderLight}`,
  };

  return (
    <div style={{ overflowX: "auto", border: `1px solid ${T.border}`, borderRadius: T.radius.lg }}>
      <table style={tableStyle} role="grid" aria-label="MFA Recovery Queue">
        <thead>
          <tr>
            <th style={thStyle}>Administrator</th>
            <th style={thStyle}>Requested</th>
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
                borderLeft: `3px solid ${T.warn}`,
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.surfaceSubtle)}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = idx % 2 === 1 ? T.surfaceAlt : "transparent")}
            >
              <td style={tdStyle}>
                <div style={{ fontWeight: 600, color: T.text }}>{item.name}</div>
                <div style={{ fontSize: 12.5, color: T.muted, marginTop: 1 }}>{item.email}</div>
              </td>
              <td style={tdStyle}>
                <div style={{ fontSize: 13, color: T.textSecondary }}>{new Date(item.createdAt).toLocaleString()}</div>
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: T.space.sm }}>
                  <button
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", backgroundColor: "transparent",
                      border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
                      fontSize: 12.5, fontWeight: 600, color: T.error,
                      cursor: "pointer", transition: T.transition,
                    }}
                    onClick={() => onReject(item)}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = T.errorBg)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    title="Reject Request"
                    aria-label={`Reject recovery for ${item.name}`}
                  >
                    <X size={14} /> Reject
                  </button>
                  <button
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", backgroundColor: T.successBg,
                      border: `1px solid ${T.successBorder}`, borderRadius: T.radius.sm,
                      fontSize: 12.5, fontWeight: 600, color: T.success,
                      cursor: "pointer", transition: T.transition,
                    }}
                    onClick={() => onApprove(item)}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = `${T.success}18`)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = T.successBg)}
                    title="Approve Request"
                    aria-label={`Approve recovery for ${item.name}`}
                  >
                    <Check size={14} /> Approve
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TotpRecoveryQueueTable({
  items = [],
  isLoading = false,
  error = "",
  onRefresh,
  onApprove,
  onReject,
  id,
}) {
  const refreshBtnStyle = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 12px", backgroundColor: "transparent",
    border: `1px solid ${T.border}`, borderRadius: T.radius.md,
    fontSize: 12.5, fontWeight: 600, color: T.textSecondary,
    cursor: isLoading ? "not-allowed" : "pointer",
    transition: T.transition, opacity: isLoading ? 0.6 : 1,
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <EmptyStateBlock
          icon={Loader}
          title="Loading Recovery Queue…"
          description="Fetching pending requests from the secure server."
        />
      );
    }
    if (error) {
      return (
        <EmptyStateBlock
          icon={AlertTriangle}
          title="Error Loading Queue"
          description={error}
        />
      );
    }
    if (items.length === 0) {
      return (
        <EmptyStateBlock
          icon={ShieldQuestion}
          title="Recovery Queue is Clear"
          description="There are no pending multi-factor authentication recovery requests at this time."
        />
      );
    }
    return <GovernanceTable items={items} onApprove={onApprove} onReject={onReject} />;
  };

  return (
    <SectionCard accentColor={items.length > 0 ? T.warn : undefined}>
      <div id={id}>
        <SectionHeader
          icon={KeyRound}
          title="MFA Recovery Queue"
          description="Review requests from administrators who lost authenticator access."
          count={items.length}
          actions={onRefresh && (
            <button
              style={refreshBtnStyle}
              onClick={onRefresh}
              disabled={isLoading}
              onMouseOver={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = T.surfaceAlt; }}
              onMouseOut={(e) => { if (!isLoading) e.currentTarget.style.backgroundColor = "transparent"; }}
              aria-label="Refresh recovery queue"
            >
              <RefreshCw size={13} style={isLoading ? { animation: "adminSpin 1s linear infinite" } : {}} />
              Refresh
            </button>
          )}
        />
        <div style={{ marginTop: T.space.sm }}>
          {renderContent()}
        </div>
      </div>
    </SectionCard>
  );
}
